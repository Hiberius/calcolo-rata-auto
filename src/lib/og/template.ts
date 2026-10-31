import type { Analisi } from '../calc';
import { composizioneTotale, type VoceTotale } from '../calc/composizione';
import { euro, euroIntero, numero, percentuale, punti } from '../calc/format';
import { baseScena, cursoriIniziali, rigaIncrocio, serieScena } from '../calc/scena';

export interface DatiScheda {
  readonly id: string;
  readonly titolo: string;
  readonly rataPubblicizzata: string;
  readonly totale: string;
  /** Totale al centesimo: chiude la composizione, così la somma torna a vista. */
  readonly totaleEsatto: string;
  readonly prezzo: string | null;
  readonly costoCredito: string | null;
  readonly costoCreditoPct: string | null;
  readonly composizione: string;
  readonly taeg: string;
  /** «Dal mese N devi all'auto più di quanto vale, stima.» se il debito supera il valore stimato. */
  readonly incrocio: string | null;
  readonly url: string;
  readonly urlBreve: string;
}

/** 4326 -> "4.326"; 128.99 -> "128,99" */
function compatto(valore: number): string {
  return numero(valore, Number.isInteger(valore) ? 0 : 2);
}

const BREVI: Readonly<Record<string, string>> = {
  anticipo: 'Anticipo', maxiRata: 'maxi rata', bollo: 'bollo', istruttoria: 'istruttoria', ipt: 'IPT', messaSuStrada: 'messa su strada',
  polizze: 'polizze', servizi: 'servizi', altre: 'altre spese', km: 'km in più',
};

/** Una voce del totale in forma breve per testo e immagine: "35×169", "incasso 35×3,40", "bollo 47,90". */
function breve(v: VoceTotale, a: Analisi): string {
  const p = a.preventivo;
  if (v.chiave === 'rate') {
    return p.primaRataDiversa != null ? `prima rata ${compatto(p.primaRataDiversa)} + ${p.nRate - 1}×${compatto(p.rata)}` : `${p.nRate}×${compatto(p.rata)}`;
  }
  if (v.chiave === 'incasso' && p.speseIncassoRata) return `incasso ${p.nRate}×${compatto(p.speseIncassoRata)}`;
  return `${BREVI[v.chiave] ?? v.etichetta} ${compatto(v.importo)}`;
}

function incrocioDi(a: Analisi): string | null {
  const base = baseScena(a);
  return rigaIncrocio(serieScena(base, cursoriIniziali(base)), base.fonteTasso, a.mercato);
}

function titoloDi(a: Analisi): string {
  const p = a.preventivo;
  return [p.marca, p.modello, p.versione].filter(Boolean).join(' ') || 'Il preventivo';
}

export function datiScheda(a: Analisi, id: string, sito: string): DatiScheda {
  const p = a.preventivo;
  const t = a.totali;
  // Tutte le voci del totale, spese comprese: chi rifà la somma arriva al totale (test del 31/10).
  const parti = composizioneTotale(a).voci.map((v) => breve(v, a));
  const host = sito.replace(/^https?:\/\//, '').replace(/\/$/, '');
  return {
    id,
    titolo: titoloDi(a),
    rataPubblicizzata: `${compatto(p.rata)} €/mese`,
    totale: euroIntero(t.totalePagatoTenendo),
    totaleEsatto: euro(t.totalePagatoTenendo),
    prezzo: t.prezzoRiferimento != null ? euroIntero(t.prezzoRiferimento) : null,
    costoCredito: t.costoCredito != null ? euroIntero(t.costoCredito) : null,
    costoCreditoPct: t.costoCreditoPct != null ? percentuale(t.costoCreditoPct, 0) : null,
    composizione: `${parti.join(' + ')} = ${euro(t.totalePagatoTenendo)}`,
    taeg: p.taegDichiarato != null ? `TAEG ${punti(p.taegDichiarato)}` : 'TAEG non indicato',
    incrocio: incrocioDi(a),
    url: `${sito.replace(/\/$/, '')}/s/${id}`,
    urlBreve: `${host}/s/${id}`,
  };
}

/** Testo pronto da incollare su Reddit o Facebook. */
export function testoCondivisione(d: DatiScheda): string {
  const prezzo = d.prezzo ? ` (prezzo ${d.prezzo})` : '';
  const costo = d.costoCredito ? ` Costo del credito ${d.costoCredito} (${d.costoCreditoPct}).` : '';
  const incrocio = d.incrocio ? ` ${d.incrocio}` : '';
  return `${d.titolo} «a ${d.rataPubblicizzata}». Paghi davvero ${d.totaleEsatto}${prezzo}.${costo} ${d.composizione}. ${d.taeg}.${incrocio} ${d.urlBreve} (Rata Vera non è un mediatore creditizio: chiedi il SECCI prima di firmare.)`;
}
