import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveBookmark } from '../src/content/bookmarks';
import type { Bookmark } from '../src/domain/bookmarks';
import type { ContentSource, WanderItem } from '../src/domain/item-schema';

const item: WanderItem = { id: 'saved', kind: 'news', title: 'A past story', url: 'https://example.org/story', sourceId: 'example', publishedAt: '2020-01-01T00:00:00Z', author: 'An author', licenseUrl: 'https://creativecommons.org/licenses/by/3.0/' };
const bookmark: Bookmark = { id: item.id, savedAt: '2020-01-02T00:00:00Z', item, source: { id: 'example', name: 'Example source', url: 'https://example.org/' } };
const source: ContentSource = { id: 'example', name: 'Example source', kind: 'rss', url: 'https://example.org/', displayPolicy: 'headline-only', enabled: true };

test('an absent expired article keeps its saved link, date and attribution as a snapshot', () => {
  const result = resolveBookmark(bookmark, new Map(), new Map(), Date.parse('2026-10-02T00:00:00Z'));
  assert.equal(result.status, 'snapshot');
  assert.equal(result.oldNews, true);
  assert.equal(result.item.author, 'An author');
  assert.equal(result.item.url, item.url);
  assert.equal(result.source?.name, 'Example source');
});

test('current curated content wins over imported metadata sharing the same ID', () => {
  const current = { ...item, title: 'Correct title', url: 'https://example.org/correct' };
  const result = resolveBookmark(bookmark, new Map([[item.id, current]]), new Map([[source.id, source]]));
  assert.equal(result.item.title, 'Correct title');
  assert.equal(result.item.url, current.url);
  assert.equal(result.status, 'current');
});

test('disabled current items or sources cannot be reopened through an old saved copy', () => {
  assert.equal(resolveBookmark(bookmark, new Map([[item.id, { ...item, enabled: false }]]), new Map()).status, 'withdrawn');
  assert.equal(resolveBookmark(bookmark, new Map(), new Map([[source.id, { ...source, enabled: false }]])).status, 'withdrawn');
});
