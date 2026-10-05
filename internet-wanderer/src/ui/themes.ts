import type { CSSProperties } from 'react';
import type { Mode } from '../domain/modes';
import type { YearDefinition } from '../domain/year-schema';
import { eraRegistry, type EraDefinition } from './era-registry';

export interface ExperienceTheme {
  id: string; label: string; era: string;
  accent: string; accentInk: string; paper: string; ink: string; muted: string; line: string; chrome: string; chromeInk: string;
  skin: 'modern' | EraDefinition['skin']; font: 'sans' | 'mono' | 'serif'; motion: 'slide' | 'float' | 'snap';
  caption?: string; connection?: string; note?: string;
}
const modern: ExperienceTheme = { id: 'surprise', label: 'An open window', era: 'modern',
  accent: 'var(--color-orange)', accentInk: 'var(--color-ink)', paper: 'var(--color-paper)', ink: 'var(--color-ink)', muted: 'var(--color-muted)', line: 'var(--color-border)', chrome: 'var(--color-chrome)', chromeInk: 'var(--color-muted)', skin: 'modern', font: 'sans', motion: 'slide' };
export const EXPERIENCE_THEMES: Record<Mode, ExperienceTheme> = {
  surprise: modern,
  elsewhere: { ...modern, id: 'elsewhere', label: 'A little off the beaten path', accent: 'var(--color-lime)', accentInk: 'var(--color-forest)', line: 'var(--color-lime-border)', chrome: 'var(--color-lime-paper)', chromeInk: 'var(--color-forest)', motion: 'float' },
  news: { ...modern, id: 'news', label: 'A different point of view', accent: 'var(--color-lavender)', accentInk: 'var(--color-plum)', line: 'var(--color-lavender-border)', chrome: 'var(--color-lavender-paper)', chromeInk: 'var(--color-plum)' },
  time: { ...modern, id: 'time', label: 'A window into another year' },
};
export function getExperienceTheme(mode: Mode = 'surprise', year?: number, years?: readonly YearDefinition[]): ExperienceTheme {
  const era = mode === 'time' ? eraRegistry.forYear(year, years) : undefined;
  return era ? { id: `time-${era.id}`, label: era.windowLabel, era: String(year), ...era.colors,
    skin: era.skin, font: era.font, motion: era.motion, caption: era.caption, connection: era.connection, note: era.note } : EXPERIENCE_THEMES[mode];
}
export function themeStyle(theme: ExperienceTheme): CSSProperties {
  return Object.fromEntries([
    ...(['accent', 'accentInk', 'paper', 'ink', 'muted', 'line', 'chrome', 'chromeInk'] as const).map(key => [`--experience-${key.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`)}`, theme[key]]),
    ['--experience-font', `var(--font-${theme.font})`],
    ['--experience-enter-duration', theme.motion === 'snap' ? '90ms' : theme.motion === 'float' ? '300ms' : '230ms'],
  ]) as CSSProperties;
}
