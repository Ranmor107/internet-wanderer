import { z } from 'zod';
import { isoDateTimeSchema, wanderItemSchema, type WanderItem } from './item-schema';

export const MAX_BOOKMARKS = 500;
export const MAX_IMPORT_BYTES = 1024 * 1024;

const identifierSchema = z.string().min(1).max(512).refine((value) => value.trim() === value, 'ID 不能包含首尾空白');
const safeUrlSchema = z.string().refine((value) => {
  if (value.length > 4096 || !/^https?:\/\//i.test(value) || /[\u0000-\u0020\u007f]/.test(value)) return false;
  try {
    const url = new URL(value);
    return !url.username && !url.password && !value.split('/')[2]?.includes('@');
  } catch { return false; }
}, '链接必须是无账号密码的 HTTP(S) 地址，且不超过 4096 个字符');
const boundedIsoSchema = isoDateTimeSchema.refine((value) => value.length <= 64, '时间字段最长允许 64 个字符');

export const bookmarkSourceSchema = z.object({
  id: identifierSchema,
  name: z.string().min(1).max(500).refine((value) => !!value.trim(), '来源名称不能为空'),
  url: safeUrlSchema,
  publisherCountry: z.string().max(200).optional(),
  publisherType: z.enum(['media', 'institution']).optional(),
  termsUrl: safeUrlSchema.optional(),
});

export type BookmarkSource = z.infer<typeof bookmarkSourceSchema>;

// Reuse the content contract and strip unknown fields, while retaining original
// titles and links (the shared schema normalizes URLs). Validate those original
// links below so normalization cannot hide embedded control characters.
const bookmarkItemSchema = z.unknown().transform((input, ctx): WanderItem => {
  let result: ReturnType<typeof wanderItemSchema.safeParse>;
  try { result = wanderItemSchema.safeParse(input); }
  catch {
    ctx.addIssue({ code: 'custom', message: '内容包含格式不正确的链接' });
    return z.NEVER;
  }
  if (!result.success) {
    for (const issue of result.error.issues) ctx.addIssue({ code: 'custom', path: issue.path, message: issue.message });
    return z.NEVER;
  }
  const original = input as WanderItem;
  if (original.id !== result.data.id || original.sourceId !== result.data.sourceId) {
    ctx.addIssue({ code: 'custom', message: '内容 ID 和来源 ID 不能包含首尾空白' });
    return z.NEVER;
  }
  return {
    ...result.data,
    title: original.title,
    url: original.url,
    ...(original.licenseUrl !== undefined ? { licenseUrl: original.licenseUrl } : {}),
    ...(original.evidenceUrls !== undefined ? { evidenceUrls: [...original.evidenceUrls] } : {}),
    ...(original.archive !== undefined ? { archive: { ...result.data.archive!, originalUrl: original.archive.originalUrl } } : {}),
  };
}).superRefine((item, ctx) => {
  const boundedStrings: Array<[string, string | undefined, number]> = [
    ['id', item.id, 512], ['sourceId', item.sourceId, 512], ['title', item.title, 2000],
    ['author', item.author, 1000], ['blurb', item.blurb, 8000], ['language', item.language, 64],
    ['publishedAt', item.publishedAt, 64],
  ];
  for (const [field, value, max] of boundedStrings) {
    if (value !== undefined && value.length > max) ctx.addIssue({ code: 'custom', path: [field], message: `最多允许 ${max} 个字符` });
  }
  const urls: Array<[Array<string | number>, string | undefined]> = [
    [['url'], item.url], [['licenseUrl'], item.licenseUrl], [['archive', 'originalUrl'], item.archive?.originalUrl],
    ...(item.evidenceUrls ?? []).map((url, index): [Array<string | number>, string] => [['evidenceUrls', index], url]),
  ];
  for (const [path, value] of urls) {
    if (value !== undefined && !safeUrlSchema.safeParse(value).success) {
      ctx.addIssue({ code: 'custom', path, message: '只允许无账号密码的 HTTP(S) 链接，最长 4096 个字符' });
    }
  }
  if (item.tags && (item.tags.length > 30 || item.tags.some((tag) => tag.length > 100))) {
    ctx.addIssue({ code: 'custom', path: ['tags'], message: '最多允许 30 个标签，每个最长 100 个字符' });
  }
  if (item.evidenceUrls && item.evidenceUrls.length > 30) {
    ctx.addIssue({ code: 'custom', path: ['evidenceUrls'], message: '最多允许 30 个参考链接' });
  }
  if (item.archive && item.archive.capturedAt.length > 64) ctx.addIssue({ code: 'custom', path: ['archive', 'capturedAt'], message: '时间字段最长允许 64 个字符' });
  const host = new URL(item.url).hostname.toLowerCase();
  const isGlobalVoices = item.sourceId === 'global-voices' || host === 'globalvoices.org' || host.endsWith('.globalvoices.org');
  if (isGlobalVoices && (!item.author?.trim() || !item.licenseUrl)) {
    ctx.addIssue({ code: 'custom', message: 'Global Voices 收藏必须保留作者和许可链接' });
  }
});

export const bookmarkSchema = z.object({
  id: identifierSchema,
  savedAt: boundedIsoSchema,
  item: bookmarkItemSchema,
  source: bookmarkSourceSchema.optional(),
}).superRefine((bookmark, ctx) => {
  if (bookmark.id !== bookmark.item.id) ctx.addIssue({ code: 'custom', path: ['id'], message: '收藏 ID 必须与内容 ID 一致' });
  if (bookmark.source && bookmark.source.id !== bookmark.item.sourceId) {
    ctx.addIssue({ code: 'custom', path: ['source', 'id'], message: '来源快照 ID 必须与内容来源一致' });
  }
});

export type Bookmark = z.infer<typeof bookmarkSchema>;

export const bookmarkFileSchema = z.object({
  app: z.literal('internet-wanderer'),
  schemaVersion: z.literal(1),
  exportedAt: boundedIsoSchema,
  bookmarks: z.array(bookmarkSchema).max(MAX_BOOKMARKS, `最多允许 ${MAX_BOOKMARKS} 条收藏，请先减少数量`),
});

export type BookmarkFile = z.infer<typeof bookmarkFileSchema>;
type Clock = Date | number | string;

function isoNow(now?: Clock): string {
  const date = now === undefined ? new Date() : new Date(now);
  if (!Number.isFinite(date.getTime())) throw new Error('收藏时间无效，请检查设备时间。');
  return date.toISOString();
}

function assertByteLimit(text: string) {
  if (new TextEncoder().encode(text).byteLength > MAX_IMPORT_BYTES) {
    throw new Error('收藏文件超过 1 MiB，请减少收藏数量或缩短内容后重试。');
  }
}

function formatValidationError(error: z.ZodError): Error {
  const issue = error.issues[0];
  const field = issue?.path.length ? `（${issue.path.join('.')}）` : '';
  return new Error(`收藏数据格式不正确${field}：${issue?.message ?? '请检查文件内容'}`);
}

function validateBookmarks(bookmarks: readonly Bookmark[]): Bookmark[] {
  const parsed = z.array(bookmarkSchema).max(MAX_BOOKMARKS, `最多允许 ${MAX_BOOKMARKS} 条收藏，请先减少数量`).safeParse(bookmarks);
  if (!parsed.success) throw formatValidationError(parsed.error);
  return parsed.data;
}

export function makeBookmark(item: WanderItem, source?: BookmarkSource, now?: Clock): Bookmark {
  const result = bookmarkSchema.safeParse({ id: item.id, savedAt: isoNow(now), item, source });
  if (!result.success) throw formatValidationError(result.error);
  return result.data;
}

export function parseBookmarkFile(text: string): Bookmark[] {
  assertByteLimit(text);
  let value: unknown;
  try { value = JSON.parse(text); }
  catch { throw new Error('文件不是有效的 JSON，请选择 Internet Wanderer 导出的收藏文件。'); }
  const parsed = bookmarkFileSchema.safeParse(value);
  if (!parsed.success) throw formatValidationError(parsed.error);
  return parsed.data.bookmarks;
}

export function serializeBookmarks(bookmarks: readonly Bookmark[], now?: Clock): string {
  const file: BookmarkFile = { app: 'internet-wanderer', schemaVersion: 1, exportedAt: isoNow(now), bookmarks: validateBookmarks(bookmarks) };
  const text = JSON.stringify(file, null, 2);
  assertByteLimit(text);
  return text;
}

export function mergeBookmarks(existing: readonly Bookmark[], incoming: readonly Bookmark[]): { bookmarks: Bookmark[]; added: number; duplicates: number } {
  const local = validateBookmarks(existing);
  const imported = validateBookmarks(incoming);
  const merged = new Map<string, Bookmark>();
  for (const bookmark of local) if (!merged.has(bookmark.id)) merged.set(bookmark.id, bookmark);
  let added = 0;
  let duplicates = 0;
  for (const bookmark of imported) {
    if (merged.has(bookmark.id)) duplicates += 1;
    else { merged.set(bookmark.id, bookmark); added += 1; }
  }
  const bookmarks = [...merged.values()];
  if (bookmarks.length > MAX_BOOKMARKS) throw new Error(`合并后超过 ${MAX_BOOKMARKS} 条收藏，请先移除部分收藏再导入。`);
  // A successful merge must remain exportable and restorable with the same caps.
  serializeBookmarks(bookmarks);
  return { bookmarks, added, duplicates };
}
