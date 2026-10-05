import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import type { WanderItem } from '../domain/item-schema';
import type { Mode } from '../domain/modes';
import { appendVisit, emptyJourney, readJourney, recordEncounters, writeJourney, type Journey } from '../storage/recent';

interface JourneyActions {
  journey: Journey;
  encounter: (items: WanderItem[], mode: Mode, year?: number, recordVisit?: boolean) => void;
  restore: (items: WanderItem[], mode: Mode, year?: number) => void;
  clear: () => void;
}
const Context = createContext<JourneyActions | null>(null);

export function JourneyProvider({ children }: { children: ReactNode }) {
  const [journey, setJourney] = useState(readJourney);
  useEffect(() => { writeJourney(journey); }, [journey]);
  const encounter = useCallback((items: WanderItem[], mode: Mode, year?: number, recordVisit = true) => {
    if (!items.length) return;
    const encounteredAt = new Date().toISOString();
    setJourney((previous) => recordEncounters(previous,
      items.map((item) => ({ id: item.id, encounteredAt, mode, year })),
      { currentId: items[0].id, currentMode: mode, currentYear: year, packIds: items.map((item) => item.id), trail: recordVisit ? appendVisit(previous.trail ?? [], { mode, year, ids: items.map(item => item.id) }) : previous.trail },
    ));
  }, []);
  const restore = useCallback((items: WanderItem[], mode: Mode, year?: number) => {
    if (!items.length) return;
    setJourney((previous) => ({ ...previous, currentId: items[0].id, currentMode: mode, currentYear: year, packIds: items.map((item) => item.id) }));
  }, []);
  const clear = useCallback(() => setJourney(emptyJourney()), []);
  return <Context.Provider value={{ journey, encounter, restore, clear }}>{children}</Context.Provider>;
}

export function useJourney() {
  const context = useContext(Context);
  if (!context) throw new Error('JourneyProvider is required');
  return context;
}
