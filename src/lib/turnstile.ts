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

/** Codici che vogliono dire "la verifica non è configurata da parte nostra", non "sei un robot". */
const CODICI_NON_CONFIGURATO = new Set(['segreto-mancante', 'missing-input-secret', 'invalid-input-secret']);

/** La verifica è fallita perché manca o è sbagliato il segreto: il modulo non è attivo, riprovare non serve. */
export function turnstileNonConfigurato(esito: EsitoTurnstile): boolean {
  return esito.codici.some((c) => CODICI_NON_CONFIGURATO.has(c));
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

interface VariabiliAntiRobot {
  readonly PUBLIC_TURNSTILE_SITE_KEY?: string | undefined;
  readonly TURNSTILE_SECRET_KEY?: string | undefined;
}

/**
 * La chiave pubblica da dare ai moduli, oppure '' se la verifica non può funzionare: senza il segreto, fuori da
 * localhost, il server rifiuta ogni token (segretoTurnstile). In quel caso il widget non si mostra nemmeno: con la chiave
 * di test Cloudflare stamperebbe «Solo per test» in pagina, e i moduli dicono invece in una riga che non sono ancora attivi.
 */
export function chiaveAntiRobot(env: VariabiliAntiRobot | undefined, urlRichiesta: string): string {
  const chiave = (env?.PUBLIC_TURNSTILE_SITE_KEY ?? '').trim() || TURNSTILE_SITE_KEY_TEST;
  if (richiestaLocale(urlRichiesta)) return chiave;
  return env?.TURNSTILE_SECRET_KEY ? chiave : '';
}

/** Detto una volta sola, uguale nei moduli: il modulo esiste, la verifica anti-robot non è ancora accesa. */
export const MESSAGGIO_NON_ATTIVO = 'Questo invio si attiva a giorni, appena è accesa la verifica anti-robot. Intanto i conti sul preventivo funzionano: scrivi i numeri o guarda l’esempio.';
