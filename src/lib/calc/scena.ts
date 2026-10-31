import { t } from '../../markets';
import { MERCATO_IT } from '../../markets/it';
import type { Mercato } from '../../markets/tipi';
import { arrotonda, euro, euroIntero } from './format';
import { tanNominaleDaTaeg } from './rata';
import type { Analisi } from './tipi';
import { durataMesi } from './totale';
import {
  rataDelPiano, serieValoreDebito, tassoImplicito, TOLLERANZA_RATA_EURO, valoreStimato, type PianoDebito, type SerieValoreDebito,
} from './valore';

/**
 * Da dove viene il tasso con cui scende il debito:
 * - `tan`: il TAN dichiarato, che con capitale, rate e maxi rata torna (scarto sulla rata entro 1 €);
 * - `implicito`: il tasso che fa tornare capitale, rate e maxi rata, perché il TAN manca o non torna con la rata;
 * - `taeg`: il nominale equivalente al TAEG, quando rate e maxi rata non bastano a ricavare un tasso;
 * - `nessuno`: nessun tasso usabile, curva del debito solo indicativa (e niente riga dell'incrocio da condividere).
 */
export type FonteTasso = 'tan' | 'implicito' | 'taeg' | 'nessuno';

/** Dati della scena del risultato (specifica v2, §2): funzioni pure, senza DOM, usate dall'isola e dall'immagine della scheda. */
export interface BaseScena {
  readonly prezzo: number | null;
  readonly piano: PianoDebito | null;
  readonly anticipo: number;
  readonly durata: number;
  readonly kmAnnui: number;
  readonly vfg: number | null;
  readonly fonteTasso: FonteTasso;
  /** Il TAN scritto sul preventivo, per dire in chiaro quando non torna con la rata. */
  readonly tanDichiarato: number | null;
}

export interface Cursori {
  readonly anticipo: number;
  readonly durata: number;
  readonly kmAnnui: number;
}

export interface Limite {
  readonly min: number;
  readonly max: number;
  readonly passo: number;
}

export const DURATA_MIN = 12;
export const DURATA_MAX = 72;
export const KM_MIN = 5_000;
export const KM_MAX = 50_000;

interface TassoPiano {
  readonly tasso: number;
  readonly fonte: FonteTasso;
}

/** Il TAN se torna con la rata; altrimenti il tasso implicito di rate e maxi rata; poi il TAEG in nominale; poi zero. */
export function tassoDelPiano(a: Analisi, capitale: number): TassoPiano {
  const p = a.preventivo;
  const maxi = p.maxiRata ?? 0;
  if (p.tan != null && Math.abs(rataDelPiano(capitale, p.tan, p.nRate, maxi) - p.rata) <= TOLLERANZA_RATA_EURO) {
    return { tasso: p.tan, fonte: 'tan' };
  }
  const implicito = tassoImplicito(capitale, p.rata, p.nRate, maxi);
  if (implicito != null) return { tasso: implicito, fonte: 'implicito' };
  const taeg = p.taegDichiarato ?? a.taeg.taegRicostruito;
  if (taeg != null) return { tasso: tanNominaleDaTaeg(taeg), fonte: 'taeg' };
  return { tasso: p.tan ?? 0, fonte: 'nessuno' };
}

interface PianoConFonte {
  readonly piano: PianoDebito | null;
  readonly fonte: FonteTasso;
}

function pianoDa(a: Analisi, prezzo: number | null): PianoConFonte {
  const p = a.preventivo;
  if (p.tipo === 'noleggio' || prezzo == null || p.nRate <= 0) return { piano: null, fonte: 'nessuno' };
  const capitale = arrotonda(p.importoCreditoDichiarato ?? a.ricostruzione.importoCreditoRicostruito ?? Math.max(0, prezzo - p.anticipo));
  const { tasso, fonte } = tassoDelPiano(a, capitale);
  return { piano: { capitale, tanAnnuo: tasso, nRate: p.nRate, rata: p.rata, maxiRata: p.maxiRata ?? 0 }, fonte };
}

export function baseScena(a: Analisi, vfg: number | null = null): BaseScena {
  const prezzo = a.totali.prezzoRiferimento;
  const { piano, fonte } = pianoDa(a, prezzo);
  return {
    prezzo, piano, anticipo: a.preventivo.anticipo, durata: durataMesi(a.preventivo), kmAnnui: a.ipotesi.kmAnnui, vfg,
    fonteTasso: fonte, tanDichiarato: a.preventivo.tan ?? null,
  };
}

export function cursoriIniziali(b: BaseScena): Cursori {
  return { anticipo: b.anticipo, durata: b.durata, kmAnnui: b.kmAnnui };
}

/**
 * Anticipo più alto che il cursore permette: il 60% del prezzo, ma mai tanto da lasciare un capitale sotto la maxi rata,
 * che resta fissa (altrimenti la rata diventerebbe negativa). Mai sotto l'anticipo del preventivo.
 */
export function anticipoMassimo(b: BaseScena): number {
  const sessanta = Math.round((b.prezzo ?? b.anticipo) * 0.6);
  const conMaxi = b.piano ? Math.floor(b.anticipo + b.piano.capitale - Math.max(b.piano.maxiRata, 1)) : sessanta;
  return Math.max(b.anticipo, Math.min(sessanta, conMaxi));
}

export function limitiCursori(b: BaseScena): { readonly anticipo: Limite; readonly durata: Limite; readonly kmAnnui: Limite } {
  return {
    anticipo: { min: 0, max: anticipoMassimo(b), passo: 1 },
    durata: { min: Math.min(DURATA_MIN, b.durata), max: Math.max(DURATA_MAX, b.durata), passo: 1 },
    kmAnnui: { min: KM_MIN, max: Math.max(KM_MAX, b.kmAnnui), passo: 500 },
  };
}

/**
 * Il piano con i cursori: il capitale cambia euro per euro con l'anticipo, la maxi rata resta la stessa,
 * la rata si sposta di quanto si sposta la rata teorica al tasso del piano. Con i cursori iniziali il piano è quello del preventivo.
 * null se la combinazione non è possibile: la maxi rata da sola supera il capitale, la rata sarebbe sotto zero.
 */
export function pianoConCursori(b: BaseScena, c: Cursori): PianoDebito | null {
  const base = b.piano;
  if (!base) return null;
  const nRate = Math.max(1, base.maxiRata > 0 ? c.durata - 1 : c.durata);
  const capitale = Math.max(0, arrotonda(base.capitale + (b.anticipo - c.anticipo)));
  if (nRate === base.nRate && capitale === base.capitale) return base;
  const teorica = (cap: number, n: number) => rataDelPiano(cap, base.tanAnnuo, n, base.maxiRata);
  const nuova = teorica(capitale, nRate);
  const rata = base.rata + nuova - teorica(base.capitale, base.nRate);
  if (capitale <= 0 || nuova < 0 || rata < 0) return null;
  return { ...base, capitale, nRate, rata };
}

/** I cursori portano a un piano impossibile (maxi rata sopra il capitale): la scena lo dice invece di mostrare 0 €. */
export function combinazioneImpossibile(b: BaseScena, c: Cursori): boolean {
  return b.piano != null && b.prezzo != null && pianoConCursori(b, c) == null;
}

/** Il valore garantito vale solo per la durata della promozione: se cambi la durata, il punto sparisce. */
export function serieScena(b: BaseScena, c: Cursori): SerieValoreDebito | null {
  const piano = pianoConCursori(b, c);
  if (!piano || b.prezzo == null) return null;
  return serieValoreDebito({ prezzo: b.prezzo, piano, kmAnnui: c.kmAnnui, vfg: c.durata === b.durata ? b.vfg : null });
}

/** "Dal mese 14 devi all'auto più di quanto vale (stima)." oppure la frase opposta, nella lingua del mercato. */
export function fraseIncrocio(s: SerieValoreDebito, m: Mercato = MERCATO_IT): string {
  if (s.meseIncrocio == null) return t(m, 'atto2.incrocioMai');
  if (s.meseIncrocio === 0) return t(m, 'atto2.incrocioFirma');
  return t(m, 'atto2.incrocioMese', { mese: s.meseIncrocio });
}

/**
 * Riga per il testo da condividere: la stessa frase della scena, con «stima, non quotazione».
 * Solo se c'è un incrocio e il tasso del piano è affidabile: senza tasso la curva è indicativa e non va diffusa.
 */
export function rigaIncrocio(s: SerieValoreDebito | null, fonte: FonteTasso = 'tan', m: Mercato = MERCATO_IT): string | null {
  if (!s || s.meseIncrocio == null || fonte === 'nessuno') return null;
  return fraseIncrocio(s, m);
}

/** Cosa resta in mano alla fine, strada per strada, con il valore stimato dove l'auto è tua. Nessuna classifica. */
export function possessoFinale(a: Analisi, b: BaseScena): Readonly<Record<'A' | 'B' | 'C', string>> {
  const m = a.mercato;
  const valore = b.prezzo != null ? valoreStimato(b.prezzo, b.durata, b.kmAnnui) : null;
  const vale = valore != null ? t(m, 'possesso.vale', { valore: euroIntero(valore) }) : '';
  const maxi = a.preventivo.maxiRata ?? 0;
  const nulla = t(m, 'possesso.nulla');
  const strada = a.preventivo.tipo === 'noleggio'
    ? nulla
    : maxi > 0 ? t(m, 'possesso.conMaxi', { importo: euro(maxi), vale }) : t(m, 'possesso.ultimaRata', { vale });
  return { A: t(m, 'possesso.dalPrimoGiorno', { vale }), B: strada, C: nulla };
}

/** Una sola scala in euro per tutta la scena: il totale e le tre strade si confrontano a vista. */
export function scalaEuro(a: Analisi): number {
  const valori = [a.totali.totalePagatoTenendo, ...a.treStrade.map((s) => s.totaleUscito ?? 0)];
  return Math.max(1, ...valori);
}
