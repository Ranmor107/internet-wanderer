import type { ContentSource } from '../../src/domain/item-schema.ts';
import { fetchRssFeed, mergeNewsItems, parseRss, type NewsItem } from './rss.ts';

/** Global Voices' date paths query its published archive; root-feed year parameters do not. */
export async function collectArchiveYear(
  source: ContentSource,
  year: number,
  options: { now?: Date; pages?: number; fetchFeed?: (url: string) => Promise<string> } = {},
): Promise<{ items: NewsItem[]; pagesFetched: number }> {
  const now = options.now ?? new Date();
  const pages = options.pages ?? 2;
  if (!Number.isInteger(year) || year < 2004 || year > now.getUTCFullYear()) throw new Error('Archive year must be between 2004 and the current year');
  if (!Number.isInteger(pages) || pages < 1 || pages > 10) throw new Error('Archive pages must be between 1 and 10');
  const base = new URL(source.url);
  if (base.hostname !== 'globalvoices.org' && !base.hostname.endsWith('.globalvoices.org')) throw new Error('Only reviewed Global Voices archive origins are supported');
  if (!source.enabled) return { items: [], pagesFetched: 0 };
  const fetchFeed = options.fetchFeed ?? fetchRssFeed;
  let items: NewsItem[] = [];
  let pagesFetched = 0;
  for (let page = 1; page <= pages; page += 1) {
    const url = new URL('/' + year + '/feed/', base);
    url.searchParams.set('paged', String(page));
    let xml: string;
    try { xml = await fetchFeed(url.href); }
    catch (error) {
      if ((error as { status?: number }).status === 404) break;
      throw error;
    }
    const batch = await parseRss(xml, source, now);
    // Archive paths use the site's calendar; normalized UTC dates may cross New Year.
    const timezoneMargin = 14 * 60 * 60 * 1000;
    if (batch.some(item => {
      const publishedAt = Date.parse(item.publishedAt);
      return publishedAt < Date.UTC(year, 0, 1) - timezoneMargin || publishedAt >= Date.UTC(year + 1, 0, 1) + timezoneMargin;
    })) throw new Error('Archive response contains a different publication year');
    pagesFetched += 1;
    const next = mergeNewsItems(items, batch);
    if (!/<item\b/i.test(xml) || (batch.length > 0 && next.length === items.length)) break;
    items = next;
  }
  return { items, pagesFetched };
}
