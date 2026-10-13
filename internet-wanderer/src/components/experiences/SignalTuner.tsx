import { Radio, Shuffle } from 'lucide-react';
import { languageName } from '../../content/format';
import type { ContentSource } from '../../domain/item-schema';

export default function SignalTuner({ sources, sourceId, sequence, tune, drift }: { sources: ContentSource[]; sourceId: string; sequence: number; tune: (id: string) => void; drift: () => void }) {
  const index = Math.max(0, sources.findIndex(source => source.id === sourceId));
  const source = sources[index];
  return <section className="signal-tuner" aria-label="新闻调频台" data-testid="signal-tuner">
    <header><span><Radio size={16} /> WORLD RECEIVER</span><span>ND—01</span></header>
    <div className="signal-scope" key={`${sourceId}-${sequence}`} aria-hidden="true"><i /><i /><i /><span className="signal-sweep" /><div className="signal-pin"><b /></div><span className="scope-coordinate">A SIGNAL FROM<br /><strong>{source?.publisherCountry ?? 'ELSEWHERE'}</strong></span></div>
    <div className="tuner-readout"><div><span>STATION {String(index + 1).padStart(2, '0')}</span><h2>{languageName(source?.language)}</h2></div><span className="signal-locked"><i /> SIGNAL FOUND</span></div>
    <div className="tuner-dial">
      <label htmlFor="station-frequency">滑动调频，捕捉一个陌生视角</label>
      <input id="station-frequency" aria-label="新闻来源调频" aria-valuetext={source ? `${source.name}，${languageName(source.language)}，来源所在地 ${source.publisherCountry}` : '暂无来源'} type="range" min="0" max={Math.max(0, sources.length - 1)} step="1" value={index} disabled={sources.length < 2} onChange={event => { const picked = sources[Number(event.target.value)]; if (picked) tune(picked.id); }} />
      <div className="tuner-ticks" aria-hidden="true">{sources.map((entry, position) => <span key={entry.id} className={index === position ? 'is-tuned' : ''}>{String(position + 1).padStart(2, '0')}</span>)}</div>
    </div>
    <div className="tuned-source"><span>正在接收</span><strong>{source?.name ?? '未知来源'}</strong><span>{source?.publisherCountry} · {languageName(source?.language)}</span></div>
    <button className="tuner-drift" onClick={drift}><Shuffle size={16} />让信号继续漂流 <span>↗</span></button>
    <p className="tuner-footnote">每个刻度是一处新闻来源。<br />地区指来源所在地，消息保留原始发表时间。</p>
  </section>;
}
