import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { ArrowUpRight, ChevronDown, Globe2, Layers, Minus, Plus, Radio, RotateCcw, Shuffle, X, Bookmark, BookmarkCheck } from 'lucide-react';
import { languageName } from '../../content/format';
import type { ContentSource, WanderItem } from '../../domain/item-schema';
import { NEWS_TOPICS, newsInTopic, newsTopicName, topicsForItem, type NewsTopicFilter } from '../../domain/news-topics';
import { NEWS_REGIONS, regionItems } from '../../ui/globe/geography';
import { sourceOrigin } from '../../ui/globe/projection';
import EarthGlobe, { type EarthApi, type EarthTarget } from './EarthGlobe';
import { useBookmarks } from '../../app/bookmarks-context';
import NewsDispatch from './NewsDispatch';

type Selection = { id: string; name: string; longitude: number; latitude: number; basis: 'report' | 'publisher'; count: number };
export default function SignalTuner({ sources, items, item, sequence, tune, drift, roamRegions, visit, previous, previousDisabled, recentIds, demoNote }: {
  sources: ContentSource[]; items: WanderItem[]; item?: WanderItem; sequence: number;
  tune: (id: string) => void; drift: () => void; roamRegions: boolean; visit: (id: string) => void;
  previous: () => void; previousDisabled: boolean; recentIds: string[]; demoNote: React.ReactNode;
}) {
  const [topic, setTopic] = useState<NewsTopicFilter>('all');
  const filteredItems = useMemo(() => newsInTopic(items, topic), [items, topic]);
  const regions = useMemo(() => {
    const ids = new Set(filteredItems.map(item => item.id));
    return NEWS_REGIONS.map(region => ({ ...region, items: region.items.filter(record => ids.has(record.id)) })).filter(region => region.items.length);
  }, [filteredItems]);
  const filteredSources = sources.filter(source => filteredItems.some(item => item.sourceId === source.id));
  const topicCounts = useMemo(() => Object.fromEntries(NEWS_TOPICS.map(option => [option.id, items.filter(item => topicsForItem(item).includes(option.id)).length])), [items]);
  const earth = useRef<EarthApi | undefined>(undefined);
  const explorer = useRef<HTMLElement>(null), dispatch = useRef<HTMLElement>(null);
  const menu = useRef<HTMLDivElement>(null), regionToggle = useRef<HTMLButtonElement>(null);
  const topicSelect = useRef<HTMLSelectElement>(null);
  const focusReport = useRef<HTMLElement | null>(null);
  const token = useRef(0), pending = useRef<string | undefined>(undefined), committed = useRef<string | undefined>(undefined);
  function context(report?: WanderItem): Selection | undefined {
    if (!report) return;
    const region = regions.find(region => region.items.some(record => record.id === report.id));
    if (region) return { ...region, count: region.items.length, basis: 'report' };
    const origin = sourceOrigin(report.sourceId);
    return origin && { ...origin, id: origin.id.toUpperCase(), count: 0, basis: 'publisher' };
  }
  const [selection, setSelection] = useState<Selection | undefined>(() => context(item));
  const [target, setTarget] = useState<EarthTarget | undefined>(() => { const point = context(item); return point && { ...point, token: 0, animate: false }; });
  const [phase, setPhase] = useState(item ? 'flying' : 'exploring');
  const [panelOpen, setPanelOpen] = useState(!!item), [expanded, setExpanded] = useState(false);
  const [signals, setSignals] = useState(true), [listOpen, setListOpen] = useState(false);
  const { bookmarks, toggle } = useBookmarks();
  const saved = !!item && bookmarks.some(bookmark => bookmark.id === item.id);
  useLayoutEffect(() => {
    if (!panelOpen || !dispatch.current) return;
    dispatch.current.scrollTop = 0;
    const origin = focusReport.current;
    if (origin && (document.activeElement === origin || (!origin.isConnected && document.activeElement === document.body))) dispatch.current.querySelector<HTMLElement>('h2')?.focus({ preventScroll: true });
    focusReport.current = null;
  }, [item?.id, panelOpen]);
  useEffect(() => {
    if (!listOpen) return;
    const outside = (event: PointerEvent) => { if (event.target instanceof Node && !menu.current?.contains(event.target)) setListOpen(false); };
    document.addEventListener('pointerdown', outside);
    return () => document.removeEventListener('pointerdown', outside);
  }, [listOpen]);
  function closeList() { setListOpen(false); regionToggle.current?.focus({ preventScroll: true }); }
  function closePanel() {
    setPanelOpen(false);
    const control = explorer.current?.querySelector<HTMLElement>('.earth-canvas-host canvas') ?? regionToggle.current;
    control?.focus({ preventScroll: true });
  }
  useEffect(() => {
    if (item?.id === committed.current) { committed.current = undefined; return; }
    if (item && !filteredItems.some(record => record.id === item.id)) { interrupt(); earth.current?.cancelFlight(); setTarget(undefined); return; }
    const point = context(item);
    if (point) {
      pending.current = undefined; setSelection(point); setPanelOpen(false); setExpanded(false); setPhase('flying');
      setTarget({ ...point, token: ++token.current, animate: sequence > 0 });
    } else if (item) { setPanelOpen(true); setPhase('ready'); }
  }, [item?.id, sequence]);

  function changeTopic(value: NewsTopicFilter) {
    ++token.current; pending.current = undefined; committed.current = undefined; focusReport.current = null;
    earth.current?.cancelFlight(); setTarget(undefined); setSelection(undefined);
    setPanelOpen(false); setExpanded(false); setListOpen(false); setPhase('exploring'); setTopic(value);
    topicSelect.current?.focus({ preventScroll: true });
  }

  function chooseReport(pool: WanderItem[]) {
    const unseen = pool.filter(candidate => candidate.id !== item?.id && !recentIds.includes(candidate.id));
    const alternatives = unseen.length ? unseen : pool.filter(candidate => candidate.id !== item?.id);
    const candidates = alternatives.length ? alternatives : pool;
    return candidates[Math.floor(Math.random() * candidates.length)];
  }

  function receiveReport(report: WanderItem) {
    const point = context(report);
    focusReport.current = null; setExpanded(false);
    if (point) {
      pending.current = report.id; setSelection(point); setPanelOpen(false); setPhase('flying');
      setTarget({ ...point, token: ++token.current, animate: true });
    } else {
      ++token.current; earth.current?.cancelFlight(); pending.current = undefined; committed.current = report.id;
      setTarget(undefined); setSelection(undefined); visit(report.id); setPhase('ready'); setPanelOpen(true);
    }
  }

  function chooseSource(id: string) {
    pending.current = undefined;
    if (topic === 'all') { tune(id); return; }
    const report = chooseReport(filteredItems.filter(record => record.sourceId === id));
    if (report) receiveReport(report);
  }

  function chooseRegion(point: { id: string; name: string; longitude: number; latitude: number }, preferred?: string, keyboard = false) {
    focusReport.current = keyboard ? (preferred ? document.activeElement as HTMLElement : regionToggle.current) : null;
    const region = regions.find(region => region.id === point.id);
    const pool = region ? regionItems(region, filteredItems) : [];
    const chosen = preferred ? pool.find(candidate => candidate.id === preferred) : chooseReport(pool);
    const focus = region ?? point;
    if (preferred && chosen && selection?.id === point.id && phase === 'ready') {
      committed.current = chosen.id; visit(chosen.id); setExpanded(false); setPanelOpen(true); return;
    }
    pending.current = chosen?.id;
    setSelection({ ...focus, basis: 'report', count: pool.length }); setPhase('flying'); setPanelOpen(false); setExpanded(false);
    setTarget({ ...focus, token: ++token.current, animate: true });
    if (listOpen) closeList();
  }
  function advance() {
    focusReport.current = null;
    if (!roamRegions && topic === 'all') { pending.current = undefined; drift(); return; }
    const others = regions.filter(region => region.id !== selection?.id);
    const pool = others.length ? others : regions;
    const picked = pool[Math.floor(Math.random() * pool.length)];
    if (picked) chooseRegion(picked);
    else { const report = chooseReport(filteredItems); if (report) receiveReport(report); }
  }
  function arrive(point: EarthTarget) {
    if (point.token !== token.current) return;
    if (pending.current) { committed.current = pending.current; visit(pending.current); pending.current = undefined; }
    setPhase('ready'); setPanelOpen(true);
  }
  function reset() {
    focusReport.current = null;
    ++token.current; pending.current = undefined; earth.current?.reset(); setTarget(undefined);
    setSelection(undefined); setPhase('exploring'); setPanelOpen(false); setExpanded(false);
  }
  function interrupt() { ++token.current; pending.current = undefined; focusReport.current = null; setPhase('exploring'); setPanelOpen(false); }
  const region = selection && regions.find(region => region.id === selection.id);
  const hasReport = item && filteredItems.some(record => record.id === item.id) && (!selection || selection.basis === 'publisher' || region?.items.some(record => record.id === item.id));
  return <section ref={explorer} className="earth-explorer" aria-label="地球新闻探索" data-testid="signal-tuner" data-phase={phase} data-region={selection?.id ?? ''} data-expanded={expanded} data-panel={panelOpen} onKeyDown={event => {
    if (event.key !== 'Escape' || (!listOpen && !panelOpen)) return;
    event.preventDefault(); event.stopPropagation();
    if (listOpen) closeList(); else closePanel();
  }}>
    <EarthGlobe ref={earth} regions={regions} target={target} onPick={chooseRegion} onArrive={arrive} onInterrupt={interrupt} />
    <div className="earth-shade" aria-hidden="true" />
    <div className="earth-topic-filter"><label>新闻种类<select ref={topicSelect} aria-label="新闻类别" value={topic} onChange={event => changeTopic(event.target.value as NewsTopicFilter)}><option value="all">全部种类 · {items.length}</option>{NEWS_TOPICS.map(option => <option key={option.id} value={option.id}>{option.name} · {topicCounts[option.id]}</option>)}</select></label><span role="status" aria-live="polite">{topic === 'all' ? '全部馆藏' : `${newsTopicName(topic)}频道`} · {filteredItems.length} 则{topic !== 'all' && '已归类'}</span></div>
    <div className={`earth-intro ${panelOpen || phase === 'flying' ? 'is-quiet' : ''}`}><span><Radio size={14} /> NEWS DRIFT / EXPLORE THE PLANET</span><h2>{filteredItems.length ? <>A planet full<br />of <em>stories.</em></> : <>Waiting for<br />a <em>signal.</em></>}</h2><p>{filteredItems.length ? <>转动世界，遇见另一种生活。<br />{topic === 'all' ? '点击一个信号，让消息从那里传来。' : `正在接收${newsTopicName(topic)}消息，点击信号或继续漂流。`}</> : <>这个类别暂时没有可用报道。<br />切换种类，世界里还有其他声音。</>}</p>{!filteredItems.length && <button onClick={() => changeTopic('all')}>查看全部新闻 <ArrowUpRight size={14} /></button>}<small>保存的近期与历史报道 · 保留原始发表时间</small></div>
    {phase === 'flying' && selection && <div className="earth-passage" aria-hidden="true" key={target?.token}><span>FOLLOWING A SIGNAL</span><strong>{selection.name}</strong><small>移动中 · 拖动地球可随时改变方向</small><i /></div>}
    <div className="earth-topline"><span role="status" aria-live="polite">{phase === 'flying' ? `飞往 ${selection?.name ?? '下一处信号'}…` : panelOpen ? `${selection?.name ?? '世界'} / SIGNAL RECEIVED` : 'THE WORLD IS YOUR WAY IN.'}</span><span>{regions.length} 个地区信号</span></div>
    <div className="earth-tools" aria-label="地球视角控制"><button aria-label="放大地球" onClick={() => earth.current?.zoom(1)}><Plus size={19} /></button><button aria-label="缩小地球" onClick={() => earth.current?.zoom(-1)}><Minus size={19} /></button><span /><button aria-label="返回全球视角" onClick={reset}><Globe2 size={19} /></button><button aria-label="显示地区信号" aria-pressed={signals} onClick={() => { setSignals(value => !value); earth.current?.signals(!signals); }}><Layers size={18} /></button></div>
    {panelOpen && <aside ref={dispatch} className="earth-dispatch" aria-label="地区新闻" data-testid="earth-dispatch"><header><div><span>{selection?.basis === 'publisher' ? '发布机构所在地' : '报道关联地区'}</span><strong>{selection?.name ?? '地区未标注'}</strong></div><button className="icon-button" aria-label="关闭新闻，继续探索" onClick={closePanel}><X size={20} /></button></header>
      <div className="dispatch-postmark"><span><i /> {hasReport ? 'DISPATCH RECEIVED' : 'UNEXPLORED'}</span>{selection && <span>{Math.abs(selection.latitude).toFixed(1)}°{selection.latitude >= 0 ? 'N' : 'S'} / {Math.abs(selection.longitude).toFixed(1)}°{selection.longitude >= 0 ? 'E' : 'W'}</span>}</div>
      {hasReport ? <><NewsDispatch key={item.id} item={item} expanded={expanded} /><button className="dispatch-expand" aria-expanded={expanded} onClick={() => setExpanded(value => !value)}>{expanded ? '收起来源详情' : '展开消息与来源'}<ChevronDown size={15} /></button>{expanded && demoNote}{region && <div className="region-stories"><span>留在{selection?.name} · {topic === 'all' ? '另一些声音' : `${newsTopicName(topic)}消息`}</span>{region.items.filter(record => record.id !== item.id).map(record => <button key={record.id} onClick={event => chooseRegion(region, record.id, event.detail === 0)}>{record.title}<ArrowUpRight size={12} /></button>)}</div>}</> : <div className="earth-empty"><h3>{topic === 'all' ? '这个角落，还没有归类的消息。' : `这个地区没有已归类的${newsTopicName(topic)}消息。`}</h3><p>试试亮起的地区信号，或让世界带你去下一站。</p><button disabled={!filteredItems.length} onClick={advance}>去另一处信号 <ArrowUpRight size={15} /></button>{topic !== 'all' && <button onClick={() => changeTopic('all')}>查看全部新闻 <ArrowUpRight size={15} /></button>}</div>}
      <footer>{selection?.basis === 'report' ? '按报道标题审核关联 · 国家级位置示意' : '这条消息尚无报道地区标注，仅标发布机构所在地'}</footer>
    </aside>}
    <div ref={menu} className="earth-region-menu"><button ref={regionToggle} className="earth-region-toggle" aria-expanded={listOpen} aria-controls="region-signal-list" onClick={() => setListOpen(value => !value)}><Radio size={15} />地区信号<ChevronDown size={14} /></button>{listOpen && <div id="region-signal-list" className="region-signal-list"><header><strong>{topic === 'all' ? '从哪里开始？' : `${newsTopicName(topic)} · 从哪里开始？`}</strong><button className="icon-button" aria-label="关闭地区列表" onClick={closeList}><X size={16} /></button></header><div>{regions.map(region => <button key={region.id} onClick={event => chooseRegion(region, undefined, event.detail === 0)}><span>{region.name}<small>{region.englishName}</small></span><i>{region.items.length} 则 ↗</i></button>)}</div><label>也可按媒体来源浏览<select aria-label="新闻来源" disabled={!filteredSources.length} value={panelOpen && hasReport ? item?.sourceId ?? '' : ''} onChange={event => chooseSource(event.target.value)}><option value="" disabled>选择一个来源</option>{filteredSources.map(source => <option value={source.id} key={source.id}>{source.name} · {languageName(source.language)}</option>)}</select><small>题材经人工归类，可跨类；未归类报道保留在“全部”。</small></label></div>}</div>
    <nav className="earth-journey" aria-label="漫游操作" data-testid="journey-controls"><button className="earth-previous" onClick={previous} disabled={previousDisabled} aria-label="上一站"><RotateCcw size={17} /></button><button className="earth-drift" disabled={!filteredItems.length} aria-label={`下一站 · ${roamRegions ? '继续漂流' : 'Surprise me'}`} onClick={advance}><Shuffle size={19} /><span>{phase === 'flying' ? '换个方向' : roamRegions ? '继续漂流' : 'Surprise me'}<small>{topic === 'all' ? 'TAKE ME SOMEWHERE ELSE' : `继续探索 · ${newsTopicName(topic)}`}</small></span><ArrowUpRight size={18} /></button><button className="earth-save" disabled={!item || !panelOpen || !hasReport} aria-label={saved ? '取消收藏当前站' : '收藏当前站'} aria-pressed={saved} onClick={() => item && toggle(item, sources.find(source => source.id === item.sourceId))}>{saved ? <BookmarkCheck size={18} /> : <Bookmark size={18} />}</button></nav>
    <div className="earth-bottomline"><span>拖动旋转 · 滚轮 / 双指缩放 · 点击地区</span><span>Earth: <a href="https://science.nasa.gov/earth/earth-observatory/blue-marble-next-generation/" target="_blank" rel="noopener noreferrer">NASA</a> / <a href="https://www.naturalearthdata.com/about/terms-of-use/" target="_blank" rel="noopener noreferrer">Natural Earth</a></span></div>
  </section>;
}
