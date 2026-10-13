import { useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowUpRight, Clock3, History, Shuffle, Sparkles } from 'lucide-react';
import { useWander } from '../app/use-wander';
import ItemCard from '../components/ItemCard';
import { formatDate, domainName, languageName } from '../content/format';
import { useContent } from '../app/content-context';
import { getExperienceTheme, themeStyle } from '../ui/themes';
import JourneyControls from '../components/JourneyControls';
import NodeMap from '../components/experiences/NodeMap';
import SignalTuner from '../components/experiences/SignalTuner';
import TimeRail from '../components/experiences/TimeRail';
import { MODE_LABELS, type Mode } from '../domain/modes';

const descriptions: Record<Mode, string> = {
  elsewhere: '一个链接，通向一个意想不到的小世界。',
  news: '拨动频率，接收来自熟悉视野之外的消息。',
  time: '过去没有消失。推开一扇窗口，再见一次。',
  surprise: '没有安排的旅程，才有意料之外的相遇。',
};
const titles: Record<Mode, [string, string]> = { elsewhere: ['One link.', 'Anywhere.'], news: ['Tune in.', 'Drift away.'], time: ['Another year.', 'Another internet.'], surprise: ['A turn you', 'didn’t see coming.'] };

export default function Wander({ openRecent }: { openRecent: () => void }) {
  const { mode, year, yearInfo, journey, presentation, previous, previousDisabled, visibleItems, primary, next, changeYear } = useWander();
  const { repository: { years, sources, newsSnapshot, allItems, canRestore }, runtime: contentRuntime } = useContent();
  const navigate = useNavigate();
  const newsSources = sources.filter(source => source.enabled && allItems.some(item => item.sourceId === source.id && item.kind === 'news' && canRestore(item, 'news')));
  const result = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!presentation.sequence || !result.current) return;
    if (result.current.getBoundingClientRect().bottom < 0) result.current.scrollIntoView({ block: 'start', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
  }, [presentation.sequence]);
  const experience = primary?.history ? 'time' : primary?.kind === 'news' ? 'news' : mode === 'surprise' ? 'elsewhere' : mode;
  const era = mode === 'time' ? year : primary?.history?.year;
  const theme = getExperienceTheme(experience, era, years);
  const demoNote = contentRuntime.isDemo && (mode === 'news' || primary?.kind === 'news') ? <p className="demo-note" data-testid="news-sample-note"><span>SAVED EDITION</span>已保存的多语言新闻库 · {contentRuntime.snapshotDate ? `整理于 ${formatDate(contentRuntime.snapshotDate)}` : '整理日期未记录'}。涵盖近期与历史新闻，保留原始发表时间，不实时更新。</p> : null;
  const controls = primary && <JourneyControls item={primary} next={() => next()} previous={previous} previousDisabled={previousDisabled} time={mode === 'time'} nextLabel={mode === 'elsewhere' ? 'Wander' : mode === 'news' ? '继续漂流' : 'Surprise me'} />;
  return <main className={`wander-page page-enter ${primary ? 'has-journey-controls' : ''}`} style={themeStyle(theme)} data-skin={theme.skin} data-motion={theme.motion} data-mode={mode} data-experience={experience} data-era={era ?? 'modern'}>
    <nav className="mode-switch" aria-label="漫游模式">
      {(['surprise', 'elsewhere', 'news', 'time'] as const).map((value, index) => <Link key={value} to={`/wander?mode=${value}`} aria-current={mode === value ? 'page' : undefined} className={mode === value ? 'is-active' : ''}><span className="mode-index" aria-hidden="true">{value === 'surprise' ? <Shuffle size={13} /> : `0${index}`}</span>{MODE_LABELS[value]}</Link>)}
    </nav>
    <header className="wander-heading"><div><span className="eyebrow"><i /> {MODE_LABELS[mode].toUpperCase()} / AN OPEN-ENDED JOURNEY</span><h1>{titles[mode][0]} <em>{titles[mode][1]}</em></h1><p>{descriptions[mode]}</p></div><button className="text-button recent-toggle" onClick={openRecent}><History size={16} />最近遇见<span>{journey.entries.length}</span></button></header>
    {mode === 'surprise' && primary && <div className="surprise-itinerary"><span>LET CHANCE CONNECT THE DOTS</span>{(['elsewhere', 'news', 'time'] as const).map(value => <Link key={value} to={`/wander?mode=${value}`} className={experience === value ? 'is-here' : ''}><i />{MODE_LABELS[value]}{experience === value && <b>YOU ARE HERE</b>}</Link>)}</div>}
    {mode === 'time' && <TimeRail years={years} year={year} changeYear={changeYear} />}
    {primary ? <>
      <div ref={result} className="result-anchor" />
      <p className="arrival-note" role="status" aria-live="polite" data-testid="arrival-note"><span>{presentation.isNew ? '↳ JUST LANDED' : '↶ BACK TO THIS WINDOW'}</span><b>{domainName(primary.url)}</b>{primary.history && <i>{primary.history.year}</i>}</p>
      {experience === 'elsewhere' && <div className="elsewhere-experience"><div className="map-column"><NodeMap item={primary} sequence={presentation.sequence} revisit={item => navigate('/wander?mode=elsewhere', { state: { restoreItemId: item.id } })} openRecent={openRecent} /><div className="explore-controls"><p>沿着未知的分支，<em>再走一站。</em></p>{controls}</div></div><div className="destination-panel"><span className="panel-coordinate">DESTINATION / {String(journey.entries.length).padStart(2, '0')}</span><div className="result-enter" key={`${primary.id}-${presentation.sequence}`}><ItemCard item={primary} /></div><p className="return-note">打开外站后，随时回来接着走。<ArrowUpRight size={13} /></p></div></div>}
      {experience === 'news' && <div className="news-experience"><SignalTuner sources={newsSources} sourceId={primary.sourceId} sequence={presentation.sequence} tune={id => next(id)} drift={() => next()} /><div className="news-reading">{demoNote}<div className="result-enter" key={`${primary.id}-${presentation.sequence}`}><ItemCard item={primary} /></div><div className="reading-controls"><span>另一种语言，<br />另一种看世界的方式。</span>{controls}</div></div></div>}
      {experience === 'time' && <div className="time-experience">
        <div className="year-intro"><div className="giant-year" aria-hidden="true">{era}</div><div><span className="eyebrow">{theme.caption ?? 'YOU ARE VISITING THE PAST'}</span><h2>{(mode === 'time' ? yearInfo : years.find(option => option.year === era))?.title.replace(/^\d+ · /, '')}</h2><p>{(mode === 'time' ? yearInfo : years.find(option => option.year === era))?.description}</p><div className="era-memento"><span>{theme.connection}</span><i>{theme.note}</i></div></div><span className="time-stamp" aria-hidden="true">PAST<br />IS PRESENT<br /><ArrowUpRight size={21} /></span></div>
        <div className={mode === 'time' ? 'year-pack result-enter' : 'time-single result-enter'} key={`${mode}-${presentation.sequence}-${primary.id}`}>{visibleItems.map((item, index) => <ItemCard key={item.id} item={item} index={index} compact={mode === 'time'} />)}</div>
        <div className="time-actions">{controls}{mode === 'time' ? <button className="secondary-button" onClick={changeYear}><Shuffle size={16} />换个年份</button> : <Link className="secondary-button" to={`/wander?mode=time&year=${era}`}><Clock3 size={16} />继续逛 {era} 年</Link>}</div>
      </div>}
      <div className="journey-bottom"><span>{presentation.note ?? (experience === 'time' ? '事件日期与网页保存日期，分别记录。年代界面是一种设计演绎。' : 'A SMALL STEP OUTSIDE THE FAMILIAR.')}</span><Link to="/">回到探索地图 <ArrowUpRight size={13} /></Link></div>
    </> : <section className="empty-state" aria-live="polite"><Sparkles size={38} strokeWidth={1} /><h2>{mode === 'news' ? '新闻正在下一班途中。' : mode === 'time' ? '这个年份，还没有留下足够的线索。' : '这个角落暂时安静。'}</h2><p>换一个方向，继续你的旅程。</p><div><Link className="next-button" to="/wander?mode=elsewhere">去 Elsewhere</Link><button className="secondary-button" onClick={() => mode === 'time' ? changeYear() : next()}>再试一次</button></div></section>}
    {mode === 'news' && <p className="coverage-note">{newsSources.map(source => `${source.name}（${languageName(source.language)}）`).join(' · ') || '来源尚未完成采集'} / 近期与历史新闻。一次偶遇，不代表世界的全貌。</p>}
  </main>;
}
