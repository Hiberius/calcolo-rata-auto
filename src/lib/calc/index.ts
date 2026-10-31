import type { Mercato } from '../../markets/tipi';
import { calcolaAnalisi } from './motore';
import { IpotesiSchema, PreventivoSchema, type Analisi, type IpotesiInput } from './tipi';

export * from './tipi';
export * as formato from './format';

export { AVVERTENZA } from './config';

export type EsitoAnalisi =
  | { readonly ok: true; readonly analisi: Analisi }
  | { readonly ok: false; readonly errori: readonly { readonly campo: string; readonly messaggio: string }[] };

/** Punto d'ingresso: valida input e ipotesi con zod, poi calcola tutto con funzioni pure. */
export function analizza(input: unknown, ipotesiInput: IpotesiInput = {}, mercato?: Mercato): EsitoAnalisi {
  const p = PreventivoSchema.safeParse(input);
  const i = IpotesiSchema.safeParse(ipotesiInput);
  if (!p.success || !i.success) {
    const problemi = [...(p.success ? [] : p.error.issues), ...(i.success ? [] : i.error.issues)];
    return { ok: false, errori: problemi.map((e) => ({ campo: e.path.join('.'), messaggio: e.message })) };
  }
  return { ok: true, analisi: calcolaAnalisi(p.data, i.data, mercato) };
}
