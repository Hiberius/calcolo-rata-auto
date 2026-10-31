/** Chiavi di test pubbliche di Cloudflare: passano sempre. Usate solo se il segreto vero manca. */
export const TURNSTILE_SITE_KEY_TEST = '1x00000000000000000000AA';
export const TURNSTILE_SECRET_KEY_TEST = '1x0000000000000000000000000000000AA';

const URL_VERIFICA = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

export interface EsitoTurnstile {
  readonly ok: boolean;
  readonly codici: readonly string[];
}

export async function verificaTurnstile(token: string | null | undefined, segreto: string | undefined, ip: string): Promise<EsitoTurnstile> {
  if (!token || token.length > 2048) return { ok: false, codici: ['token-mancante'] };
  const corpo = new FormData();
  corpo.append('secret', segreto || TURNSTILE_SECRET_KEY_TEST);
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
