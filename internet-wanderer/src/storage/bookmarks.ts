import { parseBookmarkFile, serializeBookmarks, type Bookmark } from '../domain/bookmarks';

export const BOOKMARK_STORAGE_KEY = 'internet-wanderer:bookmarks:v1';
export type BookmarkStorageStatus = 'ready' | 'unavailable' | 'corrupt';
export interface BookmarkReadResult { bookmarks: Bookmark[]; storageStatus: BookmarkStorageStatus }
type StorageReader = Pick<Storage, 'getItem'>;
type StorageWriter = Pick<Storage, 'setItem'>;

export function readBookmarks(storage?: StorageReader): BookmarkReadResult {
  let raw: string | null;
  try { raw = (storage ?? window.localStorage).getItem(BOOKMARK_STORAGE_KEY); }
  catch { return { bookmarks: [], storageStatus: 'unavailable' }; }
  if (raw === null) return { bookmarks: [], storageStatus: 'ready' };
  try { return { bookmarks: parseBookmarkFile(raw), storageStatus: 'ready' }; }
  catch { return { bookmarks: [], storageStatus: 'corrupt' }; }
}

export function writeBookmarks(bookmarks: readonly Bookmark[], storage?: StorageWriter): boolean {
  try {
    const serialized = serializeBookmarks(bookmarks);
    (storage ?? window.localStorage).setItem(BOOKMARK_STORAGE_KEY, serialized);
    return true;
  } catch { return false; }
}
