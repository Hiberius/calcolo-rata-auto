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
    versione: '2026-10-31-v2',
    testo:
      'Accetto di essere contattato da Rata Vera, via email o telefono, per ricevere offerte di noleggio a lungo termine sul modello che ho indicato. I miei dati non vengono passati a nessun altro senza un mio nuovo consenso, che indicherà il nome del partner. Posso chiederne la cancellazione in ogni momento.',
  },
  avviso_officina: {
    finalita: 'avviso_officina',
    versione: '2026-10-31',
    testo:
      "Voglio ricevere da Rata Vera una sola email, quando il confronto con il prezzo giusto è pronto. L'email serve solo a questo avviso: dopo l'invio la cancelliamo, e comunque entro 6 mesi. Posso chiederne la cancellazione prima, in ogni momento.",
  },
  contatto_stampa: {
    finalita: 'contatto_stampa',
    versione: '2026-10-31',
    testo:
      "Accetto di ricevere da Rata Vera, all'indirizzo indicato, l'avviso di uscita di ogni edizione dell'Indice con i dati per la stampa. Nessun altro uso. Posso chiedere la cancellazione in ogni momento.",
  },
} as const satisfies Record<string, TestoConsenso>;
