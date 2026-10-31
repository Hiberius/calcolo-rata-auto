interface TurnstileApi {
  render: (el: HTMLElement, opzioni: Record<string, unknown>) => string;
  remove: (id: string) => void;
  reset: (id: string) => void;
}
declare global {
  interface Window { turnstile?: TurnstileApi }
}

const SCRIPT = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

function caricaScript(): Promise<TurnstileApi> {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  const esistente = document.querySelector<HTMLScriptElement>(`script[src="${SCRIPT}"]`);
  return new Promise((risolvi, rifiuta) => {
    const s = esistente ?? Object.assign(document.createElement('script'), { src: SCRIPT, async: true, defer: true });
    s.addEventListener('load', () => (window.turnstile ? risolvi(window.turnstile) : rifiuta(new Error('turnstile'))));
    s.addEventListener('error', () => rifiuta(new Error('turnstile')));
    if (!esistente) document.head.appendChild(s);
  });
}

/** Mostra il widget nell'elemento e chiama onToken a ogni token valido. Restituisce la funzione di pulizia. */
export async function montaTurnstile(el: HTMLElement, siteKey: string, onToken: (token: string | null) => void): Promise<() => void> {
  const api = await caricaScript();
  const id = api.render(el, {
    sitekey: siteKey,
    language: 'it',
    callback: (t: string) => onToken(t),
    'expired-callback': () => onToken(null),
    'error-callback': () => onToken(null),
    // Invisibile finché Cloudflare non chiede un'interazione: niente riquadro vuoto né scritte di servizio in pagina.
    appearance: 'interaction-only',
  });
  return () => api.remove(id);
}

const SCRIPT_IMPLICITO = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
const ATTESA_DOPO_CARICAMENTO_MS = 2_500;

/**
 * Moduli con il widget implicito (.cf-turnstile): lo script di Cloudflare si scarica al primo gesto sul modulo
 * (focus o tocco) o 2,5 s dopo il caricamento della pagina, così non contende la rete al primo schermo (LCP di /indice).
 */
export function caricaTurnstilePigro(doc: Document): void {
  const widget = [...doc.querySelectorAll<HTMLElement>('[data-turnstile-pigro]')];
  if (widget.length === 0) return;
  let fatto = false;
  const carica = () => {
    if (fatto || doc.querySelector(`script[src="${SCRIPT_IMPLICITO}"]`)) return;
    fatto = true;
    doc.head.appendChild(Object.assign(doc.createElement('script'), { src: SCRIPT_IMPLICITO, async: true, defer: true }));
  };
  for (const w of widget) {
    const modulo = w.closest('form') ?? w.parentElement;
    modulo?.addEventListener('focusin', carica, { once: true });
    modulo?.addEventListener('pointerdown', carica, { once: true });
  }
  const dopo = () => setTimeout(carica, ATTESA_DOPO_CARICAMENTO_MS);
  if (doc.readyState === 'complete') dopo();
  else addEventListener('load', dopo, { once: true });
}
