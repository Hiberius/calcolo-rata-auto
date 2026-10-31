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
  });
  return () => api.remove(id);
}
