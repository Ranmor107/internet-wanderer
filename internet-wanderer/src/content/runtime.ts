import snapshot from '../../data/news.snapshot.json';
import { createContentRuntime } from './clock';
export { createContentRuntime, type ContentRuntime } from './clock';

// import.meta.env is unavailable in the Node test runner. Missing or unknown
// values deliberately choose Demo; only the exact opt-in value enables Live.
export const contentRuntime = createContentRuntime(
  import.meta.env?.VITE_CONTENT_MODE,
  snapshot.generatedAt,
);
