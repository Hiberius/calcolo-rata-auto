import { numero } from '../calc/format';
import { fotogramma, MASSIMO_ANTEPRIMA, serieAnteprima, TEMPI } from '../calc/anteprima';
import { menoMovimento } from '../motion';
import { disegnaCurve } from '../../components/scene/disegno/curve';
import { prepara } from '../../components/scene/disegno/tela';

/**
 * Loop dell'anteprima in home: rAF a 60 fps finché è in vista e la scheda è visibile.
 * Livello RIDOTTO (fotogramma statico, nessun loop): meno movimento, Save-Data, poca memoria o pochi core,
 * oppure i primi 30 fotogrammi troppo lenti (mediana oltre 22 ms).
 */
const MS_LENTO = 22;
const CAMPIONI = 30;

interface NavigatorRidotto { connection?: { saveData?: boolean }; deviceMemory?: number }

function livelloRidotto(): boolean {
  if (menoMovimento()) return true;
  const n = navigator as Navigator & NavigatorRidotto;
  return n.connection?.saveData === true || (n.deviceMemory ?? 8) <= 2 || (navigator.hardwareConcurrency || 8) < 4;
}

function mediana(v: readonly number[]): number {
  const s = [...v].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)] ?? 0;
}

function scrivi(el: HTMLElement | null, testo: string): void {
  if (el && el.textContent !== testo) el.textContent = testo;
}

export function avviaAnteprima(doc: Document): void {
  const radice = doc.querySelector<HTMLElement>('[data-anteprima]');
  const tela = radice?.querySelector<HTMLCanvasElement>('[data-tela-anteprima]');
  if (!radice || !tela) return;
  const lettura = radice.querySelector<HTMLElement>('[data-anteprima-anticipo]');
  const incrocio = radice.querySelector<HTMLElement>('[data-anteprima-incrocio]');

  const disegna = (ms: number) => {
    const f = fotogramma(ms);
    const serie = serieAnteprima(f.anticipo);
    const pronto = prepara(tela);
    if (pronto) disegnaCurve(pronto.ctx, pronto.area, { serie, massimo: MASSIMO_ANTEPRIMA, avanzamento: f.avanzamento, senzaAssi: true });
    scrivi(lettura, `${numero(Math.round(f.anticipo), 0)} €`);
    scrivi(incrocio, serie.meseIncrocio == null ? 'il debito resta sotto il valore' : `dal mese ${serie.meseIncrocio} il debito supera il valore`);
  };

  // Livello ridotto: un fotogramma statico con le curve complete e l'anticipo del preventivo, nessun loop.
  const FERMO = TEMPI.disegno;
  radice.dataset.livello = livelloRidotto() || typeof requestAnimationFrame !== 'function' ? 'ridotto' : 'pieno';
  if (radice.dataset.livello === 'ridotto') {
    disegna(FERMO);
    return;
  }

  let tempo = 0;
  let ultimo: number | null = null;
  let attivo = false;
  let richiesta = 0;
  const durate: number[] = [];

  const passo = (ora: number) => {
    if (!attivo) return;
    const delta = ultimo == null ? 0 : Math.min(100, ora - ultimo);
    ultimo = ora;
    tempo += delta;
    if (durate.length < CAMPIONI && delta > 0) {
      durate.push(delta);
      if (durate.length === CAMPIONI && mediana(durate) > MS_LENTO) {
        radice.dataset.livello = 'ridotto';
        attivo = false;
        disegna(FERMO);
        return;
      }
    }
    disegna(tempo);
    richiesta = requestAnimationFrame(passo);
  };
  const parti = () => {
    if (attivo || radice.dataset.livello === 'ridotto' || doc.hidden) return;
    attivo = true;
    ultimo = null;
    richiesta = requestAnimationFrame(passo);
  };
  const ferma = () => {
    attivo = false;
    cancelAnimationFrame(richiesta);
  };

  let inVista = false;
  if (typeof IntersectionObserver === 'function') {
    new IntersectionObserver((voci) => {
      inVista = voci.some((v) => v.isIntersecting);
      if (inVista) parti(); else ferma();
    }, { threshold: 0.25 }).observe(radice);
  } else {
    inVista = true;
    parti();
  }
  doc.addEventListener('visibilitychange', () => (doc.hidden || !inVista ? ferma() : parti()));
  if (typeof ResizeObserver === 'function') new ResizeObserver(() => { if (!attivo) disegna(tempo || FERMO); }).observe(tela);
}
