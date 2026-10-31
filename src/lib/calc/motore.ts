import { MERCATO_IT } from '../../markets/it';
import type { Mercato } from '../../markets/tipi';
import { ricostruisci } from './discrepanze';
import { scenariFineContratto } from './scenari';
import { verificaTaeg } from './taeg';
import type { Analisi, Ipotesi, Preventivo } from './tipi';
import { calcolaTotali } from './totale';
import { treStrade } from './treStrade';
import { verdetto } from './verdetto';

/**
 * Il calcolo vero e proprio, su input già validati. Nessuna dipendenza da zod: lo usano anche le isole leggere.
 * Il mercato decide nome del tasso e del documento, termini, soglie e testi; i numeri non cambiano.
 */
export function calcolaAnalisi(preventivo: Preventivo, ipotesi: Ipotesi, mercato: Mercato = MERCATO_IT): Analisi {
  const ricostruzione = ricostruisci(preventivo);
  const totali = calcolaTotali(preventivo, ricostruzione, ipotesi);
  return {
    mercato,
    preventivo,
    ipotesi,
    ricostruzione,
    totali,
    taeg: verificaTaeg(preventivo, ricostruzione, mercato),
    scenari: scenariFineContratto(preventivo, totali, ipotesi),
    treStrade: treStrade(preventivo, totali, ipotesi, mercato),
    verdetto: verdetto(totali, mercato),
  };
}
