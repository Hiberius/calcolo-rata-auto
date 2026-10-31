import type { Area } from '../useTela';
import { COLORE_CONTENITORE, SCENA } from './colori';

export interface VoceFlusso {
  readonly chiave: string;
  readonly importo: number;
}

export interface StatoFlusso {
  readonly voci: readonly VoceFlusso[];
  readonly totale: number;
  /** Scala in euro comune a tutta la scena: la barra in alto è lunga totale / scala. */
  readonly scala: number;
  /** 0..1, già passato per la curva. */
  readonly avanzamento: number;
}

const ALTO_BARRA = 0.13;
const INIZIO_CONTENITORI = 0.56;
const SPAZIO = 8;
const PARTICELLE_PER_VOCE = 7;

interface Geometria {
  readonly x0: number;
  readonly x1: number;
  readonly cx0: number;
  readonly cx1: number;
}

function geometrie(s: StatoFlusso, a: Area): readonly Geometria[] {
  const lunghezza = a.larghezza * Math.min(1, s.totale / s.scala);
  const colonna = (a.larghezza - SPAZIO * (s.voci.length - 1)) / s.voci.length;
  let cursore = 0;
  return s.voci.map((v, k) => {
    const x0 = cursore;
    cursore += s.totale > 0 ? (v.importo / s.totale) * lunghezza : 0;
    const cx0 = k * (colonna + SPAZIO);
    return { x0, x1: cursore, cx0, cx1: cx0 + colonna };
  });
}

/** Il nastro che scende dalla barra «dalla tua tasca» al suo contenitore. */
function nastro(ctx: CanvasRenderingContext2D, g: Geometria, yA: number, yB: number): void {
  const metà = (yA + yB) / 2;
  ctx.beginPath();
  ctx.moveTo(g.x0, yA);
  ctx.bezierCurveTo(g.x0, metà, g.cx0, metà, g.cx0, yB);
  ctx.lineTo(g.cx1, yB);
  ctx.bezierCurveTo(g.cx1, metà, g.x1, metà, g.x1, yA);
  ctx.closePath();
}

/** Punto sul centro del nastro, per le particelle in viaggio. */
function puntoSulNastro(g: Geometria, yA: number, yB: number, t: number): { x: number; y: number } {
  const xa = (g.x0 + g.x1) / 2;
  const xb = (g.cx0 + g.cx1) / 2;
  const u = 1 - t;
  const metà = (yA + yB) / 2;
  const x = u ** 3 * xa + 3 * u * u * t * xa + 3 * u * t * t * xb + t ** 3 * xb;
  const y = u ** 3 * yA + 3 * u * u * t * metà + 3 * u * t * t * metà + t ** 3 * yB;
  return { x, y };
}

function particelle(ctx: CanvasRenderingContext2D, g: Geometria, yA: number, yB: number, avanzamento: number, colore: string): void {
  if (avanzamento <= 0 || avanzamento >= 1) return;
  ctx.fillStyle = colore;
  for (let k = 0; k < PARTICELLE_PER_VOCE; k += 1) {
    const t = (avanzamento * 2.2 + k / PARTICELLE_PER_VOCE) % 1;
    const p = puntoSulNastro(g, yA, yB, t);
    ctx.globalAlpha = 0.85 * (1 - avanzamento);
    ctx.beginPath();
    ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

/** Atto 1: la barra del totale in alto si divide in nastri che riempiono i contenitori, in proporzione agli importi. */
export function disegnaFlusso(ctx: CanvasRenderingContext2D, a: Area, s: StatoFlusso): void {
  const yA = a.altezza * ALTO_BARRA;
  const yB = a.altezza * INIZIO_CONTENITORI;
  const altezzaContenitore = a.altezza - yB - 1;
  const discesa = Math.min(1, s.avanzamento / 0.6);
  const riempimento = Math.max(0, (s.avanzamento - 0.35) / 0.65);
  geometrie(s, a).forEach((g, k) => {
    const voce = s.voci[k];
    if (!voce) return;
    const colore = COLORE_CONTENITORE[voce.chiave] ?? SCENA.carta;
    ctx.fillStyle = colore;
    ctx.fillRect(g.x0, 0, Math.max(0, g.x1 - g.x0 - 1), yA);
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, yA, a.larghezza, (yB - yA) * discesa + 1);
    ctx.clip();
    if (voce.importo > 0) {
      nastro(ctx, g, yA, yB);
      // Nastri appena accennati: il colore pieno resta alla barra e ai contenitori.
      ctx.globalAlpha = voce.chiave === 'capitale' || voce.chiave === 'resto' ? 0.12 : 0.22;
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    ctx.restore();
    ctx.strokeStyle = SCENA.griglia;
    ctx.lineWidth = 1;
    ctx.strokeRect(g.cx0 + 0.5, yB + 0.5, g.cx1 - g.cx0 - 1, altezzaContenitore);
    const pieno = s.totale > 0 ? (voce.importo / s.totale) * altezzaContenitore * riempimento : 0;
    ctx.fillStyle = colore;
    ctx.fillRect(g.cx0, yB + altezzaContenitore - pieno + 1, g.cx1 - g.cx0, pieno);
    if (voce.importo > 0) particelle(ctx, g, yA, yB, s.avanzamento, colore);
  });
}
