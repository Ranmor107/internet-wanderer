import { wanderItemSchema, type NewsSourceState, type WanderItem } from './item-schema';
import { RESOLVED_MODES, SELECTION_RULES, type Mode, type ResolvedMode } from './modes';

export interface SelectNextOptions {
  items: readonly WanderItem[];
  mode: Mode;
  year?: number;
  /** Oldest to newest. Duplicate encounters count once, at their latest position. */
  recentIds?: readonly string[];
  previousId?: string;
  sourceStates?: Readonly<Record<string, NewsSourceState>>;
  now?: Date | number | string;
  rng?: () => number;
}

export interface SelectionResult {
  item: WanderItem | null;
  mode: Mode;
  resolvedMode: ResolvedMode | null;
  repeated: boolean;
  reason?: string;
}

function timestamp(now: SelectNextOptions['now']): number {
  if (now === undefined) return Date.now();
  if (typeof now === 'number') return now;
  return now instanceof Date ? now.getTime() : Date.parse(now);
}

function choose<T>(items: readonly T[], rng: () => number): T {
  const random = rng();
  const index = Number.isFinite(random) ? Math.min(items.length - 1, Math.max(0, Math.floor(random * items.length))) : 0;
  return items[index]!;
}

function hostname(item: WanderItem | undefined): string | undefined {
  if (!item) return undefined;
  try {
    return new URL(item.url).hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return undefined;
  }
}

function recentWindow(options: SelectNextOptions): string[] {
  const ids = options.previousId ? [...(options.recentIds ?? []), options.previousId] : [...(options.recentIds ?? [])];
  return [...new Set(ids.reverse())].slice(0, SELECTION_RULES.recentWindow).reverse();
}

function validItems(options: SelectNextOptions, now: number): WanderItem[] {
  const seen = new Set<string>();
  return options.items.filter((item) => {
    if (!wanderItemSchema.safeParse(item).success || item.enabled === false || seen.has(item.id)) return false;
    if (item.kind === 'news') {
      const age = now - Date.parse(item.publishedAt);
      if (!Number.isFinite(age) || age < 0 || age > SELECTION_RULES.newsMaxAgeMs) return false;
      if (options.mode === 'surprise') {
        const successAt = options.sourceStates?.[item.sourceId]?.lastSuccessAt;
        const sourceAge = successAt ? now - Date.parse(successAt) : Number.NaN;
        if (!Number.isFinite(sourceAge) || sourceAge < 0 || sourceAge > SELECTION_RULES.sourceFreshnessMs) return false;
      }
    }
    seen.add(item.id);
    return true;
  });
}

function belongsToMode(item: WanderItem, mode: ResolvedMode, options: SelectNextOptions): boolean {
  if (mode === 'elsewhere') return item.kind === 'website' && !item.history;
  if (mode === 'time') return item.history !== undefined && (options.year === undefined || item.history.year === options.year);
  return item.kind === 'news';
}

/** Relax only the oldest encounter needed to keep a small content pool moving. */
function withoutRecent(items: WanderItem[], recent: readonly string[], count = 1): WanderItem[] {
  for (let start = 0; start <= recent.length; start += 1) {
    const excluded = new Set(recent.slice(start));
    const candidates = items.filter((item) => !excluded.has(item.id));
    if (candidates.length >= Math.min(count, items.length)) return candidates;
  }
  return [];
}

function preferNext(items: WanderItem[], options: SelectNextOptions, recent: readonly string[]): WanderItem[] {
  // Keep unseen content first; domain diversity breaks ties within that set.
  const candidates = withoutRecent(items, recent);
  const previous = options.items.find((item) => item.id === options.previousId);
  const previousDomain = hostname(previous);
  const differentDomain = previousDomain ? candidates.filter((item) => hostname(item) !== previousDomain) : candidates;
  return differentDomain.length > 0 ? differentDomain : candidates;
}

function chooseWithinMode(items: WanderItem[], mode: ResolvedMode, options: SelectNextOptions, rng: () => number): WanderItem {
  if (mode === 'news') {
    const sourceId = choose([...new Set(items.map((item) => item.sourceId))], rng);
    return choose(items.filter((item) => item.sourceId === sourceId), rng);
  }
  if (mode === 'time' && options.year === undefined) {
    const year = choose([...new Set(items.map((item) => item.history!.year))], rng);
    return choose(items.filter((item) => item.history!.year === year), rng);
  }
  return choose(items, rng);
}

export function selectNext(options: SelectNextOptions): SelectionResult {
  const rng = options.rng ?? Math.random;
  const now = timestamp(options.now);
  const valid = validItems(options, now);
  const modes: ResolvedMode[] = options.mode === 'surprise' ? [...RESOLVED_MODES] : [options.mode];
  const pools = modes.map((mode) => ({ mode, items: valid.filter((item) => belongsToMode(item, mode, options)) }))
    .filter((pool) => pool.items.length > 0);
  if (pools.length === 0) {
    return { item: null, mode: options.mode, resolvedMode: null, repeated: false, reason: '这个角落暂时没有可用内容，试试另一个方向。' };
  }
  const pool = options.mode === 'surprise' ? choose(pools, rng) : pools[0]!;
  const recent = recentWindow(options);
  const candidates = preferNext(pool.items, options, recent);
  const item = chooseWithinMode(candidates, pool.mode, options, rng);
  const repeated = recent.includes(item.id);
  return {
    item,
    mode: options.mode,
    resolvedMode: pool.mode,
    repeated,
    ...(repeated ? { reason: pool.items.length === 1 ? '这个角落暂时只有这一站。' : '这个角落已经逛过一圈，带你再看一站。' } : {}),
  };
}

function roleOf(item: WanderItem): 'event' | 'place' | 'archive' {
  return item.history?.role ?? (item.kind === 'event' ? 'event' : item.kind === 'archive' ? 'archive' : 'place');
}

export function selectYearPack(options: SelectNextOptions & { year: number }): WanderItem[] {
  const rng = options.rng ?? Math.random;
  const now = timestamp(options.now);
  const pack: WanderItem[] = [];
  const recent = recentWindow(options);
  const eligible = validItems(options, now).filter((item) => belongsToMode(item, 'time', options));
  const pool = withoutRecent(eligible, recent, SELECTION_RULES.yearPackSize);
  for (const role of ['event', 'place', 'archive'] as const) {
    const candidates = pool.filter((item) => roleOf(item) === role && !pack.some((picked) => picked.id === item.id));
    if (candidates.length > 0) pack.push(choose(withoutRecent(candidates, recent), rng));
  }
  while (pack.length < SELECTION_RULES.yearPackSize) {
    const remaining = pool.filter((item) => !pack.some((picked) => picked.id === item.id));
    if (remaining.length === 0) break;
    pack.push(choose(withoutRecent(remaining, recent), rng));
  }
  return pack;
}
