import { Link } from 'react-router-dom';
import { ArrowDown, ArrowUpRight, Shuffle } from 'lucide-react';
import { useContent } from '../app/content-context';
import { domainName } from '../content/format';
import WebsitePreview, { FEATURED_SITE_IDS } from '../components/experiences/WebsitePreview';
import ArchiveArtifact from '../components/experiences/ArchiveArtifact';
import NewsWorldPreview from '../components/experiences/NewsWorldPreview';

export default function Home() {
  const { repository } = useContent();
  const sites = FEATURED_SITE_IDS.map(id => repository.itemById.get(id)).filter(item => !!item && repository.canRestore(item, 'elsewhere'));
  const archive = repository.allItems.find(item => item.kind === 'archive');
  return <main className="home-page page-enter">
    <section className="departure-hero" aria-labelledby="home-title">
      <span className="home-kicker"><i /> THE INTERNET HAS OTHER PLANS FOR YOU.</span>
      <h1 id="home-title">Go somewhere<br /><em>unexpected.</em></h1>
      <p className="hero-intro">离开常开的那几个标签页。<br className="mobile-break" />下一站，可能有点奇怪。</p>
      <Link className="surprise-button departure-button" data-testid="home-surprise-cta" to="/wander?mode=surprise" state={{ freshStart: true }} aria-label="Surprise me · Take me somewhere · 带我去别处"><Shuffle size={24} /><span>Take me somewhere<small>带我去别处</small></span><ArrowUpRight size={29} /></Link>
      <Link className="just-web-link" to="/wander?mode=elsewhere" state={{ freshStart: true }} aria-label="Elsewhere · 跳入一个陌生网站">只想逛网站？试试 Elsewhere <ArrowUpRight size={13} /></Link>
      <span className="hero-thread" aria-hidden="true">↓</span>
    </section>
    <section className="possible-stops" aria-labelledby="possible-stops-title">
      <header><div><span className="eyebrow">A FEW POSSIBLE NEXT TABS</span><h2 id="possible-stops-title">下一站，可能长这样。</h2></div><span>点击直达 · 新标签打开 · 原创示意预览 <ArrowDown size={13} /></span></header>
      <div className="sample-wall">{sites.map((item, index) => item && <a className={`sample-window sample-window-${index}`} key={item.id} href={item.url} target="_blank" rel="noopener noreferrer" aria-label={`打开网站：${item.title}（新标签页）`} data-testid="site-example">
        <div className="sample-chrome"><span aria-hidden="true">● ○ ○</span><span>{domainName(item.url)}</span><ArrowUpRight size={12} /></div><WebsitePreview item={item} small /><div className="sample-caption"><h3>{item.title}</h3><ArrowUpRight size={17} /><p>{item.blurb}</p></div>
      </a>)}</div>
      <div className="sample-wall-note"><span>小小的网页，各有自己的世界。</span><Link to="/wander?mode=elsewhere" state={{ freshStart: true }}>沿着一条链接走远 <ArrowUpRight size={14} /></Link></div>
    </section>
    <div className="other-worlds-label"><span>THE WEB ALSO HAS OTHER FREQUENCIES.</span><span>或者，换一种漫游方式。</span></div>
    <section className="home-other-worlds" aria-label="另外两个探索世界">
      <NewsWorldPreview />
      <Link className="home-time-world" to={`/wander?mode=time${archive?.history ? `&year=${archive.history.year}` : ''}`} state={archive ? { restoreItemId: archive.id } : undefined} aria-label="Time Machine · 穿过一扇历史窗口"><header><span>Time Machine</span><ArrowUpRight size={21} /></header>{archive && <div className="home-archive-window"><ArchiveArtifact item={archive} /></div>}<div className="home-time-caption"><span className="eyebrow">THE PAST IS STILL ONLINE</span><h2>{archive?.title ?? 'Open a window to another year.'}</h2><p>事件、去处、旧网页。走进一个年代的互联网。</p></div></Link>
    </section>
    <div className="home-endnote"><span className="trail-mark" aria-hidden="true">⤳</span><p>You don’t have to know where you’re going.</p><span>只需要一点好奇心。</span></div>
  </main>;
}
