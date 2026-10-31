import type { Analisi } from '../calc';
import { euroIntero, numero, percentuale, punti } from '../calc/format';

export interface DatiScheda {
  readonly id: string;
  readonly titolo: string;
  readonly rataPubblicizzata: string;
  readonly totale: string;
  readonly prezzo: string | null;
  readonly costoCredito: string | null;
  readonly costoCreditoPct: string | null;
  readonly composizione: string;
  readonly taeg: string;
  readonly url: string;
  readonly urlBreve: string;
}

/** 4326 -> "4.326"; 128.99 -> "128,99" */
function compatto(valore: number): string {
  return numero(valore, Number.isInteger(valore) ? 0 : 2);
}

function titoloDi(a: Analisi): string {
  const p = a.preventivo;
  return [p.marca, p.modello, p.versione].filter(Boolean).join(' ') || 'Il preventivo';
}

export function datiScheda(a: Analisi, id: string, sito: string): DatiScheda {
  const p = a.preventivo;
  const t = a.totali;
  const parti = [`Anticipo ${compatto(p.anticipo)}`, `${p.nRate}×${compatto(p.rata)}`, ...(p.maxiRata ? [`maxi rata ${compatto(p.maxiRata)}`] : [])];
  const host = sito.replace(/^https?:\/\//, '').replace(/\/$/, '');
  return {
    id,
    titolo: titoloDi(a),
    rataPubblicizzata: `${compatto(p.rata)} €/mese`,
    totale: euroIntero(t.totalePagatoTenendo),
    prezzo: t.prezzoRiferimento != null ? euroIntero(t.prezzoRiferimento) : null,
    costoCredito: t.costoCredito != null ? euroIntero(t.costoCredito) : null,
    costoCreditoPct: t.costoCreditoPct != null ? percentuale(t.costoCreditoPct, 0) : null,
    composizione: parti.join(' + '),
    taeg: p.taegDichiarato != null ? `TAEG ${punti(p.taegDichiarato)}` : 'TAEG non indicato',
    url: `${sito.replace(/\/$/, '')}/s/${id}`,
    urlBreve: `${host}/s/${id}`,
  };
}

/** Testo pronto da incollare su Reddit o Facebook. */
export function testoCondivisione(d: DatiScheda): string {
  const prezzo = d.prezzo ? ` (prezzo ${d.prezzo})` : '';
  const costo = d.costoCredito ? ` Costo del credito ${d.costoCredito} (${d.costoCreditoPct}).` : '';
  return `${d.titolo} «a ${d.rataPubblicizzata}». Paghi davvero ${d.totale}${prezzo}.${costo} ${d.composizione}. ${d.taeg}. ${d.urlBreve} (Rata Vera non è un mediatore creditizio: chiedi il SECCI prima di firmare.)`;
}
