import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useJourney } from './journey-context';
import { useContent } from './content-context';
import { isMode, type Mode } from '../domain/modes';
import type { WanderItem } from '../domain/item-schema';
import { selectNext, selectYearPack } from '../domain/select-next';
import type { JourneyView } from '../storage/recent';

interface Presentation { items: WanderItem[]; isNew: boolean; newCompanions?: WanderItem[]; note?: string; sequence: number }
interface RouteState { entryKey?: string; view?: JourneyView; restoreItemId?: string; freshStart?: boolean }

export function useWander() {
  const { repository, runtime } = useContent();
  const { allItems, canRestore, itemById, newsSnapshot, years } = repository;
  const [params] = useSearchParams();
  const mode: Mode = isMode(params.get('mode')) ? params.get('mode') as Mode : 'surprise';
  const navigate = useNavigate();
  const location = useLocation();
  const route: RouteState = location.state ?? {};
  const { journey, encounter, restore } = useJourney();
  const requestedYear = Number(params.get('year'));
  const [year] = useState(() => years.some(option => option.year === requestedYear) ? requestedYear
    : mode === 'time' && route.view?.mode === mode && years.some(option => option.year === route.view?.year) ? route.view?.year
    : journey.currentMode === 'time' && years.some(option => option.year === journey.currentYear) ? journey.currentYear
    : years[Math.floor(Math.random() * years.length)]?.year);
  const yearInfo = years.find(option => option.year === year);
  const [now, setNow] = useState(runtime.now);
  const [presentation, setPresentation] = useState<Presentation>(() => {
    const common = { items: allItems, mode, year: mode === 'time' ? year : undefined, recentIds: journey.entries.map(entry => entry.id), previousId: journey.currentId, sourceStates: newsSnapshot.sourceStates, now: runtime.now() };
    const valid = (id: string) => {
      const item = itemById.get(id);
      return canRestore(item, mode) && (mode !== 'time' || item.history?.year === year) ? item : undefined;
    };
    if (!route.freshStart && route.view?.mode === mode && (mode !== 'time' || route.view.year === year) && Array.isArray(route.view.ids) && route.view.ids.length <= 3 && new Set(route.view.ids).size === route.view.ids.length) {
      const items = route.view.ids.map(valid).filter((item): item is WanderItem => !!item);
      if (items.length && items.length === route.view.ids.length) return { items, isNew: false, sequence: 0 };
    }
    const rememberedId = route.freshStart ? undefined : route.restoreItemId ?? (journey.currentMode === mode ? journey.currentId : undefined);
    const remembered = rememberedId ? valid(rememberedId) : undefined;
    if (mode === 'time' && year !== undefined) {
      const saved = (journey.packIds ?? []).map(valid).filter((item): item is WanderItem => !!item);
      if (!route.freshStart && !route.restoreItemId && journey.currentMode === mode && journey.currentYear === year && saved.length) return { items: saved, isNew: false, sequence: 0 };
      const pack = selectYearPack({ ...common, year });
      if (remembered) {
        const companions = (saved.length ? saved : pack).filter(item => item.id !== remembered.id).slice(0, 2);
        return { items: [remembered, ...companions], newCompanions: companions.filter(item => !journey.entries.some(entry => entry.id === item.id)), isNew: false, sequence: 0 };
      }
      return { items: pack, isNew: true, sequence: 0 };
    }
    if (remembered) return { items: [remembered], isNew: false, sequence: 0 };
    const result = selectNext(common);
    return { items: result.item ? [result.item] : [], isNew: true, note: result.reason, sequence: 0 };
  });

  useEffect(() => {
    if (presentation.isNew) encounter(presentation.items, mode, mode === 'time' ? year : undefined);
    else {
      if (presentation.newCompanions?.length) encounter(presentation.newCompanions, mode, year, false);
      restore(presentation.items, mode, mode === 'time' ? year : undefined);
    }
  }, [presentation, encounter, restore, mode, year]);
  // Save this history entry's actual presentation. Replace keeps its identity,
  // so back/forward and refresh restore this view without remounting on each next.
  useEffect(() => {
    if (!presentation.items.length) return;
    const view: JourneyView = { mode, year: mode === 'time' ? year : undefined, ids: presentation.items.map(item => item.id) };
    if (!route.freshStart && !route.restoreItemId && JSON.stringify(route.view) === JSON.stringify(view)) return;
    // Only metadata changes. Preserve the router's key and index without another
    // navigation/render cycle, and never let a stale effect rewrite a popped entry.
    const historyState = window.history.state;
    if ((historyState?.key ?? 'default') !== location.key || window.location.hash !== `#${location.pathname}${location.search}`) return;
    window.history.replaceState({ ...historyState, usr: { entryKey: route.entryKey ?? location.key, view } }, '');
  }, [presentation, mode, year, location.pathname, location.search, location.key, location.state]);
  useEffect(() => {
    const update = () => setNow(runtime.now());
    window.addEventListener('focus', update);
    const timer = window.setInterval(update, 60_000);
    return () => { window.removeEventListener('focus', update); window.clearInterval(timer); };
  }, [runtime]);

  function next() {
    const options = { items: allItems, mode, year: mode === 'time' ? year : undefined, recentIds: journey.entries.map(entry => entry.id), previousId: presentation.items[0]?.id, sourceStates: newsSnapshot.sourceStates, now: runtime.now() };
    if (mode === 'time' && year !== undefined) setPresentation(previous => ({ items: selectYearPack({ ...options, year }), isNew: true, sequence: previous.sequence + 1 }));
    else {
      const result = selectNext(options);
      setPresentation(previous => ({ items: result.item ? [result.item] : [], isNew: true, note: result.reason, sequence: previous.sequence + 1 }));
    }
    setNow(runtime.now());
  }
  function changeYear() {
    const others = years.filter(option => option.year !== year);
    const picked = others[Math.floor(Math.random() * others.length)];
    if (picked) navigate(`/wander?mode=time&year=${picked.year}`, { state: { freshStart: true } });
    else next();
  }
  const trail = journey.trail ?? [];
  const currentView = { mode, year: mode === 'time' ? year : undefined, ids: presentation.items.map(item => item.id) };
  const trailIndex = trail.map(view => JSON.stringify(view)).lastIndexOf(JSON.stringify(currentView));
  const previousView = trailIndex > 0 ? trail[trailIndex - 1] : undefined;
  const currentIndex = journey.entries.findIndex(entry => entry.id === presentation.items[0]?.id);
  const previousEncounter = !previousView && currentIndex > 0 ? journey.entries[currentIndex - 1] : undefined;
  function previous() {
    if (previousView) navigate(`/wander?mode=${previousView.mode}${previousView.year ? `&year=${previousView.year}` : ''}`, { state: { view: previousView } });
    else if (previousEncounter) navigate(`/wander?mode=${previousEncounter.mode}${previousEncounter.year ? `&year=${previousEncounter.year}` : ''}`, { state: { restoreItemId: previousEncounter.id } });
  }
  const visibleItems = presentation.items.filter(item => canRestore(item, mode, now));
  return { mode, year, yearInfo, journey, presentation, previousDisabled: !previousView && !previousEncounter,
    previous, visibleItems, primary: visibleItems[0], next, changeYear };
}
