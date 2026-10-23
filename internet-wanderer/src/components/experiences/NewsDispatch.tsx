import { Bookmark, BookmarkCheck, ExternalLink } from 'lucide-react';
import { useContent } from '../../app/content-context';
import { useBookmarks } from '../../app/bookmarks-context';
import { formatDate, languageName } from '../../content/format';
import { SELECTION_RULES } from '../../domain/modes';
import type { WanderItem } from '../../domain/item-schema';

/** A dispatch belongs to a place; it has no simulated browser chrome. */
export default function NewsDispatch({ item, expanded }: { item: WanderItem; expanded: boolean }) {
  const { repository: { sourceById, isSourceFresh, newsSnapshot } } = useContent();
  const { bookmarks, toggle } = useBookmarks();
  const source = sourceById.get(item.sourceId);
  const saved = bookmarks.some(bookmark => bookmark.id === item.id);
  const historical = !!item.publishedAt && Date.now() - Date.parse(item.publishedAt) > SELECTION_RULES.newsRecentAgeMs;
  const lastUpdated = newsSnapshot.sourceStates[item.sourceId]?.lastSuccessAt;
  return <article className="news-letter kind-news" data-testid="wander-card" key={item.id}>
    <div className="dispatch-edition"><span>{source?.name ?? '远方消息'}</span><span className="news-edition">{historical ? '历史新闻' : '新闻档案'}</span></div>
    <h2 lang={item.language}>{item.title}</h2>
    <div className="news-context"><p>发表于 {item.publishedAt ? formatDate(item.publishedAt, true) : '时间未记录'}</p><p>{languageName(item.language)} · {source?.publisherType === 'institution' ? '机构资讯' : '新闻报道'}</p></div>
    {item.blurb && <p className="dispatch-summary">{item.blurb}</p>}
    <div className="dispatch-byline">{item.author && <p>作者：{item.author}</p>}{item.translator && <p>译者：{item.translator}</p>}</div>
    <div className="dispatch-actions"><a className="visit-button" href={item.url} target="_blank" rel="noopener noreferrer" aria-label={`打开这一站：${item.title}`}>阅读原文 <ExternalLink size={14} /></a><button className="save-bookmark" aria-label={`${saved ? '取消收藏' : '收藏'}：${item.title}`} aria-pressed={saved} onClick={() => toggle(item, source)}>{saved ? <BookmarkCheck size={16} /> : <Bookmark size={16} />}{saved ? '已收藏' : '收藏'}</button></div>
    <div className="source-note"><span>来源位于 {source?.publisherCountry ?? '地区未标注'}</span>{source && <a href={source.url} target="_blank" rel="noopener noreferrer">{source.name}</a>}{item.licenseUrl && <a href={item.licenseUrl} target="_blank" rel="noopener noreferrer">CC BY 3.0</a>}</div>
    {expanded && <div className="dispatch-provenance">
      {!isSourceFresh(item.sourceId) && <p className="snapshot-note">保存版本 · {lastUpdated ? `上次采集 ${formatDate(lastUpdated, true)}` : '采集时间未记录'}</p>}
      <p>保留原始发表时间；地球上的信号代表馆藏报道，并非实时新闻。</p>
    </div>}
  </article>;
}
