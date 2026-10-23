import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, Radio } from 'lucide-react';
import EarthGlobe, { type EarthTarget } from './EarthGlobe';
import { NEWS_REGIONS } from '../../ui/globe/geography';

export default function NewsWorldPreview() {
  const [target, setTarget] = useState<EarthTarget>({ ...NEWS_REGIONS.find(region => region.id === 'KE')!, token: 0, animate: false });
  return <article className="home-news-world earth-preview-card">
    <header><span><Radio size={17} /> News Drift</span><span>DRAG THE WORLD ↗</span></header>
    <div className="home-earth"><EarthGlobe regions={NEWS_REGIONS} target={target} preview onPick={point => setTarget(previous => ({ ...point, token: previous.token + 1, animate: true }))} /></div>
    <Link className="news-world-link" to="/wander?mode=news" state={{ freshStart: true }} aria-label="News Drift · 接收一则远方消息"><span className="eyebrow">A PLANET FULL OF STORIES</span><h2>世界的另一边，<br /><em>正在说什么？</em></h2><p>转动地球，从一个地区的消息出发。</p><span className="world-invitation">开始地球漫游 <ArrowUpRight size={17} /></span></Link>
  </article>;
}
