import assert from 'node:assert/strict';
import test from 'node:test';
import { collectArchiveYear } from '../scripts/adapters/news-archives.ts';
import type { ContentSource } from '../src/domain/item-schema.ts';

const now = new Date('2026-10-02T10:00:00.000Z');
const source: ContentSource = {
  id: 'global-voices-zh', name: 'Global Voices 简体中文', kind: 'rss', url: 'https://zhs.globalvoices.org/',
  feedUrl: 'https://zhs.globalvoices.org/feed/', displayPolicy: 'headline-only', enabled: true, language: 'zh-CN',
};
// Observed credit structure from the January 2015 public feed, without article content.
const credits = `<div class='gv-rss-footer'><div class='text-credits-container'><div class='text-credits-section'><span class='credit-label'>Written (English) by</span> <a href='https://globalvoices.org/author/rezwan/' class='user-link'>Rezwan</a></div><div class='text-credits-section'><span class='credit-label'>Translated (简体中文) by</span> <a href='https://zhs.globalvoices.org/author/gvzhteam/' class='user-link'>GV 中文化小组</a></div></div><span class='source-link'><a href='https://globalvoicesonline.org/2015/01/09/a-new-era-begins-for-sri-lanka-after-president-mahinda-rajapaksa-concedes-defeat/'>原文</a></span></div>`;
const item = (id: string, date = 'Sat, 24 Jan 2015 16:11:14 +0000', title = '「斯里兰卡的新时代」总统拉贾帕克萨承认大选失利') => `<item><title><![CDATA[${title}]]></title><link>https://zhs.globalvoices.org/2015/01/25/${id}/</link><guid>${id}</guid><pubDate>${date}</pubDate><dc:creator>GV 中文化小组</dc:creator><content:encoded><![CDATA[${credits}]]></content:encoded></item>`;
const rss = (items = '') => `<?xml version="1.0"?><rss version="2.0" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:content="http://purl.org/rss/1.0/modules/content/"><channel><title>2015 · Global Voices 简体中文</title><link>https://zhs.globalvoices.org/</link><description>Test archive</description>${items}</channel></rss>`;

test('year archives use official date paths and default to two distinct pages', async () => {
  const requested: string[] = [];
  const result = await collectArchiveYear(source, 2015, {
    now,
    fetchFeed: async url => {
      requested.push(url);
      return rss(item(requested.length === 1 ? '13942' : '13935'));
    },
  });
  assert.deepEqual(requested, ['https://zhs.globalvoices.org/2015/feed/?paged=1', 'https://zhs.globalvoices.org/2015/feed/?paged=2']);
  assert.equal(result.pagesFetched, 2);
  assert.equal(result.items.length, 2);
  assert.ok(result.items.every(entry => entry.publishedAt === '2015-01-24T16:11:14.000Z'));
  assert.ok(result.items.every(entry => entry.author === 'Rezwan' && entry.translator === 'GV 中文化小组'));
});

test('explicit page bounds apply to Japanese archive origins', async () => {
  const requested: string[] = [];
  const japanese = { ...source, id: 'global-voices-ja', url: 'https://jp.globalvoices.org/', language: 'ja' };
  const japaneseCredits = `<div class='gv-rss-footer'><div class='text-credits-container'><div class='text-credits-section'><span class='credit-label'>記者 (English)</span> <a href='https://globalvoices.org/author/amira-al-hussaini/' class='user-link'>Amira Al Hussaini</a></div><div class='text-credits-section'><span class='credit-label'>翻訳 (日本語)</span> <a href='https://jp.globalvoices.org/author/yuko-aoyagi/' class='user-link'>Yuko Aoyagi</a></div></div></div>`;
  const xml = rss(item('34231', 'Sat, 31 Jan 2015 09:18:12 +0000', 'マジですか。サウジの新しい宗教令、雪だるま作りを禁止')).replace(credits, japaneseCredits).replace('https://zhs.globalvoices.org/2015/01/25/34231/', 'https://jp.globalvoices.org/2015/01/31/34231/');
  const result = await collectArchiveYear(japanese, 2015, { now, pages: 1, fetchFeed: async url => { requested.push(url); return xml; } });
  assert.deepEqual(requested, ['https://jp.globalvoices.org/2015/feed/?paged=1']);
  assert.equal(result.pagesFetched, 1);
  assert.equal(result.items[0].language, 'ja');
});

test('a missing archive page stops pagination and keeps earlier pages', async () => {
  let calls = 0;
  const result = await collectArchiveYear(source, 2015, {
    now, pages: 5,
    fetchFeed: async () => {
      calls += 1;
      if (calls === 2) throw Object.assign(new Error('HTTP404'), { status: 404 });
      return rss(item('13942'));
    },
  });
  assert.equal(calls, 2);
  assert.equal(result.pagesFetched, 1);
  assert.equal(result.items.length, 1);
  const absent = await collectArchiveYear(source, 2015, { now, fetchFeed: async () => { throw Object.assign(new Error('HTTP404'), { status: 404 }); } });
  assert.deepEqual(absent, { items: [], pagesFetched: 0 });
});

test('other HTTP errors, network failures and malformed responses propagate', async () => {
  for (const failure of [Object.assign(new Error('HTTP403'), { status: 403 }), Object.assign(new Error('HTTP500'), { status: 500 }), new Error('Timed out')]) {
    await assert.rejects(() => collectArchiveYear(source, 2015, { now, fetchFeed: async () => { throw failure; } }), error => error === failure);
  }
  await assert.rejects(() => collectArchiveYear(source, 2015, { now, fetchFeed: async () => '<html><body>Unavailable</body></html>' }));
});

test('an empty raw feed stops at the empty page and retains earlier results', async () => {
  let calls = 0;
  const result = await collectArchiveYear(source, 2015, { now, pages: 5, fetchFeed: async () => { calls += 1; return calls === 1 ? rss(item('13942')) : rss(); } });
  assert.equal(calls, 2);
  assert.equal(result.pagesFetched, 2);
  assert.equal(result.items.length, 1);
});

test('a repeated page stops without duplicating IDs or canonical URLs', async () => {
  let calls = 0;
  const result = await collectArchiveYear(source, 2015, { now, pages: 5, fetchFeed: async () => { calls += 1; return rss(item('13942')); } });
  assert.equal(calls, 2);
  assert.equal(result.pagesFetched, 2);
  assert.equal(result.items.length, 1);
});

test('an endpoint ignoring the archive year cannot mix current or other-year news into history', async () => {
  for (const date of ['Thu, 01 Oct 2026 09:00:00 GMT', 'Tue, 01 Jul 2014 12:00:00 +0000']) {
    await assert.rejects(() => collectArchiveYear(source, 2015, { now, fetchFeed: async () => rss(item('wrong-year', date)) }), /year/i);
  }
  let calls = 0;
  await assert.rejects(() => collectArchiveYear(source, 2015, { now, fetchFeed: async () => { calls += 1; return rss(item(String(calls), calls === 1 ? 'Sat, 24 Jan 2015 16:11:14 +0000' : 'Thu, 01 Oct 2026 09:00:00 GMT')); } }), /year/i);
  assert.equal(calls, 2);
});

test('a verified local-year archive can contain a publication instant shortly into the next UTC year', async () => {
  const english = { ...source, id: 'global-voices', url: 'https://globalvoices.org/', language: 'en' };
  // The URL and timestamp are the verified boundary case; credits reuse the small fixture above.
  const xml = rss(item('boms-in-bangkok', 'Mon, 01 Jan 2007 03:04:02 +0000', 'Bombs in Bangkok')).replace('https://zhs.globalvoices.org/2015/01/25/boms-in-bangkok/', 'https://globalvoices.org/2006/12/31/boms-in-bangkok/');
  const result = await collectArchiveYear(english, 2006, { now, pages: 1, fetchFeed: async () => xml });
  assert.equal(result.pagesFetched, 1);
  assert.equal(result.items.length, 1);
  assert.equal(result.items[0].url, 'https://globalvoices.org/2006/12/31/boms-in-bangkok/');
  assert.equal(result.items[0].publishedAt, '2007-01-01T03:04:02.000Z');
});

test('disabled archive sources make no request', async () => {
  const result = await collectArchiveYear({ ...source, enabled: false }, 2015, { now, fetchFeed: async () => { assert.fail('Disabled archive must not be fetched'); } });
  assert.deepEqual(result, { items: [], pagesFetched: 0 });
});
