import type { SerieValoreDebito } from '~/lib/calc/valore';
import type { Area } from '../useTela';
import { MONO, SANS, SCENA } from './colori';

/** Testi disegnati sul canvas, nella lingua del mercato. */
export interface EtichetteCurve {
  readonly vfg: string;
  readonly mese: (n: number) => string;
}

const ETICHETTE_IT: EtichetteCurve = { vfg: 'valore garantito dalla casa', mese: (n) => `mese ${n}` };

export interface StatoCurve {
  readonly serie: SerieValoreDebito;
  /** Massimo dell'asse in euro: il prezzo o il debito più alto. */
  readonly massimo: number;
  readonly avanzamento: number;
  readonly etichette?: EtichetteCurve | undefined;
  /** Anteprima della home: niente etichette sugli assi, solo le curve. */
  readonly senzaAssi?: boolean | undefined;
}

const MARGINE = { sinistra: 52, destra: 14, alto: 18, basso: 30 } as const;
/** Senza assi (anteprima della home) le curve prendono quasi tutto lo spazio. */
const MARGINE_NUDO = { sinistra: 6, destra: 10, alto: 14, basso: 10 } as const;

function margine(s: StatoCurve): { readonly sinistra: number; readonly destra: number; readonly alto: number; readonly basso: number } {
  return s.senzaAssi ? MARGINE_NUDO : MARGINE;
}

interface Scala {
  readonly x: (mese: number) => number;
  readonly y: (euro: number) => number;
}

function scala(a: Area, s: StatoCurve): Scala {
  const m = margine(s);
  const w = a.larghezza - m.sinistra - m.destra;
  const h = a.altezza - m.alto - m.basso;
  const durata = Math.max(1, s.serie.durata);
  return {
    x: (mese) => m.sinistra + (mese / durata) * w,
    y: (euro) => m.alto + h - (euro / s.massimo) * h,
  };
}

/** 0 €, 5k €, 12,5k €: etichette corte che stanno nel margine anche sul telefono. */
function etichettaAsse(v: number): string {
  if (v === 0) return '0 €';
  const k = v / 1000;
  return `${Number.isInteger(k) ? k : k.toFixed(1).replace('.', ',')}k €`;
}

function passoAsse(massimo: number): number {
  const grezzo = massimo / 4;
  const potenza = 10 ** Math.floor(Math.log10(grezzo));
  return [1, 2, 2.5, 5, 10].map((m) => m * potenza).find((p) => p >= grezzo) ?? grezzo;
}

function griglia(ctx: CanvasRenderingContext2D, a: Area, s: StatoCurve, sc: Scala): void {
  ctx.font = `11px ${MONO}`;
  ctx.fillStyle = SCENA.tenue;
  ctx.strokeStyle = SCENA.griglia;
  ctx.lineWidth = 1;
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  const passo = passoAsse(s.massimo);
  for (let v = 0; v <= s.massimo + 1; v += passo) {
    const y = Math.round(sc.y(v)) + 0.5;
    ctx.beginPath();
    ctx.moveTo(MARGINE.sinistra, y);
    ctx.lineTo(a.larghezza - MARGINE.destra, y);
    ctx.stroke();
    ctx.fillText(etichettaAsse(v), MARGINE.sinistra - 8, y);
  }
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  const anni = Math.floor(s.serie.durata / 12);
  for (let k = 1; k <= anni; k += 1) {
    const x = sc.x(k * 12);
    // L'ultima etichetta si allinea a destra: centrata sul bordo veniva tagliata.
    ctx.textAlign = x > a.larghezza - MARGINE.destra - 30 ? 'right' : 'center';
    ctx.fillText(`${k}° anno`, Math.min(x, a.larghezza - 2), a.altezza - MARGINE.basso + 10);
  }
}

/** Zona in cui il debito supera il valore, riempita: «qui devi all’auto più di quanto vale». */
function zonaSopra(ctx: CanvasRenderingContext2D, s: StatoCurve, sc: Scala, fino: number): void {
  const punti = s.serie.punti.filter((p) => p.mese <= fino);
  ctx.fillStyle = 'rgba(242, 130, 95, 0.36)';
  for (let k = 1; k < punti.length; k += 1) {
    const p0 = punti[k - 1];
    const p1 = punti[k];
    if (!p0 || !p1 || (p0.debito <= p0.valore && p1.debito <= p1.valore)) continue;
    ctx.beginPath();
    ctx.moveTo(sc.x(p0.mese), sc.y(Math.max(p0.debito, p0.valore)));
    ctx.lineTo(sc.x(p1.mese), sc.y(Math.max(p1.debito, p1.valore)));
    ctx.lineTo(sc.x(p1.mese), sc.y(Math.min(p1.debito, p1.valore)));
    ctx.lineTo(sc.x(p0.mese), sc.y(Math.min(p0.debito, p0.valore)));
    ctx.closePath();
    ctx.fill();
  }
}

/**
 * Segno verticale sul primo mese in cui il debito supera il valore: quando le due curve sono vicine la zona è sottile,
 * il segno con il mese la rende leggibile comunque.
 */
function segnoIncrocio(ctx: CanvasRenderingContext2D, a: Area, s: StatoCurve, sc: Scala, fino: number): void {
  const mese = s.serie.meseIncrocio;
  if (mese == null || mese > fino) return;
  const x = Math.round(sc.x(mese)) + 0.5;
  const mg = margine(s);
  ctx.save();
  ctx.strokeStyle = SCENA.segnale;
  ctx.lineWidth = 1;
  ctx.setLineDash([3, 4]);
  ctx.beginPath();
  ctx.moveTo(x, mg.alto);
  ctx.lineTo(x, a.altezza - mg.basso);
  ctx.stroke();
  ctx.restore();
  if (s.senzaAssi) return;
  const testo = (s.etichette ?? ETICHETTE_IT).mese(mese);
  ctx.font = `600 11px ${MONO}`;
  const larghezza = ctx.measureText(testo).width;
  const vicinoDestra = x + 6 + larghezza > a.larghezza - mg.destra;
  const xTesto = vicinoDestra ? x - 6 - larghezza : x + 6;
  ctx.fillStyle = SCENA.fondo;
  ctx.fillRect(xTesto - 3, mg.alto - 2, larghezza + 6, 16);
  ctx.fillStyle = SCENA.segnale;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(testo, xTesto, mg.alto);
}

function linea(ctx: CanvasRenderingContext2D, s: StatoCurve, sc: Scala, fino: number, campo: 'valore' | 'debito', colore: string, spessore: number): void {
  ctx.strokeStyle = colore;
  ctx.lineWidth = spessore;
  ctx.lineJoin = 'round';
  ctx.beginPath();
  s.serie.punti.filter((p) => p.mese <= fino).forEach((p, k) => {
    if (k === 0) ctx.moveTo(sc.x(p.mese), sc.y(p[campo]));
    else ctx.lineTo(sc.x(p.mese), sc.y(p[campo]));
  });
  ctx.stroke();
}

function punto(ctx: CanvasRenderingContext2D, x: number, y: number, colore: string, anello = false): void {
  ctx.beginPath();
  ctx.arc(x, y, anello ? 7 : 4.5, 0, Math.PI * 2);
  if (anello) {
    ctx.strokeStyle = colore;
    ctx.lineWidth = 2.5;
    ctx.stroke();
  } else {
    ctx.fillStyle = colore;
    ctx.fill();
  }
}

function puntiFinali(ctx: CanvasRenderingContext2D, s: StatoCurve, sc: Scala): void {
  const x = sc.x(s.serie.durata);
  punto(ctx, x, sc.y(s.serie.debitoFinale), SCENA.segnale);
  punto(ctx, x, sc.y(s.serie.valoreFinale), SCENA.carta);
  if (!s.serie.vfg) return;
  const y = sc.y(s.serie.vfg.importo);
  punto(ctx, x, y, SCENA.attenzione, true);
  // L'etichetta sta su un riquadro del colore del fondo: sopra le curve resta leggibile.
  const testo = (s.etichette ?? ETICHETTE_IT).vfg;
  ctx.font = `600 12px ${SANS}`;
  const larghezza = ctx.measureText(testo).width;
  const yTesto = Math.max(16, y - 16);
  ctx.fillStyle = SCENA.fondo;
  ctx.fillRect(x - 14 - larghezza - 6, yTesto - 15, larghezza + 12, 20);
  ctx.fillStyle = SCENA.attenzione;
  ctx.textAlign = 'right';
  ctx.textBaseline = 'bottom';
  ctx.fillText(testo, x - 14, yTesto);
}

/** Atto 2: valore stimato (scende) e debito residuo nel tempo, con la zona in cui il debito supera il valore. */
export function disegnaCurve(ctx: CanvasRenderingContext2D, a: Area, s: StatoCurve): void {
  const sc = scala(a, s);
  const fino = s.serie.durata * s.avanzamento;
  if (!s.senzaAssi) griglia(ctx, a, s, sc);
  zonaSopra(ctx, s, sc, fino);
  segnoIncrocio(ctx, a, s, sc, fino);
  linea(ctx, s, sc, fino, 'valore', SCENA.carta, 2);
  linea(ctx, s, sc, fino, 'debito', SCENA.segnale, 2.5);
  if (s.avanzamento >= 1 && !s.senzaAssi) puntiFinali(ctx, s, sc);
}
