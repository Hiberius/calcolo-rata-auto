import { MERCATO_DE } from './de';
import { MERCATO_ES } from './es';
import { MERCATO_FR } from './fr';
import { MERCATO_IT } from './it';
import type { CodiceMercato, Mercato } from './tipi';

/** Tutti i mercati, anche quelli non attivi. Non importarlo nelle isole: porterebbe le quattro lingue nel bundle. */
export const MERCATI: Readonly<Record<CodiceMercato, Mercato>> = { it: MERCATO_IT, es: MERCATO_ES, fr: MERCATO_FR, de: MERCATO_DE };

/** Solo i mercati attivi (oggi l'Italia): sitemap, robots e percorsi li leggono da qui. */
export function mercatiAttivi(): readonly Mercato[] {
  return Object.values(MERCATI).filter((m) => m.attivo);
}
