import assert from 'node:assert/strict';
import test from 'node:test';
import { bundledContent } from '../src/content/providers/bundled';
import { createContentRepository } from '../src/content/repository-factory';
import { createContentRuntime } from '../src/content/clock';
import { selectYearPack } from '../src/domain/select-next';

const repository = createContentRepository(bundledContent, createContentRuntime('demo', bundledContent.generatedAt));

for (const { year } of bundledContent.years) {
  test(`${year} is reachable with an event, a place and an exact archive`, () => {
    assert.ok(repository.years.some((entry) => entry.year === year));
    const pack = selectYearPack({ items: repository.allItems, mode: 'time', year, rng: () => 0 });
    assert.deepEqual(pack.map((item) => item.history?.role), ['event', 'place', 'archive']);
    for (const item of pack) {
      assert.equal(repository.canRestore(item, 'time'), true);
      assert.equal(repository.canRestore(item, 'elsewhere'), false);
      assert.ok(item.evidenceUrls?.length, `${item.id}: missing evidence`);
      if (item.kind === 'archive') {
        assert.equal(new Date(item.archive.capturedAt).getUTCFullYear(), year);
        const replay = item.url.match(/^https:\/\/web\.archive\.org\/web\/(\d{14})\/(.+)$/)!;
        assert.equal(replay[1], new Date(item.archive.capturedAt).toISOString().replace(/\D/g, '').slice(0, 14));
        assert.equal(new URL(replay[2]).href, new URL(item.archive.originalUrl).href);
      }
    }
  });
}

for (const year of [1996, 2001, 2004, 2016]) {
  test(`${year} offers two complete, distinct packs before repeating`, () => {
    const first = selectYearPack({ items: repository.allItems, mode: 'time', year, rng: () => 0 });
    const second = selectYearPack({ items: repository.allItems, mode: 'time', year, recentIds: first.map((item) => item.id), rng: () => 0 });
    assert.deepEqual(second.map((item) => item.history?.role), ['event', 'place', 'archive']);
    assert.equal(new Set([...first, ...second].map((item) => item.id)).size, 6);
  });
}
