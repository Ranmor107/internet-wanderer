import assert from 'node:assert/strict';
import test from 'node:test';
import { canonicalHttpUrl, mergeNewsItems, parseRss, plainText, refreshNewsSnapshot } from '../scripts/adapters/rss.ts';
import type { ContentSource, NewsSnapshot } from '../src/domain/item-schema.ts';

const now = new Date('2026-10-02T10:00:00.000Z');
const source: ContentSource = {
  id: 'example', name: 'Example newsroom', kind: 'rss', url: 'https://example.test/',
  feedUrl: 'https://example.test/feed', displayPolicy: 'headline-only', enabled: true, language: 'en',
};
const empty: NewsSnapshot = { schemaVersion: 1, items: [], sourceStates: {} };
const rss = (items = '') => `<?xml version="1.0"?><rss version="2.0" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:content="http://purl.org/rss/1.0/modules/content/"><channel><title>Example</title><link>https://example.test/</link><description>Test feed</description>${items}</channel></rss>`;
const item = ({ title = 'A recent discovery', link = 'https://example.test/story', date = 'Thu, 01 Oct 2026 09:00:00 GMT', guid = 'stable-guid', extra = '' } = {}) => `<item><title><![CDATA[${title}]]></title><link>${link.replaceAll('&', '&amp;')}</link>${date ? `<pubDate>${date}</pubDate>` : ''}${guid ? `<guid>${guid}</guid>` : ''}<description><![CDATA[<p>Summary with <script>alert(1)</script>markup.</p>]]></description>${extra}</item>`;
// Short credit markup from the public 2015 feeds; no article body or images.
const chineseCredits = `<div class='gv-rss-footer'><div class='text-credits-container'><div class='text-credits-section'><span class='credit-label'>Written (English) by</span> <a href='https://globalvoices.org/author/rezwan/' class='user-link'>Rezwan</a></div><div class='text-credits-section'><span class='credit-label'>Translated (简体中文) by</span> <a href='https://zhs.globalvoices.org/author/gvzhteam/' class='user-link'>GV 中文化小组</a></div></div><span class='source-link'><a href='https://globalvoicesonline.org/2015/01/09/a-new-era-begins-for-sri-lanka-after-president-mahinda-rajapaksa-concedes-defeat/'>原文</a></span></div>`;
const japaneseCredits = `<div class='gv-rss-footer'><div class='text-credits-container'><div class='text-credits-section'><span class='credit-label'>記者 (English)</span> <a href='https://globalvoices.org/author/amira-al-hussaini/' class='user-link'>Amira Al Hussaini</a></div><div class='text-credits-section'><span class='credit-label'>翻訳 (日本語)</span> <a href='https://jp.globalvoices.org/author/yuko-aoyagi/' class='user-link'>Yuko Aoyagi</a></div></div><span class='source-link'><a href='https://globalvoicesonline.org/2015/01/12/this-is-no-joke-new-fatwa-prohibits-building-snowmen-in-saudi-arabia/'>原文</a></span></div>`;
const encodedCredits = (html: string) => `<content:encoded><![CDATA[${html}]]></content:encoded>`;

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

test('missing, ambiguous, invalid and future dates are excluded', async () => {
  const dates = ['', '2026-10-02T11:00:00Z', '2026-10-01T09:00:00', 'Wed, 31 Sep 2026 09:00:00 GMT', '2015-02-29T09:00:00Z', 'invalid'];
  const xml = rss(dates.map((date, i) => item({ date, guid: String(i), link: `https://example.test/${i}` })).join(''));
  assert.equal((await parseRss(xml, source, now)).length, 0);
});

test('historical publication dates retain their precise UTC instant', async () => {
  const xml = rss([
    item({ date: 'Mon, 01 Sep 2026 09:00:00 GMT', guid: 'last-month', link: 'https://example.test/last-month' }),
    item({ date: 'Sun, 25 Jan 2015 00:11:14 +0800', guid: 'archive', link: 'https://example.test/2015/01/25/archive' }),
  ].join(''));
  const result = await parseRss(xml, source, now);
  assert.deepEqual(result.map(entry => entry.publishedAt), ['2026-09-01T09:00:00.000Z', '2015-01-24T16:11:14.000Z']);
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
  assert.equal((await parseRss(rss(item({ extra: '<dc:creator>GV 中文化小组</dc:creator>' })), gv, now)).length, 0);
  const result = await parseRss(rss(item({ extra: `<dc:creator>GV 中文化小组</dc:creator>${encodedCredits(chineseCredits)}` })), gv, now);
  assert.equal(result.length, 1);
  assert.equal(result[0].author, 'Rezwan');
  assert.equal(result[0].translator, 'GV 中文化小组');
  assert.equal(result[0].licenseUrl, 'https://creativecommons.org/licenses/by/3.0/');
});

test('Global Voices attribution is required for localized IDs and actual current or legacy domains', async () => {
  const variants = [
    { source: { ...source, id: 'global-voices-zh' }, link: 'https://example.test/story' },
    { source: { ...source, url: 'https://zhs.globalvoices.org/' }, link: 'https://example.test/story' },
    { source, link: 'https://jp.globalvoices.org/2015/01/31/34231/' },
    { source, link: 'https://zh.globalvoicesonline.org/hans/?p=13946' },
  ];
  for (const variant of variants) {
    assert.equal((await parseRss(rss(item({ link: variant.link, extra: '<dc:creator>A Translator</dc:creator>' })), variant.source, now)).length, 0);
    const result = await parseRss(rss(item({ link: variant.link, extra: encodedCredits(chineseCredits) })), variant.source, now);
    assert.equal(result.length, 1);
    assert.equal(result[0].author, 'Rezwan');
    assert.equal(result[0].licenseUrl, 'https://creativecommons.org/licenses/by/3.0/');
  }
});

test('Chinese credits retain all author and translation sections as metadata only', async () => {
  const gv = { ...source, id: 'global-voices-zh', url: 'https://zhs.globalvoices.org/', language: 'zh-CN' };
  const credits = `<div class='gv-rss-footer'><div class='text-credits-container'><div class='text-credits-section'><span class='credit-label'>Written (Português) by</span> <a href='https://globalvoices.org/author/taisa/' class='user-link'>Taisa Sganzerla</a> <a href='https://globalvoices.org/author/rezwan/' class='user-link'>Rezwan</a></div><div class='text-credits-section'><span class='credit-label'>Translated (English) by</span> <a href='https://globalvoices.org/author/taisa/' class='user-link'>Taisa Sganzerla</a></div><div class='text-credits-section'><span class='credit-label'>Translated (简体中文) by</span> <a href='https://zhs.globalvoices.org/author/ameli/' class='user-link'>Ameli</a></div></div><span class='source-link'><a href='https://pt.globalvoicesonline.org/2014/12/05/video-indios-munduruku-protestam-contra-construcao-de-hidreletrica-na-amazonia/'>原文</a></span></div>`;
  const result = await parseRss(rss(item({
    title: '视频：亚马逊原民部落抗议兴建水力发电大坝', link: 'https://zhs.globalvoices.org/2015/01/30/13946/', date: 'Fri, 30 Jan 2015 15:55:02 +0000',
    extra: `<dc:creator>Ameli</dc:creator>${encodedCredits('<p>UNSAVED_ARTICLE_BODY</p>' + credits)}`,
  })), gv, now);
  assert.equal(result.length, 1);
  assert.equal(result[0].author, 'Taisa Sganzerla、Rezwan');
  assert.equal(result[0].translator, 'Taisa Sganzerla、Ameli');
  assert.equal(result[0].language, 'zh-CN');
  assert.equal(result[0].publishedAt, '2015-01-30T15:55:02.000Z');
  assert.deepEqual(result[0].evidenceUrls, ['https://pt.globalvoicesonline.org/2014/12/05/video-indios-munduruku-protestam-contra-construcao-de-hidreletrica-na-amazonia/']);
  assert.equal(result[0].blurb, undefined);
  assert.equal(JSON.stringify(result).includes('UNSAVED_ARTICLE_BODY'), false);
  assert.deepEqual(Object.keys(result[0]).sort(), ['author', 'enabled', 'evidenceUrls', 'id', 'kind', 'language', 'licenseUrl', 'publishedAt', 'sourceId', 'title', 'translator', 'url']);
});

test('Japanese RSS uses configured language and tolerates the observed ESC control character', async () => {
  const gv = { ...source, id: 'global-voices-ja', url: 'https://jp.globalvoices.org/', language: 'ja' };
  const xml = rss(item({ title: 'マジですか。サウジの新しい宗教令、雪だるま作りを禁止', link: 'https://jp.globalvoices.org/2015/01/31/34231/', date: 'Sat, 31 Jan 2015 09:18:12 +0000', extra: `<dc:creator>Yuko Aoyagi</dc:creator>${encodedCredits('\u001b' + japaneseCredits)}` })).replace('<title>Example</title>', '<title>Example</title><language>en-US</language>');
  const result = await parseRss(xml, gv, now);
  assert.equal(result.length, 1);
  assert.equal(result[0].author, 'Amira Al Hussaini');
  assert.equal(result[0].translator, 'Yuko Aoyagi');
  assert.equal(result[0].language, 'ja');
  assert.equal(result[0].publishedAt, '2015-01-31T09:18:12.000Z');
  assert.deepEqual(result[0].evidenceUrls, ['https://globalvoicesonline.org/2015/01/12/this-is-no-joke-new-fatwa-prohibits-building-snowmen-in-saudi-arabia/']);
});

test('French original reporting preserves the verified Ecrit par author credits', async () => {
  const gv = { ...source, id: 'global-voices-fr', url: 'https://fr.globalvoices.org/', language: 'fr' };
  const credits = `<div class='gv-rss-footer'><strong><div class='text-credits-container'><div class='text-credits-section'><span class='credit-label'>Ecrit par</span> <a href='https://fr.globalvoices.org/author/claire-ulrich/' class='user-link'>Claire Ulrich</a></div></div></strong></div>`;
  const result = await parseRss(rss(item({ link: 'https://fr.globalvoices.org/2010/12/31/52154/', date: 'Fri, 31 Dec 2010 14:02:16 +0000', extra: `<dc:creator>Claire Ulrich</dc:creator>${encodedCredits(credits)}` })), gv, now);
  assert.equal(result.length, 1);
  assert.equal(result[0].author, 'Claire Ulrich');
  assert.equal(result[0].translator, undefined);
  assert.equal(result[0].language, 'fr');
  assert.equal(result[0].publishedAt, '2010-12-31T14:02:16.000Z');
  assert.equal(result[0].licenseUrl, 'https://creativecommons.org/licenses/by/3.0/');
});

test('body links and translator-only footers cannot substitute for reliable original author credits', async () => {
  const gv = { ...source, id: 'global-voices-ja', url: 'https://jp.globalvoices.org/' };
  const outsideFooter = japaneseCredits.replace("class='gv-rss-footer'", "class='article-body'");
  const translatorOnly = japaneseCredits.replace(/<div class='text-credits-section'><span class='credit-label'>記者[\s\S]*?<\/div>/, '');
  for (const credits of [outsideFooter, translatorOnly]) {
    assert.equal((await parseRss(rss(item({ extra: `<dc:creator>Yuko Aoyagi</dc:creator>${encodedCredits(credits)}` })), gv, now)).length, 0);
  }
});

test('news merging accumulates old items and updates a matching GUID without changing its saved ID', async () => {
  const previous = await parseRss(rss(item({ title: 'Original title', date: 'Fri, 30 Jan 2015 15:55:02 +0000' })), source, now);
  const incoming = await parseRss(rss([
    item({ title: 'Revised title', link: 'https://example.test/renamed' }),
    item({ title: 'Another story', guid: 'another', link: 'https://example.test/another' }),
  ].join('')), source, now);
  const result = mergeNewsItems(previous, incoming);
  assert.equal(result.length, 2);
  assert.equal(result.find(entry => entry.title === 'Revised title')?.id, previous[0].id);
  assert.equal(result.find(entry => entry.id === previous[0].id)?.url, 'https://example.test/renamed');
});

test('changed GUIDs and cross-source canonical URL duplicates reuse the previous saved ID', async () => {
  const previous = await parseRss(rss(item({ guid: 'original', link: 'https://example.test/story?id=4&utm_source=old' })), source, now);
  const incoming = await parseRss(rss(item({ guid: 'replacement', title: 'Updated title', link: 'https://example.test/story?utm_source=new&id=4#fragment' })), { ...source, id: 'another' }, now);
  assert.notEqual(incoming[0].id, previous[0].id);
  const result = mergeNewsItems(previous, incoming);
  assert.equal(result.length, 1);
  assert.equal(result[0].id, previous[0].id);
  assert.equal(result[0].title, 'Updated title');
  assert.equal(result[0].url, 'https://example.test/story?id=4');
  assert.deepEqual(mergeNewsItems(result, []), result);
});

test('merging removes both ID and URL collisions after an article changes its canonical URL', async () => {
  const previous = await parseRss(rss([
    item({ guid: 'first', link: 'https://example.test/first' }),
    item({ guid: 'second', link: 'https://example.test/second' }),
  ].join('')), source, now);
  const incoming = await parseRss(rss(item({ guid: 'first', title: 'Combined story', link: 'https://example.test/second' })), source, now);
  const result = mergeNewsItems(previous, incoming);
  assert.equal(result.length, 1);
  assert.equal(result[0].id, previous[0].id);
  assert.equal(result[0].title, 'Combined story');
  assert.equal(new Set(result.map(entry => entry.id)).size, result.length);
  assert.equal(new Set(result.map(entry => entry.url)).size, result.length);
});

test('a malformed feed preserves the previous batch and its success time; a valid empty feed retains history', async () => {
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
  assert.deepEqual(validEmpty.items, previous.items);
  assert.equal(validEmpty.sourceStates.example.status, 'empty');
  assert.equal(validEmpty.sourceStates.example.lastSuccessAt, now.toISOString());
});

test('a successful refresh adds new stories while retaining earlier archive records and IDs', async () => {
  const previous: NewsSnapshot = {
    ...empty,
    items: await parseRss(rss(item({ guid: 'archive', link: 'https://example.test/archive', date: 'Fri, 30 Jan 2015 15:55:02 +0000' })), source, now),
  };
  const result = await refreshNewsSnapshot([source], previous, { now, fetchFeed: async () => rss(item({ guid: 'recent', link: 'https://example.test/recent' })) });
  assert.equal(result.items.length, 2);
  assert.deepEqual(result.items[1], previous.items[0]);
  assert.equal(result.items[0].url, 'https://example.test/recent');
  assert.equal(result.sourceStates.example.status, 'ok');
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

test('disabled sources retain saved records and source state without making a request', async () => {
  const disabled = { ...source, enabled: false };
  const previous: NewsSnapshot = {
    ...empty,
    items: await parseRss(rss(item({ date: 'Fri, 30 Jan 2015 15:55:02 +0000' })), source, now),
    sourceStates: { example: { status: 'ok', lastSuccessAt: '2026-10-01T12:00:00Z', lastAttemptAt: '2026-10-01T12:00:00Z' } },
  };
  const result = await refreshNewsSnapshot([disabled], previous, { now, fetchFeed: async () => { assert.fail('Disabled source must not be fetched'); } });
  assert.deepEqual(result.items, previous.items);
  assert.deepEqual(result.sourceStates, previous.sourceStates);
});

test('cross-source canonical URL deduplication and DTD refusal', async () => {
  const result = await refreshNewsSnapshot([source, { ...source, id: 'another' }], empty, { now, fetchFeed: async () => rss(item()) });
  assert.equal(result.items.length, 1);
  await assert.rejects(() => parseRss('<!DOCTYPE rss><rss/>', source, now), /declarations/);
  await assert.rejects(() => parseRss('<rss version="2.0"><channel>', source, now));
});
