import { MERCATO_IT } from '../../markets/it';
import { t } from '../../markets';
import type { Mercato } from '../../markets/tipi';
import { MESSAGGIO_TOTALE_INCOERENTE } from './totale';
import { percentuale } from './format';
import type { Totali, Verdetto } from './tipi';

function fraseQuota(t0: Totali, m: Mercato): { quota: number | null; frase: string | null } {
  if (t0.totalePagatoTenendo <= 0 || t0.sommaRate <= 0) return { quota: null, frase: null };
  const quota = t0.sommaRate / t0.totalePagatoTenendo;
  return { quota, frase: t(m, 'verdetto.quota', { quota: percentuale(quota, 0) }) };
}

/** Etichetta fattuale sul costo del credito: nessun consiglio, solo il confronto con le soglie dichiarate del mercato. */
export function verdetto(totali: Totali, m: Mercato = MERCATO_IT): Verdetto {
  const { quota, frase } = fraseQuota(totali, m);
  const pct = totali.costoCreditoPct;
  if (totali.messaggi.includes(MESSAGGIO_TOTALE_INCOERENTE)) {
    return { livello: 'non_applicabile', etichetta: MESSAGGIO_TOTALE_INCOERENTE, quotaRata: quota, fraseQuotaRata: frase };
  }
  if (pct == null) {
    return { livello: 'non_applicabile', etichetta: t(m, 'verdetto.nonCalcolabile'), quotaRata: quota, fraseQuotaRata: frase };
  }
  const valori = { costo: t(m, 'verdetto.costo', { pct: percentuale(pct, 1) }), basso: percentuale(m.soglie.basso, 0), alto: percentuale(m.soglie.alto, 0) };
  if (pct < m.soglie.basso) return { livello: 'basso', etichetta: t(m, 'verdetto.basso', valori), quotaRata: quota, fraseQuotaRata: frase };
  if (pct <= m.soglie.alto) return { livello: 'medio', etichetta: t(m, 'verdetto.medio', valori), quotaRata: quota, fraseQuotaRata: frase };
  return { livello: 'alto', etichetta: t(m, 'verdetto.alto', valori), quotaRata: quota, fraseQuotaRata: frase };
}
