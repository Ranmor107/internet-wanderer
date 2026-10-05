import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { makeBookmark, mergeBookmarks, type Bookmark } from '../domain/bookmarks';
import type { ContentSource, WanderItem } from '../domain/item-schema';
import { BOOKMARK_STORAGE_KEY, readBookmarks, writeBookmarks, type BookmarkReadResult } from '../storage/bookmarks';

interface OperationResult { ok: boolean; persisted: boolean; message: string }
interface BookmarkActions extends BookmarkReadResult {
  feedback: string;
  toggle: (item: WanderItem, source?: ContentSource) => OperationResult;
  remove: (id: string) => OperationResult;
  importBookmarks: (incoming: Bookmark[]) => OperationResult;
}
const Context = createContext<BookmarkActions | null>(null);

export function BookmarksProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState(readBookmarks);
  const latest = useRef(state);
  const [feedback, setFeedback] = useState('');
  useEffect(() => {
    if (!feedback) return;
    const timer = window.setTimeout(() => setFeedback(''), 5000);
    return () => window.clearTimeout(timer);
  }, [feedback]);

  // Reads never trigger writes. In particular, a corrupt existing file is kept
  // untouched while this session can still collect and export new discoveries.
  const commit = useCallback((bookmarks: Bookmark[], message: string): OperationResult => {
    const corrupt = latest.current.storageStatus === 'corrupt';
    const persisted = !corrupt && writeBookmarks(bookmarks);
    const next: BookmarkReadResult = {
      bookmarks,
      storageStatus: corrupt ? 'corrupt' : persisted ? 'ready' : 'unavailable',
    };
    latest.current = next;
    setState(next);
    const result = { ok: true, persisted, message: persisted ? message : `${message}。仅暂存本次页面，请及时导出。` };
    setFeedback(result.message);
    return result;
  }, []);
  const failure = useCallback((error: unknown): OperationResult => {
    const message = error instanceof Error ? error.message : '无法保存收藏，请稍后再试。';
    setFeedback(message);
    return { ok: false, persisted: false, message };
  }, []);
  const remove = useCallback((id: string) => commit(latest.current.bookmarks.filter((bookmark) => bookmark.id !== id), '已移除收藏'), [commit]);
  const toggle = useCallback((item: WanderItem, source?: ContentSource) => {
    if (latest.current.bookmarks.some((bookmark) => bookmark.id === item.id)) return remove(item.id);
    try {
      const result = mergeBookmarks(latest.current.bookmarks, [makeBookmark(item, source)]);
      return commit(result.bookmarks, '已收藏');
    } catch (error) { return failure(error); }
  }, [commit, remove, failure]);
  const importBookmarks = useCallback((incoming: Bookmark[]) => {
    try {
      const result = mergeBookmarks(latest.current.bookmarks, incoming);
      if (!result.added) return { ok: true, persisted: latest.current.storageStatus === 'ready', message: '这些内容已经收藏，无需重复导入。' };
      return commit(result.bookmarks, `已导入 ${result.added} 条收藏`);
    } catch (error) { return failure(error); }
  }, [commit, failure]);

  useEffect(() => {
    const sync = (event: StorageEvent) => {
      if (event.key !== BOOKMARK_STORAGE_KEY && event.key !== null) return;
      // Never discard unsaved in-memory changes because a second tab wrote.
      if (latest.current.storageStatus !== 'ready') return;
      const next = readBookmarks();
      if (next.storageStatus === 'ready') {
        latest.current = next;
        setState(next);
      } else {
        const preserved = { ...latest.current, storageStatus: next.storageStatus };
        latest.current = preserved;
        setState(preserved);
      }
    };
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, []);

  return <Context.Provider value={{ ...state, feedback, toggle, remove, importBookmarks }}>{children}</Context.Provider>;
}

export function useBookmarks() {
  const context = useContext(Context);
  if (!context) throw new Error('BookmarksProvider is required');
  return context;
}
