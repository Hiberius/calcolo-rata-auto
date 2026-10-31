import { avviaGlossario } from './glossario';

const CHIAVE_BANNER = 'ratavera:banner-cookie';

function leggi(chiave: string): string | null {
  try {
    return localStorage.getItem(chiave);
  } catch {
    return null;
  }
}

function scrivi(chiave: string, valore: string): void {
  try {
    localStorage.setItem(chiave, valore);
  } catch {
    // Storage bloccato: il banner ricomparirà, nient'altro.
  }
}

/** Riga informativa sui cookie con «Chiudi»: nessun consenso da chiedere, perché non ci sono cookie di profilazione. */
function rigaCookie(doc: Document): void {
  const modello = doc.querySelector<HTMLTemplateElement>('template[data-riga-cookie]');
  if (!modello || leggi(CHIAVE_BANNER) === '1') return;
  const riga = modello.content.firstElementChild?.cloneNode(true);
  if (!(riga instanceof HTMLElement)) return;
  doc.body.appendChild(riga);
  riga.querySelector('[data-chiudi-banner]')?.addEventListener('click', () => {
    scrivi(CHIAVE_BANNER, '1');
    riga.remove();
  });
}

/** Glossario in linea e riga sui cookie, su ogni pagina. */
export function avviaPagina(doc: Document): void {
  avviaGlossario(doc);
  rigaCookie(doc);
}
