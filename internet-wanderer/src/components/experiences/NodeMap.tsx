import { useState, type ReactNode } from 'react';
import { ArrowUpRight } from 'lucide-react';
import { useJourney } from '../../app/journey-context';
import { useContent } from '../../app/content-context';
import { domainName } from '../../content/format';
import type { WanderItem } from '../../domain/item-schema';

const positions = [[12, 34], [88, 35], [11, 63], [90, 64], [27, 88], [73, 88], [51, 94]] as const;
const branches = [[16, 12], [84, 13], [7, 79], [94, 80]] as const;

export default function NodeMap({ item, sequence, revisit, explore, openRecent, children }: { item: WanderItem; sequence: number; revisit: (item: WanderItem) => void; explore: () => void; openRecent: () => void; children: (explore: () => void) => ReactNode }) {
  const { journey } = useJourney();
  const { repository } = useContent();
  const [branch, setBranch] = useState(1);
  const visited = journey.entries.map(entry => repository.itemById.get(entry.id)).filter((entry): entry is WanderItem => !!entry && repository.canRestore(entry, 'elsewhere'));
  const nodes = visited.filter(entry => entry.id !== item.id).slice(-7);
  return <section className="node-map orbital-map" aria-label="你的互联网旅行图" data-testid="node-map">
    <header className="map-legend"><span><i /> A LITTLE INTERNET OF YOUR OWN</span><span>{String(visited.length || 1).padStart(2, '0')} RECENT NODES</span></header>
    <div className="map-canvas">
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" fill="none" aria-hidden="true">
        {branches.map(([x, y], index) => <path key={`unknown-${index}`} className="map-unknown-path" d={`M50 45Q${x} 45 ${x} ${y}`} />)}
        {nodes.map((node, index) => { const [x, y] = positions[index]!; const [nextX, nextY] = index + 1 < nodes.length ? positions[index + 1]! : [50, 45]; return <path key={node.id} className="map-route" d={`M${x} ${y}Q50 ${(y + nextY) / 2} ${nextX} ${nextY}`} />; })}
        <path key={`${item.id}-${sequence}-${branch}`} className="map-route map-route--new" pathLength="1" d={`M${branches[branch]![0]} ${branches[branch]![1]}Q${branches[branch]![0]} 45 50 45`} />
      </svg>
      {branches.map(([x, y], index) => <button key={index} className={`unknown-node ${branch === index ? 'last-branch' : ''}`} style={{ left: `${x}%`, top: `${y}%` }} onClick={() => { setBranch(index); explore(); }} aria-label={`探索未知分支 ${index + 1}`}><span>?</span><small>{index < 2 ? 'WHAT’S OVER HERE?' : 'ANOTHER WAY'}</small></button>)}
      {nodes.map((node, index) => <button key={node.id} className="map-node" style={{ left: `${positions[index]![0]}%`, top: `${positions[index]![1]}%` }} onClick={() => revisit(node)} aria-label={`回访：${node.title}`} aria-pressed="false" title={node.title}><span>{String(index + 1).padStart(2, '0')}</span><small>{domainName(node.url)}</small></button>)}
    </div>
    <div className="node-center"><div className="current-coordinate"><button className="map-node is-current" onClick={() => revisit(item)} aria-label={`回访：${item.title}`} aria-pressed="true"><span><ArrowUpRight size={19} /></span></button><span>YOU ARE HERE <b>{domainName(item.url)}</b></span></div>{children(() => { setBranch(value => (value + 1) % branches.length); explore(); })}</div>
    <footer><span><b />你的足迹 <i />点击未知节点，发现另一站</span><button className="text-button" onClick={openRecent}>查看全部足迹 <ArrowUpRight size={14} /></button></footer>
  </section>;
}
