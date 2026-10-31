import type { TESTI_IT } from './it';

/**
 * Un mercato (specifica v2, §5): lingua, documento precontrattuale, tasso, termini, soglie, fonti, avvertenza e le
 * stringhe dell'interfaccia dei risultati e della scena. Solo `it` è attivo e indicizzato; gli altri esistono per i test.
 */
export const CODICI_MERCATO = ['it', 'es', 'fr', 'de'] as const;
export type CodiceMercato = (typeof CODICI_MERCATO)[number];

export type ChiaveTesto = keyof typeof TESTI_IT;
export type Testi = Readonly<Record<ChiaveTesto, string>>;

export interface Fonte {
  readonly nome: string;
  readonly url: string;
}

export interface Mercato {
  readonly codice: CodiceMercato;
  /** Il sito risponde in questo mercato. Oggi solo l'Italia. */
  readonly attivo: boolean;
  /** Le pagine di questo mercato possono stare nella sitemap e nei motori di ricerca. */
  readonly indicizzato: boolean;
  readonly lingua: string;
  readonly valuta: 'EUR';
  /** Separatori dei numeri: il formato si adegua quando il mercato diventa attivo. */
  readonly numeri: { readonly migliaia: string; readonly decimali: string };
  /** Documento precontrattuale da chiedere prima di firmare. */
  readonly documento: { readonly sigla: string; readonly nome: string };
  /** Nome del tasso effettivo e formula (direttiva 2008/48/CE, allegato I, uguale in tutta l'UE). */
  readonly tasso: { readonly sigla: string; readonly nome: string; readonly formula: string };
  readonly termini: { readonly maxiRata: string; readonly valoreFuturoGarantito: string; readonly tassoNominale: string };
  /** Soglie dell'etichetta sul costo del credito (in frazione del prezzo), da ricalibrare sul dataset del mercato. */
  readonly soglie: { readonly basso: number; readonly alto: number };
  readonly fonti: readonly Fonte[];
  readonly avvertenza: string;
  readonly testi: Testi;
}
