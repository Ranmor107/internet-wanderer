import assert from 'node:assert/strict';
import test from 'node:test';
import { createContentRuntime, contentRuntime } from '../src/content/runtime';
import { canRestore, isSourceFresh, newsSnapshot } from '../src/content/repository';
import { selectNext } from '../src/domain/select-next';
import { SELECTION_RULES } from '../src/domain/modes';

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
  assert.equal(isSourceFresh(selected.item.sourceId), true);
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

test('explicit clocks preserve the seven-day and 48-hour limits in Demo and Live', () => {
  const item = newsSnapshot.items[0]!;
  assert.equal(item.kind, 'news');
  const publishedAt = Date.parse(item.publishedAt!);
  const lastSuccessAt = Date.parse(newsSnapshot.sourceStates[item.sourceId]!.lastSuccessAt!);
  assert.equal(canRestore(item, 'news', publishedAt - 1), false);
  assert.equal(canRestore(item, 'news', publishedAt + SELECTION_RULES.newsMaxAgeMs), true);
  assert.equal(canRestore(item, 'news', publishedAt + SELECTION_RULES.newsMaxAgeMs + 1), false);
  assert.equal(isSourceFresh(item.sourceId, lastSuccessAt + SELECTION_RULES.sourceFreshnessMs), true);
  assert.equal(isSourceFresh(item.sourceId, lastSuccessAt + SELECTION_RULES.sourceFreshnessMs + 1), false);
  assert.equal(canRestore(item, 'surprise', lastSuccessAt + SELECTION_RULES.sourceFreshnessMs + 1), false);
  assert.equal(selectNext({ items: [item], mode: 'news', now: publishedAt + 8 * DAY }).item, null);
});
