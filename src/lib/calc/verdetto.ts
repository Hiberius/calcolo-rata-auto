import { SOGLIE_VERDETTO } from './config';
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
  if (pct == null) {
    return { livello: 'non_applicabile', etichetta: 'Costo del credito non calcolabile: conta il totale.', quotaRata: quota, fraseQuotaRata: frase };
  }
  if (pct < SOGLIE_VERDETTO.basso) return { livello: 'basso', etichetta: 'Costo del credito basso', quotaRata: quota, fraseQuotaRata: frase };
  if (pct <= SOGLIE_VERDETTO.alto) return { livello: 'medio', etichetta: 'Costo del credito nella media delle promozioni attuali', quotaRata: quota, fraseQuotaRata: frase };
  return { livello: 'alto', etichetta: 'Costo del credito sopra la media delle promozioni attuali', quotaRata: quota, fraseQuotaRata: frase };
}
