import type { Finalita } from './db/queries';

export interface TestoConsenso {
  readonly finalita: Finalita;
  readonly versione: string;
  readonly testo: string;
}

/** Testi esatti mostrati all'utente: quello che si registra in D1 è questo, con la sua versione. */
export const CONSENSI = {
  archivio: {
    finalita: 'archivio',
    versione: '2026-10-31',
    testo:
      "Aggiungi il mio preventivo anonimo all'archivio di Rata Vera. Entrano solo i numeri, marca, modello e provincia (se l'hai indicata), per il confronto con gli altri preventivi. Nessun nome, targa o concessionario.",
  },
} as const satisfies Record<string, TestoConsenso>;
