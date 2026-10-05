import { isMode, type Mode } from '../domain/modes';

export const STORAGE_KEY = 'internet-wanderer:journey:v1';
export interface Encounter { id: string; encounteredAt: string; mode: Mode; year?: number }
export interface JourneyView { mode: Mode; year?: number; ids: string[] }
export interface Journey {
  version: 1;
  entries: Encounter[];
  currentId?: string;
  currentMode?: Mode;
  currentYear?: number;
  packIds?: string[];
  trail?: JourneyView[];
}
export const emptyJourney = (): Journey => ({ version: 1, entries: [] });
type StorageReader = Pick<Storage, 'getItem'>;
type StorageWriter = Pick<Storage, 'setItem'>;

export function readJourney(storage?: StorageReader): Journey {
  try {
    const raw = (storage ?? window.localStorage).getItem(STORAGE_KEY);
    if (!raw) return emptyJourney();
    const parsed = JSON.parse(raw);
    if (parsed.version !== 1 || !Array.isArray(parsed.entries)) return emptyJourney();
    const entries: Encounter[] = parsed.entries.filter((entry: Encounter) =>
      entry && typeof entry.id === 'string' && entry.id.length < 512 && isMode(entry.mode) &&
      typeof entry.encounteredAt === 'string' && Number.isFinite(Date.parse(entry.encounteredAt)) &&
      (entry.year === undefined || Number.isInteger(entry.year)),
    );
    const unique = new Map<string, Encounter>();
    for (const entry of entries) {
      unique.delete(entry.id);
      unique.set(entry.id, entry);
    }
    return {
      version: 1,
      trail: Array.isArray(parsed.trail) ? parsed.trail.filter((view: JourneyView) => view && isMode(view.mode) && Array.isArray(view.ids) && view.ids.length > 0 && view.ids.length <= 3 && view.ids.every(id => typeof id === 'string' && id.length < 512) && (view.year === undefined || Number.isInteger(view.year))).slice(-20) : [],
      entries: [...unique.values()].slice(-20),
      currentId: typeof parsed.currentId === 'string' ? parsed.currentId : undefined,
      currentMode: isMode(parsed.currentMode) ? parsed.currentMode : undefined,
      currentYear: Number.isInteger(parsed.currentYear) ? parsed.currentYear : undefined,
      packIds: Array.isArray(parsed.packIds) ? parsed.packIds.filter((id: unknown) => typeof id === 'string').slice(0, 3) : undefined,
    };
  } catch { return emptyJourney(); }
}

export function writeJourney(journey: Journey, storage?: StorageWriter): boolean {
  try { (storage ?? window.localStorage).setItem(STORAGE_KEY, JSON.stringify(journey)); return true; }
  catch { return false; }
}

export function recordEncounters(previous: Journey, entries: Encounter[], current: Partial<Journey> = {}): Journey {
  const freshIds = new Set(entries.map((entry) => entry.id));
  const unique = new Map(entries.map((entry) => [entry.id, entry]));
  return {
    ...previous,
    ...current,
    version: 1,
    entries: [...previous.entries.filter((entry) => !freshIds.has(entry.id)), ...unique.values()].slice(-20),
  };
}

export function appendVisit(previous: readonly JourneyView[], view: JourneyView): JourneyView[] {
  if (JSON.stringify(previous.at(-1)) === JSON.stringify(view)) return [...previous];
  return [...previous, view].slice(-20);
}
