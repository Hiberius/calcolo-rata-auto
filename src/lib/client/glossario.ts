/** Comportamento del glossario in linea (components/ui/Termine.tsx), con ascoltatori delegati: vale anche per le isole. */
const MARGINE = 12;

function definizione(t: Element): HTMLElement | null {
  return t.querySelector<HTMLElement>('.termine-def');
}

/** Il riquadro dentro cui la definizione deve stare: il pannello scuro della scena (o la vista venditore), se c'è, altrimenti lo schermo. */
interface Limiti { readonly sinistra: number; readonly destra: number }
function limitiDi(t: HTMLElement, larghezza: number): Limiti {
  const pannello = t.closest('.pannello-scena, .vista-venditore');
  if (!pannello) return { sinistra: 0, destra: larghezza };
  const r = pannello.getBoundingClientRect();
  return { sinistra: Math.max(0, r.left), destra: Math.min(larghezza, r.right) };
}

/** Larghezza massima della definizione: 20rem, mai oltre il riquadro meno i margini. */
function larghezzaMassima(l: Limiti): number {
  const rem = Number.parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
  return Math.min(20 * rem, l.destra - l.sinistra - 2 * MARGINE);
}

function spostamento(sinistra: number, ampiezza: number, l: Limiti): number {
  const fuori = sinistra + ampiezza - (l.destra - MARGINE);
  const dx = fuori > 0 ? -fuori : 0;
  return sinistra + dx < l.sinistra + MARGINE ? l.sinistra + MARGINE - sinistra : dx;
}

/**
 * Tiene la definizione dentro lo schermo. Prima di mostrarla la sposta come se fosse larga al massimo, poi
 * la riavvicina alla parola con la larghezza vera: non sborda mai, nemmeno per un istante. Su mobile anche
 * un istante basta ad allargare la pagina, e la barra fissa in basso la tiene allargata.
 */
function preposiziona(t: HTMLElement, larghezza: number): void {
  const def = definizione(t);
  if (!def) return;
  const l = limitiDi(t, larghezza);
  const massima = larghezzaMassima(l);
  def.style.setProperty('--larghezza-def', `${Math.round(massima)}px`);
  def.style.setProperty('--sposta', `${Math.round(spostamento(t.getBoundingClientRect().left, massima, l))}px`);
}

function rifinisci(t: HTMLElement, larghezza: number): void {
  const def = definizione(t);
  const r = def?.getBoundingClientRect();
  if (!def || !r || r.width === 0) return;
  def.style.setProperty('--sposta', `${Math.round(spostamento(t.getBoundingClientRect().left, r.width, limitiDi(t, larghezza)))}px`);
}

function imposta(t: Element, aperto: boolean): void {
  const voce = t.querySelector('[data-termine-voce]');
  const larghezza = t.ownerDocument.documentElement.clientWidth;
  if (aperto) preposiziona(t as HTMLElement, larghezza);
  if (aperto) t.setAttribute('data-aperto', '');
  else t.removeAttribute('data-aperto');
  voce?.setAttribute('aria-expanded', String(aperto));
  if (aperto) rifinisci(t as HTMLElement, larghezza);
}

function chiudiTutti(doc: Document, tranne?: Element): void {
  for (const t of doc.querySelectorAll('[data-termine][data-aperto]')) if (t !== tranne) imposta(t, false);
}

function termineDi(bersaglio: EventTarget | null): HTMLElement | null {
  return bersaglio instanceof Element ? bersaglio.closest<HTMLElement>('[data-termine]') : null;
}

export function avviaGlossario(doc: Document): void {
  doc.addEventListener('click', (e) => {
    const t = termineDi(e.target);
    const suVoce = e.target instanceof Element && e.target.closest('[data-termine-voce]');
    if (t && suVoce) {
      const aperto = !t.hasAttribute('data-aperto');
      chiudiTutti(doc, t);
      imposta(t, aperto);
      return;
    }
    if (!t) chiudiTutti(doc);
  });
  // Esc chiude sia la definizione aperta col tocco sia quella aperta dal passaggio del puntatore (WCAG 1.4.13).
  doc.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    for (const t of doc.querySelectorAll('[data-termine]:hover')) t.setAttribute('data-chiuso', '');
    const aperto = doc.querySelector('[data-termine][data-aperto]');
    if (!aperto) return;
    chiudiTutti(doc);
    aperto.querySelector<HTMLElement>('[data-termine-voce]')?.focus();
  });
  doc.addEventListener('focusout', (e) => {
    const t = termineDi(e.target);
    if (t && !(e.relatedTarget instanceof Node && t.contains(e.relatedTarget))) imposta(t, false);
  });
  doc.addEventListener('pointerover', (e) => {
    const t = termineDi(e.target);
    if (!t || t.hasAttribute('data-chiuso')) return;
    const larghezza = doc.documentElement.clientWidth;
    preposiziona(t, larghezza);
    rifinisci(t, larghezza);
  });
  doc.addEventListener('pointerout', (e) => {
    const t = termineDi(e.target);
    if (t && !(e.relatedTarget instanceof Node && t.contains(e.relatedTarget))) t.removeAttribute('data-chiuso');
  });
}
