import { z } from 'zod';

export const httpUrlSchema = z.string().url().refine((value) => {
  const protocol = new URL(value).protocol;
  return protocol === 'https:' || protocol === 'http:';
}, 'Only HTTP(S) links are allowed');

export const isoDateTimeSchema = z.string().datetime({ offset: true }).refine(
  (value) => Number.isFinite(Date.parse(value)),
  'A reliable ISO datetime with a timezone is required',
);

const calendarDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => {
  const timestamp = Date.parse(`${value}T00:00:00Z`);
  return Number.isFinite(timestamp) && new Date(timestamp).toISOString().slice(0, 10) === value;
}, 'A valid calendar date is required');

const historySchema = z.object({
  year: z.number().int().min(1).max(9999),
  occurredOn: calendarDateSchema.optional(),
  role: z.enum(['event', 'place', 'archive']).optional(),
}).refine((history) => !history.occurredOn || Number(history.occurredOn.slice(0, 4)) === history.year, {
  message: 'The event date must belong to its associated year',
  path: ['occurredOn'],
});

const archiveSchema = z.object({
  originalUrl: httpUrlSchema,
  capturedAt: isoDateTimeSchema,
});

const baseItemSchema = z.object({
  id: z.string().trim().min(1),
  title: z.string().trim().min(1),
  url: httpUrlSchema,
  sourceId: z.string().trim().min(1),
  author: z.string().optional(),
  translator: z.string().optional(),
  licenseUrl: httpUrlSchema.optional(),
  blurb: z.string().optional(),
  language: z.string().optional(),
  tags: z.array(z.string()).optional(),
  enabled: z.boolean().optional(),
  publishedAt: isoDateTimeSchema.optional(),
  history: historySchema.optional(),
  archive: archiveSchema.optional(),
  evidenceUrls: z.array(httpUrlSchema).optional(),
});

export const wanderItemSchema = z.discriminatedUnion('kind', [
  baseItemSchema.extend({ kind: z.literal('website') }),
  baseItemSchema.extend({ kind: z.literal('news'), publishedAt: isoDateTimeSchema }),
  baseItemSchema.extend({ kind: z.literal('archive'), archive: archiveSchema }),
  baseItemSchema.extend({
    kind: z.literal('event'),
    history: historySchema,
    evidenceUrls: z.array(httpUrlSchema).min(1),
  }),
]);

export type WanderItem = z.infer<typeof wanderItemSchema>;

export const contentSourceSchema = z.object({
  id: z.string().trim().min(1),
  name: z.string().trim().min(1),
  kind: z.enum(['curated', 'rss', 'archive', 'reference']),
  url: httpUrlSchema,
  feedUrl: httpUrlSchema.optional(),
  publisherCountry: z.string().optional(),
  publisherType: z.enum(['media', 'institution']).optional(),
  language: z.string().optional(),
  displayPolicy: z.enum(['link-only', 'headline-only', 'summary-allowed']),
  termsUrl: httpUrlSchema.optional(),
  checkedAt: z.union([calendarDateSchema, isoDateTimeSchema]).optional(),
  enabled: z.boolean(),
});

export type ContentSource = z.infer<typeof contentSourceSchema>;

export const newsSourceStateSchema = z.object({
  lastSuccessAt: isoDateTimeSchema.optional(),
  lastAttemptAt: isoDateTimeSchema.optional(),
  status: z.enum(['ok', 'error', 'empty']),
  message: z.string().optional(),
});

export type NewsSourceState = z.infer<typeof newsSourceStateSchema>;

function uniqueIds(items: WanderItem[], ctx: z.RefinementCtx) {
  const ids = new Set<string>();
  items.forEach((item, index) => {
    if (ids.has(item.id)) {
      ctx.addIssue({ code: 'custom', path: ['items', index, 'id'], message: `Duplicate item ID: ${item.id}` });
    }
    ids.add(item.id);
  });
}

export const datasetSchema = z.object({
  schemaVersion: z.literal(1),
  items: z.array(wanderItemSchema),
}).superRefine((dataset, ctx) => uniqueIds(dataset.items, ctx));

export const newsSnapshotSchema = z.object({
  schemaVersion: z.literal(1),
  items: z.array(wanderItemSchema).refine((items) => items.every((item) => item.kind === 'news'), {
    message: 'News snapshots may only contain news items',
  }),
  generatedAt: isoDateTimeSchema.optional(),
  sourceStates: z.record(z.string(), newsSourceStateSchema),
}).superRefine((snapshot, ctx) => uniqueIds(snapshot.items, ctx));

export type NewsSnapshot = z.infer<typeof newsSnapshotSchema>;
