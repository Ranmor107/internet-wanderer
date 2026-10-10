import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';
import { z } from 'zod';
import { yearsSchema } from '../src/domain/year-schema';
import { createEraRegistry } from '../src/ui/era-registry';
import { contentSourceSchema, datasetSchema, newsSnapshotSchema } from '../src/domain/item-schema';
import { GLOBAL_VOICES_LICENSE, isGlobalVoices } from '../src/domain/news-attribution';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const json = async (path: string) => JSON.parse(await readFile(resolve(root, path), 'utf8'));
const sources = z.array(contentSourceSchema).parse([
  ...await json('config/curated-sources.json'),
  ...await json('config/rss-sources.json'),
]);
const sourceIds = new Set(sources.map((source) => source.id));
const enabledSourceIds = new Set(sources.filter((source) => source.enabled).map((source) => source.id));
if (sourceIds.size !== sources.length) throw new Error('Duplicate source IDs');
const sites = datasetSchema.parse(await json('data/sites.json'));
const history = datasetSchema.parse(await json('data/history.json'));
const news = newsSnapshotSchema.parse(await json('data/news.snapshot.json'));
const combined = datasetSchema.parse({ schemaVersion: 1, items: [...sites.items, ...history.items, ...news.items] });
const years = yearsSchema.parse(await json('config/years.json'));
createEraRegistry(await json('config/era-themes.json'), years);
if (new Set(years.map((year) => year.year)).size !== years.length) throw new Error('Duplicate years');
for (const item of combined.items) {
  if (!sourceIds.has(item.sourceId)) throw new Error(`${item.id}: unknown source ${item.sourceId}`);
  if (item.history && !years.some((year) => year.year === item.history?.year)) throw new Error(`${item.id}: unsupported historical year`);
  if (item.history && !item.evidenceUrls?.length) throw new Error(`${item.id}: historical evidence is required`);
  if (item.kind === 'archive' && item.history && new Date(item.archive.capturedAt).getUTCFullYear() !== item.history.year) throw new Error(`${item.id}: capture year does not match its year pack`);
  if (item.kind === 'archive' && item.sourceId === 'wayback') {
    const replay = item.url.match(/^https:\/\/web\.archive\.org\/web\/(\d{14})\/(https?:\/\/.+)$/);
    const timestamp = new Date(item.archive.capturedAt).toISOString().replace(/\D/g, '').slice(0, 14);
    if (!replay || replay[1] !== timestamp || new URL(replay[2]).href !== new URL(item.archive.originalUrl).href) throw new Error(`${item.id}: Wayback URL must match the exact capture time and original URL`);
  }
  if (isGlobalVoices(item.sourceId, item.url) && (!item.author?.trim() || item.licenseUrl !== GLOBAL_VOICES_LICENSE)) throw new Error(`${item.id}: required author/license attribution missing`);
}
for (const sourceId of Object.keys(news.sourceStates)) {
  if (!sourceIds.has(sourceId)) throw new Error(`Unknown news source state: ${sourceId}`);
}
for (const year of years) {
  const items = history.items.filter((item) => item.enabled !== false && enabledSourceIds.has(item.sourceId) && item.history?.year === year.year);
  if (!items.length) throw new Error(`${year.year}: empty year pack`);
  if (items.length < 6) console.warn(`${year.year}: ${items.length} items; launch target is 6`);
  for (const role of ['event', 'place', 'archive']) {
    if (!items.some((item) => item.history?.role === role)) throw new Error(`${year.year}: missing ${role} fragment`);
  }
}
console.log(`Validated ${sites.items.length} websites, ${history.items.length} historical items, ${news.items.length} news items, ${sources.length} sources and ${years.length} years.`);
