import { ricostruisci } from './discrepanze';
import { scenariFineContratto } from './scenari';
import { verificaTaeg } from './taeg';
import { IpotesiSchema, PreventivoSchema, type Analisi, type IpotesiInput } from './tipi';
import { calcolaTotali } from './totale';
import { treStrade } from './treStrade';
import { verdetto } from './verdetto';

export * from './tipi';
export * as formato from './format';

export const AVVERTENZA =
  'Rata Vera non è un mediatore creditizio né un intermediario: fa i conti sui numeri che inserisci. Prima di firmare chiedi il SECCI (modulo Informazioni europee di base).';

export type EsitoAnalisi =
  | { readonly ok: true; readonly analisi: Analisi }
  | { readonly ok: false; readonly errori: readonly { readonly campo: string; readonly messaggio: string }[] };

/** Punto d'ingresso: valida input e ipotesi con zod, poi calcola tutto con funzioni pure. */
export function analizza(input: unknown, ipotesiInput: IpotesiInput = {}): EsitoAnalisi {
  const p = PreventivoSchema.safeParse(input);
  const i = IpotesiSchema.safeParse(ipotesiInput);
  if (!p.success || !i.success) {
    const problemi = [...(p.success ? [] : p.error.issues), ...(i.success ? [] : i.error.issues)];
    return { ok: false, errori: problemi.map((e) => ({ campo: e.path.join('.'), messaggio: e.message })) };
  }
  const preventivo = p.data;
  const ipotesi = i.data;
  const ricostruzione = ricostruisci(preventivo);
  const totali = calcolaTotali(preventivo, ricostruzione, ipotesi);
  return {
    ok: true,
    analisi: {
      preventivo,
      ipotesi,
      ricostruzione,
      totali,
      taeg: verificaTaeg(preventivo, ricostruzione),
      scenari: scenariFineContratto(preventivo, totali, ipotesi),
      treStrade: treStrade(preventivo, totali, ipotesi),
      verdetto: verdetto(totali),
    },
  };
}
