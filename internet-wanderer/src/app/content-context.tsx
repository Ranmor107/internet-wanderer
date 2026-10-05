import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { createContentRepository, type ContentRepository } from '../content/repository-factory';
import { contentBundleSchema, type ContentProvider } from '../content/provider';
import { createContentRuntime, type ContentRuntime } from '../content/clock';
import { createEraRegistry, eraRegistry } from '../ui/era-registry';

interface ContentValue { repository: ContentRepository; runtime: ContentRuntime }
const Context = createContext<ContentValue | null>(null);
function prepare(input: unknown): ContentValue {
  const bundle = contentBundleSchema.parse(input);
  createEraRegistry(eraRegistry.eras, bundle.years);
  const runtime = createContentRuntime(import.meta.env?.VITE_CONTENT_MODE, bundle.generatedAt);
  return { repository: createContentRepository(bundle, runtime), runtime };
}
export function ContentProviderHost({ provider, children }: { provider: ContentProvider; children: ReactNode }) {
  const [state, setState] = useState<{ owner: ContentProvider; value?: ContentValue; error?: string }>(() => {
    try { return { owner: provider, value: provider.initial ? prepare(provider.initial) : undefined }; }
    catch { return { owner: provider, error: '内容暂时无法打开，请再试一次。' }; }
  });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const abort = new AbortController();
    if (!provider.initial || attempt) setState({ owner: provider });
    Promise.resolve().then(() => provider.load(abort.signal)).then(input => {
      if (!abort.signal.aborted) setState({ owner: provider, value: prepare(input) });
    }).catch(() => { if (!abort.signal.aborted) setState({ owner: provider, error: '这个角落还没准备好，稍后再试一次。' }); });
    return () => abort.abort();
  }, [provider, attempt]);
  if (state.owner !== provider || !state.value) return <main className="content-state" aria-live="polite"><span className="eyebrow">INTERNET WANDERER</span><h1>{state.error ? '稍等，链接有点绕。' : '正在打开一扇窗。'}</h1>{state.error && <><p>{state.error}</p><button className="next-button" onClick={() => setAttempt(value => value + 1)}>再试一次</button></>}</main>;
  return <Context.Provider value={state.value}>{children}</Context.Provider>;
}
export function useContent() {
  const content = useContext(Context);
  if (!content) throw new Error('ContentProviderHost is required');
  return content;
}
