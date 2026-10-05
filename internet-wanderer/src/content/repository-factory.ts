import type { WanderItem } from '../domain/item-schema';
import { SELECTION_RULES, type Mode } from '../domain/modes';
import { contentBundleSchema, type ContentBundle } from './provider';
import type { ContentRuntime } from './clock';
export { domainName, formatDate, languageName } from './format';

/** Data indexing and availability apply identically to every provider. */
export function createContentRepository(input: ContentBundle, runtime: ContentRuntime) {
  const bundle = contentBundleSchema.parse(input);
  const sources = bundle.sources;
  const sourceById = new Map(sources.map(source => [source.id, source]));
  const catalogItems = bundle.items;
  const catalogItemById = new Map(catalogItems.map(item => [item.id, item]));
  const allItems = catalogItems.filter(item => item.enabled !== false && sourceById.get(item.sourceId)?.enabled === true);
  const itemById = new Map(allItems.map(item => [item.id, item]));
  const years = bundle.years.filter(year => allItems.some(item => item.history?.year === year.year));
  const newsSnapshot = { schemaVersion: 1 as const, items: catalogItems.filter(item => item.kind === 'news'), generatedAt: bundle.generatedAt, sourceStates: bundle.sourceStates };
  function isSourceFresh(sourceId: string, now = runtime.now()): boolean {
    const success = bundle.sourceStates[sourceId]?.lastSuccessAt;
    const age = success ? now - Date.parse(success) : Infinity;
    return age >= 0 && age <= SELECTION_RULES.sourceFreshnessMs;
  }
  function canRestore(item: WanderItem | undefined, mode: Mode, now = runtime.now()): item is WanderItem {
    if (!item || !itemById.has(item.id) || item.enabled === false) return false;
    if (mode === 'news' && item.kind !== 'news') return false;
    if (mode === 'elsewhere' && (item.kind !== 'website' || item.history)) return false;
    if (mode === 'time' && !item.history) return false;
    if (item.kind !== 'news') return true;
    const age = now - Date.parse(item.publishedAt);
    if (age < 0 || age > SELECTION_RULES.newsMaxAgeMs) return false;
    return mode !== 'surprise' || isSourceFresh(item.sourceId, now);
  }
  return { sources, sourceById, catalogItems, catalogItemById, allItems, itemById, years, newsSnapshot,
    websiteCount: allItems.filter(item => item.kind === 'website' && !item.history).length, canRestore, isSourceFresh };
}
export type ContentRepository = ReturnType<typeof createContentRepository>;
