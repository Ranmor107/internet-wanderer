import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, Asterisk, Clock3, History, Shuffle, Sparkles } from 'lucide-react';
import { useWander } from '../app/use-wander';
import ItemCard from '../components/ItemCard';
import { formatDate, domainName, languageName } from '../content/format';
import { useContent } from '../app/content-context';
import { getExperienceTheme, themeStyle } from '../ui/themes';
import JourneyControls from '../components/JourneyControls';
import { MODE_LABELS, type Mode } from '../domain/modes';

const descriptions: Record<Mode, string> = {
  elsewhere: '一个陌生地址。一个意想不到的小世界。',
  news: '离开熟悉的头条，从别处看看这个世界。',
  time: '过去没有消失，它只是换了一个网址。',
  surprise: '去哪里不重要，重要的是出发。',
};
const titles: Record<Mode, string> = { elsewhere: 'Hello, somewhere else.', news: 'Outside your usual world.', time: 'You had to be there.', surprise: 'A good place to get lost.' };

export default function Wander({ openRecent }: { openRecent: () => void }) {
  const { mode, year, yearInfo, journey, presentation, previous, previousDisabled, visibleItems, primary, next, changeYear } = useWander();
  const { repository: { years, sources, newsSnapshot }, runtime: contentRuntime } = useContent();
  const newsSources = sources.filter((source) => source.enabled && Object.hasOwn(newsSnapshot.sourceStates, source.id));
  const result = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!presentation.sequence || !result.current) return;
    const top = result.current.getBoundingClientRect().top;
    if (top < -24 || top > window.innerHeight / 2) result.current.scrollIntoView({ block: 'start', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
  }, [presentation.sequence]);
  const experience = primary?.history ? 'time' : primary?.kind === 'news' ? 'news' : mode === 'surprise' ? 'elsewhere' : mode;
  const era = mode === 'time' ? year : primary?.history?.year;
  const theme = getExperienceTheme(experience, era, years);
  return <main className={`wander-page page-enter ${primary ? 'has-journey-controls' : ''}`} style={themeStyle(theme)} data-skin={theme.skin} data-motion={theme.motion} data-mode={mode} data-experience={experience} data-era={era ?? 'modern'}>
    <nav className="mode-switch" aria-label="漫游模式">
      {(['surprise', 'elsewhere', 'news', 'time'] as const).map((value) => <Link key={value} to={`/wander?mode=${value}`} aria-current={mode === value ? 'page' : undefined} className={mode === value ? 'is-active' : ''}>{value === 'surprise' && <Shuffle size={14} />}{MODE_LABELS[value]}</Link>)}
    </nav>
    <header className="wander-heading"><div><span className="eyebrow"><i /> {MODE_LABELS[mode].toUpperCase()} / KEEP WANDERING</span><h1>{titles[mode]}</h1><p>{descriptions[mode]}</p></div><button className="text-button recent-toggle" onClick={openRecent}><History size={16} />最近遇见<span>{journey.entries.length}</span></button></header>
    {mode === 'time' && <section className="year-control" aria-label="选择年份"><span className="timeline-label">SET YOUR COORDINATES</span><div className="year-buttons">{years.map((option) => <Link key={option.year} to={`/wander?mode=time&year=${option.year}`} className={option.year === year ? 'selected' : ''} aria-current={option.year === year ? 'date' : undefined}>{option.year}</Link>)}</div><button className="text-button" onClick={changeYear}><Shuffle size={15} />随机年份</button></section>}
    {mode === 'time' && yearInfo && <div className="year-intro"><div className="giant-year">{year}</div><div><span className="eyebrow">{theme.caption ?? 'YOU ARE VISITING THE PAST'}</span><h2>{yearInfo.title.replace(/^\d+ · /, '')}</h2><p>{yearInfo.description}</p><div className="era-memento"><span>{theme.connection}</span><i>{theme.note}</i></div></div><span className="year-sticker" aria-hidden="true">wish you<br />were here <ArrowUpRight size={20} /></span></div>}
    {contentRuntime.isDemo && (mode === 'news' || primary?.kind === 'news') && <p className="demo-note" data-testid="news-sample-note"><span>SAVED EDITION</span> 已保存的多语言新闻库 · {contentRuntime.snapshotDate ? `整理于 ${formatDate(contentRuntime.snapshotDate)}` : '整理日期未记录'}。涵盖近期与历史新闻，保留原始发表时间，不实时更新。</p>}
    {primary ? <>
      <p className="arrival-note" role="status" aria-live="polite" data-testid="arrival-note"><span>{presentation.isNew ? '↳ JUST LANDED' : '↶ BACK TO THIS WINDOW'}</span><b>{domainName(primary.url)}</b>{primary.history && <i>{primary.history.year}</i>}</p>
      <div ref={result} className="result-anchor" />
      <div className={mode === 'time' ? 'time-result' : 'single-result'}>
        <div className={mode === 'time' ? 'year-pack result-enter' : 'result-enter'} key={`${mode}-${presentation.sequence}-${primary.id}`}>{visibleItems.map((item, index) => <ItemCard key={item.id} item={item} index={index} compact={mode === 'time'} />)}</div>
        {mode !== 'time' && <aside className="journey-aside"><Asterisk className="aside-asterisk" size={65} strokeWidth={.9} aria-hidden="true" /><span className="eyebrow">NO WRONG TURNS.</span><h2>Stay a little.<br /><em>Or keep going.</em></h2><p>喜欢就进去看看。<br />下一条链接，又会通向哪里？</p><JourneyControls item={primary} next={next} previous={previous} previousDisabled={previousDisabled} />{primary.history && <Link className="year-invite" to={`/wander?mode=time&year=${primary.history.year}`}><Clock3 size={16} />继续逛 {primary.history.year} 年</Link>}<p className="aside-footnote">打开外站后，随时回来接着走。</p></aside>}
      </div>
      {mode === 'time' && <div className="time-actions"><JourneyControls item={primary} next={next} previous={previous} previousDisabled={previousDisabled} time /><button className="secondary-button" onClick={changeYear}><Shuffle size={17} />换个年份</button></div>}
      <div className="journey-bottom"><span>{presentation.note ?? (mode === 'time' ? '事件日期与网页保存日期，分别记录。' : 'YOU DON’T HAVE TO KNOW WHERE YOU’RE GOING.')}</span></div>
    </> : <section className="empty-state" aria-live="polite"><Sparkles size={38} strokeWidth={1} /><h2>{mode === 'news' ? '新闻正在下一班途中。' : mode === 'time' ? '这个年份，还没有留下足够的线索。' : '这个角落暂时安静。'}</h2><p>{mode === 'news' ? '新闻库暂时没有可用条目。先去别处转转，或稍后再来。' : '换一个方向，继续你的旅程。'}</p><div><Link className="next-button" to="/wander?mode=elsewhere">去 Elsewhere</Link><button className="secondary-button" onClick={mode === 'time' ? changeYear : next}>再试一次</button></div></section>}
    {mode === 'news' && <p className="coverage-note">{newsSources.map((source) => `${source.name}（${languageName(source.language)}）`).join(' · ') || '来源尚未完成采集'} / 近期与历史新闻。一次偶遇，不代表世界的全貌。</p>}
  </main>;
}
