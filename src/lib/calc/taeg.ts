import { t } from '../../markets';
import { MERCATO_IT } from '../../markets/it';
import type { Mercato } from '../../markets/tipi';
import { TOLLERANZA_TAEG_PUNTI } from './config';
import { arrotonda, punti } from './format';
import type { EsitoTaeg, Preventivo, Ricostruzione } from './tipi';

export interface Flusso {
  readonly mese: number;
  readonly importo: number;
}

const TASSO_MENSILE_MAX = 0.05;
const ITERAZIONI = 200;
/** Mezzo centesimo: sotto questa soglia il valore attuale a tasso zero è rumore di arrotondamento. */
const TOLLERANZA_VA = 0.005;

/**
 * Flussi dal punto di vista del cliente: al mese 0 riceve il credito meno le spese anticipate,
 * dal mese 1 al mese n paga rata e incasso, al mese n+1 la maxi rata (la "rata finale" dopo le n rate).
 */
export function flussiCliente(p: Preventivo, r: Ricostruzione): Flusso[] | null {
  const credito = p.importoCreditoDichiarato ?? r.importoCreditoRicostruito;
  if (credito == null || credito <= 0 || p.nRate <= 0 || p.rata <= 0) return null;
  const speseAnticipate = (p.speseIstruttoria ?? 0) + (p.impostaBollo ?? 0) + r.speseImplicite;
  const incasso = p.speseIncassoRata ?? 0;
  const rate = Array.from({ length: p.nRate }, (_, k) => ({
    mese: k + 1,
    importo: -((k === 0 && p.primaRataDiversa != null ? p.primaRataDiversa : p.rata) + incasso),
  }));
  const maxi = p.maxiRata ? [{ mese: p.nRate + 1, importo: -p.maxiRata }] : [];
  return [{ mese: 0, importo: credito - speseAnticipate }, ...rate, ...maxi];
}

export function valoreAttuale(flussi: readonly Flusso[], tassoMensile: number): number {
  return flussi.reduce((somma, f) => somma + f.importo / (1 + tassoMensile) ** f.mese, 0);
}

/** Tasso mensile che azzera il valore attuale, per bisezione tra 0 e 5%. null se fuori intervallo. */
export function tassoMensile(flussi: readonly Flusso[]): number | null {
  const vaZero = valoreAttuale(flussi, 0);
  if (Math.abs(vaZero) <= TOLLERANZA_VA) return 0;
  if (vaZero > 0) return null;
  if (valoreAttuale(flussi, TASSO_MENSILE_MAX) < 0) return null;
  let basso = 0;
  let alto = TASSO_MENSILE_MAX;
  for (let k = 0; k < ITERAZIONI; k += 1) {
    const medio = (basso + alto) / 2;
    if (valoreAttuale(flussi, medio) > 0) alto = medio;
    else basso = medio;
  }
  return (basso + alto) / 2;
}

/** TAEG in punti percentuali (11.03 = 11,03%). */
export function taegDaFlussi(flussi: readonly Flusso[]): number | null {
  const i = tassoMensile(flussi);
  return i == null ? null : ((1 + i) ** 12 - 1) * 100;
}

function esitoNonCalcolabile(p: Preventivo, nota: string): EsitoTaeg {
  return { taegRicostruito: null, taegDichiarato: p.taegDichiarato ?? null, differenzaPunti: null, stato: 'non_calcolabile', nota };
}

export function verificaTaeg(p: Preventivo, r: Ricostruzione, m: Mercato = MERCATO_IT): EsitoTaeg {
  if (p.tipo === 'noleggio') return esitoNonCalcolabile(p, t(m, 'taeg.noleggio'));
  const flussi = flussiCliente(p, r);
  if (!flussi) return esitoNonCalcolabile(p, t(m, 'taeg.mancanoDati'));
  const calcolato = taegDaFlussi(flussi);
  if (calcolato == null) return esitoNonCalcolabile(p, t(m, 'taeg.nonRicostruibile'));
  const taeg = arrotonda(calcolato, 2);
  if (p.taegDichiarato == null) {
    return { taegRicostruito: taeg, taegDichiarato: null, differenzaPunti: null, stato: 'non_dichiarato', nota: t(m, 'taeg.nonDichiarato', { calcolato: punti(taeg) }) };
  }
  const differenza = arrotonda(taeg - p.taegDichiarato, 2);
  const inLinea = Math.abs(differenza) <= TOLLERANZA_TAEG_PUNTI;
  const valori = { calcolato: punti(taeg), dichiarato: punti(p.taegDichiarato) };
  const nota = inLinea ? t(m, 'taeg.inLinea', valori) : t(m, 'taeg.daVerificare', valori);
  return { taegRicostruito: taeg, taegDichiarato: p.taegDichiarato, differenzaPunti: differenza, stato: inLinea ? 'in_linea' : 'da_verificare', nota };
}
