import type { AstroComponentFactory } from 'astro/runtime/server/index.js';
import { z } from 'zod';

const VARIANTI = ['maxi', 'vfg', 'fine', 'taeg', 'noleggio'] as const;

export const GuidaSchema = z
  .object({
    titolo: z.string().min(10).max(120),
    titoloPagina: z.string().min(10).max(120),
    descrizione: z.string().min(50).max(200),
    query: z.string().min(5).max(80),
    lede: z.string().min(50).max(500),
    calcolo: z.enum(VARIANTI),
    titoloCalcolo: z.string().max(80),
    esempio: z.record(z.string(), z.string()),
    aggiornato: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    fonti: z.array(z.object({ titolo: z.string().min(5), url: z.url({ protocol: /^https$/ }) })).min(1),
  })
  .strict();
export type Guida = z.output<typeof GuidaSchema> & { readonly slug: string; readonly Content: AstroComponentFactory };

interface ModuloMd {
  readonly frontmatter: unknown;
  readonly Content: AstroComponentFactory;
}

const FILE = import.meta.glob<ModuloMd>('../data/guide/*.md', { eager: true });

/** Le 5 guide (§3), validate a build time: un frontmatter sbagliato ferma la build. */
export function tutteLeGuide(): readonly Guida[] {
  return Object.entries(FILE)
    .map(([percorso, modulo]) => {
      const slug = percorso.split('/').pop()?.replace(/\.md$/, '') ?? '';
      const esito = GuidaSchema.safeParse(modulo.frontmatter);
      if (!esito.success) throw new Error(`${percorso}: ${esito.error.issues.map((i) => `${i.path.join('.')} ${i.message}`).join('; ')}`);
      return { ...esito.data, slug, Content: modulo.Content };
    })
    .sort((a, b) => a.slug.localeCompare(b.slug));
}
