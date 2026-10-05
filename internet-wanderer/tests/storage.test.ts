import test from 'node:test';
import assert from 'node:assert/strict';
import { emptyJourney, readJourney, recordEncounters, writeJourney } from '../src/storage/recent';

test('broken or inaccessible local storage leaves the journey usable', () => {
  assert.deepEqual(readJourney({ getItem: () => '{broken' }), emptyJourney());
  assert.deepEqual(readJourney({ getItem: () => { throw new Error('blocked'); } }), emptyJourney());
  assert.equal(writeJourney(emptyJourney(), { setItem: () => { throw new Error('quota'); } }), false);
});

test('recent encounters are unique, bounded and ordered with the newest last', () => {
  const entries = Array.from({ length: 24 }, (_, n) => ({ id: `site-${n}`, mode: 'elsewhere' as const, encounteredAt: '2026-10-02T10:00:00Z' }));
  let journey = recordEncounters(emptyJourney(), entries);
  assert.equal(journey.entries.length, 20);
  assert.equal(journey.entries[0].id, 'site-4');
  journey = recordEncounters(journey, [entries[6]], { currentId: 'site-6' });
  assert.equal(journey.entries.length, 20);
  assert.equal(journey.entries.at(-1)?.id, 'site-6');
  assert.equal(journey.currentId, 'site-6');
});

test('malformed individual entries do not discard the rest of the history', () => {
  const data = { version: 1, entries: [null, { id: 'ok', mode: 'time', year: 2007, encounteredAt: '2026-10-02T10:00:00Z' }, { id: 'bad', mode: 'unknown' }] };
  assert.equal(readJourney({ getItem: () => JSON.stringify(data) }).entries.length, 1);
});

test('restored duplicate encounters keep the last occurrence in chronological position', () => {
  const entries = ['a', 'b', 'a'].map((id) => ({ id, mode: 'elsewhere', encounteredAt: '2026-10-02T10:00:00Z' }));
  const journey = readJourney({ getItem: () => JSON.stringify({ version: 1, entries }) });
  assert.deepEqual(journey.entries.map((entry) => entry.id), ['b', 'a']);
});

test('route presentation trails preserve complete year packs and ignore consecutive double records', async () => {
  const { appendVisit, readJourney } = await import('../src/storage/recent');
  const first = { mode: 'time' as const, year: 1999, ids: ['event', 'place', 'archive'] };
  const next = { mode: 'time' as const, year: 1999, ids: ['event2', 'place2', 'archive2'] };
  const visits = appendVisit(appendVisit([], first), first);
  assert.equal(visits.length, 1);
  assert.deepEqual(appendVisit(visits, next)[0], first);
  const restored = readJourney({ getItem: () => JSON.stringify({ version: 1, entries: [], trail: [first, { mode: 'invalid', ids: ['bad'] }, { mode: 'time', ids: ['1', '2', '3', '4'] }] }) });
  assert.deepEqual(restored.trail, [first]);
});
