import type { z } from 'zod';
import { hashIpGiornaliero } from '../hash';
import { ipDa, jsonErrore, jsonOk, MESSAGGI } from '../http';
import { controllaLimiti, type Limite } from '../ratelimit';
import { verificaTurnstile } from '../turnstile';

export type CodiceErrore = 'dati' | 'turnstile' | 'limite' | 'interno' | 'consenso';

const MESSAGGI_MODULO: Record<CodiceErrore, string> = {
  dati: 'Alcuni campi non sono validi: controllali e riprova.',
  turnstile: MESSAGGI.turnstile,
  limite: 'Hai già inviato diverse richieste oggi: riprova domani o scrivici.',
  interno: MESSAGGI.interno,
  consenso: 'Il testo del consenso è cambiato: ricarica la pagina e riprova.',
};
const STATUS: Record<CodiceErrore, number> = { dati: 422, turnstile: 403, limite: 429, interno: 500, consenso: 409 };
const CAMPI_TOKEN = ['cf-turnstile-response', 'turnstileToken', 'g-recaptcha-response'] as const;
const MAX_CORPO = 16 * 1024;

export function messaggioErrore(codice: string | null): string | null {
  return codice && codice in MESSAGGI_MODULO ? MESSAGGI_MODULO[codice as CodiceErrore] : null;
}

function daForm(request: Request): boolean {
  const tipo = request.headers.get('content-type') ?? '';
  return tipo.includes('application/x-www-form-urlencoded') || tipo.includes('multipart/form-data');
}

/** Corpo JSON o form HTML in un oggetto semplice. null se illeggibile o troppo grande. */
export async function leggiCorpo(request: Request): Promise<Record<string, unknown> | null> {
  if (Number(request.headers.get('content-length') ?? '0') > MAX_CORPO) return null;
  try {
    if (daForm(request)) return Object.fromEntries([...(await request.formData()).entries()].map(([k, v]) => [k, typeof v === 'string' ? v : '']));
    const dati: unknown = await request.json();
    return dati && typeof dati === 'object' && !Array.isArray(dati) ? (dati as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

/** Separa il token anti-robot dai campi del modulo: i campi vanno allo schema .strict(). */
export function separaToken(corpo: Readonly<Record<string, unknown>>): { token: string | null; campi: Record<string, unknown> } {
  const token = CAMPI_TOKEN.map((k) => corpo[k]).find((v): v is string => typeof v === 'string' && v.length > 0) ?? null;
  const campi = Object.fromEntries(Object.entries(corpo).filter(([k]) => !(CAMPI_TOKEN as readonly string[]).includes(k) && corpo[k] !== ''));
  return { token, campi };
}

/** Form HTML: torna alla pagina con ?inviato=1 o ?errore=codice. JSON: risposta { ok, ... }. */
export function rispondi(request: Request, pagina: string, esito: { ok: true; dati?: object } | { ok: false; codice: CodiceErrore; campi?: readonly string[] }): Response {
  if (daForm(request)) {
    const q = esito.ok ? 'inviato=1' : `errore=${esito.codice}${esito.campi?.length ? `&campi=${encodeURIComponent(esito.campi.join(','))}` : ''}`;
    return new Response(null, { status: 303, headers: { location: `${pagina}?${q}#modulo`, 'cache-control': 'no-store' } });
  }
  if (esito.ok) return jsonOk(esito.dati ?? {}, 201);
  return jsonErrore(STATUS[esito.codice], MESSAGGI_MODULO[esito.codice], esito.campi ? { campi: esito.campi } : {});
}

export type EsitoControlli<T> =
  | { readonly ok: true; readonly dati: T; readonly ipHash: string }
  | { readonly ok: false; readonly codice: CodiceErrore; readonly campi?: readonly string[] };

/** Corpo, schema zod, Turnstile e limite di frequenza: lo stesso percorso per ogni modulo pubblico. */
export async function controllaModulo<S extends z.ZodType>(
  request: Request,
  env: Pick<Env, 'KV' | 'TURNSTILE_SECRET_KEY' | 'HASH_SALT'>,
  schema: S,
  limite: Limite,
): Promise<EsitoControlli<z.output<S>>> {
  const corpo = await leggiCorpo(request);
  if (!corpo) return { ok: false, codice: 'dati' };
  const { token, campi } = separaToken(corpo);
  const esito = schema.safeParse(campi);
  if (!esito.success) return { ok: false, codice: 'dati', campi: [...new Set(esito.error.issues.map((i) => i.path.join('.') || 'modulo'))] };
  const ip = ipDa(request);
  const turnstile = await verificaTurnstile(token, env.TURNSTILE_SECRET_KEY, ip, request.url);
  if (!turnstile.ok) return { ok: false, codice: 'turnstile' };
  const ipHash = await hashIpGiornaliero(ip, env.HASH_SALT);
  const frequenza = await controllaLimiti(env.KV, ipHash, [limite]);
  if (!frequenza.consentito) return { ok: false, codice: 'limite' };
  return { ok: true, dati: esito.data, ipHash };
}
