import { createHash } from 'node:crypto';
import Parser from 'rss-parser';
import { decodeHTML } from 'entities';
import {
  newsSnapshotSchema,
  wanderItemSchema,
  type ContentSource,
  type NewsSnapshot,
  type WanderItem,
} from '../../src/domain/item-schema.ts';

const MAX_FEED_BYTES = 2 * 1024 * 1024;
const MAX_ITEMS_PER_SOURCE = 15;
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const GLOBAL_VOICES_LICENSE = 'https://creativecommons.org/licenses/by/3.0/';

type RawItem = {
  id?: string;
  author?: string;
  rawPublished?: string;
  rawPubDate?: string;
  rawDcDate?: string;
};
type NewsItem = Extract<WanderItem, { kind: 'news' }>;

/** A display string only: never render feed material through innerHTML. */
export function plainText(value: unknown, maxLength = 1000): string {
  if (typeof value !== 'string') return '';
  return decodeHTML(value)
    .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

/** Strip known tracking parameters; preserve article-identifying query values. */
export function canonicalHttpUrl(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  try {
    const url = new URL(value.trim());
    if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) return undefined;
    url.hash = '';
    for (const name of [...url.searchParams.keys()]) {
      if (/^utm_/i.test(name) || /^(fbclid|gclid|mc_cid|mc_eid)$/i.test(name)) {
        url.searchParams.delete(name);
      }
    }
    url.searchParams.sort();
    return url.href;
  } catch {
    return undefined;
  }
}

function reliablePublishedAt(raw: unknown, now: number): string | undefined {
  if (typeof raw !== 'string') return undefined;
  const value = raw.trim();
  // An update time is not a publication time. Dates without a timezone are ambiguous.
  if (!/(?:Z|[+-]\d{2}:?\d{2}|GMT|UTC)\s*$/i.test(value)) return undefined;
  const isoCalendar = value.match(/^(\d{4})-(\d{2})-(\d{2})T/);
  const rfcCalendar = value.match(/(?:^|\s)(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})\s/);
  if (isoCalendar || rfcCalendar) {
    const year = Number(isoCalendar?.[1] ?? rfcCalendar![3]);
    const month = isoCalendar ? Number(isoCalendar[2]) - 1 : ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'].indexOf(rfcCalendar![2].toLowerCase());
    const day = Number(isoCalendar?.[3] ?? rfcCalendar![1]);
    const calendar = new Date(Date.UTC(year, month, day));
    if (calendar.getUTCFullYear() !== year || calendar.getUTCMonth() !== month || calendar.getUTCDate() !== day) return undefined;
  } else {
    return undefined;
  }
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed) || parsed > now || now - parsed > MAX_AGE_MS) return undefined;
  return new Date(parsed).toISOString();
}

export async function parseRss(xml: string, source: ContentSource, now = new Date()): Promise<NewsItem[]> {
  if (Buffer.byteLength(xml) > MAX_FEED_BYTES) throw new Error('Feed exceeds the 2 MiB limit');
  const documentMarkup = xml.replace(/<!\[CDATA\[[\s\S]*?\]\]>/g, '').replace(/<!--[\s\S]*?-->/g, '');
  if (/<!DOCTYPE|<!ENTITY/i.test(documentMarkup)) throw new Error('XML document declarations are not supported');
  const parser = new Parser<Record<string, never>, RawItem>({
    customFields: {
      item: [['published', 'rawPublished'], ['pubDate', 'rawPubDate'], ['dc:date', 'rawDcDate']],
    },
  });
  const feed = await parser.parseString(xml);
  if (!plainText(feed.title) || !Array.isArray(feed.items)) throw new Error('Feed is missing its title or item list');
  const items: NewsItem[] = [];
  const seenUrls = new Set<string>();
  const seenIds = new Set<string>();
  for (const raw of feed.items) {
    const url = canonicalHttpUrl(raw.link);
    const title = plainText(raw.title);
    const publishedAt = reliablePublishedAt(raw.rawPublished ?? raw.rawPubDate ?? raw.rawDcDate, now.getTime());
    if (!url || !title || !publishedAt) continue;
    const author = plainText(raw.creator ?? raw.author, 250);
    // Global Voices' verified republication policy requires a named author.
    if (source.id === 'global-voices' && !author) continue;
    const identity = raw.guid?.trim() || raw.id?.trim() || url;
    const id = `news-${source.id}-${createHash('sha256').update(identity).digest('hex').slice(0, 20)}`;
    if (seenUrls.has(url) || seenIds.has(id)) continue;
    const parsed = wanderItemSchema.safeParse({
      id,
      kind: 'news',
      title: source.displayPolicy === 'link-only' ? `${source.name} · 原文链接` : title,
      url,
      sourceId: source.id,
      publishedAt,
      enabled: true,
      ...(source.language ? { language: source.language } : {}),
      ...(author ? { author } : {}),
      ...(source.id === 'global-voices' ? { licenseUrl: GLOBAL_VOICES_LICENSE } : {}),
      ...(source.displayPolicy === 'summary-allowed'
        ? { blurb: plainText(raw.contentSnippet ?? raw.summary ?? raw.content, 280) }
        : {}),
    });
    if (!parsed.success || parsed.data.kind !== 'news') continue;
    items.push(parsed.data);
    seenUrls.add(url);
    seenIds.add(id);
  }
  return items.sort((a, b) => Date.parse(b.publishedAt!) - Date.parse(a.publishedAt!)).slice(0, MAX_ITEMS_PER_SOURCE);
}

async function fetchOnce(feedUrl: string): Promise<string> {
  const original = new URL(feedUrl);
  let currentUrl = original.href;
  const signal = AbortSignal.timeout(12_000);
  for (let redirects = 0; redirects <= 3; redirects += 1) {
    const response = await fetch(currentUrl, {
      signal,
      redirect: 'manual',
      headers: { Accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml', 'User-Agent': 'InternetWanderer/0.1 (RSS reader)' },
    });
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location');
      await response.body?.cancel();
      if (!location) throw new Error('Feed redirect has no location');
      const redirected = new URL(location, currentUrl);
      if (redirected.origin !== original.origin) throw new Error('Feed redirected outside the configured origin; review its configuration');
      currentUrl = redirected.href;
      continue;
    }
    if (!response.ok) {
      await response.body?.cancel();
      throw new Error(`Feed returned HTTP ${response.status}`);
    }
    if (!response.body) throw new Error('Feed has no response body');
    if (Number(response.headers.get('content-length')) > MAX_FEED_BYTES) {
      await response.body.cancel();
      throw new Error('Feed exceeds the 2 MiB limit');
    }
    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let totalBytes = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytes += value.byteLength;
      if (totalBytes > MAX_FEED_BYTES) {
        await reader.cancel();
        throw new Error('Feed exceeds the 2 MiB limit');
      }
      chunks.push(value);
    }
    return Buffer.concat(chunks).toString('utf8');
  }
  throw new Error('Feed exceeded the redirect limit');
}

/** Whitelisted callers supply configured feed URLs; one bounded retry only. */
export async function fetchRssFeed(feedUrl: string): Promise<string> {
  const safeUrl = canonicalHttpUrl(feedUrl);
  if (!safeUrl) throw new Error('Feed URL must use HTTP(S)');
  try {
    return await fetchOnce(safeUrl);
  } catch {
    await new Promise((resolve) => setTimeout(resolve, 500));
    return fetchOnce(safeUrl);
  }
}

export async function refreshNewsSnapshot(
  sources: ContentSource[],
  previous: NewsSnapshot,
  options: { now?: Date; fetchFeed?: (url: string) => Promise<string> } = {},
): Promise<NewsSnapshot> {
  const now = options.now ?? new Date();
  const timestamp = now.toISOString();
  const fetchFeed = options.fetchFeed ?? fetchRssFeed;
  const enabledSources = sources.filter((source) => source.kind === 'rss' && source.enabled && source.feedUrl);
  const batches = await Promise.all(enabledSources.map(async (source) => {
    try {
      const xml = await fetchFeed(source.feedUrl!);
      const items = await parseRss(xml, source, now);
      return {
        sourceId: source.id,
        items,
        state: {
          lastAttemptAt: timestamp,
          lastSuccessAt: timestamp,
          status: items.length ? 'ok' as const : 'empty' as const,
          ...(items.length ? {} : { message: '采集成功，暂无带可靠发表时间的近 7 天内容。' }),
        },
      };
    } catch (error) {
      return {
        sourceId: source.id,
        items: previous.items.filter((item) => item.sourceId === source.id),
        state: {
          ...(previous.sourceStates[source.id]?.lastSuccessAt
            ? { lastSuccessAt: previous.sourceStates[source.id].lastSuccessAt }
            : {}),
          lastAttemptAt: timestamp,
          status: 'error' as const,
          message: error instanceof Error ? plainText(error.message, 240) : 'RSS refresh failed',
        },
      };
    }
  }));
  const seenUrls = new Set<string>();
  const items = batches.flatMap((batch) => batch.items).filter((item) => {
    const key = canonicalHttpUrl(item.url);
    if (!key || seenUrls.has(key)) return false;
    seenUrls.add(key);
    return true;
  });
  return newsSnapshotSchema.parse({
    schemaVersion: 1,
    items,
    generatedAt: timestamp,
    sourceStates: Object.fromEntries(batches.map((batch) => [batch.sourceId, batch.state])),
  });
}
