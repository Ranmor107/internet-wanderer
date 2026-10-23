import { useEffect, useMemo, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowUpRight, Clock3, History, Shuffle, Sparkles } from 'lucide-react';
import { useWander } from '../app/use-wander';
import ItemCard from '../components/ItemCard';
import { formatDate, domainName } from '../content/format';
import { useContent } from '../app/content-context';
import { getExperienceTheme, themeStyle } from '../ui/themes';
import JourneyControls from '../components/JourneyControls';
import NodeMap from '../components/experiences/NodeMap';
import SignalTuner from '../components/experiences/SignalTuner';
import TimeRail from '../components/experiences/TimeRail';
import MuseumGallery, { exhibitionItems } from '../components/experiences/MuseumGallery';
import { MODE_LABELS, type Mode } from '../domain/modes';

const descriptions: Record<Mode, string> = {
  elsewhere: '一个链接，通向一个意想不到的小世界。',
  news: '转动世界，从一个地区的消息出发。',
  time: '过去没有消失。推开一扇窗口，再见一次。',
  surprise: '没有安排的旅程，才有意料之外的相遇。',
};
const titles: Record<Mode, [string, string]> = { elsewhere: ['One link.', 'Anywhere.'], news: ['A planet full', 'of stories.'], time: ['Another year.', 'Another internet.'], surprise: ['A turn you', 'didn’t see coming.'] };

export default function Wander({ openRecent }: { openRecent: () => void }) {
  const { mode, year, yearInfo, journey, presentation, previous, previousDisabled, visibleItems, primary, next, changeYear, visitNews } = useWander();
  const { repository: { years, sources, allItems, canRestore }, runtime: contentRuntime } = useContent();
  const navigate = useNavigate();
  const newsItems = useMemo(() => allItems.filter(item => item.kind === 'news' && canRestore(item, 'news')), [allItems, canRestore]);
  const newsSources = useMemo(() => sources.filter(source => source.enabled && newsItems.some(item => item.sourceId === source.id)), [sources, newsItems]);
  const result = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (primary?.kind === 'news') return;
    if (!presentation.sequence || !result.current) return;
    if (result.current.getBoundingClientRect().bottom < 0) result.current.scrollIntoView({ block: 'start', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
  }, [presentation.sequence, primary?.kind]);
  const experience = primary?.history ? 'time' : primary?.kind === 'news' ? 'news' : mode === 'surprise' ? 'elsewhere' : mode;
  const era = mode === 'time' ? year : primary?.history?.year;
  const theme = getExperienceTheme(experience, era, years);
  const demoNote = contentRuntime.isDemo && (mode === 'news' || primary?.kind === 'news') ? <p className="demo-note" data-testid="news-sample-note"><span>SAVED EDITION</span>已保存的多语言新闻库 · {contentRuntime.snapshotDate ? `整理于 ${formatDate(contentRuntime.snapshotDate)}` : '整理日期未记录'}。涵盖近期与历史新闻，保留原始发表时间，不实时更新。</p> : null;
  const currentExhibit = mode === 'time' ? exhibitionItems(visibleItems)[0] : primary;
  const renderControls = (advance = () => next(), busy = false) => currentExhibit && <JourneyControls busy={busy} item={currentExhibit} next={advance} previous={previous} previousDisabled={previousDisabled} time={mode === 'time'} nextLabel={mode === 'elsewhere' ? 'Wander again' : mode === 'news' ? '继续漂流' : 'Surprise me'} />;
  const controls = renderControls();
  return <main className={`wander-page page-enter ${primary ? 'has-journey-controls' : ''}`} style={themeStyle(theme)} data-skin={theme.skin} data-motion={theme.motion} data-mode={mode} data-experience={experience} data-era={era ?? 'modern'}>
    <nav className="mode-switch" aria-label="漫游模式">
      {(['surprise', 'elsewhere', 'news', 'time'] as const).map((value, index) => <Link key={value} to={`/wander?mode=${value}`} aria-current={mode === value ? 'page' : undefined} className={mode === value ? 'is-active' : ''}><span className="mode-index" aria-hidden="true">{value === 'surprise' ? <Shuffle size={13} /> : `0${index}`}</span>{MODE_LABELS[value]}</Link>)}
    </nav>
    <header className="wander-heading"><div><span className="eyebrow"><i /> {MODE_LABELS[mode].toUpperCase()} / AN OPEN-ENDED JOURNEY</span><h1>{titles[mode][0]} <em>{titles[mode][1]}</em></h1><p>{descriptions[mode]}</p></div><button className="text-button recent-toggle" onClick={openRecent}><History size={16} />最近遇见<span>{journey.entries.length}</span></button></header>
    {mode === 'surprise' && primary && <div className="surprise-itinerary"><span>LET CHANCE CONNECT THE DOTS</span>{(['elsewhere', 'news', 'time'] as const).map(value => <Link key={value} to={`/wander?mode=${value}`} className={experience === value ? 'is-here' : ''}><i />{MODE_LABELS[value]}{experience === value && <b>YOU ARE HERE</b>}</Link>)}</div>}
    {mode === 'time' && <TimeRail years={years} year={year} changeYear={changeYear} />}
    {experience === 'news' && primary && <p className="arrival-note" data-testid="arrival-note"><span>{presentation.isNew ? '↳ JUST LANDED' : '↶ BACK TO THIS WINDOW'}</span><b>{domainName(primary.url)}</b></p>}
    {experience === 'news' ? <SignalTuner sources={newsSources} items={newsItems} item={primary} sequence={presentation.sequence} tune={id => next(id)} drift={() => next()} roamRegions={mode === 'news'} visit={visitNews} previous={previous} previousDisabled={previousDisabled} recentIds={journey.entries.map(entry => entry.id)} demoNote={demoNote} /> : primary ? <>
      <div ref={result} className="result-anchor" />
      <p className="arrival-note" role="status" aria-live="polite" data-testid="arrival-note"><span>{presentation.isNew ? '↳ JUST LANDED' : '↶ BACK TO THIS WINDOW'}</span><b>{domainName((currentExhibit ?? primary).url)}</b>{primary.history && <i>{primary.history.year}</i>}</p>
      {experience === 'elsewhere' && <NodeMap item={primary} sequence={presentation.sequence} revisit={item => navigate('/wander?mode=elsewhere', { state: { restoreItemId: item.id } })} explore={() => next()} openRecent={openRecent}>{advance => <><div className="result-enter" key={`${primary.id}-${presentation.sequence}`}><ItemCard item={primary} /></div><div className="explore-controls">{renderControls(advance)}</div><p className="return-note">打开外站，或沿着一个问号继续。<ArrowUpRight size={13} /></p></>}</NodeMap>}

      {experience === 'time' && <div className="time-experience">
        <div className="year-intro"><div className="giant-year" aria-hidden="true">{era}</div><div><span className="eyebrow">{theme.caption ?? 'YOU ARE VISITING THE PAST'}</span><h2>{(mode === 'time' ? yearInfo : years.find(option => option.year === era))?.title.replace(/^\d+ · /, '')}</h2><p>{(mode === 'time' ? yearInfo : years.find(option => option.year === era))?.description}</p><div className="era-memento"><span>{theme.connection}</span><i>{theme.note}</i></div></div><span className="time-stamp" aria-hidden="true">PAST<br />IS PRESENT<br /><ArrowUpRight size={21} /></span></div>
        <MuseumGallery items={visibleItems} sequence={presentation.sequence} />
        <div className="time-actions">{controls}{mode === 'time' ? <button className="secondary-button" onClick={changeYear}><Shuffle size={16} />换个年份</button> : <Link className="secondary-button" to={`/wander?mode=time&year=${era}`}><Clock3 size={16} />继续逛 {era} 年</Link>}</div>
      </div>}
      <div className="journey-bottom"><span>{presentation.note ?? (experience === 'time' ? '事件日期与网页保存日期，分别记录。年代界面是一种设计演绎。' : 'A SMALL STEP OUTSIDE THE FAMILIAR.')}</span><Link to="/">回到探索地图 <ArrowUpRight size={13} /></Link></div>
    </> : <section className="empty-state" aria-live="polite"><Sparkles size={38} strokeWidth={1} /><h2>{mode === 'news' ? '新闻正在下一班途中。' : mode === 'time' ? '这个年份，还没有留下足够的线索。' : '这个角落暂时安静。'}</h2><p>换一个方向，继续你的旅程。</p><div><Link className="next-button" to="/wander?mode=elsewhere">去 Elsewhere</Link><button className="secondary-button" onClick={() => mode === 'time' ? changeYear() : next()}>再试一次</button></div></section>}

  </main>;
}
