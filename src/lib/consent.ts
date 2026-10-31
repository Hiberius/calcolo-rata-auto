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
  contatto_noleggio: {
    finalita: 'contatto_noleggio',
    versione: '2026-10-31',
    testo:
      'Accetto di essere contattato da un partner di noleggio a lungo termine selezionato da Rata Vera, per questa richiesta. I miei dati non vengono usati per altro e posso chiederne la cancellazione in ogni momento.',
  },
  contatto_b2b: {
    finalita: 'contatto_b2b',
    versione: '2026-10-31',
    testo: 'Accetto di essere ricontattato da Rata Vera per questa richiesta. I dati restano a Rata Vera e non vengono ceduti.',
  },
} as const satisfies Record<string, TestoConsenso>;
