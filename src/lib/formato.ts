import * as calc from './calc/format';

/**
 * Una regola sola per scrivere i numeri, decisa per contesto e usata ovunque (revisione del 31/10, problema 9).
 * - anteprima: la miniatura della home, dove si legge a colpo d'occhio: euro interi.
 * - scena: la scena, il risultato, la scheda, la vista per il venditore: euro al centesimo, come nel preventivo.
 * Le quote di un totale sono percentuali intere in entrambi i contesti; una voce presente ma sotto l'1% si scrive «<1%»,
 * mai «0%» (sembrerebbe assente) e mai con un decimale in un posto e senza nell'altro.
 * Il costo del credito in % del prezzo ha una cifra decimale ovunque (22,1%): risultato, scena, venditore, promo, scheda.
 *
 * Italiano tipografico (specifica, c): spazio non separabile prima di € e di %, così «18.253,25 €» non va mai a capo
 * lasciando il simbolo da solo. Il motore di calcolo (lib/calc) resta com'è: la tipografia si applica qui, all'uscita.
 */
export type Contesto = 'anteprima' | 'scena';

export const REGOLE: Readonly<Record<Contesto, { readonly decimaliEuro: number }>> = {
  anteprima: { decimaliEuro: 0 },
  scena: { decimaliEuro: 2 },
};

export const NBSP = ' ';

/** Spazio non separabile prima di € e %, e dopo il «×» tra numeri: per le frasi che arrivano già scritte dal calcolo. */
export function tipografia(testo: string): string {
  return testo.replace(/ (€|%)/g, `${NBSP}$1`);
}

export const numero = calc.numero;
export const arrotonda = calc.arrotonda;

/** 1.234,56 € */
export function euro(valore: number | null | undefined, decimali = 2): string {
  return tipografia(calc.euro(valore, decimali));
}

/** 18.253 € (arrotondato all'euro) */
export function euroIntero(valore: number | null | undefined): string {
  return euro(valore, 0);
}

/** Da frazione: 0,1103 -> 11,03% */
export function percentuale(frazione: number | null | undefined, decimali = 2): string {
  return calc.percentuale(frazione, decimali);
}

/** Da punti percentuali: 11.03 -> 11,03% */
export function punti(valore: number | null | undefined, decimali = 2): string {
  return calc.punti(valore, decimali);
}

/** Importo in euro con i decimali del contesto: 18.253 € in anteprima, 18.253,25 € nella scena. */
export function importo(valore: number | null | undefined, contesto: Contesto): string {
  return euro(valore, REGOLE[contesto].decimaliEuro);
}

/** Quota di una parte sul totale, intera: «19%», «<1%» per una voce piccola ma presente, «0%» solo se la voce è zero. */
export function quota(parte: number, totale: number): string {
  if (!(totale > 0) || !(parte > 0)) return '0%';
  const pct = (parte / totale) * 100;
  if (pct < 1) return '<1%';
  return `${calc.numero(Math.round(pct), 0)}%`;
}

/** Costo del credito in % del prezzo (frazione): una cifra decimale, uguale in ogni superficie. 0,2210 -> «22,1%». */
export function costoCreditoPct(frazione: number | null | undefined): string {
  return calc.percentuale(frazione, 1);
}
