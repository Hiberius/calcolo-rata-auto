/** §11: intestazioni di sicurezza per ogni risposta, CSP con nonce per ogni pagina HTML. */
export const INTESTAZIONI_FISSE: Readonly<Record<string, string>> = {
  'strict-transport-security': 'max-age=31536000; includeSubDomains',
  'x-content-type-options': 'nosniff',
  'referrer-policy': 'strict-origin-when-cross-origin',
  'x-frame-options': 'DENY',
  'permissions-policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
};

const TURNSTILE = 'https://challenges.cloudflare.com';
const ANALYTICS = 'https://static.cloudflareinsights.com';

export function politicaCsp(nonce: string): string {
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'wasm-unsafe-eval' ${TURNSTILE} ${ANALYTICS}`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: blob:",
    `connect-src 'self' ${TURNSTILE} https://cloudflareinsights.com`,
    `frame-src ${TURNSTILE}`,
    "worker-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    'upgrade-insecure-requests',
  ].join('; ');
}

export function generaNonce(): string {
  const byte = crypto.getRandomValues(new Uint8Array(16));
  return btoa(String.fromCharCode(...byte));
}

/** Toglie le intestazioni condizionali: una pagina HTML in cache con un nonce vecchio non deve mai tornare come 304. */
export function senzaCondizionali(request: Request): Request {
  if (!request.headers.has('if-none-match') && !request.headers.has('if-modified-since')) return request;
  const headers = new Headers(request.headers);
  headers.delete('if-none-match');
  headers.delete('if-modified-since');
  return new Request(request, { headers });
}

export function intestazioniSicure(origine: Headers, html: boolean, nonce: string | null): Headers {
  const headers = new Headers(origine);
  for (const [k, v] of Object.entries(INTESTAZIONI_FISSE)) headers.set(k, v);
  if (html && nonce) {
    headers.set('content-security-policy', politicaCsp(nonce));
    headers.delete('etag');
    headers.delete('last-modified');
  }
  return headers;
}

/** Aggiunge il nonce a ogni <script> con HTMLRewriter (runtime Workers) e mette le intestazioni. */
export function applicaSicurezza(risposta: Response): Response {
  const html = (risposta.headers.get('content-type') ?? '').includes('text/html');
  const nonce = html ? generaNonce() : null;
  const headers = intestazioniSicure(risposta.headers, html, nonce);
  const nuova = new Response(risposta.body, { status: risposta.status, statusText: risposta.statusText, headers });
  if (!html || !nonce || !risposta.body) return nuova;
  return new HTMLRewriter().on('script', { element: (el) => { el.setAttribute('nonce', nonce); } }).transform(nuova);
}
