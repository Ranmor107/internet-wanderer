import { z } from 'zod';
import definitions from '../../config/era-themes.json';
import yearConfig from '../../config/years.json';
import { yearsSchema, type YearDefinition } from '../domain/year-schema';

const color = z.string().regex(/^#[0-9a-fA-F]{6}$/);
export const eraSchema = z.object({
  id: z.string().regex(/^[a-z][a-z0-9-]*$/), label: z.string().min(1),
  skin: z.enum(['bevel', 'glass', 'flat']), font: z.enum(['mono', 'sans', 'serif']), motion: z.enum(['snap', 'float', 'slide']),
  caption: z.string().min(1), connection: z.string().min(1), note: z.string().min(1), windowLabel: z.string().min(1),
  colors: z.object({ accent: color, accentInk: color, paper: color, ink: color, muted: color, line: color, chrome: color, chromeInk: color }),
});
export type EraDefinition = z.infer<typeof eraSchema>;
export function createEraRegistry(input: unknown, yearInput: unknown) {
  const eras = z.array(eraSchema).parse(input);
  if (new Set(eras.map(era => era.id)).size !== eras.length) throw new Error('Duplicate era theme IDs');
  const years = yearsSchema.parse(yearInput);
  const byId = new Map(eras.map(era => [era.id, era]));
  for (const year of years) if (!byId.has(year.theme)) throw new Error(`${year.year}: unregistered era theme ${year.theme}`);
  return {
    eras, years, byId,
    forYear(year: number | undefined, options: readonly YearDefinition[] = years) {
      const theme = options.find(option => option.year === year)?.theme;
      return theme ? byId.get(theme) : undefined;
    },
  };
}
export const eraRegistry = createEraRegistry(definitions, yearConfig);
