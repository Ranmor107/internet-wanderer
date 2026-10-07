import assert from 'node:assert/strict';
import test from 'node:test';
import { createStaticProvider, contentBundleSchema } from '../src/content/provider';
import { createContentRepository } from '../src/content/repository-factory';
import { createContentRuntime } from '../src/content/clock';
import { createEraRegistry, eraRegistry } from '../src/ui/era-registry';
import { getExperienceTheme } from '../src/ui/themes';
import { selectNext } from '../src/domain/select-next';

const now = '2026-10-02T12:00:00Z';
const source = { id: 'personal', name: 'One small site', kind: 'curated', url: 'https://example.org/', displayPolicy: 'link-only', enabled: true };
const site = { id: 'site', kind: 'website', title: 'One small world', url: 'https://example.org/', sourceId: 'personal' };
const bundle = () => ({ schemaVersion: 1, items: [site], sources: [source], years: [], generatedAt: now, sourceStates: {} });

test('static providers expose the normalized bundle without requests and honor cancellation', async () => {
  const provider = createStaticProvider('fixture', bundle());
  assert.equal(provider.initial?.items[0]?.id, 'site');
  const loaded = await provider.load();
  const repository = createContentRepository(loaded, createContentRuntime('demo', loaded.generatedAt));
  assert.equal(repository.canRestore(repository.itemById.get('site'), 'elsewhere'), true);
  const abort = new AbortController(); abort.abort();
  await assert.rejects(provider.load(abort.signal), { name: 'AbortError' });
});

test('every adapter boundary rejects duplicate IDs, missing sources and invalid years', () => {
  assert.equal(contentBundleSchema.safeParse({ ...bundle(), items: [site, site] }).success, false);
  assert.equal(contentBundleSchema.safeParse({ ...bundle(), sources: [] }).success, false);
  assert.equal(contentBundleSchema.safeParse({ ...bundle(), items: [{ ...site, history: { year: 2003 } }] }).success, false);
  assert.equal(contentBundleSchema.safeParse({ ...bundle(), sources: [source, source] }).success, false);
  assert.equal(contentBundleSchema.safeParse({ ...bundle(), sourceStates: { unknown: { status: 'empty' } } }).success, false);
});

test('replacing the provider applies its own sources, clock and enabled flags', async () => {
  const loaded = await createStaticProvider('replacement', { ...bundle(),
    items: [{ ...site, enabled: false }, { ...site, id: 'news', kind: 'news', publishedAt: now }],
    sourceStates: { personal: { status: 'ok', lastSuccessAt: now } },
  }).load();
  const demo = createContentRepository(loaded, createContentRuntime('demo', now));
  assert.equal(demo.catalogItemById.has('site'), true);
  assert.equal(demo.itemById.has('site'), false);
  assert.equal(demo.canRestore(demo.itemById.get('news'), 'news'), true);
  assert.equal(demo.canRestore(demo.itemById.get('news'), 'elsewhere'), false);
  const live = createContentRepository(loaded, createContentRuntime('live', now, () => Date.parse(now) + 8 * 86400000));
  assert.equal(live.canRestore(live.itemById.get('news'), 'news'), true);
  const disabled = createContentRepository({ ...loaded, sources: [{ ...loaded.sources[0]!, enabled: false }] }, createContentRuntime('demo', now));
  assert.equal(disabled.allItems.length, 0);
});

test('a new year selects an existing skin with configuration alone', () => {
  const years = [{ year: 2003, title: 'A new window', description: 'A small sample', theme: 'classic' }];
  const registry = createEraRegistry(eraRegistry.eras, years);
  assert.equal(registry.forYear(2003)?.skin, 'bevel');
  const theme = getExperienceTheme('time', 2003, years);
  assert.equal(theme.era, '2003');
  assert.equal(theme.skin, 'bevel');
  assert.equal(theme.motion, 'snap');
  assert.equal(getExperienceTheme('elsewhere', 2003, years).era, 'modern');
  assert.throws(() => createEraRegistry(eraRegistry.eras, [{ ...years[0], theme: 'missing' }]), /unregistered/);
  assert.throws(() => createEraRegistry([eraRegistry.eras[0], eraRegistry.eras[0]], years), /Duplicate/);
});

test('historical websites belong to Time Machine rather than Elsewhere', () => {
  const old = { ...site, id: 'old', history: { year: 2003 } };
  const loaded = contentBundleSchema.parse({ ...bundle(), items: [site, old], years: [{ year: 2003, title: 'Past', description: 'Past', theme: 'classic' }] });
  const repository = createContentRepository(loaded, createContentRuntime('demo', now));
  assert.equal(repository.canRestore(repository.itemById.get('old'), 'elsewhere'), false);
  assert.equal(selectNext({ items: loaded.items, mode: 'elsewhere', rng: () => .99 }).item?.id, 'site');
  assert.equal(selectNext({ items: loaded.items, mode: 'time', year: 2003 }).item?.id, 'old');
});
