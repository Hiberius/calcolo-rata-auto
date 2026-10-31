import { useEffect, useRef } from 'preact/hooks';
import { prepara, type Area } from './disegno/tela';

export type { Area } from './disegno/tela';

export type Disegno = (ctx: CanvasRenderingContext2D, area: Area) => void;

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
