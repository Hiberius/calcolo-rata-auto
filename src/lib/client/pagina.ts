import { inviaEvento, type EventoClient } from './evento';
import { avviaGlossario } from './glossario';

const CHIAVE_BANNER = 'ratavera:banner-cookie';
const EVENTI_LINK: ReadonlySet<string> = new Set<EventoClient>(['verdetto_click', 'b2b_click']);

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

/** Glossario in linea, riga sui cookie e click misurati sui pulsanti di pagamento. */
export function avviaPagina(doc: Document): void {
  avviaGlossario(doc);
  rigaCookie(doc);
  doc.addEventListener('click', (e) => {
    const el = (e.target as Element | null)?.closest<HTMLElement>('[data-evento]');
    const nome = el?.dataset['evento'];
    if (nome && EVENTI_LINK.has(nome)) inviaEvento(nome as EventoClient);
  });
}
