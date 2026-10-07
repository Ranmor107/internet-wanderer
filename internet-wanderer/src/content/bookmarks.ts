import type { Bookmark } from '../domain/bookmarks';
import type { ContentSource, WanderItem } from '../domain/item-schema';
import { SELECTION_RULES } from '../domain/modes';

/** Saved copies are a personal reading list; they never extend the wander pool. */
export function resolveBookmark(
  bookmark: Bookmark,
  catalog: ReadonlyMap<string, WanderItem>,
  sources: ReadonlyMap<string, ContentSource>,
  now = Date.now(),
) {
  const current = catalog.get(bookmark.id);
  const item = current ?? bookmark.item;
  const source = sources.get(item.sourceId) ?? bookmark.source;
  const withdrawn = item.enabled === false || sources.get(item.sourceId)?.enabled === false;
  return {
    item,
    source,
    status: withdrawn ? 'withdrawn' as const : current ? 'current' as const : 'snapshot' as const,
    oldNews: item.kind === 'news' && now - Date.parse(item.publishedAt) > SELECTION_RULES.newsRecentAgeMs,
  };
}
