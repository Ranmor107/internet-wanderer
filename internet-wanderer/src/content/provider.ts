import { z } from 'zod';
import { contentSourceSchema, datasetSchema, isoDateTimeSchema, newsSourceStateSchema } from '../domain/item-schema';
import { yearsSchema } from '../domain/year-schema';
import { GLOBAL_VOICES_LICENSE, isGlobalVoices } from '../domain/news-attribution';

export const contentBundleSchema = z.object({
  schemaVersion: z.literal(1),
  items: datasetSchema.shape.items,
  sources: z.array(contentSourceSchema),
  years: yearsSchema,
  generatedAt: isoDateTimeSchema.optional(),
  sourceStates: z.record(z.string(), newsSourceStateSchema),
}).superRefine((bundle, ctx) => {
  const unique = (ids: string[], name: string) => {
    if (new Set(ids).size !== ids.length) ctx.addIssue({ code: 'custom', message: `Duplicate ${name} IDs` });
  };
  unique(bundle.items.map(item => item.id), 'item');
  unique(bundle.sources.map(source => source.id), 'source');
  const sources = new Set(bundle.sources.map(source => source.id));
  const years = new Set(bundle.years.map(year => year.year));
  for (const item of bundle.items) {
    if (!sources.has(item.sourceId)) ctx.addIssue({ code: 'custom', message: `${item.id}: unknown source` });
    if (item.history && !years.has(item.history.year)) ctx.addIssue({ code: 'custom', message: `${item.id}: unknown year` });
    if (item.kind === 'archive' && item.history && new Date(item.archive.capturedAt).getUTCFullYear() !== item.history.year) ctx.addIssue({ code: 'custom', message: `${item.id}: capture year mismatch` });
    if (isGlobalVoices(item.sourceId, item.url) && (!item.author?.trim() || item.licenseUrl !== GLOBAL_VOICES_LICENSE)) ctx.addIssue({ code: 'custom', message: `${item.id}: attribution required` });
  }
  for (const id of Object.keys(bundle.sourceStates)) if (!sources.has(id)) ctx.addIssue({ code: 'custom', message: `${id}: unknown source state` });
});
export type ContentBundle = z.infer<typeof contentBundleSchema>;

/** An adapter returns normalized data, never UI or third-party raw responses. */
export interface ContentProvider {
  readonly id: string;
  /** Optional validated seed avoids a loading flash for bundled static data. */
  readonly initial?: ContentBundle;
  load(signal?: AbortSignal): Promise<ContentBundle>;
}

export function createStaticProvider(id: string, input: unknown): ContentProvider {
  const bundle = contentBundleSchema.parse(input);
  return { id, initial: bundle, async load(signal) {
    if (signal?.aborted) throw new DOMException('Content load aborted', 'AbortError');
    return bundle;
  } };
}
