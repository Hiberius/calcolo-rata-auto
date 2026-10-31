import { avviaGlossario } from './glossario';

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
}
