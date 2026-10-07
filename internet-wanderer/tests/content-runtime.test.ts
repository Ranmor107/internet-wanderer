import assert from 'node:assert/strict';
import test from 'node:test';
import { createContentRuntime, contentRuntime } from '../src/content/runtime';
import { canRestore, isSourceFresh, newsSnapshot } from '../src/content/repository';
import { selectNext } from '../src/domain/select-next';
import { SELECTION_RULES } from '../src/domain/modes';
import { createContentRepository } from '../src/content/repository-factory';
import type { ContentSource, WanderItem } from '../src/domain/item-schema';

const SNAPSHOT_DATE = '2026-10-02T08:00:00Z';
const SNAPSHOT_TIME = Date.parse(SNAPSHOT_DATE);
const DAY = 24 * 60 * 60 * 1000;

test('Demo defaults to the bundled reference time and stays playable as the wall clock advances', () => {
  let clock = SNAPSHOT_TIME + DAY;
  for (const mode of [undefined, 'demo', '', 'LIVE', true]) {
    const runtime = createContentRuntime(mode, SNAPSHOT_DATE, () => clock);
    assert.equal(runtime.isDemo, true);
    assert.equal(runtime.label, 'Demo');
    assert.equal(runtime.snapshotDate, new Date(SNAPSHOT_TIME).toISOString());
    assert.equal(runtime.now(), SNAPSHOT_TIME);
    clock += 365 * DAY;
    assert.equal(runtime.now(), SNAPSHOT_TIME);
  }
  assert.equal(contentRuntime.isDemo, true);
  assert.equal(contentRuntime.now(), Date.parse(newsSnapshot.generatedAt!));
  const selected = selectNext({
    items: newsSnapshot.items,
    mode: 'news',
    now: contentRuntime.now(),
    rng: () => 0,
  });
  assert.ok(selected.item);
  assert.equal(canRestore(selected.item, 'news'), true);
});

test('only explicit live mode uses a dynamic wall clock', () => {
  let clock = SNAPSHOT_TIME;
  const runtime = createContentRuntime('live', SNAPSHOT_DATE, () => clock);
  assert.equal(runtime.isDemo, false);
  assert.equal(runtime.label, 'Live');
  assert.equal(runtime.now(), clock);
  clock += 8 * DAY;
  assert.equal(runtime.now(), clock);
  assert.equal(runtime.snapshotDate, new Date(SNAPSHOT_TIME).toISOString());
});

test('missing or invalid snapshot metadata freezes one fallback reference without claiming an update', () => {
  for (const metadata of [undefined, 'invalid', 123]) {
    let clock = SNAPSHOT_TIME;
    const runtime = createContentRuntime('demo', metadata, () => clock);
    clock += DAY;
    assert.equal(runtime.now(), SNAPSHOT_TIME);
    assert.equal(runtime.snapshotDate, undefined);
  }
});

test('explicit clocks exclude future news and use source freshness only as status', () => {
  const item = newsSnapshot.items[0]!;
  assert.equal(item.kind, 'news');
  const publishedAt = Date.parse(item.publishedAt!);
  const lastSuccessAt = Date.parse(newsSnapshot.sourceStates[item.sourceId]!.lastSuccessAt!);
  assert.equal(canRestore(item, 'news', publishedAt - 1), false);
  assert.equal(canRestore(item, 'news', publishedAt + 8 * DAY), true);
  assert.equal(canRestore(item, 'news', Number.NaN), false);
  assert.equal(isSourceFresh(item.sourceId, lastSuccessAt + SELECTION_RULES.sourceFreshnessMs), true);
  assert.equal(isSourceFresh(item.sourceId, lastSuccessAt + SELECTION_RULES.sourceFreshnessMs + 1), false);
  assert.equal(canRestore(item, 'surprise', Math.max(publishedAt, lastSuccessAt) + SELECTION_RULES.sourceFreshnessMs + 1), true);
  assert.equal(selectNext({ items: [item], mode: 'news', now: publishedAt + 8 * DAY }).item?.id, item.id);
});

test('twenty-year-old multilingual news restores in News and Surprise but disabled sources do not', () => {
  const source: ContentSource = { id: 'archive-news', name: 'Archived newsroom', kind: 'rss', url: 'https://example.org/', displayPolicy: 'headline-only', enabled: true, language: 'es' };
  const item: WanderItem = { id: 'old-news', kind: 'news', title: 'Una noticia del pasado', url: 'https://example.org/2000/story/', sourceId: source.id, language: 'es', publishedAt: '2000-01-01T00:00:00Z' };
  const bundle = { schemaVersion: 1 as const, items: [item], sources: [source], years: [], generatedAt: SNAPSHOT_DATE, sourceStates: { [source.id]: { status: 'error' as const, lastSuccessAt: '2000-01-02T00:00:00Z' } } };
  for (const mode of ['demo', 'live']) {
    const runtime = createContentRuntime(mode, SNAPSHOT_DATE, () => SNAPSHOT_TIME);
    const repository = createContentRepository(bundle, runtime);
    assert.equal(repository.isSourceFresh(source.id), false);
    assert.equal(repository.canRestore(item, 'news'), true);
    assert.equal(repository.canRestore(item, 'surprise'), true);
    assert.equal(repository.canRestore(item, 'time'), false);
    assert.equal(repository.canRestore({ ...item, publishedAt: '2099-01-01T00:00:00Z' }, 'news'), false);
    const disabled = createContentRepository({ ...bundle, sources: [{ ...source, enabled: false }] }, runtime);
    assert.equal(disabled.canRestore(item, 'news'), false);
    assert.equal(disabled.canRestore(item, 'surprise'), false);
  }
});
