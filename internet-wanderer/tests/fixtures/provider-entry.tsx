import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import App from '../../src/App';
import { bundledProvider, bundledContent } from '../../src/content/providers/bundled';
import { createStaticProvider, type ContentBundle, type ContentProvider } from '../../src/content/provider';
import '../../src/styles/app.css';
import '../../src/styles/bookmarks.css';
import '../../src/styles/motion.css';

const site = bundledContent.items.find(item => item.kind === 'website' && !item.history)!;
const content = (title: string): ContentBundle => ({ ...bundledContent, years: [], items: [{ ...site, id: title, title }] });
const replacement = createStaticProvider('replacement', content('Changed source sample'));
let attempt = 0;
const retrySource: ContentProvider = { id: 'retry', load() {
  if (++attempt === 1) throw new Error('Synchronous adapter failure');
  return Promise.resolve(content('Changed source sample'));
} };
let pending: ((value: ContentBundle) => void) | undefined;
const slowSource: ContentProvider = { id: 'slow', load() { return new Promise(resolve => { pending = resolve; }); } };

function Harness() {
  const [provider, setProvider] = useState(bundledProvider);
  const [resolved, setResolved] = useState(false);
  return <><aside aria-label="测试驱动"><button onClick={() => setProvider(retrySource)}>Switch retry source</button><button onClick={() => setProvider(slowSource)}>Switch slow source</button><button onClick={() => setProvider(replacement)}>Switch static source</button><button onClick={() => { pending?.(content('Obsolete source sample')); setResolved(true); }}>Resolve obsolete source</button>{resolved && <output>Obsolete source resolved</output>}</aside><App contentProvider={provider} /></>;
}
createRoot(document.getElementById('root')!).render(<HashRouter><Harness /></HashRouter>);
