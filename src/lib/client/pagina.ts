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

/** Banner informativo (nessun consenso da chiedere: niente cookie di profilazione) e click misurati sui pulsanti di pagamento. */
export function avviaPagina(doc: Document): void {
  avviaGlossario(doc);
  const banner = doc.querySelector<HTMLElement>('[data-banner-cookie]');
  if (banner && leggi(CHIAVE_BANNER) !== '1') banner.hidden = false;
  doc.querySelector('[data-chiudi-banner]')?.addEventListener('click', () => {
    scrivi(CHIAVE_BANNER, '1');
    if (banner) banner.hidden = true;
  });
  doc.addEventListener('click', (e) => {
    const el = (e.target as Element | null)?.closest<HTMLElement>('[data-evento]');
    const nome = el?.dataset['evento'];
    if (nome && EVENTI_LINK.has(nome)) inviaEvento(nome as EventoClient);
  });
}
