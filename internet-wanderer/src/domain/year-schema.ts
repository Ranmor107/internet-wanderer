import { z } from 'zod';

export const yearSchema = z.object({
  year: z.number().int().min(1).max(9999),
  title: z.string().min(1),
  description: z.string().min(1),
  theme: z.string().regex(/^[a-z][a-z0-9-]*$/),
});
export const yearsSchema = z.array(yearSchema).refine(
  years => new Set(years.map(year => year.year)).size === years.length, 'Duplicate years',
);
export type YearDefinition = z.infer<typeof yearSchema>;
