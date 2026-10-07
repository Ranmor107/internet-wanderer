import assert from 'node:assert/strict';
import test from 'node:test';
import { contentSourceSchema, datasetSchema, newsSnapshotSchema, wanderItemSchema, type WanderItem } from '../src/domain/item-schema';
import { selectNext, selectYearPack } from '../src/domain/select-next';

const NOW = Date.parse('2026-10-02T12:00:00Z');
const DAY = 24 * 60 * 60 * 1000;
const ago = (ms: number) => new Date(NOW - ms).toISOString();
const site = (id: string, fields: Partial<WanderItem> = {}): WanderItem => ({
  id, kind: 'website', title: id, url: `https://${id}.example/`, sourceId: 'curated', ...fields,
} as WanderItem);
const news = (id: string, sourceId: string, publishedAt = ago(DAY)): WanderItem => ({
  id, kind: 'news', title: id, url: `https://${sourceId}.example/${id}`, sourceId, publishedAt,
});
const event = (id: string, year = 2007): WanderItem => ({
  id, kind: 'event', title: id, url: `https://${id}.example/`, sourceId: 'reference', history: { year },
  evidenceUrls: ['https://evidence.example/'],
});
const archive = (id: string, year = 2007): WanderItem => ({
  id, kind: 'archive', title: id, url: `https://archive.example/${id}`, sourceId: 'archive', history: { year },
  archive: { originalUrl: 'https://original.example/', capturedAt: `${year}-07-01T00:00:00Z` },
});
function sequence(...values: number[]): () => number {
  let index = 0;
  return () => values[index++] ?? 0;
}

test('schemas enforce type-specific fields and safe links', () => {
  assert.equal(wanderItemSchema.safeParse(site('valid')).success, true);
  assert.equal(wanderItemSchema.safeParse({ ...site('bad'), url: 'javascript:alert(1)' }).success, false);
  assert.equal(wanderItemSchema.safeParse({ ...site('bad'), kind: 'news' }).success, false);
  assert.equal(wanderItemSchema.safeParse({ ...news('bad', 'a'), publishedAt: '2026-10-02T12:00:00' }).success, false);
  assert.equal(wanderItemSchema.safeParse({ ...site('bad'), kind: 'archive' }).success, false);
  assert.equal(wanderItemSchema.safeParse({ ...event('bad'), evidenceUrls: [] }).success, false);
  assert.equal(wanderItemSchema.safeParse({ ...event('bad'), history: { year: 2007, occurredOn: '2007-02-30' } }).success, false);
  assert.equal(wanderItemSchema.safeParse({ ...event('bad'), history: { year: 2007, occurredOn: '2008-01-01' } }).success, false);
  assert.equal(wanderItemSchema.safeParse(news('timezone', 'a', '2026-10-02T14:00:00+02:00')).success, true);
});

test('datasets reject duplicate stable IDs and incompatible snapshot contents', () => {
  assert.equal(datasetSchema.safeParse({ schemaVersion: 1, items: [site('a'), site('a')] }).success, false);
  assert.equal(datasetSchema.safeParse({ schemaVersion: 2, items: [] }).success, false);
  assert.equal(newsSnapshotSchema.safeParse({ schemaVersion: 1, items: [site('a')], sourceStates: {} }).success, false);
  assert.equal(newsSnapshotSchema.safeParse({ schemaVersion: 1, items: [], sourceStates: {} }).success, true);
  assert.equal(contentSourceSchema.safeParse({ id: 'a', name: 'A', kind: 'rss', url: 'https://a.example/', displayPolicy: 'headline-only', enabled: true, checkedAt: '2026-10-02' }).success, true);
});

test('disabled, malformed, and wrong-year entries never enter the selected pool', () => {
  const items = [site('off', { enabled: false }), site('unsafe', { url: 'file:///tmp/item' }), event('past', 1999)];
  assert.equal(selectNext({ items, mode: 'elsewhere' }).item, null);
  assert.equal(selectNext({ items, mode: 'time', year: 2007 }).item, null);
  assert.deepEqual(selectYearPack({ items, mode: 'time', year: 2007 }), []);
});

test('reliable historical news remains selectable while future and invalid dates are excluded', () => {
  const items = [news('old', 'a', '2000-01-01T00:00:00Z'), news('future', 'a', ago(-1)), news('recent', 'a', ago(DAY))];
  const selected = selectNext({ items, mode: 'news', now: NOW, rng: () => 0 });
  assert.equal(selected.item?.id, 'old');
  assert.equal(selected.item?.kind, 'news');
  assert.equal(selected.item?.publishedAt, '2000-01-01T00:00:00Z');
  assert.equal(selectNext({ items: [items[0]!], mode: 'surprise', now: NOW }).item?.id, 'old');
  assert.equal(selectNext({ items: [items[0]!], mode: 'time', now: NOW }).item, null);
  assert.equal(selectNext({ items: [{ ...items[0]!, history: { year: 2000 } }], mode: 'time', year: 2000, now: NOW }).item, null);
  assert.equal(selectNext({ items: [items[1]!], mode: 'news', now: NOW }).item, null);
  assert.equal(selectNext({ items: [items[1]!], mode: 'surprise', now: NOW }).item, null);
  assert.equal(selectNext({ items: [news('unknown', 'a', '')], mode: 'news', now: NOW }).item, null);
  assert.equal(selectNext({ items, mode: 'news', now: Number.NaN }).item, null);
});

test('source refresh age is informational and never expires saved news in Surprise', () => {
  const items = [{ ...news('a', 'publisher', '2000-01-01T00:00:00Z'), language: 'ja' }];
  const sourceStates = { publisher: { status: 'error' as const, lastSuccessAt: ago(2 * DAY + 1) } };
  assert.equal(selectNext({ items, mode: 'news', sourceStates, now: NOW }).item?.id, 'a');
  assert.equal(selectNext({ items, mode: 'surprise', sourceStates, now: NOW }).item?.id, 'a');
  assert.equal(selectNext({ items, mode: 'surprise', now: NOW }).item?.language, 'ja');
  sourceStates.publisher.lastSuccessAt = ago(2 * DAY);
  assert.equal(selectNext({ items, mode: 'surprise', sourceStates, now: NOW }).item?.id, 'a');
  sourceStates.publisher.lastSuccessAt = ago(-1);
  assert.equal(selectNext({ items, mode: 'surprise', sourceStates, now: NOW }).item?.id, 'a');
});

test('Surprise selects equally sized mode intervals regardless of item counts', () => {
  const items = [...Array.from({ length: 30 }, (_, i) => site(`site${i}`)), news('headline', 'a'), event('history')];
  const sourceStates = { a: { status: 'ok' as const, lastSuccessAt: ago(0) } };
  const select = (value: number) => selectNext({ items, mode: 'surprise', sourceStates, now: NOW, rng: sequence(value) });
  assert.equal(select(0).resolvedMode, 'elsewhere');
  assert.equal(select(0.33334).resolvedMode, 'news');
  assert.equal(select(0.66667).resolvedMode, 'time');
  assert.equal(select(0.99999).resolvedMode, 'time');
  assert.equal(selectNext({ items, mode: 'surprise', now: NOW, rng: sequence(0.5) }).resolvedMode, 'news');
});

test('news sources and random historical years are sampled before their items', () => {
  const newsItems = [...Array.from({ length: 15 }, (_, i) => news(`a${i}`, 'a')), news('b', 'b')];
  assert.equal(selectNext({ items: newsItems, mode: 'news', now: NOW, rng: sequence(0.5, 0) }).item?.id, 'b');
  const history = [...Array.from({ length: 15 }, (_, i) => event(`a${i}`, 1999)), event('b', 2007)];
  assert.equal(selectNext({ items: history, mode: 'time', rng: sequence(0.5, 0) }).item?.id, 'b');
  assert.equal(selectNext({ items: history, mode: 'time', year: 1999, rng: sequence(0) }).item?.history?.year, 1999);
});

test('recent deduplication avoids all last twenty IDs when candidates remain', () => {
  const items = Array.from({ length: 21 }, (_, i) => site(`s${i}`));
  const recentIds = items.slice(0, 20).map((item) => item.id);
  assert.equal(selectNext({ items, mode: 'elsewhere', recentIds, rng: () => 0 }).item?.id, 's20');
  const allRecent = items.map((item) => item.id);
  assert.equal(selectNext({ items, mode: 'elsewhere', recentIds: allRecent, rng: () => 0 }).item?.id, 's0');
  assert.equal(selectNext({ items, mode: 'elsewhere', recentIds: [...recentIds, 's0'], rng: () => 0 }).item?.id, 's20');
});

test('small pools release their oldest encounter without relaxing hard filters', () => {
  const items = [site('a'), site('b'), site('off', { enabled: false })];
  const result = selectNext({ items, mode: 'elsewhere', recentIds: ['a', 'b'], previousId: 'b', rng: () => 0 });
  assert.equal(result.item?.id, 'a');
  assert.equal(result.repeated, true);
  const single = selectNext({ items: [site('a')], mode: 'elsewhere', previousId: 'a', rng: () => 0 });
  assert.equal(single.repeated, true);
  assert.match(single.reason ?? '', /只有这一站/);
});

test('same-domain avoidance preserves unseen items before considering repeat visits', () => {
  const items = [site('a', { url: 'https://www.same.example/a' }), site('b', { url: 'https://same.example/b' }), site('c')];
  assert.equal(selectNext({ items, mode: 'elsewhere', previousId: 'a', recentIds: ['c', 'a'], rng: () => 0 }).item?.id, 'b');
  assert.equal(selectNext({ items, mode: 'elsewhere', previousId: 'a', rng: () => 0 }).item?.id, 'c');
  assert.equal(selectNext({ items: items.slice(0, 2), mode: 'elsewhere', previousId: 'a', rng: () => 0 }).item?.id, 'b');
});

test('year packs include event, place, archive; avoid recent within each role and duplicate IDs', () => {
  const items = [event('e1'), event('e2'), site('p1', { history: { year: 2007 } }), site('p2', { history: { year: 2007 } }), archive('a1'), archive('a2')];
  const first = selectYearPack({ items, mode: 'time', year: 2007, rng: () => 0 });
  assert.deepEqual(first.map((item) => item.id), ['e1', 'p1', 'a1']);
  const second = selectYearPack({ items, mode: 'time', year: 2007, recentIds: first.map((item) => item.id), rng: () => 0 });
  assert.deepEqual(second.map((item) => item.id), ['e2', 'p2', 'a2']);
  const third = selectYearPack({ items, mode: 'time', year: 2007, recentIds: [...first, ...second].map((item) => item.id), rng: () => 0 });
  assert.deepEqual(third.map((item) => item.id), ['e1', 'p1', 'a1']);
  assert.equal(new Set(third.map((item) => item.id)).size, third.length);
});

test('incomplete year packs return available content and never fabricate missing roles', () => {
  const items = [event('e1'), event('e2'), event('e2'), event('other', 1999)];
  const pack = selectYearPack({ items, mode: 'time', year: 2007, recentIds: ['e1', 'e2'], rng: () => 0 });
  assert.deepEqual(pack.map((item) => item.id), ['e1', 'e2']);
});

test('year packs prioritize three unseen entries over repeating a missing role', () => {
  const items = [event('e1'), archive('a1'), site('p1', { history: { year: 2007 } }), site('p2', { history: { year: 2007 } }), site('p3', { history: { year: 2007 } })];
  const pack = selectYearPack({ items, mode: 'time', year: 2007, recentIds: ['e1', 'a1'], rng: () => 0 });
  assert.deepEqual(new Set(pack.map((item) => item.id)), new Set(['p1', 'p2', 'p3']));
});
