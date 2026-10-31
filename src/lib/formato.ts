import { euro, numero } from './calc/format';

/**
 * Una regola sola per scrivere i numeri, decisa per contesto e usata ovunque (revisione del 31/10, problema 9).
 * - anteprima: la miniatura della home, dove si legge a colpo d'occhio: euro interi.
 * - scena: la scena, il risultato, la scheda, la vista per il venditore: euro al centesimo, come nel preventivo.
 * Le quote di un totale sono percentuali intere in entrambi i contesti; una voce presente ma sotto l'1% si scrive «<1%»,
 * mai «0%» (sembrerebbe assente) e mai con un decimale in un posto e senza nell'altro.
 */
export type Contesto = 'anteprima' | 'scena';

export const REGOLE: Readonly<Record<Contesto, { readonly decimaliEuro: number }>> = {
  anteprima: { decimaliEuro: 0 },
  scena: { decimaliEuro: 2 },
};

/** Importo in euro con i decimali del contesto: 18.253 € in anteprima, 18.253,25 € nella scena. */
export function importo(valore: number | null | undefined, contesto: Contesto): string {
  return euro(valore, REGOLE[contesto].decimaliEuro);
}

/** Quota di una parte sul totale, intera: «19%», «<1%» per una voce piccola ma presente, «0%» solo se la voce è zero. */
export function quota(parte: number, totale: number): string {
  if (!(totale > 0) || !(parte > 0)) return '0%';
  const pct = (parte / totale) * 100;
  if (pct < 1) return '<1%';
  return `${numero(Math.round(pct), 0)}%`;
}
