import { useEffect, useImperativeHandle, useRef, useState, type Ref } from 'react';
import type { EarthApi, EarthTarget } from '../../ui/globe/earth-scene';
import type { NewsRegion } from '../../ui/globe/geography';

export type { EarthApi, EarthTarget } from '../../ui/globe/earth-scene';
export default function EarthGlobe({ regions, target, preview = false, onPick, onArrive, onInterrupt, ref }: {
  regions: NewsRegion[]; target?: EarthTarget; preview?: boolean; ref?: Ref<EarthApi | undefined>;
  onPick?: (point: { id: string; name: string; longitude: number; latitude: number }) => void;
  onArrive?: (target: EarthTarget) => void; onInterrupt?: () => void;
}) {
  const host = useRef<HTMLDivElement>(null), api = useRef<EarthApi | undefined>(undefined);
  const callbacks = useRef({ onPick, onArrive, onInterrupt, target });
  callbacks.current = { onPick, onArrive, onInterrupt, target };
  const [status, setStatus] = useState<'loading' | 'ready' | 'unavailable'>('loading');
  const [attempt, setAttempt] = useState(0);
  useImperativeHandle(ref, () => ({
    flyTo: point => api.current?.flyTo(point), zoom: direction => api.current?.zoom(direction),
    reset: () => api.current?.reset(), signals: value => api.current?.signals(value), dispose: () => api.current?.dispose(),
  }), []);
  useEffect(() => {
    let disposed = false;
    const node = host.current!;
    const observer = new IntersectionObserver(async ([entry]) => {
      if (!entry.isIntersecting) return;
      observer.disconnect();
      try {
        const { createEarth } = await import('../../ui/globe/earth-scene');
        if (disposed) return;
        api.current = createEarth(node, {
          regions, preview,
          pick: point => callbacks.current.onPick?.(point),
          arrive: point => callbacks.current.onArrive?.(point),
          interrupt: () => callbacks.current.onInterrupt?.(),
          ready: () => {
            if (disposed) return;
            setStatus('ready');
          },
          error: () => { if (!disposed) setStatus('unavailable'); },
        });
      } catch { if (!disposed) setStatus('unavailable'); }
    });
    observer.observe(node);
    return () => { disposed = true; observer.disconnect(); api.current?.dispose(); api.current = undefined; };
  }, [regions, preview, attempt]);
  useEffect(() => {
    if (target && status === 'ready') api.current?.flyTo(target);
    if (target && status === 'unavailable') callbacks.current.onArrive?.(target);
  }, [target, status]);
  return <div className={`earth-viewport ${preview ? 'earth-viewport--preview' : ''}`} data-testid="earth-viewport" data-renderer={status}>
    <div className="earth-canvas-host" ref={host} />
    {status === 'loading' && <div className="earth-loading"><i /><span>正在展开世界…</span></div>}
    {status === 'unavailable' && <div className="earth-unavailable"><div className="earth-fallback" /><p>三维地球暂时无法显示。<br />仍可从地区信号列表选择新闻。</p><button onClick={() => { setStatus('loading'); setAttempt(value => value + 1); }}>重新加载地球</button></div>}
  </div>;
}
