import { ricostruisci } from './discrepanze';
import { scenariFineContratto } from './scenari';
import { verificaTaeg } from './taeg';
import type { Analisi, Ipotesi, Preventivo } from './tipi';
import { calcolaTotali } from './totale';
import { treStrade } from './treStrade';
import { verdetto } from './verdetto';

/** Il calcolo vero e proprio, su input già validati. Nessuna dipendenza da zod: lo usano anche le isole leggere. */
export function calcolaAnalisi(preventivo: Preventivo, ipotesi: Ipotesi): Analisi {
  const ricostruzione = ricostruisci(preventivo);
  const totali = calcolaTotali(preventivo, ricostruzione, ipotesi);
  return {
    preventivo,
    ipotesi,
    ricostruzione,
    totali,
    taeg: verificaTaeg(preventivo, ricostruzione),
    scenari: scenariFineContratto(preventivo, totali, ipotesi),
    treStrade: treStrade(preventivo, totali, ipotesi),
    verdetto: verdetto(totali),
  };
}
