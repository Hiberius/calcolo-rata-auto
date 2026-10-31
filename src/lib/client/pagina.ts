import { avviaGlossario } from './glossario';
import { stampaScontrini } from './stampa';

const CHIAVE_BANNER = 'ratavera:banner-cookie';

function scrivi(chiave: string, valore: string): void {
  try {
    localStorage.setItem(chiave, valore);
  } catch {
    // Storage bloccato: il banner ricomparirà, nient'altro.
  }
}

/**
 * Riga informativa sui cookie con «Chiudi»: nessun consenso da chiedere, perché non ci sono cookie di profilazione.
 * La riga è nel flusso in cima alla pagina (mai sopra un controllo); chiusa una volta, non torna (script in testa a Base).
 */
function rigaCookie(doc: Document): void {
  const riga = doc.querySelector<HTMLElement>('[data-banner-cookie]');
  riga?.querySelector('[data-chiudi-banner]')?.addEventListener('click', () => {
    scrivi(CHIAVE_BANNER, '1');
    doc.documentElement.dataset.cookieLetto = '';
  });
}

/** Glossario in linea e riga sui cookie, su ogni pagina. */
export function avviaPagina(doc: Document): void {
  avviaGlossario(doc);
  rigaCookie(doc);
  menuCompatto(doc);
  stampaScontrini(doc);
}

/** Il pannello del menu si chiude con Esc (il fuoco torna su «Menu»), toccando fuori o scegliendo una voce. */
function menuCompatto(doc: Document): void {
  const menu = doc.querySelector<HTMLDetailsElement>('[data-menu]');
  if (!menu) return;
  const chiudi = (fuoco: boolean) => {
    if (!menu.open) return;
    menu.open = false;
    if (fuoco) menu.querySelector('summary')?.focus();
  };
  doc.addEventListener('keydown', (e) => { if (e.key === 'Escape') chiudi(true); });
  doc.addEventListener('click', (e) => { if (e.target instanceof Node && !menu.contains(e.target)) chiudi(false); });
  menu.querySelector('nav')?.addEventListener('click', (e) => { if (e.target instanceof Element && e.target.closest('a')) chiudi(false); });
}
