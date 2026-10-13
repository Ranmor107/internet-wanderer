import { ArrowUpRight } from 'lucide-react';
import { useJourney } from '../../app/journey-context';
import { useContent } from '../../app/content-context';
import { domainName } from '../../content/format';
import type { WanderItem } from '../../domain/item-schema';

const positions = [[18, 63], [33, 38], [48, 66], [63, 46], [48, 20], [70, 17], [81, 38], [84, 69]];

export default function NodeMap({ item, sequence, revisit, openRecent }: { item: WanderItem; sequence: number; revisit: (item: WanderItem) => void; openRecent: () => void }) {
  const { journey } = useJourney();
  const { repository } = useContent();
  const visited = journey.entries.map(entry => repository.itemById.get(entry.id)).filter((entry): entry is WanderItem => !!entry && repository.canRestore(entry, 'elsewhere'));
  const nodes = [...visited.filter(entry => entry.id !== item.id).slice(-7), item];
  const current = nodes.findIndex(node => node.id === item.id);
  const [x, y] = positions[Math.max(0, current)]!;
  return <section className="node-map" aria-label="你的互联网旅行图" data-testid="node-map">
    <header className="map-legend"><span><i /> YOUR LITTLE CORNER OF THE WEB</span><span>{String(visited.length || 1).padStart(2, '0')} NODES FOUND</span></header>
    <div className="map-canvas">
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" fill="none" aria-hidden="true">
        <path className="map-unknown-path" d={`M${x} ${y} Q95 50 91 17 M${x} ${y} Q20 15 11 24`} />
        {nodes.slice(1).map((node, index) => { const [ax, ay] = positions[index]!; const [bx, by] = positions[index + 1]!; return <path key={node.id === item.id ? `${node.id}-${sequence}` : node.id} className={node.id === item.id ? 'map-route map-route--new' : 'map-route'} pathLength="1" d={`M${ax} ${ay} Q${(ax! + bx!) / 2 + 7} ${(ay! + by!) / 2 + 7} ${bx} ${by}`} />; })}
      </svg>
      <span className="unknown-node" style={{ left: '91%', top: '17%' }} aria-hidden="true">?<small>UNEXPLORED</small></span>
      <span className="unknown-node unknown-node--small" style={{ left: '11%', top: '24%' }} aria-hidden="true">+</span>
      {nodes.map((node, index) => <button key={node.id} className={`map-node ${node.id === item.id ? 'is-current' : ''}`} style={{ left: `${positions[index]![0]}%`, top: `${positions[index]![1]}%` }} onClick={() => revisit(node)} aria-label={`回访：${node.title}`} aria-pressed={node.id === item.id} title={node.title}><span>{node.id === item.id ? <ArrowUpRight size={18} /> : String(index + 1).padStart(2, '0')}</span><small>{domainName(node.url)}</small></button>)}
      <span className="map-margin-note" aria-hidden="true">THERE IS ALWAYS<br />ANOTHER CONNECTION.</span>
    </div>
    <footer><span><b />已遇见 <i />未知方向</span><button className="text-button" onClick={openRecent}>查看全部足迹 <ArrowUpRight size={14} /></button></footer>
  </section>;
}
