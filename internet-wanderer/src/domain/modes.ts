export const RESOLVED_MODES = ['elsewhere', 'news', 'time'] as const;
export type ResolvedMode = typeof RESOLVED_MODES[number];
export type Mode = ResolvedMode | 'surprise';

export const MODE_LABELS: Record<Mode, string> = {
  elsewhere: 'Elsewhere',
  news: 'News Drift',
  time: 'Time Machine',
  surprise: 'Surprise Me',
};

export const SELECTION_RULES = {
  recentWindow: 20,
  newsMaxAgeMs: 7 * 24 * 60 * 60 * 1000,
  sourceFreshnessMs: 48 * 60 * 60 * 1000,
  yearPackSize: 3,
} as const;

export function isMode(value: unknown): value is Mode {
  return typeof value === 'string' && Object.hasOwn(MODE_LABELS, value);
}
