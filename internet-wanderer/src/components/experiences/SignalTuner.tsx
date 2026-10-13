import { Radio, Shuffle } from 'lucide-react';
import type { ReactNode } from 'react';
import { languageName } from '../../content/format';
import type { ContentSource } from '../../domain/item-schema';

function SourceWorld({ sourceId }: { sourceId: string }) {
  const origin = sourceId === 'nasa' ? 'us' : sourceId === 'ecb' ? 'de' : sourceId.startsWith('global-voices') ? 'nl' : null;
  return <div className="source-world" aria-label="来源所在地示意：美国、荷兰与德国">
    <svg viewBox="0 0 1000 470" fill="none" aria-hidden="true"><g stroke="currentColor" strokeWidth="1"><path d="M65 119L116 65L175 61L213 86L252 80L289 113L252 155L219 166L204 210L158 214L121 179L87 175Z M230 234L275 223L315 265L308 322L278 380L248 350L240 298Z M417 78L448 55L479 73L468 109L435 113Z M468 152L505 131L549 149L573 191L559 250L528 306L495 287L475 238L453 195Z M497 111L536 69L594 82L636 61L705 92L780 78L850 105L913 149L862 181L793 160L746 183L691 159L649 196L596 167L562 123Z M640 200L685 207L707 243L682 271L661 243Z M787 295L840 279L890 309L872 350L817 359L781 332Z" /><path d="M0 115H1000M0 235H1000M0 355H1000M250 0V470M500 0V470M750 0V470" strokeDasharray="2 8" opacity=".35" /></g></svg>
    <span className={`world-origin origin-us ${origin === 'us' ? 'is-receiving' : ''}`}><i />美国<small>NASA</small></span><span className={`world-origin origin-nl ${origin === 'nl' ? 'is-receiving' : ''}`}><i />荷兰<small>Global Voices</small></span><span className={`world-origin origin-de ${origin === 'de' ? 'is-receiving' : ''}`}><i />德国<small>ECB</small></span>
  </div>;
}

export default function SignalTuner({ sources, sourceId, sequence, tune, drift, children }: { sources: ContentSource[]; sourceId: string; sequence: number; tune: (id: string) => void; drift: () => void; children: ReactNode }) {
  const index = Math.max(0, sources.findIndex(source => source.id === sourceId));
  const source = sources[index];
  return <section className="signal-tuner signal-field" aria-label="新闻调频台" data-testid="signal-tuner">
    <header><span><Radio size={17} /> NEWS DRIFT / WORLD RECEIVER</span><span>ONE SIGNAL AT A TIME</span></header>
    <div className="signal-atlas" key={`${sourceId}-${sequence}`}><SourceWorld sourceId={sourceId} /><span className="signal-capture" aria-hidden="true" /></div>
    <div className="signal-station"><div className="tuner-readout"><div><span>STATION {String(index + 1).padStart(2, '0')}</span><strong>{languageName(source?.language)}</strong></div><span className="signal-locked"><i /> SIGNAL FOUND</span></div><div className="tuned-source"><span>正在接收</span><strong>{source?.name ?? '未知来源'}</strong><span>{source?.publisherCountry} · {languageName(source?.language)}</span></div></div>
    <div className="frequency-console"><div className="tuner-dial"><label htmlFor="station-frequency">滑动调频，接收另一处来源</label><input id="station-frequency" aria-label="新闻来源调频" aria-valuetext={source ? `${source.name}，${languageName(source.language)}，来源所在地 ${source.publisherCountry}` : '暂无来源'} type="range" min="0" max={Math.max(0, sources.length - 1)} step="1" value={index} disabled={sources.length < 2} onChange={event => { const picked = sources[Number(event.target.value)]; if (picked) tune(picked.id); }} /><div className="tuner-ticks" aria-hidden="true">{sources.map((entry, position) => <span key={entry.id} className={index === position ? 'is-tuned' : ''}><b>{String(position + 1).padStart(2, '0')}</b>{languageName(entry.language)}</span>)}</div></div><button className="tuner-drift" onClick={drift}><Shuffle size={16} />让信号继续漂流 <span>↗</span></button></div>
    <div className="signal-dispatch">{children}</div>
    <p className="tuner-footnote">地图标记来源所在地。一次偶遇，不代表世界的全貌。消息保留原始发表时间。</p>
  </section>;
}
