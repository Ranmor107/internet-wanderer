import { useEffect, useRef, useState } from 'react';
import { Link, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { Asterisk, Bookmark, Footprints, History, X } from 'lucide-react';
import { JourneyProvider, useJourney } from './app/journey-context';
import { BookmarksProvider, useBookmarks } from './app/bookmarks-context';
import BookmarksDialog from './components/BookmarksDialog';
import { ContentProviderHost, useContent } from './app/content-context';
import { bundledProvider } from './content/providers/bundled';
import type { ContentProvider } from './content/provider';
import { MODE_LABELS } from './domain/modes';
import Home from './pages/Home';
import Wander from './pages/Wander';
import About from './pages/About';

function RecentDialog({ open, close }: { open: boolean; close: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const { repository: { canRestore, itemById } } = useContent();
  const { journey, clear } = useJourney();
  const navigate = useNavigate();
  useEffect(() => {
    if (open && !dialog.current?.open) dialog.current?.showModal();
    if (!open && dialog.current?.open) dialog.current?.close();
  }, [open]);
  return <dialog className="recent-dialog" ref={dialog} aria-labelledby="recent-title" onCancel={close} onClick={(event) => { if (event.target === dialog.current) close(); }}>
    <div className="recent-content"><header><div><span className="eyebrow">YOUR BREADCRUMB TRAIL</span><h2 id="recent-title">最近遇见</h2></div><button className="icon-button" onClick={close} aria-label="关闭最近遇见"><X size={21} /></button></header><p className="recent-intro">最多留下 20 次偶遇，只存在这台设备里。</p>
      {journey.entries.length ? <ol className="recent-list">{[...journey.entries].reverse().map((entry, index) => {
        const item = itemById.get(entry.id);
        const usable = canRestore(item, entry.mode);
        return <li key={entry.id}><span className="recent-index">{String(index + 1).padStart(2, '0')}</span><button disabled={!usable} onClick={() => { close(); navigate(`/wander?mode=${entry.mode}${entry.year ? `&year=${entry.year}` : ''}`, { state: { restoreItemId: entry.id } }); }}><strong>{item?.title ?? '内容已移除'}</strong><span>{usable ? MODE_LABELS[entry.mode] : '内容已到期或移除'}{entry.year ? ` · ${entry.year}` : ''}</span></button></li>;
      })}</ol> : <div className="recent-empty"><Footprints size={35} strokeWidth={1} /><p>还没有足迹。<br />去遇见你的第一站吧。</p></div>}
      <footer><span>清空后，下一次漫游会重新记录。</span><button className="text-button" onClick={clear} disabled={!journey.entries.length}>清空足迹</button></footer>
    </div>
  </dialog>;
}

function Shell() {
  const [recentOpen, setRecentOpen] = useState(false);
  const [bookmarksOpen, setBookmarksOpen] = useState(false);
  const { feedback } = useBookmarks();
  const location = useLocation();
  useEffect(() => { window.scrollTo(0, 0); document.title = location.pathname === '/about' ? '关于 · Internet Wanderer' : 'Internet Wanderer — Get lost again.'; }, [location.pathname]);
  return <div className="app-shell">
    <a className="skip-link" href="#main-content">跳到主要内容</a>
    <header className="site-header"><Link to="/" className="wordmark" aria-label="Internet Wanderer 首页"><Asterisk size={41} strokeWidth={1.4} /><span>internet<br /><strong>wanderer</strong><i>↗</i></span></Link><div className="header-middle">NO MAP. NO PLAN.<span>JUST CURIOSITY.</span></div><nav aria-label="站点导航"><button className="text-button" aria-label="打开收藏" onClick={() => { setRecentOpen(false); setBookmarksOpen(true); }}><Bookmark size={16} /><span>收藏</span></button><button className="text-button" onClick={() => { setBookmarksOpen(false); setRecentOpen(true); }}><History size={16} /><span>足迹</span></button><Link to="/about" className={location.pathname === '/about' ? 'header-link is-current' : 'header-link'}>关于 ↗</Link></nav></header>
    <div id="main-content" tabIndex={-1}><Routes><Route path="/" element={<Home />} /><Route path="/wander" element={<Wander key={`${location.state?.entryKey ?? location.key}:${location.search}`} openRecent={() => setRecentOpen(true)} />} /><Route path="/about" element={<About />} /><Route path="*" element={<Navigate to="/" replace />} /></Routes></div>
    <footer className="site-footer"><span>© 2026 INTERNET WANDERER</span><span>THE WEB IS STILL A WEIRD, WONDERFUL PLACE.</span><Link to="/about">STAY CURIOUS ↗</Link></footer>
    <RecentDialog open={recentOpen} close={() => setRecentOpen(false)} />
    <BookmarksDialog open={bookmarksOpen} close={() => setBookmarksOpen(false)} />
    <div className={feedback ? 'bookmark-feedback is-visible' : 'bookmark-feedback'} role="status" aria-live="polite">{feedback}</div>
  </div>;
}

export default function App({ contentProvider = bundledProvider }: { contentProvider?: ContentProvider }) { return <JourneyProvider><BookmarksProvider><ContentProviderHost provider={contentProvider}><Shell /></ContentProviderHost></BookmarksProvider></JourneyProvider>; }
