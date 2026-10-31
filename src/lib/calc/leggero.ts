import { IPOTESI_PREDEFINITE } from './config';
import { calcolaAnalisi } from './motore';
import type { Analisi, Ipotesi, Preventivo } from './tipi';

/** Numeri di un calcolo dimostrativo (guide, promo): tipo e accessori hanno un valore predefinito. */
export type NumeriLeggeri = Omit<Preventivo, 'tipo' | 'accessoriInclusiNelPrezzo'> & Partial<Pick<Preventivo, 'tipo' | 'accessoriInclusiNelPrezzo'>>;
export type IpotesiLeggere = Partial<Ipotesi>;

const TESTUALI = new Set(['marca', 'modello', 'versione', 'provincia', 'fonte', 'tipo', 'accessoriInclusiNelPrezzo']);

function numeriValidi(p: NumeriLeggeri, i: IpotesiLeggere): boolean {
  const valori = [...Object.entries(p), ...Object.entries(i)].filter(([k, v]) => !TESTUALI.has(k) && v !== undefined).map(([, v]) => v);
  return valori.every((v) => typeof v === 'number' && Number.isFinite(v) && v >= 0) && Number.isInteger(p.nRate) && p.nRate <= 120;
}

/**
 * Versione senza zod per le isole delle guide e delle promo: stessi calcoli di analizza(),
 * con un controllo minimo sui numeri (finiti, non negativi). Restituisce null se i numeri non vanno.
 */
export function analizzaLeggero(p: NumeriLeggeri, i: IpotesiLeggere = {}): Analisi | null {
  if (!numeriValidi(p, i)) return null;
  const ipotesi: Ipotesi = { ...IPOTESI_PREDEFINITE, ...i };
  return calcolaAnalisi({ tipo: 'finanziamento', accessoriInclusiNelPrezzo: false, ...p }, ipotesi);
}
