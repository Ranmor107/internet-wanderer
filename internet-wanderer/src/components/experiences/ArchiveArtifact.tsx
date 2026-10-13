import type { WanderItem } from '../../domain/item-schema';
import { domainName } from '../../content/format';

export default function ArchiveArtifact({ item }: { item: WanderItem }) {
  const host = domainName(item.archive?.originalUrl ?? item.url);
  const year = item.history?.year ?? '';
  return <div className="archive-artifact" aria-label={`${year} 年网页意象，非原站截图`}>
    <div className="artifact-toolbar" aria-hidden="true"><span>←</span><span>→</span><span>↻</span><i>{host}</i></div>
    <div className="artifact-paper"><span className="artifact-caption">A FRAGMENT OF THE INTERNET / {year}</span><strong>{host.replace(/^www\d*\./, '').split('.')[0]}<em>_</em></strong><div className="artifact-links" aria-hidden="true"><span>explore</span><span>people</span><span>ideas</span><span>somewhere else</span></div><div className="artifact-columns" aria-hidden="true"><div /><div /><div /></div><span className="artifact-footnote">网页意象 · 打开原始档案查看真实页面 ↗</span></div>
  </div>;
}
