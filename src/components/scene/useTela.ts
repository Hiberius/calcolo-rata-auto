import { useEffect, useRef } from 'preact/hooks';

export interface Area {
  readonly larghezza: number;
  readonly altezza: number;
}

export type Disegno = (ctx: CanvasRenderingContext2D, area: Area) => void;

/** Densità massima: oltre 2 i pixel in più non si vedono e costano memoria sui telefoni. */
const DENSITA_MAX = 2;

function prepara(tela: HTMLCanvasElement): { ctx: CanvasRenderingContext2D; area: Area } | null {
  const ctx = tela.getContext('2d');
  if (!ctx) return null;
  const densita = Math.min(DENSITA_MAX, window.devicePixelRatio || 1);
  const area = { larghezza: tela.clientWidth, altezza: tela.clientHeight };
  const w = Math.max(1, Math.round(area.larghezza * densita));
  const h = Math.max(1, Math.round(area.altezza * densita));
  if (tela.width !== w || tela.height !== h) {
    tela.width = w;
    tela.height = h;
  }
  ctx.setTransform(densita, 0, 0, densita, 0, 0);
  ctx.clearRect(0, 0, area.larghezza, area.altezza);
  return { ctx, area };
}

/**
 * Canvas 2D ad alta densità: ridisegna quando cambia `disegno` e quando cambia la larghezza.
 * Il disegno è una funzione pura del suo stato: niente animazioni nascoste qui dentro.
 */
export function useTela(disegno: Disegno) {
  const ref = useRef<HTMLCanvasElement>(null);
  const ultimo = useRef(disegno);
  ultimo.current = disegno;

  const ridisegna = () => {
    const tela = ref.current;
    if (!tela) return;
    const pronto = prepara(tela);
    if (pronto) ultimo.current(pronto.ctx, pronto.area);
  };

  useEffect(ridisegna, [disegno]);

  useEffect(() => {
    const tela = ref.current;
    if (!tela) return undefined;
    // I numeri sugli assi usano JetBrains Mono: si ridisegna quando il font è pronto.
    void document.fonts?.ready.then(ridisegna).catch(() => undefined);
    if (typeof ResizeObserver !== 'function') return undefined;
    const osservatore = new ResizeObserver(() => ridisegna());
    osservatore.observe(tela);
    return () => osservatore.disconnect();
  }, []);

  return ref;
}
