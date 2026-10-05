import { createContentRepository } from './repository-factory';
import { bundledContent } from './providers/bundled';
import { contentRuntime } from './runtime';
export { createContentRepository, type ContentRepository } from './repository-factory';
export { domainName, formatDate, languageName } from './format';
// Compatibility exports for scripts/tests; rendered UI uses the provider context.
export const repository = createContentRepository(bundledContent, contentRuntime);
export const { sources, sourceById, catalogItems, catalogItemById, allItems, itemById, years, newsSnapshot, websiteCount, canRestore, isSourceFresh } = repository;
