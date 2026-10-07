import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import { Bookmark as BookmarkIcon, Download, ExternalLink, Trash2, Upload, X } from 'lucide-react';
import { useBookmarks } from '../app/bookmarks-context';
import { MAX_BOOKMARKS, MAX_IMPORT_BYTES, mergeBookmarks, parseBookmarkFile, serializeBookmarks, type Bookmark } from '../domain/bookmarks';
import { resolveBookmark } from '../content/bookmarks';
import { domainName, formatDate } from '../content/format';
import { useContent } from '../app/content-context';

export default function BookmarksDialog({ open, close }: { open: boolean; close: () => void }) {
  const { repository: { catalogItemById, sourceById } } = useContent();
  const dialog = useRef<HTMLDialogElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const importRequest = useRef(0);
  const { bookmarks, storageStatus, remove, importBookmarks } = useBookmarks();
  const [pending, setPending] = useState<{ name: string; bookmarks: Bookmark[] } | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [reading, setReading] = useState(false);

  useEffect(() => {
    if (open && !dialog.current?.open) dialog.current?.showModal();
    if (!open) {
      dialog.current?.close();
      importRequest.current += 1;
      setPending(null);
      setError('');
      setNotice('');
      setReading(false);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    // Some browsers briefly focus the document after the last dialog control.
    // Keep both directions inside the modal, including after a focused entry is removed.
    const keepFocusInDialog = (event: KeyboardEvent) => {
      if (event.key !== 'Tab' || event.altKey || event.ctrlKey || event.metaKey) return;
      const modal = dialog.current;
      if (!modal?.open) return;
      const controls = [...modal.querySelectorAll<HTMLElement>('a[href], button, input, select, textarea, [tabindex]')]
        .filter((element) => element.tabIndex >= 0 && !element.matches(':disabled') && element.getClientRects().length > 0 && getComputedStyle(element).visibility !== 'hidden');
      const first = controls[0];
      const last = controls.at(-1);
      if (!first || !last) {
        event.preventDefault();
        modal.focus();
        return;
      }
      const active = document.activeElement;
      const focusIsOnControl = controls.some((element) => element === active);
      if (!focusIsOnControl || (event.shiftKey ? active === first : active === last)) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
      }
    };
    document.addEventListener('keydown', keepFocusInDialog, true);
    return () => document.removeEventListener('keydown', keepFocusInDialog, true);
  }, [open]);

  const preview = useMemo(() => {
    if (!pending) return null;
    try { return { ...mergeBookmarks(bookmarks, pending.bookmarks), error: '' }; }
    catch (error) { return { added: 0, duplicates: 0, error: error instanceof Error ? error.message : '无法合并这份收藏。' }; }
  }, [bookmarks, pending]);

  async function selectFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    const request = ++importRequest.current;
    setPending(null);
    setError('');
    setNotice('');
    setReading(true);
    try {
      if (file.size > MAX_IMPORT_BYTES) throw new Error('备份文件不能超过 1 MiB，请选择更小的收藏文件。');
      const incoming = parseBookmarkFile(await file.text());
      if (request !== importRequest.current) return;
      if (!incoming.length) throw new Error('这份备份中没有收藏，现有内容未改动。');
      setPending({ name: file.name, bookmarks: incoming });
    } catch (error) {
      if (request === importRequest.current) setError(error instanceof Error ? error.message : '无法读取收藏文件，现有内容未改动。');
    } finally {
      if (request === importRequest.current) setReading(false);
    }
  }

  function exportFile() {
    setError('');
    try {
      const now = new Date();
      const data = serializeBookmarks(bookmarks, now);
      const url = URL.createObjectURL(new Blob([data], { type: 'application/json;charset=utf-8' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = `internet-wanderer-favorites-${now.toISOString().slice(0, 10)}.json`;
      document.body.append(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      setNotice('已生成收藏备份。换设备后可以用“导入收藏”恢复。');
    } catch (error) {
      setError(error instanceof Error ? error.message : '导出失败，收藏仍保留在这里。');
    }
  }

  function confirmImport() {
    if (!pending || !preview || preview.error || !preview.added) return;
    const result = importBookmarks(pending.bookmarks);
    if (result.ok) {
      setPending(null);
      setNotice(result.message);
    } else setError(result.message);
  }

  return <dialog ref={dialog} className="recent-dialog bookmarks-dialog" aria-labelledby="bookmarks-title" onCancel={close} onClick={(event) => { if (event.target === dialog.current) close(); }}>
    <div className="recent-content bookmarks-content">
      <header>
        <div><span className="eyebrow">A FEW PLACES TO KEEP</span><h2 id="bookmarks-title">我的收藏 <span className="bookmark-count" aria-hidden="true">{bookmarks.length}</span></h2></div>
        <button className="icon-button" onClick={close} aria-label="关闭收藏"><X size={21} /></button>
      </header>
      <p className="bookmark-intro">有些偶遇，值得留下。收藏保存在这个浏览器里，导出一份就能带走。</p>
      <div className="bookmark-tools">
        <button className="bookmark-tool" onClick={exportFile} disabled={!bookmarks.length}><Download size={16} />导出收藏</button>
        <button className="bookmark-tool" onClick={() => fileInput.current?.click()} disabled={reading}><Upload size={16} />{reading ? '正在读取…' : '导入收藏'}</button>
        <input ref={fileInput} type="file" accept="application/json,.json" aria-label="选择收藏备份文件" onChange={selectFile} hidden />
      </div>
      {storageStatus !== 'ready' && <p className="bookmark-warning" role="status">{storageStatus === 'corrupt' ? '已有的本机收藏数据无法读取，原数据未覆盖。新增收藏仅暂存本次页面，请及时导出。' : '浏览器暂时无法保存收藏，仅暂存本次页面。离开前请导出备份。'}</p>}
      {error && <p className="bookmark-error" role="alert">{error}</p>}
      {notice && <p className="bookmark-notice" role="status">{notice}</p>}
      {pending && preview && <section className="import-preview" aria-label="收藏导入预览">
        <h3>准备导入</h3><p className="import-filename">{pending.name}</p>
        {preview.error ? <p role="alert">{preview.error}</p> : <p>新增 <strong>{preview.added}</strong> 条，跳过 <strong>{preview.duplicates}</strong> 条重复收藏。现有收藏会保留。</p>}
        <div><button className="bookmark-import-confirm" disabled={!!preview.error || !preview.added} onClick={confirmImport}>导入 {preview.added} 条收藏</button><button className="text-button" onClick={() => { importRequest.current += 1; setPending(null); setError(''); }}>取消导入</button></div>
      </section>}
      {bookmarks.length ? <div className="bookmark-list">{[...bookmarks].reverse().map((bookmark) => {
        const { item, source, status, oldNews } = resolveBookmark(bookmark, catalogItemById, sourceById);
        return <article className="bookmark-entry" data-testid="bookmark-entry" key={bookmark.id}>
          <div className="bookmark-entry-top"><span>{item.kind === 'news' ? oldNews ? '已收藏的旧闻' : '资讯' : item.history ? `${item.history.year} · 时光切片` : '互联网的一角'}</span><button className="bookmark-remove" aria-label={`移除收藏：${item.title}`} onClick={() => remove(bookmark.id)}><Trash2 size={16} /></button></div>
          <h3>{item.title}</h3>
          <p className="bookmark-domain">{domainName(item.url)}</p>
          {item.kind === 'news' && <p className="bookmark-meta">发表于 {formatDate(item.publishedAt, true)}</p>}
          {item.history?.occurredOn && <p className="bookmark-meta">事件日期 · {item.history.occurredOn}</p>}
          {item.archive && <p className="bookmark-meta">网页保存于 {formatDate(item.archive.capturedAt, true)}</p>}
          {item.author && <p className="bookmark-meta">作者：{item.author}</p>}
          {item.translator && <p className="bookmark-meta">译者：{item.translator}</p>}
          <div className="bookmark-source">{source && (status === 'withdrawn' ? <span>{source.name}</span> : <a href={source.url} target="_blank" rel="noopener noreferrer">{source.name}</a>)}{item.licenseUrl && <a href={item.licenseUrl} target="_blank" rel="noopener noreferrer">{item.licenseUrl === 'https://creativecommons.org/licenses/by/3.0/' ? 'CC BY 3.0' : '内容许可'}</a>}</div>
          {status === 'snapshot' && <p className="bookmark-snapshot">保存时的信息 · 当前内容库未收录</p>}
          {status === 'withdrawn' ? <p className="bookmark-warning">这条内容或来源已停用，暂不提供跳转。</p> : <a className="bookmark-open" href={item.url} target="_blank" rel="noopener noreferrer" aria-label={`打开收藏：${item.title}`}>再去看看 <ExternalLink size={14} /></a>}
          <p className="bookmark-saved-date">收藏于 {formatDate(bookmark.savedAt)}</p>
        </article>;
      })}</div> : <div className="recent-empty bookmark-empty"><BookmarkIcon size={35} strokeWidth={1} /><h3>给一次偶遇，留个位置。</h3><p>在漫游卡片上点“收藏”，<br />或导入以前保存的备份。</p></div>}
      <footer><span>最多 {MAX_BOOKMARKS} 条。导入只加入收藏，不影响漫游池。</span><span>清空“最近遇见”不会删除收藏。</span></footer>
    </div>
  </dialog>;
}
