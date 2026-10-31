import { BASE_ANTEPRIMA, MASSIMO_ANTEPRIMA, serieAnteprima } from '~/lib/calc/anteprima';
import type { SerieValoreDebito } from '~/lib/calc/valore';
import { minimoAsse } from '../scene/disegno/curve';

/**
 * Asse dell'anteprima in home: fisso per tutto il giro (l'anticipo scende a zero e torna), dal minimo dei due estremi.
 * Solo disegno: i numeri sono quelli di lib/calc/anteprima, che non cambia.
 */
export const MINIMO_ANTEPRIMA = Math.min(
  minimoAsse(serieAnteprima(0), MASSIMO_ANTEPRIMA),
  minimoAsse(serieAnteprima(BASE_ANTEPRIMA.anticipo), MASSIMO_ANTEPRIMA),
);

/** Frase dell'incrocio senza gergo (specifica v2, §1: niente «debito» sopra la piega). */
export function fraseIncrocioHome(serie: SerieValoreDebito): string {
  return serie.meseIncrocio == null
    ? 'per tutto il piano devi all’auto meno di quanto vale'
    : `dal mese ${serie.meseIncrocio} devi all’auto più di quanto vale`;
}

/**
 * Le due curve come tracciati SVG, per la pagina senza JavaScript: stesse serie e stessa scala del canvas (il poster
 * generato mostrava il valore che sale e la zona a metà piano, l'opposto dei numeri).
 */
export function tracciatiSvg(serie: SerieValoreDebito, larghezza: number, altezza: number, margine = 8) {
  const w = larghezza - 2 * margine;
  const h = altezza - 2 * margine;
  const x = (mese: number) => margine + (mese / Math.max(1, serie.durata)) * w;
  const y = (euro: number) => margine + h - ((euro - MINIMO_ANTEPRIMA) / (MASSIMO_ANTEPRIMA - MINIMO_ANTEPRIMA)) * h;
  const punto = (a: number, b: number) => `${a.toFixed(1)},${b.toFixed(1)}`;
  const linea = (campo: 'valore' | 'debito') => serie.punti.map((p, i) => `${i === 0 ? 'M' : 'L'}${punto(x(p.mese), y(p[campo]))}`).join(' ');
  const sopra = serie.punti.filter((p) => p.debito > p.valore);
  const zona = sopra.length < 2 ? '' : `M${sopra.map((p) => punto(x(p.mese), y(p.debito))).join(' L')} L${[...sopra].reverse().map((p) => punto(x(p.mese), y(p.valore))).join(' L')} Z`;
  const incrocio = serie.meseIncrocio == null ? null : x(serie.meseIncrocio);
  return { valore: linea('valore'), debito: linea('debito'), zona, incrocio };
}
