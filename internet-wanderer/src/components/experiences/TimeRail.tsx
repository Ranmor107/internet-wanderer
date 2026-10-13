import { Link } from 'react-router-dom';
import { useEffect, useRef } from 'react';
import { ArrowLeft, ArrowRight, Shuffle } from 'lucide-react';
import type { YearDefinition } from '../../domain/year-schema';

export default function TimeRail({ years, year, changeYear }: { years: YearDefinition[]; year?: number; changeYear: () => void }) {
  const index = years.findIndex(option => option.year === year);
  const selected = useRef<HTMLAnchorElement>(null);
  useEffect(() => { selected.current?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'instant' }); }, [year]);
  return <section className="year-control" aria-label="选择年份">
    <div className="time-rail-heading"><span className="eyebrow">CHOOSE A POINT IN TIME</span><button className="text-button" onClick={changeYear}><Shuffle size={14} />随机年份</button></div>
    <div className="time-rail"><Link className={`rail-step ${index <= 0 ? 'is-disabled' : ''}`} to={`/wander?mode=time&year=${years[Math.max(0, index - 1)]?.year}`} aria-label="上一个年份" aria-disabled={index <= 0} tabIndex={index <= 0 ? -1 : 0} onClick={event => { if (index <= 0) event.preventDefault(); }}><ArrowLeft size={18} /></Link><div className="year-buttons">{years.map(option => <Link ref={option.year === year ? selected : undefined} key={option.year} to={`/wander?mode=time&year=${option.year}`} className={option.year === year ? 'selected' : ''} aria-current={option.year === year ? 'date' : undefined}><span>{option.year}</span><i /></Link>)}</div><Link className={`rail-step ${index >= years.length - 1 ? 'is-disabled' : ''}`} to={`/wander?mode=time&year=${years[Math.min(years.length - 1, index + 1)]?.year}`} aria-label="下一个年份" aria-disabled={index >= years.length - 1} tabIndex={index >= years.length - 1 ? -1 : 0} onClick={event => { if (index >= years.length - 1) event.preventDefault(); }}><ArrowRight size={18} /></Link></div>
  </section>;
}
