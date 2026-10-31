/** Risposte JSON uniformi: { ok, ... } oppure { ok: false, errore } con messaggio in italiano per l'utente. */
const INTESTAZIONI_JSON = {
  'content-type': 'application/json; charset=utf-8',
  'cache-control': 'no-store',
  'x-content-type-options': 'nosniff',
} as const;

export function jsonOk<T extends object>(dati: T, status = 200): Response {
  return new Response(JSON.stringify({ ok: true, ...dati }), { status, headers: INTESTAZIONI_JSON });
}

export function jsonErrore(status: number, errore: string, extra: Readonly<Record<string, unknown>> = {}): Response {
  return new Response(JSON.stringify({ ok: false, errore, ...extra }), { status, headers: INTESTAZIONI_JSON });
}

export function ipDa(request: Request): string {
  return request.headers.get('cf-connecting-ip') ?? request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? '0.0.0.0';
}

export const MESSAGGI = {
  metodo: 'Metodo non consentito.',
  corpo: 'Richiesta non valida: ricarica la pagina e riprova.',
  turnstile: 'Verifica anti-robot non riuscita: ricarica la pagina e riprova.',
  nonAttivo: 'Questo modulo non è ancora attivo: stiamo completando la verifica anti-robot. Riprova tra qualche giorno o scrivici a ciao@ratavera.it. Il calcolo con i numeri inseriti a mano funziona già.',
  limite: "Hai fatto molte richieste: riprova tra un'ora. Puoi sempre inserire i numeri a mano.",
  interno: 'Qualcosa non ha funzionato da parte nostra: riprova tra poco.',
} as const;
