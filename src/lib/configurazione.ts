import { TURNSTILE_SITE_KEY_TEST } from './turnstile';

/**
 * Controllo della configurazione prima del deploy (revisione del 31/10): con la chiave Turnstile di test o senza
 * segreti i moduli non funzionano fuori da localhost, senza P.IVA e sede l'informativa privacy è incompleta.
 * Funzione pura: lo script `scripts/controlla-deploy.ts` le passa i vars di wrangler.jsonc e i nomi dei segreti.
 */
export interface ConfigurazioneDeploy {
  readonly vars: Readonly<Record<string, string | undefined>>;
  /** Nomi dei segreti presenti nel Worker (`wrangler secret list`), senza i valori. */
  readonly segreti: readonly string[];
}

export const SEGRETI_NECESSARI = ['TURNSTILE_SECRET_KEY', 'HASH_SALT', 'ADMIN_TOKEN'] as const;

export function problemiConfigurazione(c: ConfigurazioneDeploy): string[] {
  const siteKey = (c.vars.PUBLIC_TURNSTILE_SITE_KEY ?? '').trim();
  const problemi: string[] = [];
  if (!siteKey) problemi.push('PUBLIC_TURNSTILE_SITE_KEY è vuota: i moduli non mostrano la verifica anti-robot.');
  if (siteKey === TURNSTILE_SITE_KEY_TEST) {
    problemi.push('PUBLIC_TURNSTILE_SITE_KEY è la chiave di test di Cloudflare: crea il widget Turnstile e metti la chiave vera in wrangler.jsonc.');
  }
  for (const nome of SEGRETI_NECESSARI) {
    if (!c.segreti.includes(nome)) problemi.push(`Manca il segreto ${nome} (wrangler secret put ${nome}).`);
  }
  if (!(c.vars.PUBLIC_PIVA ?? '').trim()) problemi.push('PUBLIC_PIVA è vuota: la privacy pubblica il titolare senza partita IVA.');
  if (!(c.vars.PUBLIC_SEDE ?? '').trim()) problemi.push('PUBLIC_SEDE è vuota: la privacy pubblica il titolare senza sede.');
  return problemi;
}

/** wrangler.jsonc senza commenti, poi JSON. I commenti sono solo righe intere `//` o blocchi, come nel file del repo. */
export function leggiJsonc(testo: string): unknown {
  const senzaBlocchi = testo.replace(/\/\*[\s\S]*?\*\//g, '');
  const senzaRighe = senzaBlocchi.split('\n').filter((r) => !r.trim().startsWith('//')).join('\n');
  return JSON.parse(senzaRighe.replace(/,(\s*[}\]])/g, '$1'));
}
