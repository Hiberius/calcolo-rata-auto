import { easeInOut, easeOutExpo } from '../motion';
import { pianoConCursori, type BaseScena } from './scena';
import { serieValoreDebito, tassoImplicito, type SerieValoreDebito } from './valore';

/** I numeri della 208 dell'esempio (lib/esempio.ts). Al TAN dichiarato (7,49%) rata e maxi rata non tornano: il debito
 * scende al tasso che le fa tornare, come nella scena (lib/calc/scena.ts, tassoDelPiano). */
const CAPITALE = 14_950 - 4_326;
const TAN_DICHIARATO = 7.49;

/**
 * Anteprima della scena in home (specifica v2, §1): l'atto 2 della Peugeot 208 dell'esempio, con l'anticipo che scende
 * a zero e torna. Gli stessi numeri del preventivo d'esempio (lib/esempio.ts) e la stessa regola dei cursori della scena.
 */
export const BASE_ANTEPRIMA: BaseScena = {
  prezzo: 14_950,
  piano: { capitale: CAPITALE, tanAnnuo: tassoImplicito(CAPITALE, 99, 35, 10_434) ?? TAN_DICHIARATO, nRate: 35, rata: 99, maxiRata: 10_434 },
  anticipo: 4_326,
  durata: 36,
  kmAnnui: 15_000,
  vfg: null,
  fonteTasso: 'implicito',
  tanDichiarato: TAN_DICHIARATO,
};

/** Frase sotto l'anteprima: con l'anticipo del preventivo il server la scrive, poi la aggiorna il loop. */
export function fraseAnteprima(serie: SerieValoreDebito): string {
  return serie.meseIncrocio == null ? 'il debito resta sotto il valore' : `dal mese ${serie.meseIncrocio} il debito supera il valore`;
}

/** Asse fisso: il debito più alto possibile (anticipo zero) più un margine, così le curve si muovono e l'asse no. */
export const MASSIMO_ANTEPRIMA = 14_950 * 1.06;

export function serieAnteprima(anticipo: number): SerieValoreDebito {
  const c = { anticipo: Math.round(Math.min(BASE_ANTEPRIMA.anticipo, Math.max(0, anticipo))), durata: BASE_ANTEPRIMA.durata, kmAnnui: BASE_ANTEPRIMA.kmAnnui };
  const piano = pianoConCursori(BASE_ANTEPRIMA, c) ?? BASE_ANTEPRIMA.piano!;
  return serieValoreDebito({ prezzo: BASE_ANTEPRIMA.prezzo!, piano, kmAnnui: c.kmAnnui });
}

/** Tempi del loop (ms): disegno iniziale una volta sola, poi l'anticipo scende, si ferma, risale, si ferma. 9 s in tutto. */
export const TEMPI = { disegno: 1_600, pausa: 1_000, discesa: 2_600, fermo: 1_200, risalita: 2_000, coda: 1_200 } as const;
const GIRO = TEMPI.pausa + TEMPI.discesa + TEMPI.fermo + TEMPI.risalita + TEMPI.coda;

export interface FotogrammaAnteprima {
  readonly avanzamento: number;
  readonly anticipo: number;
}

/** Lo stato dell'anteprima al tempo `ms` dall'avvio: funzione pura, il disegno la legge a ogni fotogramma. */
export function fotogramma(ms: number): FotogrammaAnteprima {
  const base = BASE_ANTEPRIMA.anticipo;
  if (ms < TEMPI.disegno) return { avanzamento: easeOutExpo(ms / TEMPI.disegno), anticipo: base };
  let t = (ms - TEMPI.disegno) % GIRO;
  if (t < TEMPI.pausa) return { avanzamento: 1, anticipo: base };
  t -= TEMPI.pausa;
  if (t < TEMPI.discesa) return { avanzamento: 1, anticipo: base * (1 - easeInOut(t / TEMPI.discesa)) };
  t -= TEMPI.discesa;
  if (t < TEMPI.fermo) return { avanzamento: 1, anticipo: 0 };
  t -= TEMPI.fermo;
  if (t < TEMPI.risalita) return { avanzamento: 1, anticipo: base * easeInOut(t / TEMPI.risalita) };
  return { avanzamento: 1, anticipo: base };
}
