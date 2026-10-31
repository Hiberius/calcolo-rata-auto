import { MERCATO_IT } from './it';
import type { ChiaveTesto, CodiceMercato, Mercato } from './tipi';

export type { ChiaveTesto, CodiceMercato, Mercato } from './tipi';
export { CODICI_MERCATO } from './tipi';
export { MERCATO_IT } from './it';

export type Valori = Readonly<Record<string, string | number>>;

/** Segnaposto che vengono dal mercato stesso: il nome del tasso, del documento e i termini. */
function valoriDelMercato(m: Mercato): Valori {
  return {
    tasso: m.tasso.sigla,
    documento: m.documento.sigla,
    maxiRata: m.termini.maxiRata,
    vfg: m.termini.valoreFuturoGarantito,
    stima: m.testi['scena.stima'],
  };
}

/**
 * La stringa `chiave` nella lingua del mercato, con i segnaposto {nome} sostituiti. I valori passati vincono su quelli
 * del mercato; un segnaposto senza valore resta com'è, così un errore si vede invece di sparire.
 */
export function t(m: Mercato, chiave: ChiaveTesto, valori: Valori = {}): string {
  const tutti: Valori = { ...valoriDelMercato(m), ...valori };
  return m.testi[chiave].replace(/\{([a-zA-Z]+)\}/g, (intero, nome: string) => (nome in tutti ? String(tutti[nome]) : intero));
}

/** Il testo prima e dopo un segnaposto: serve quando il valore va in un elemento a parte (per esempio un numero colorato). */
export function attorno(m: Mercato, chiave: ChiaveTesto, segnaposto: string): readonly [string, string] {
  const testo = t(m, chiave, { [segnaposto]: '\u0000' });
  const [prima = '', dopo = ''] = testo.split('\u0000');
  return [prima, dopo];
}

/** Il mercato in cui il sito risponde oggi. Gli altri si caricano solo dove servono (test, futuri percorsi). */
export function mercatoAttivo(): Mercato {
  return MERCATO_IT;
}

export function eCodiceMercato(v: unknown): v is CodiceMercato {
  return v === 'it' || v === 'es' || v === 'fr' || v === 'de';
}
