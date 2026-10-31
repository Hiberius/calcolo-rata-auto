export interface Area {
  readonly larghezza: number;
  readonly altezza: number;
}

/** Densità massima: oltre 2 i pixel in più non si vedono e costano memoria sui telefoni. */
const DENSITA_MAX = 2;

export function prepara(tela: HTMLCanvasElement): { ctx: CanvasRenderingContext2D; area: Area } | null {
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
