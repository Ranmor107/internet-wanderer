import sites from '../../../data/sites.json';
import history from '../../../data/history.json';
import snapshot from '../../../data/news.snapshot.json';
import curatedSources from '../../../config/curated-sources.json';
import rssSources from '../../../config/rss-sources.json';
import years from '../../../config/years.json';
import { createStaticProvider } from '../provider';

export const bundledProvider = createStaticProvider('bundled-static', {
  schemaVersion: 1,
  items: [...sites.items, ...history.items, ...snapshot.items],
  sources: [...curatedSources, ...rssSources],
  years,
  generatedAt: snapshot.generatedAt,
  sourceStates: snapshot.sourceStates,
});
export const bundledContent = bundledProvider.initial!;
