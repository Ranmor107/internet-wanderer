import assert from 'node:assert/strict';
import test from 'node:test';
import {
  MAX_BOOKMARKS, MAX_IMPORT_BYTES, makeBookmark, mergeBookmarks, parseBookmarkFile, serializeBookmarks,
  type Bookmark, type BookmarkSource,
} from '../src/domain/bookmarks';
import { BOOKMARK_STORAGE_KEY, readBookmarks, writeBookmarks } from '../src/storage/bookmarks';
import type { WanderItem } from '../src/domain/item-schema';

const NOW = '2026-10-02T12:00:00Z';
const source: BookmarkSource = { id: 'curated', name: 'Curated places', url: 'https://example.org/', termsUrl: 'https://example.org/terms' };
const site = (id = 'site'): WanderItem => ({ id, kind: 'website', title: `  ${id} & <curiosity>  `, url: `https://example.org/${id}?q=1#section`, sourceId: 'curated', tags: ['art'] });
const saved = (id = 'site') => makeBookmark(site(id), source, NOW);
const envelope = (bookmarks: unknown[]) => ({ app: 'internet-wanderer', schemaVersion: 1, exportedAt: NOW, bookmarks });

test('round-trip preserves websites, events, archives, news and attribution exactly', () => {
  const event: WanderItem = { ...site('event'), kind: 'event', history: { year: 2007, occurredOn: '2007-01-09', role: 'event' }, evidenceUrls: ['https://example.org/evidence'] };
  const archive: WanderItem = { ...site('archive'), kind: 'archive', history: { year: 1999, role: 'archive' }, archive: { originalUrl: 'http://original.example.org/', capturedAt: '1999-12-31T23:59:59+00:00' } };
  const news: WanderItem = { ...site('news'), kind: 'news', sourceId: 'global-voices-zh', url: 'https://zhs.globalvoices.org/2020/story/', publishedAt: '2020-01-01T10:00:00+02:00', author: '  Original Author  ', translator: '原文译者、简中译者', licenseUrl: 'https://creativecommons.org/licenses/by/3.0/', language: 'zh-CN' };
  const publisher = { id: 'global-voices-zh', name: 'Global Voices · 简体中文', url: 'https://zhs.globalvoices.org/', publisherCountry: '荷兰 · 全球作者网络', publisherType: 'media' as const, termsUrl: 'https://globalvoices.org/terms/' };
  const bookmarks = [saved(), makeBookmark(event, source, NOW), makeBookmark(archive, source, NOW), makeBookmark(news, publisher, NOW)];
  assert.deepEqual(parseBookmarkFile(serializeBookmarks(bookmarks, NOW)), bookmarks);
  assert.equal(bookmarks[0].item.title, site().title);
  assert.equal(bookmarks[3].item.author, news.author);
  assert.equal(bookmarks[3].item.translator, news.translator);
  assert.equal(bookmarks[3].item.publishedAt, '2020-01-01T10:00:00+02:00');
  assert.deepEqual(bookmarks[3].source, publisher);
  const exactUrls = makeBookmark({ ...site('exact'), url: 'HTTPS://EXAMPLE.ORG', licenseUrl: 'https://license.example', evidenceUrls: ['https://evidence.example'] }, source, NOW);
  assert.equal(exactUrls.item.url, 'HTTPS://EXAMPLE.ORG');
  assert.equal(exactUrls.item.licenseUrl, 'https://license.example');
  assert.deepEqual(exactUrls.item.evidenceUrls, ['https://evidence.example']);
  assert.deepEqual(parseBookmarkFile(serializeBookmarks([exactUrls], NOW)), [exactUrls]);
});

test('expired saved news survives parsing and serialization without fresh feed membership', () => {
  const item: WanderItem = { ...site('old-news'), kind: 'news', publishedAt: '2000-01-01T00:00:00Z' };
  const bookmark = makeBookmark(item, source, NOW);
  assert.deepEqual(parseBookmarkFile(serializeBookmarks([bookmark], '2035-01-01T00:00:00Z')), [bookmark]);
});

test('merging is immutable; local records win and first incoming duplicate wins', () => {
  const local = [saved('a')];
  const replacement = { ...saved('a'), item: { ...site('a'), title: 'replacement' } };
  const first = { ...saved('b'), item: { ...site('b'), title: 'first' } };
  const last = { ...saved('b'), item: { ...site('b'), title: 'last' } };
  const incoming = [replacement, first, last];
  const before = structuredClone({ local, incoming });
  const result = mergeBookmarks(local, incoming);
  assert.equal(result.added, 1);
  assert.equal(result.duplicates, 2);
  assert.deepEqual(result.bookmarks, [local[0], first]);
  assert.deepEqual({ local, incoming }, before);
});

test('known fields are preserved and unknown fields are stripped at every level', () => {
  const bookmark = { ...saved(), injected: 'ignored', item: { ...site(), html: '<script>alert(1)</script>' }, source: { ...source, feedUrl: 'javascript:alert(1)', unknown: 'ignored' } };
  const input = { ...envelope([bookmark]), extra: { unsafe: 'javascript:alert(1)' } };
  const parsed = parseBookmarkFile(JSON.stringify(input));
  assert.deepEqual(parsed, [saved()]);
  assert.ok('injected' in bookmark);
});

test('invalid JSON, unknown app/version and malformed individual items reject the whole file', () => {
  assert.throws(() => parseBookmarkFile('{broken'), /有效的 JSON/);
  assert.throws(() => parseBookmarkFile(JSON.stringify({ ...envelope([]), app: 'other-app' })), /格式不正确/);
  assert.throws(() => parseBookmarkFile(JSON.stringify({ ...envelope([]), schemaVersion: 2 })), /格式不正确/);
  assert.throws(() => parseBookmarkFile(JSON.stringify({ ...envelope([]), exportedAt: 'yesterday' })), /格式不正确/);
  assert.throws(() => parseBookmarkFile(JSON.stringify(envelope([saved(), { ...saved('bad'), savedAt: '2026-10-02' }]))), /格式不正确/);
  assert.throws(() => parseBookmarkFile(JSON.stringify(envelope([{ ...saved(), item: { ...site(), url: 'not a URL' } }]))), /格式不正确/);
});

test('every stored URL rejects dangerous schemes and embedded user information', () => {
  const dangerous = ['javascript:alert(1)', 'data:text/html,<script>bad</script>', 'file:///etc/passwd', 'https://user:pass@example.org/', 'https://user@example.org/', 'https://@example.org/', 'https://example.org/\nunsafe'];
  for (const url of dangerous) {
    const variants = [
      { ...saved(), item: { ...site(), url } },
      { ...saved(), item: { ...site(), licenseUrl: url } },
      { ...saved(), item: { ...site(), evidenceUrls: [url] } },
      { ...saved(), item: { ...site(), kind: 'archive', archive: { originalUrl: url, capturedAt: NOW } } },
      { ...saved(), source: { ...source, url } },
      { ...saved(), source: { ...source, termsUrl: url } },
    ];
    for (const value of variants) assert.throws(() => parseBookmarkFile(JSON.stringify(envelope([value]))), /格式不正确/, url);
  }
});

test('bookmark and publisher identities must match their item', () => {
  assert.throws(() => parseBookmarkFile(JSON.stringify(envelope([{ ...saved(), id: 'other' }]))), /收藏 ID/);
  assert.throws(() => parseBookmarkFile(JSON.stringify(envelope([{ ...saved(), source: { ...source, id: 'other' } }]))), /来源快照 ID/);
  assert.throws(() => makeBookmark({ ...site(), id: ' padded ' }, source, NOW), /ID/);
});

test('Global Voices attribution is mandatory even with another source ID', () => {
  const item: WanderItem = { ...site(), kind: 'news', sourceId: 'global-voices', publishedAt: NOW };
  assert.throws(() => makeBookmark(item, undefined, NOW), /作者和许可/);
  assert.throws(() => makeBookmark({ ...item, author: '   ', licenseUrl: 'https://creativecommons.org/licenses/by/3.0/' }, undefined, NOW), /作者和许可/);
  assert.throws(() => makeBookmark({ ...item, sourceId: 'other', url: 'https://zh.globalvoices.org/story/' }, undefined, NOW), /作者和许可/);
  assert.throws(() => makeBookmark({ ...item, sourceId: 'global-voices-fr', url: 'https://fr.globalvoices.org/story/', author: 'Someone', licenseUrl: 'https://example.org/license' }, undefined, NOW), /作者和许可/);
  assert.doesNotThrow(() => makeBookmark({ ...item, author: 'Someone', licenseUrl: 'https://creativecommons.org/licenses/by/3.0/' }, undefined, NOW));
});

test('string and collection limits reject unreasonable records', () => {
  assert.throws(() => makeBookmark({ ...site(), title: 'x'.repeat(2001) }, source, NOW), /2000/);
  assert.throws(() => makeBookmark({ ...site(), tags: Array(31).fill('tag') }, source, NOW), /标签/);
  assert.throws(() => makeBookmark({ ...site(), evidenceUrls: Array(31).fill('https://example.org/') }, source, NOW), /参考链接/);
  assert.throws(() => makeBookmark(site(), { ...source, name: 'x'.repeat(501) }, NOW));
  assert.throws(() => makeBookmark(site(), source, 'not-a-date'), /时间无效/);
});

test('500-item cap allows the boundary and atomically rejects an overflowing merge', () => {
  const existing = Array.from({ length: MAX_BOOKMARKS }, (_, i) => saved(`s${i}`));
  assert.equal(parseBookmarkFile(serializeBookmarks(existing, NOW)).length, MAX_BOOKMARKS);
  assert.throws(() => serializeBookmarks([...existing, saved('extra')], NOW), /500/);
  assert.throws(() => parseBookmarkFile(JSON.stringify(envelope([...existing, saved('extra')]))), /500/);
  const before = structuredClone(existing);
  assert.throws(() => mergeBookmarks(existing, [saved('extra')]), /合并后超过 500/);
  assert.deepEqual(existing, before);
  assert.equal(mergeBookmarks(existing, [saved('s0')]).duplicates, 1);
});

test('import byte cap uses UTF-8 and permits exactly 1 MiB', () => {
  const base = serializeBookmarks([], NOW);
  const baseBytes = new TextEncoder().encode(base).byteLength;
  assert.deepEqual(parseBookmarkFile(base + ' '.repeat(MAX_IMPORT_BYTES - baseBytes)), []);
  assert.throws(() => parseBookmarkFile(base + ' '.repeat(MAX_IMPORT_BYTES - baseBytes + 1)), /1 MiB/);
  const multibyte = JSON.stringify({ ...envelope([]), note: '界'.repeat(Math.ceil(MAX_IMPORT_BYTES / 3)) });
  assert.ok(multibyte.length < MAX_IMPORT_BYTES);
  assert.throws(() => parseBookmarkFile(multibyte), /1 MiB/);
});

test('exports and merged data cannot exceed their own import byte cap', () => {
  const large = Array.from({ length: 200 }, (_, i) => makeBookmark({ ...site(`large${i}`), blurb: 'x'.repeat(6000) }, source, NOW));
  assert.throws(() => serializeBookmarks(large, NOW), /1 MiB/);
  const existing = large.slice(0, 100);
  const incoming = large.slice(100);
  assert.doesNotThrow(() => serializeBookmarks(existing, NOW));
  assert.throws(() => mergeBookmarks(existing, incoming), /1 MiB/);
  assert.equal(existing.length, 100);
});

function fakeStorage(initial?: string) {
  const values = new Map<string, string>([['internet-wanderer:journey:v1', 'journey untouched']]);
  if (initial !== undefined) values.set(BOOKMARK_STORAGE_KEY, initial);
  const writes: string[] = [];
  return {
    values, writes,
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { writes.push(key); values.set(key, value); },
  };
}

test('storage reads have no writes and distinguish missing, corrupt and unavailable data', () => {
  const missing = fakeStorage();
  assert.deepEqual(readBookmarks(missing), { bookmarks: [], storageStatus: 'ready' });
  assert.deepEqual(missing.writes, []);
  for (const raw of ['', '{broken', 'null', JSON.stringify({ ...envelope([]), schemaVersion: 9 })]) {
    const corrupt = fakeStorage(raw);
    assert.deepEqual(readBookmarks(corrupt), { bookmarks: [], storageStatus: 'corrupt' });
    assert.equal(corrupt.values.get(BOOKMARK_STORAGE_KEY), raw);
    assert.deepEqual(corrupt.writes, []);
  }
  assert.deepEqual(readBookmarks({ getItem: () => { throw new Error('denied'); } }), { bookmarks: [], storageStatus: 'unavailable' });
});

test('storage writes preserve independent journey data and recover complete bookmark snapshots', () => {
  const storage = fakeStorage();
  const bookmarks = [saved()];
  assert.equal(writeBookmarks(bookmarks, storage), true);
  assert.deepEqual(readBookmarks(storage), { bookmarks, storageStatus: 'ready' });
  assert.deepEqual(storage.writes, [BOOKMARK_STORAGE_KEY]);
  assert.equal(storage.values.get('internet-wanderer:journey:v1'), 'journey untouched');
});

test('failed or invalid writes leave existing data intact', () => {
  const original = serializeBookmarks([saved()], NOW);
  const storage = fakeStorage(original);
  const denied = { ...storage, setItem: () => { throw new Error('quota'); } };
  assert.equal(writeBookmarks([saved('new')], denied), false);
  assert.equal(storage.values.get(BOOKMARK_STORAGE_KEY), original);
  assert.equal(writeBookmarks([{ ...saved(), item: { ...site(), url: 'javascript:alert(1)' } } as Bookmark], storage), false);
  assert.equal(storage.values.get(BOOKMARK_STORAGE_KEY), original);
  assert.deepEqual(storage.writes, []);
});
