import assert from 'node:assert/strict';
import test from 'node:test';
import index from '../data/news-topics.json' with { type: 'json' };
import snapshot from '../data/news.snapshot.json' with { type: 'json' };
import { NEWS_TOPICS, newsInTopic, newsTopicIndexSchema, topicsForItem } from '../src/domain/news-topics';
import type { WanderItem } from '../src/domain/item-schema';
import { NEWS_REGIONS, regionItems } from '../src/ui/globe/geography';

const items = snapshot.items as WanderItem[];

test('reviewed topics preserve exact saved titles and give every subject several places to explore', () => {
  const records = newsTopicIndexSchema.parse(index).items;
  const byId = new Map(items.map(item => [item.id, item]));
  for (const record of records) assert.equal(byId.get(record.id)?.title, record.title, record.id);
  for (const topic of NEWS_TOPICS) {
    const reports = newsInTopic(items, topic.id);
    assert.ok(reports.length >= 12, `${topic.name}: not enough reviewed reports`);
    assert.ok(NEWS_REGIONS.filter(region => regionItems(region, reports).length).length >= 3, `${topic.name}: not enough destinations`);
    assert.ok(new Set(reports.map(item => item.language)).size >= 2, `${topic.name}: needs different voices`);
  }
});

test('unreviewed reports remain in all news and changed titles are not silently recategorized', () => {
  const reviewed = items.find(item => topicsForItem(item).length)!;
  const unknown: WanderItem = { ...reviewed, id: 'unreviewed', tags: ['military'] };
  const changed = { ...reviewed, title: 'A different report' };
  assert.deepEqual(topicsForItem(unknown), []);
  assert.deepEqual(topicsForItem(changed), []);
  assert.deepEqual(newsInTopic([unknown, changed], 'all'), [unknown, changed]);
  for (const topic of NEWS_TOPICS) assert.deepEqual(newsInTopic([unknown, changed], topic.id), []);
  assert.equal(newsInTopic(items, 'all').length, items.length);
});

test('multi-topic reports match each reviewed subject without duplicate entries', () => {
  const crossTopic = items.find(item => topicsForItem(item).length > 1)!;
  assert.ok(crossTopic);
  for (const topic of topicsForItem(crossTopic)) assert.deepEqual(newsInTopic([crossTopic], topic), [crossTopic]);
  for (const topic of NEWS_TOPICS) {
    const pool = newsInTopic(items, topic.id);
    assert.equal(new Set(pool.map(item => item.id)).size, pool.length);
  }
});

test('topic index rejects unknown subjects, repeated associations and duplicate item IDs', () => {
  const base = { schemaVersion: 1, reviewedAt: '2026-10-26', basis: 'test', items: [{ id: 'one', title: 'One', topics: ['technology'] }] };
  assert.ok(newsTopicIndexSchema.safeParse(base).success);
  assert.equal(newsTopicIndexSchema.safeParse({ ...base, items: [{ ...base.items[0], topics: ['made-up'] }] }).success, false);
  assert.equal(newsTopicIndexSchema.safeParse({ ...base, items: [{ ...base.items[0], topics: ['technology', 'technology'] }] }).success, false);
  assert.equal(newsTopicIndexSchema.safeParse({ ...base, items: [...base.items, ...base.items] }).success, false);
  assert.equal(newsTopicIndexSchema.safeParse({ ...base, items: [{ ...base.items[0], topics: [] }] }).success, false);
});
