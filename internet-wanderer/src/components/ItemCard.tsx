import { Bookmark, BookmarkCheck, ExternalLink, Globe2, Newspaper, Clock3, ScanLine } from 'lucide-react';
import { useBookmarks } from '../app/bookmarks-context';
import BrowserFrame from './BrowserFrame';
import type { WanderItem } from '../domain/item-schema';
import { domainName, formatDate, languageName } from '../content/format';
import { useContent } from '../app/content-context';
import ElsewherePostcard from './experiences/ElsewherePostcard';
import { getExperienceTheme } from '../ui/themes';
import NewsMasthead from './experiences/NewsMasthead';

const kindNames = { website: '互联网的一角', news: '来自另一种视角', archive: '一张旧网页', event: '当年一件事' };
const kindIcons = { website: Globe2, news: Newspaper, archive: ScanLine, event: Clock3 };

export default function ItemCard({ item, compact = false, index = 0 }: { item: WanderItem; compact?: boolean; index?: number }) {
  const { repository: { sourceById, isSourceFresh, newsSnapshot, years }, runtime: contentRuntime } = useContent();
  const source = sourceById.get(item.sourceId);
  const { bookmarks, toggle } = useBookmarks();
  const saved = bookmarks.some((bookmark) => bookmark.id === item.id);
  const Icon = kindIcons[item.kind];
  const mode = item.history ? 'time' : item.kind === 'news' ? 'news' : 'elsewhere';
  const stale = item.kind === 'news' && !isSourceFresh(item.sourceId);
  const lastUpdated = newsSnapshot.sourceStates[item.sourceId]?.lastSuccessAt;
  return <article className={`item-card ${compact ? 'item-card--compact' : ''} kind-${item.kind}`} data-testid="wander-card">
    <BrowserFrame theme={getExperienceTheme(mode, item.history?.year, years)} mode={mode} year={item.history?.year} address={domainName(item.url)} label={item.history ? `${item.history.year} / fragment ${String(index + 1).padStart(2, '0')}` : item.kind === 'news' ? 'the other side of the story' : 'a small corner of a very big web'}>
      {!compact && item.kind === 'website' && !item.history && <ElsewherePostcard item={item} />}
      {item.kind === 'news' && <NewsMasthead source={source} language={item.language} />}
      {item.history && <div className="fragment-ribbon"><span>FRAGMENT {String(index + 1).padStart(2, '0')}</span><b>{({ event: '当年发生', place: '当年去处', archive: '网页存档' } as const)[item.history.role ?? (item.kind === 'archive' ? 'archive' : item.kind === 'event' ? 'event' : 'place')]}</b></div>}
      <div className="item-body">
        <div className="item-eyebrow"><Icon size={15} strokeWidth={1.6} /><span>{kindNames[item.kind]}</span>{item.history && <span className="year-tag">{item.history.year}</span>}{item.kind === 'news' && <span className="news-edition">{contentRuntime.isDemo ? 'SAMPLE EDITION' : 'NEWS DRIFT'}</span>}</div>
        <h2 className={item.kind === 'news' && item.title.length > 95 ? 'headline-long' : undefined} lang={item.language}>{item.title}</h2>
        {item.blurb && <p className="item-description">{item.blurb}</p>}
        {item.kind === 'news' && <div className="news-context">
          <p>{source?.publisherType === 'institution' ? '机构资讯' : '新闻报道'} · {source?.publisherCountry ?? '地区未标注'} · {languageName(item.language)}</p>
          <p>发表于 {formatDate(item.publishedAt, true)}</p>
          {item.author && <p>作者：{item.author}</p>}
          {stale && <p className="snapshot-note">旧快照 · {lastUpdated ? `上次更新 ${formatDate(lastUpdated, true)}` : '更新时间未知'}</p>}
        </div>}
        {item.history?.occurredOn && <p className="date-note">事件日期 · {item.history.occurredOn}</p>}
        {item.archive && <div className="archive-context"><p>保存于 {formatDate(item.archive.capturedAt, true)}</p><p>网页可能缺少图片或部分链接。<a href={item.archive.originalUrl} target="_blank" rel="noopener noreferrer">查看原网址</a></p></div>}
        {item.tags?.length ? <div className="tag-list">{item.tags.slice(0, 3).map((tag) => <span key={tag}>{tag}</span>)}</div> : null}
        <div className="item-bottom">
          <a className="visit-button" href={item.url} target="_blank" rel="noopener noreferrer" aria-label={`打开这一站：${item.title}`}>打开这一站 <ExternalLink size={15} /></a>
          <button className="save-bookmark" aria-label={`${saved ? '取消收藏' : '收藏'}：${item.title}`} aria-pressed={saved} onClick={() => toggle(item, source)}>{saved ? <BookmarkCheck size={17} /> : <Bookmark size={17} />}{saved ? '已收藏' : '收藏'}</button>
          {!compact && <span className="new-tab-note">在新标签页相遇 ↗</span>}
        </div>
        <div className="source-note">
          {source && <a href={source.url} target="_blank" rel="noopener noreferrer">{source.name}</a>}
          {item.kind !== 'news' && <span>{languageName(item.language)}</span>}
          {item.licenseUrl && <a href={item.licenseUrl} target="_blank" rel="noopener noreferrer">CC BY 3.0</a>}
        </div>
      </div>
    </BrowserFrame>
  </article>;
}
