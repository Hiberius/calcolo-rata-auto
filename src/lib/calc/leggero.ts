import { EURO_MAX, IPOTESI_PREDEFINITE } from './config';
import { calcolaAnalisi } from './motore';
import type { Analisi, Ipotesi, Preventivo } from './tipi';

/** Numeri di un calcolo dimostrativo (guide, promo): tipo e accessori hanno un valore predefinito. */
export type NumeriLeggeri = Omit<Preventivo, 'tipo' | 'accessoriInclusiNelPrezzo'> & Partial<Pick<Preventivo, 'tipo' | 'accessoriInclusiNelPrezzo'>>;
export type IpotesiLeggere = Partial<Ipotesi>;

const TESTUALI = new Set(['marca', 'modello', 'versione', 'provincia', 'fonte', 'tipo', 'accessoriInclusiNelPrezzo']);

/** Stessi limiti di PreventivoSchema e IpotesiSchema: mesi da 1 a 120, percentuali fino a 100, importi fino a EURO_MAX. */
const MESI = new Set(['mesiNoleggio', 'mesiRifinanziamento', 'mesiPrestito']);
const PERCENTUALI = new Set(['tan', 'taegDichiarato', 'tanRifinanziamento', 'tanPrestito', 'taegPrestito']);

function valoreValido(k: string, v: unknown): boolean {
  if (typeof v !== 'number' || !Number.isFinite(v) || v < 0) return false;
  if (MESI.has(k)) return Number.isInteger(v) && v >= 1 && v <= 120;
  if (PERCENTUALI.has(k)) return v <= 100;
  return v <= EURO_MAX;
}

function numeriValidi(p: NumeriLeggeri, i: IpotesiLeggere): boolean {
  const voci = [...Object.entries(p), ...Object.entries(i)].filter(([k, v]) => !TESTUALI.has(k) && v !== undefined);
  return voci.every(([k, v]) => valoreValido(k, v)) && Number.isInteger(p.nRate) && p.nRate <= 120;
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
