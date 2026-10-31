/** Chiavi di test pubbliche di Cloudflare: passano sempre. Usate solo in locale, se il segreto vero manca. */
export const TURNSTILE_SITE_KEY_TEST = '1x00000000000000000000AA';
export const TURNSTILE_SECRET_KEY_TEST = '1x0000000000000000000000000000000AA';

const URL_VERIFICA = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

export interface EsitoTurnstile {
  readonly ok: boolean;
  readonly codici: readonly string[];
}

const HOST_LOCALI = new Set(['localhost', '127.0.0.1', '[::1]']);

export function richiestaLocale(urlRichiesta: string): boolean {
  try {
    const host = new URL(urlRichiesta).hostname;
    return HOST_LOCALI.has(host) || host.endsWith('.localhost');
  } catch {
    return false;
  }
}

/** Il segreto da usare: quello vero se c'è; quello di test solo in locale; altrimenti null (si rifiuta tutto). */
export function segretoTurnstile(segreto: string | undefined, urlRichiesta: string): string | null {
  if (segreto) return segreto;
  return richiestaLocale(urlRichiesta) ? TURNSTILE_SECRET_KEY_TEST : null;
}

export async function verificaTurnstile(
  token: string | null | undefined,
  segreto: string | undefined,
  ip: string,
  urlRichiesta: string,
): Promise<EsitoTurnstile> {
  if (!token || token.length > 2048) return { ok: false, codici: ['token-mancante'] };
  const chiave = segretoTurnstile(segreto, urlRichiesta);
  if (!chiave) return { ok: false, codici: ['segreto-mancante'] };
  const corpo = new FormData();
  corpo.append('secret', chiave);
  corpo.append('response', token);
  corpo.append('remoteip', ip);
  try {
    const risposta = await fetch(URL_VERIFICA, { method: 'POST', body: corpo });
    if (!risposta.ok) return { ok: false, codici: [`http-${risposta.status}`] };
    const dati = (await risposta.json()) as { success?: boolean; 'error-codes'?: string[] };
    return { ok: dati.success === true, codici: dati['error-codes'] ?? [] };
  } catch {
    return { ok: false, codici: ['rete'] };
  }
}
