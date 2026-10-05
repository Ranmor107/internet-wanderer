import assert from 'node:assert/strict';
import test from 'node:test';
import { canonicalHttpUrl, parseRss, plainText, refreshNewsSnapshot } from '../scripts/adapters/rss.ts';
import type { ContentSource, NewsSnapshot } from '../src/domain/item-schema.ts';

const now = new Date('2026-10-02T10:00:00.000Z');
const source: ContentSource = {
  id: 'example', name: 'Example newsroom', kind: 'rss', url: 'https://example.test/',
  feedUrl: 'https://example.test/feed', displayPolicy: 'headline-only', enabled: true, language: 'en',
};
const empty: NewsSnapshot = { schemaVersion: 1, items: [], sourceStates: {} };
const rss = (items = '') => `<?xml version="1.0"?><rss version="2.0" xmlns:dc="http://purl.org/dc/elements/1.1/"><channel><title>Example</title><link>https://example.test/</link><description>Test feed</description>${items}</channel></rss>`;
const item = ({ title = 'A recent discovery', link = 'https://example.test/story', date = 'Thu, 01 Oct 2026 09:00:00 GMT', guid = 'stable-guid', extra = '' } = {}) => `<item><title><![CDATA[${title}]]></title><link>${link.replaceAll('&', '&amp;')}</link>${date ? `<pubDate>${date}</pubDate>` : ''}${guid ? `<guid>${guid}</guid>` : ''}<description><![CDATA[<p>Summary with <script>alert(1)</script>markup.</p>]]></description>${extra}</item>`;

test('canonical URLs reject executable schemes and retain meaningful query values', () => {
  assert.equal(canonicalHttpUrl('javascript:alert(1)'), undefined);
  assert.equal(canonicalHttpUrl('data:text/html,hello'), undefined);
  assert.equal(canonicalHttpUrl('https://user:password@example.test/'), undefined);
  assert.equal(canonicalHttpUrl('https://Example.test/story?id=4&utm_source=rss&lang=en#section'), 'https://example.test/story?id=4&lang=en');
  assert.equal(plainText('<b>A &amp; B</b><script>bad()</script> &copy;'), 'A & B ©');
});

test('normalization keeps publication time, safe text, stable IDs and headline-only policy', async () => {
  const first = await parseRss(rss(item({ title: '<b>A &amp; B</b><script>bad()</script>' })), source, now);
  assert.equal(first.length, 1);
  assert.equal(first[0].title, 'A & B');
  assert.equal(first[0].publishedAt, '2026-10-01T09:00:00.000Z');
  assert.equal(first[0].blurb, undefined);
  const second = await parseRss(rss(item({ link: 'https://example.test/renamed' })), source, now);
  assert.equal(first[0].id, second[0].id);
});

test('missing, stale, ambiguous, invalid and future dates are excluded', async () => {
  const dates = ['', 'Mon, 01 Sep 2026 09:00:00 GMT', '2026-10-02T11:00:00Z', '2026-10-01T09:00:00', 'Wed, 31 Sep 2026 09:00:00 GMT', 'invalid'];
  const xml = rss(dates.map((date, i) => item({ date, guid: String(i), link: `https://example.test/${i}` })).join(''));
  assert.equal((await parseRss(xml, source, now)).length, 0);
});

test('unsafe links and duplicate canonical URLs or GUIDs are excluded', async () => {
  const xml = rss([
    item({ link: 'javascript:alert(1)', guid: 'bad' }),
    item({ link: 'https://example.test/story?utm_source=rss', guid: 'a' }),
    item({ link: 'https://example.test/story', guid: 'b' }),
    item({ link: 'https://example.test/another', guid: 'a' }),
  ].join(''));
  assert.equal((await parseRss(xml, source, now)).length, 1);
});

test('per-source output is bounded at 15 items', async () => {
  const xml = rss(Array.from({ length: 30 }, (_, i) => item({ guid: String(i), link: `https://example.test/${i}` })).join(''));
  assert.equal((await parseRss(xml, source, now)).length, 15);
});

test('Atom requires published rather than substituting updated as publication', async () => {
  const xml = `<?xml version="1.0"?><feed xmlns="http://www.w3.org/2005/Atom"><title>Example</title><id>https://example.test/</id><updated>2026-10-01T09:00:00Z</updated><entry><id>first</id><title>First</title><link href="https://example.test/first"/><published>2026-10-01T08:00:00Z</published><updated>2026-10-01T09:00:00Z</updated></entry><entry><id>second</id><title>Second</title><link href="https://example.test/second"/><updated>2026-10-01T09:00:00Z</updated></entry></feed>`;
  const result = await parseRss(xml, source, now);
  assert.equal(result.length, 1);
  assert.equal(result[0].publishedAt, '2026-10-01T08:00:00.000Z');
});

test('Global Voices requires and includes author and license attribution', async () => {
  const gv = { ...source, id: 'global-voices' };
  assert.equal((await parseRss(rss(item()), gv, now)).length, 0);
  const result = await parseRss(rss(item({ extra: '<dc:creator>A Writer</dc:creator>' })), gv, now);
  assert.equal(result[0].author, 'A Writer');
  assert.equal(result[0].licenseUrl, 'https://creativecommons.org/licenses/by/3.0/');
});

test('a malformed feed preserves the previous batch and its success time; a valid empty feed replaces it', async () => {
  const previous: NewsSnapshot = {
    ...empty,
    items: await parseRss(rss(item()), source, now),
    sourceStates: { example: { status: 'ok', lastSuccessAt: '2026-10-01T12:00:00Z' } },
  };
  const failed = await refreshNewsSnapshot([source], previous, { now, fetchFeed: async () => '<html><body>Temporarily unavailable</body></html>' });
  assert.deepEqual(failed.items, previous.items);
  assert.equal(failed.sourceStates.example.status, 'error');
  assert.equal(failed.sourceStates.example.lastSuccessAt, '2026-10-01T12:00:00Z');
  assert.equal(failed.sourceStates.example.lastAttemptAt, now.toISOString());
  const validEmpty = await refreshNewsSnapshot([source], previous, { now, fetchFeed: async () => rss() });
  assert.equal(validEmpty.items.length, 0);
  assert.equal(validEmpty.sourceStates.example.status, 'empty');
  assert.equal(validEmpty.sourceStates.example.lastSuccessAt, now.toISOString());
});

test('one network failure does not discard another source and disabled sources are never fetched', async () => {
  const another = { ...source, id: 'another', feedUrl: 'https://another.test/feed' };
  const disabled = { ...source, id: 'disabled', enabled: false, feedUrl: 'https://disabled.test/feed' };
  const fetched: string[] = [];
  const result = await refreshNewsSnapshot([source, another, disabled], empty, {
    now,
    fetchFeed: async (url) => {
      fetched.push(url);
      if (url === source.feedUrl) throw new Error('Timed out');
      return rss(item());
    },
  });
  assert.equal(result.sourceStates.example.status, 'error');
  assert.equal(result.sourceStates.another.status, 'ok');
  assert.equal(result.items[0].sourceId, 'another');
  assert.equal(fetched.length, 2);
  assert.equal(result.sourceStates.disabled, undefined);
});

test('cross-source canonical URL deduplication and DTD refusal', async () => {
  const result = await refreshNewsSnapshot([source, { ...source, id: 'another' }], empty, { now, fetchFeed: async () => rss(item()) });
  assert.equal(result.items.length, 1);
  await assert.rejects(() => parseRss('<!DOCTYPE rss><rss/>', source, now), /declarations/);
  await assert.rejects(() => parseRss('<rss version="2.0"><channel>', source, now));
});
