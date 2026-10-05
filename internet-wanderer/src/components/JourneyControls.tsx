import { ArrowUpRight, Bookmark, BookmarkCheck, RotateCcw, Shuffle } from 'lucide-react';
import { useBookmarks } from '../app/bookmarks-context';
import { useContent } from '../app/content-context';
import type { WanderItem } from '../domain/item-schema';

export default function JourneyControls({ item, next, previous, previousDisabled, time = false }: {
  item: WanderItem; next: () => void; previous: () => void; previousDisabled: boolean; time?: boolean;
}) {
  const { bookmarks, toggle } = useBookmarks();
  const { repository: { sourceById } } = useContent();
  const saved = bookmarks.some(bookmark => bookmark.id === item.id);
  return <nav className="journey-controls" aria-label="漫游操作" data-testid="journey-controls">
    <button className="journey-previous" onClick={previous} disabled={previousDisabled} aria-label="上一站"><RotateCcw size={17} /><span>上一站</span></button>
    <button className="next-button" onClick={next}>{time ? <RotateCcw size={18} /> : <Shuffle size={18} />}<span>{time ? '再逛这个年份' : '下一站'}</span><ArrowUpRight size={18} /></button>
    <button className="journey-save" aria-label={saved ? '取消收藏当前站' : '收藏当前站'} aria-pressed={saved} onClick={() => toggle(item, sourceById.get(item.sourceId))}>{saved ? <BookmarkCheck size={18} /> : <Bookmark size={18} />}<span>{saved ? '已收藏' : '收藏'}</span></button>
  </nav>;
}
