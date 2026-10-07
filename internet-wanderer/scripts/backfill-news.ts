import { readFile, rename, unlink, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';
import { contentSourceSchema, newsSnapshotSchema } from '../src/domain/item-schema.ts';
import { collectArchiveYear } from './adapters/news-archives.ts';
import { mergeNewsItems, plainText } from './adapters/rss.ts';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const snapshotPath = resolve(root, 'data/news.snapshot.json');
const now = new Date();
const sourceId = process.argv.slice(2).find(arg => arg.startsWith('--source='))?.slice('--source='.length);
const args = new Map(process.argv.slice(2).filter(arg => !arg.startsWith('--source=')).map(arg => {
  const match = arg.match(/^--(from|to|pages)=(\d+)$/);
  if (!match) throw new Error('Use --from=2004 --to=2026 --pages=2 and optionally --source=global-voices-fr');
  return [match[1], Number(match[2])] as const;
}));
const from = args.get('from') ?? 2004;
const to = args.get('to') ?? now.getUTCFullYear();
const pages = args.get('pages') ?? 2;
if (from < 2004 || to > now.getUTCFullYear() || from > to || pages < 1 || pages > 10) throw new Error('Invalid archive year range or page limit');
const sources = z.array(contentSourceSchema).parse(JSON.parse(await readFile(resolve(root, 'config/rss-sources.json'), 'utf8')))
  .filter(source => {
    const host = new URL(source.url).hostname;
    return source.enabled && (!sourceId || source.id === sourceId) && (host === 'globalvoices.org' || host.endsWith('.globalvoices.org'));
  });
if (!sources.length) throw new Error('No enabled reviewed archive source matches the request');
const previous = newsSnapshotSchema.parse(JSON.parse(await readFile(snapshotPath, 'utf8')));
const batches = await Promise.all(sources.map(async source => {
  let items = previous.items.filter(item => item.sourceId === source.id);
  const errors: string[] = [];
  let pagesFetched = 0;
  for (let year = from; year <= to; year += 1) {
    try {
      const result = await collectArchiveYear(source, year, { now, pages });
      items = mergeNewsItems(items, result.items);
      pagesFetched += result.pagesFetched;
    } catch (error) {
      errors.push(year + ': ' + plainText(error instanceof Error ? error.message : 'Archive request failed', 140));
    }
    if ((year - from + 1) % 5 === 0 || year === to) console.log(source.name + ': checked through ' + year + ', ' + items.length + ' records, ' + errors.length + ' failed years');
  }
  const checkedAt = new Date().toISOString();
  return { sourceId: source.id, items, state: {
    ...previous.sourceStates[source.id],
    lastAttemptAt: checkedAt,
    ...(errors.length || !pagesFetched ? {} : { lastSuccessAt: checkedAt }),
    status: errors.length ? 'error' as const : pagesFetched ? 'ok' as const : 'empty' as const,
    message: errors.length ? errors.join('; ').slice(0, 2000) : from + '–' + to + ' archive check; ' + pagesFetched + ' feeds; ' + items.length + ' stored records',
  } };
}));
const snapshot = newsSnapshotSchema.parse({
  ...previous,
  generatedAt: new Date().toISOString(),
  items: mergeNewsItems(previous.items, batches.flatMap(batch => batch.items)),
  sourceStates: { ...previous.sourceStates, ...Object.fromEntries(batches.map(batch => [batch.sourceId, batch.state])) },
});
const temporaryPath = snapshotPath + '.' + randomUUID() + '.tmp';
try {
  await writeFile(temporaryPath, JSON.stringify(snapshot, null, 2) + '\n', { flag: 'wx' });
  await rename(temporaryPath, snapshotPath);
} finally {
  await unlink(temporaryPath).catch((error: NodeJS.ErrnoException) => { if (error.code !== 'ENOENT') throw error; });
}
console.log('Saved ' + snapshot.items.length + ' news records; failed archive years retain previous data.');
if (batches.some(batch => batch.state.status === 'error')) process.exitCode = 1;
