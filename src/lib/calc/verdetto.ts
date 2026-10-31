import { SOGLIE_VERDETTO } from './config';
import { MESSAGGIO_TOTALE_INCOERENTE } from './totale';
import { percentuale } from './format';
import type { Totali, Verdetto } from './tipi';

function fraseQuota(t: Totali): { quota: number | null; frase: string | null } {
  if (t.totalePagatoTenendo <= 0 || t.sommaRate <= 0) return { quota: null, frase: null };
  const quota = t.sommaRate / t.totalePagatoTenendo;
  return { quota, frase: `Le rate pubblicizzate coprono il ${percentuale(quota, 0)} di quello che paghi.` };
}

/** Etichetta fattuale sul costo del credito: nessun consiglio, solo il confronto con le soglie dichiarate. */
export function verdetto(t: Totali): Verdetto {
  const { quota, frase } = fraseQuota(t);
  const pct = t.costoCreditoPct;
  if (t.messaggi.includes(MESSAGGIO_TOTALE_INCOERENTE)) {
    return { livello: 'non_applicabile', etichetta: MESSAGGIO_TOTALE_INCOERENTE, quotaRata: quota, fraseQuotaRata: frase };
  }
  if (pct == null) {
    return { livello: 'non_applicabile', etichetta: 'Costo del credito non calcolabile: conta il totale.', quotaRata: quota, fraseQuotaRata: frase };
  }
  const quanto = `Costo del credito: ${percentuale(pct, 1)} del prezzo`;
  if (pct < SOGLIE_VERDETTO.basso) return { livello: 'basso', etichetta: `${quanto}, sotto il 5%`, quotaRata: quota, fraseQuotaRata: frase };
  if (pct <= SOGLIE_VERDETTO.alto) return { livello: 'medio', etichetta: `${quanto}, tra il 5% e il 12%`, quotaRata: quota, fraseQuotaRata: frase };
  return { livello: 'alto', etichetta: `${quanto}, oltre il 12%`, quotaRata: quota, fraseQuotaRata: frase };
}
