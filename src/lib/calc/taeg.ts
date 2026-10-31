import { TOLLERANZA_TAEG_PUNTI } from './config';
import { arrotonda, punti } from './format';
import type { EsitoTaeg, Preventivo, Ricostruzione } from './tipi';

export interface Flusso {
  readonly mese: number;
  readonly importo: number;
}

const TASSO_MENSILE_MAX = 0.05;
const ITERAZIONI = 200;

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
  if (valoreAttuale(flussi, 0) > 0) return null;
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

export function verificaTaeg(p: Preventivo, r: Ricostruzione): EsitoTaeg {
  if (p.tipo === 'noleggio') return esitoNonCalcolabile(p, 'Nel noleggio non c’è un TAEG: si confronta il totale dei canoni.');
  const flussi = flussiCliente(p, r);
  if (!flussi) return esitoNonCalcolabile(p, 'Per ricostruire il TAEG servono importo del credito (o prezzo e anticipo), numero di rate e rata.');
  const calcolato = taegDaFlussi(flussi);
  if (calcolato == null) return esitoNonCalcolabile(p, 'Con questi numeri il TAEG non si può ricostruire: controlla rata, anticipo e maxi rata.');
  const taeg = arrotonda(calcolato, 2);
  if (p.taegDichiarato == null) {
    return { taegRicostruito: taeg, taegDichiarato: null, differenzaPunti: null, stato: 'non_dichiarato', nota: `Il preventivo non indica il TAEG: dai numeri visibili è circa ${punti(taeg)}. Chiedilo per iscritto.` };
  }
  const differenza = arrotonda(taeg - p.taegDichiarato, 2);
  const inLinea = Math.abs(differenza) <= TOLLERANZA_TAEG_PUNTI;
  const nota = inLinea
    ? `Il TAEG dichiarato (${punti(p.taegDichiarato)}) torna con i numeri del preventivo.`
    : `Dai numeri visibili il TAEG è circa ${punti(taeg)}, quello dichiarato è ${punti(p.taegDichiarato)}: da verificare. Di solito la differenza viene da spese non indicate nel preventivo, che il SECCI deve elencare.`;
  return { taegRicostruito: taeg, taegDichiarato: p.taegDichiarato, differenzaPunti: differenza, stato: inLinea ? 'in_linea' : 'da_verificare', nota };
}
