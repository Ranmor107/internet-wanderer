import { Link } from 'react-router-dom';
import { ArrowDown, ArrowUpRight, Asterisk, Clock3, Globe2, MoveUpRight, Newspaper, Shuffle } from 'lucide-react';
import BrowserFrame from '../components/BrowserFrame';
import { useContent } from '../app/content-context';

const doors = [
  { mode: 'elsewhere', number: '01', icon: Globe2, title: 'Elsewhere', sub: 'Somewhere unexpected.', text: '去一个从没听说过的网站。', detail: 'SMALL WEB, BIG FEELINGS', tint: 'lime' },
  { mode: 'news', number: '02', icon: Newspaper, title: 'News Drift', sub: 'A different point of view.', text: '偶遇一则熟悉视野之外的消息。', detail: 'A WINDOW, NOT A FEED', tint: 'lilac' },
  { mode: 'time', number: '03', icon: Clock3, title: 'Time Machine', sub: 'The past is still online.', text: '把浏览器，拨回另一个年代。', detail: '1999 / 2007 / 2012', tint: 'peach' },
];

function UnknownWindow() {
  return <div className="unknown-window">
    <div className="floating-note note-hello" aria-hidden="true"><span>new connection</span><strong>hello, stranger<span className="blink-dot">.</span></strong><i>glad you found this place ↗</i></div>
    <Link className="portal-link" to="/wander?mode=surprise" state={{ freshStart: true }} aria-label="打开未知目的地">
      <BrowserFrame mode="surprise" address="somewhere.on.the.internet" label="destination: unknown" className="portal-window">
        <div className="portal-art" aria-hidden="true">
          <span className="portal-caption">THERE'S SOMETHING<br />ON THE OTHER SIDE.</span>
          <div className="portal-door"><div><div><div><Asterisk strokeWidth={1} /></div></div></div></div>
          <svg className="portal-cursor" viewBox="0 0 45 57"><path d="M3 3v43l11-11 9 18 9-5-9-17h16Z" fill="#fbfaf7" stroke="#272824" strokeWidth="2.5" strokeLinejoin="round" /></svg>
          <span className="portal-coordinate">↳ somewhere / somewhen / something</span>
        </div>
        <div className="portal-status"><span><i /> No destination selected.</span><ArrowUpRight size={19} /></div>
      </BrowserFrame>
    </Link>
    <div className="floating-note note-year" aria-hidden="true"><span>YOU HAVE NO NEW TASKS.</span><strong>Just a little curiosity.</strong><div>↖ follow that feeling</div></div>
    <span className="portal-side-note" aria-hidden="true">CLICK INTO THE UNKNOWN</span>
  </div>;
}

export default function Home() {
  const { repository: { years } } = useContent();
  return <main className="home-page page-enter">
    <section className="home-hero" aria-labelledby="home-title">
      <div className="hero-copy">
        <div className="home-kicker"><span className="live-dot" /> THE INTERNET IS STILL OUT THERE.</div>
        <h1 id="home-title" aria-label="Get lost on the Internet again.">Get lost on<br />the Internet<br /><em>again.</em><Asterisk className="title-spark" strokeWidth={1.2} aria-hidden="true" /></h1>
        <p className="hero-intro">不是每次上网，都需要一个目的地。<br />离开熟悉的信息流，让好奇心带路。</p>
        <Link className="surprise-button" data-testid="home-surprise-cta" to="/wander?mode=surprise" state={{ freshStart: true }}><Shuffle size={23} strokeWidth={1.8} /><span>SURPRISE ME<small>随便去哪</small></span><MoveUpRight size={24} /></Link>
        <p className="hero-footnote">No search. No sign-up. Just a little serendipity.</p>
      </div>
      <UnknownWindow />
    </section>
    <div className="door-section-label"><span><ArrowDown size={15} /> OR FOLLOW A THREAD</span><span>有点方向，也可以。</span></div>
    <section className="mode-doors" aria-label="选择漫游方向">
      {doors.map(({ icon: Icon, ...door }) => <Link key={door.mode} className={`mode-door tint-${door.tint}`} to={`/wander?mode=${door.mode}`}>
        <div className="door-top"><span className="door-icon"><Icon size={24} strokeWidth={1.4} /></span><span>{door.number} /</span><ArrowUpRight className="door-arrow" size={20} /></div>
        <h2>{door.title}</h2><p className="door-subtitle">{door.sub}</p><p className="door-description">{door.text}</p><span className="door-detail">{door.mode === 'time' ? years.map(year => year.year).join(' / ') : door.detail}</span>
      </Link>)}
    </section>
    <p className="home-endnote"><Asterisk size={19} /><span>A little less algorithm.<br className="mobile-break" /> A little more accident.</span></p>
  </main>;
}
