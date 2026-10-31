/**
 * «Prova con un preventivo d'esempio» sta nell'hero, il modulo più in basso (isola Preact): si parlano con un evento.
 * Se il clic arriva prima che l'isola sia pronta resta un segno sul documento, e l'isola lo legge appena monta.
 * Senza JavaScript il link porta a /?esempio=1, che l'isola legge allo stesso modo.
 */
export const EVENTO_ESEMPIO = 'ratavera:esempio';
const PARAMETRO = 'esempio';

export function chiediEsempio(doc: Document): void {
  doc.documentElement.dataset.esempio = 'chiesto';
  doc.dispatchEvent(new CustomEvent(EVENTO_ESEMPIO));
}

function richiestoDallIndirizzo(win: Window): boolean {
  const url = new URL(win.location.href);
  if (url.searchParams.get(PARAMETRO) !== '1') return false;
  url.searchParams.delete(PARAMETRO);
  win.history.replaceState(win.history.state, '', `${url.pathname}${url.search}${url.hash}`);
  return true;
}

/** Chiama `carica` per ogni richiesta dell'esempio, anche per quella arrivata prima. Restituisce la funzione per smettere. */
export function ascoltaEsempio(doc: Document, win: Window, carica: () => void): () => void {
  const consuma = () => {
    delete doc.documentElement.dataset.esempio;
    carica();
  };
  if (doc.documentElement.dataset.esempio === 'chiesto' || richiestoDallIndirizzo(win)) consuma();
  doc.addEventListener(EVENTO_ESEMPIO, consuma);
  return () => doc.removeEventListener(EVENTO_ESEMPIO, consuma);
}

/** Il link dell'hero: con JavaScript non ricarica la pagina, chiede l'esempio all'isola. Spazio come Invio (ha ruolo di pulsante). */
export function collegaPulsanteEsempio(doc: Document): void {
  for (const el of doc.querySelectorAll<HTMLAnchorElement>('[data-prova-esempio]')) {
    const premi = (e: Event) => {
      e.preventDefault();
      chiediEsempio(doc);
    };
    el.addEventListener('click', premi);
    el.addEventListener('keydown', (e) => { if (e.key === ' ') premi(e); });
  }
}
