import { Link } from 'react-router-dom';
import { ArrowDown, ArrowUpRight, MoveUpRight, Shuffle } from 'lucide-react';
import { useContent } from '../app/content-context';

function ConnectedWorlds({ firstYear, lastYear }: { firstYear?: number; lastYear?: number }) {
  return <div className="connected-worlds" aria-label="三个相连的探索世界">
    <svg className="world-connections" viewBox="0 0 640 480" fill="none" aria-hidden="true">
      <path d="M62 174C62 64 210 62 279 133S426 219 481 133M217 170C224 253 383 201 415 290S344 412 278 388M482 171C567 246 585 367 464 385" />
      <path className="world-route" d="M86 257C119 201 117 129 217 154S274 320 365 334" />
      <circle cx="86" cy="257" r="5" /><circle cx="279" cy="133" r="4" /><circle cx="464" cy="385" r="4" />
    </svg>
    <span className="atlas-coordinate atlas-coordinate--top">THE OPEN INTERNET / NO FIXED ROUTE</span>
    <Link to="/wander?mode=elsewhere" className="world-elsewhere" aria-label="Elsewhere · 跳入一个陌生网站">
      <span className="world-number">01 / JUMP</span>
      <svg viewBox="0 0 280 170" fill="none" aria-hidden="true"><path d="M23 121L75 69L150 107L207 38L256 81M75 69L119 24M150 107L204 153" /><path className="world-route" d="M23 121L75 69L150 107L207 38" /><circle cx="23" cy="121" r="5" /><circle cx="75" cy="69" r="7" /><circle cx="150" cy="107" r="5" /><circle cx="119" cy="24" r="4" /><circle cx="256" cy="81" r="4" /><circle cx="204" cy="153" r="4" /><circle className="node-destination" cx="207" cy="38" r="14" /><path className="node-arrow" d="M202 43l10-10m-10 0h10v10" /></svg>
      <h2>Elsewhere <ArrowUpRight size={18} /></h2><p>沿一条链接，走远一点。</p>
    </Link>
    <Link to="/wander?mode=news" className="world-news" aria-label="News Drift · 接收一则远方消息">
      <span className="world-number">02 / DRIFT</span>
      <div className="mini-signal" aria-hidden="true"><span /><span /><span /><i /><b>↗</b></div>
      <h2>News Drift <ArrowUpRight size={18} /></h2><p>调频，偶遇世界的另一面。</p>
      <span className="mini-wave" aria-hidden="true">▂ ▃ ▆ ▂ ▅ ▇ ▃ ▂ ▅</span>
    </Link>
    <Link to="/wander?mode=time" className="world-time" aria-label="Time Machine · 穿过一扇历史窗口">
      <span className="world-number">03 / TRAVEL</span>
      <div className="mini-windows" aria-hidden="true"><i /><i /><div><span>INTERNET EXPLORER <b>− □ ×</b></span><strong>{firstYear ?? 'PAST'}<span>→</span>{lastYear ?? 'NOW'}</strong><em>the past is still online.</em></div></div>
      <h2>Time Machine <ArrowUpRight size={18} /></h2><p>过去，只隔着一扇窗口。</p>
    </Link>
  </div>;
}

export default function Home() {
  const { repository: { years, websiteCount, newsSnapshot } } = useContent();
  return <main className="home-page page-enter">
    <section className="home-hero" aria-labelledby="home-title">
      <div className="hero-copy">
        <div className="home-kicker"><span className="live-dot" /> AN OPEN INVITATION TO WANDER</div>
        <h1 id="home-title" aria-label="Get lost on the Internet again.">Get lost.<br />Find <em>wonder.</em><span className="title-trail" aria-hidden="true">↗</span></h1>
        <p className="hero-intro">不是每一次上网，都需要一个目的地。<br />让好奇心，把你带到熟悉之外。</p>
        <Link className="surprise-button" data-testid="home-surprise-cta" to="/wander?mode=surprise" state={{ freshStart: true }}><Shuffle size={20} /><span>Surprise me<small>下一站，交给偶然</small></span><MoveUpRight size={22} /></Link>
        <p className="hero-footnote">NO SEARCH. NO PLAN. JUST ONE MORE CLICK.</p>
      </div>
      <ConnectedWorlds firstYear={years[0]?.year} lastYear={years.at(-1)?.year} />
    </section>
    <section className="departure-index" aria-label="选择漫游方向">
      <div className="departure-caption"><ArrowDown size={18} /><span>THREE WAYS<br />TO GET A LITTLE LOST.</span></div>
      <Link to="/wander?mode=elsewhere"><span className="index-number">01</span><div><strong>跳出日常</strong><span>{websiteCount} 个精选网站 · 跟着链接走</span></div><ArrowUpRight size={19} /></Link>
      <Link to="/wander?mode=news"><span className="index-number">02</span><div><strong>听见远方</strong><span>{new Set(newsSnapshot.items.map(item => item.language)).size} 种原文语言 · 接收陌生视角</span></div><ArrowUpRight size={19} /></Link>
      <Link to="/wander?mode=time"><span className="index-number">03</span><div><strong>回到从前</strong><span>{years.length} 个精选年份 · 走进真实档案</span></div><ArrowUpRight size={19} /></Link>
    </section>
    <div className="home-endnote"><span className="trail-mark" aria-hidden="true">⤳</span><p>The best things aren’t always what you’re looking for.</p><span>一小段没有目的的旅程。</span></div>
  </main>;
}
