import { readFile, rename, unlink, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';
import { contentSourceSchema, newsSnapshotSchema, type NewsSnapshot } from '../src/domain/item-schema.ts';
import { refreshNewsSnapshot } from './adapters/rss.ts';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const snapshotPath = resolve(root, 'data/news.snapshot.json');
const sources = z.array(contentSourceSchema).parse(
  JSON.parse(await readFile(resolve(root, 'config/rss-sources.json'), 'utf8')),
);
if (new Set(sources.map((source) => source.id)).size !== sources.length) {
  throw new Error('RSS source IDs must be unique');
}
let previous: NewsSnapshot = { schemaVersion: 1, items: [], sourceStates: {} };
try {
  previous = newsSnapshotSchema.parse(JSON.parse(await readFile(snapshotPath, 'utf8')));
} catch (error) {
  if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
}

const snapshot = await refreshNewsSnapshot(sources, previous);
const temporaryPath = `${snapshotPath}.${randomUUID()}.tmp`;
try {
  await writeFile(temporaryPath, `${JSON.stringify(snapshot, null, 2)}\n`, { flag: 'wx' });
  await rename(temporaryPath, snapshotPath);
} finally {
  await unlink(temporaryPath).catch((error: NodeJS.ErrnoException) => {
    if (error.code !== 'ENOENT') throw error;
  });
}
for (const source of sources.filter((source) => source.enabled)) {
  const state = snapshot.sourceStates[source.id];
  console.log(`${source.name}: ${state?.status ?? 'disabled'}; ${snapshot.items.filter((item) => item.sourceId === source.id).length} items${state?.message ? `; ${state.message}` : ''}`);
}
console.log(`Saved ${snapshot.items.length} items to data/news.snapshot.json`);
