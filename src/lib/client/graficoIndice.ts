import { numero } from '../calc/format';
import { movimentoPermesso } from '../motion';

/**
 * Grafico dell'Indice: riordina le righe per la misura scelta (dalla più bassa) con FLIP su Web Animations,
 * aggiorna barre (transform) e valori (textContent). Nessun innerHTML, nessuna libreria.
 */
const METRICHE = new Set(['costo', 'taeg', 'anticipo', 'maxi']);
const CURVA_RIORDINO = 'cubic-bezier(0.65, 0, 0.35, 1)';

function valore(riga: HTMLElement, metrica: string): number | null {
  const grezzo = riga.dataset[metrica];
  if (grezzo == null || grezzo === '') return null;
  const n = Number(grezzo);
  return Number.isFinite(n) ? n : null;
}

function ordinate(righe: readonly HTMLElement[], metrica: string): HTMLElement[] {
  const chiave = (r: HTMLElement) => valore(r, metrica) ?? Number.POSITIVE_INFINITY;
  return [...righe].sort((a, b) => chiave(a) - chiave(b));
}

function aggiornaRiga(riga: HTMLElement, metrica: string, massimo: number): void {
  const v = valore(riga, metrica);
  riga.querySelector<HTMLElement>('.barra-indice')?.style.setProperty('--quota', ((v ?? 0) / massimo).toFixed(4));
  const testo = riga.querySelector<HTMLElement>('[data-valore]');
  if (testo) testo.textContent = v == null ? 'n. d.' : `${numero(v, 2)}%`;
}

/** First, Last, Invert, Play: ogni riga parte da dov'era e scivola nel nuovo posto. */
function riordina(lista: HTMLElement, metrica: string): void {
  const righe = [...lista.querySelectorAll<HTMLElement>('[data-riga-indice]')];
  const prima = new Map(righe.map((r) => [r, r.getBoundingClientRect().top]));
  const nuove = ordinate(righe, metrica);
  const massimo = Math.max(0.0001, ...nuove.map((r) => valore(r, metrica) ?? 0));
  for (const r of nuove) {
    lista.appendChild(r);
    aggiornaRiga(r, metrica, massimo);
  }
  lista.dataset.metrica = metrica;
  if (!movimentoPermesso() || typeof Element.prototype.animate !== 'function') return;
  for (const r of nuove) {
    const delta = (prima.get(r) ?? 0) - r.getBoundingClientRect().top;
    if (Math.abs(delta) < 1) continue;
    r.animate([{ transform: `translateY(${delta}px)` }, { transform: 'none' }], { duration: 320, easing: CURVA_RIORDINO });
  }
}

function entraInVista(lista: HTMLElement): void {
  if (!movimentoPermesso() || typeof IntersectionObserver !== 'function') return;
  const osservatore = new IntersectionObserver((voci) => {
    if (!voci.some((v) => v.isIntersecting)) return;
    osservatore.disconnect();
    lista.dataset.entra = '';
  }, { threshold: 0.15 });
  osservatore.observe(lista);
}

export function avviaGraficoIndice(doc: Document): void {
  const lista = doc.querySelector<HTMLElement>('[data-grafico-indice]');
  if (!lista) return;
  entraInVista(lista);
  const pulsanti = [...doc.querySelectorAll<HTMLButtonElement>('[data-ordina]')];
  for (const p of pulsanti) {
    p.addEventListener('click', () => {
      const metrica = p.dataset.ordina ?? '';
      if (!METRICHE.has(metrica)) return;
      for (const altro of pulsanti) altro.setAttribute('aria-pressed', String(altro === p));
      riordina(lista, metrica);
    });
  }
}
