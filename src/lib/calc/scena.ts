import { t } from '../../markets';
import { MERCATO_IT } from '../../markets/it';
import type { Mercato } from '../../markets/tipi';
import { euro, euroIntero } from './format';
import type { Analisi } from './tipi';
import { durataMesi } from './totale';
import { rataDelPiano, serieValoreDebito, valoreStimato, type PianoDebito, type SerieValoreDebito } from './valore';

/** Dati della scena del risultato (specifica v2, §2): funzioni pure, senza DOM, usate dall'isola e dall'immagine della scheda. */
export interface BaseScena {
  readonly prezzo: number | null;
  readonly piano: PianoDebito | null;
  readonly anticipo: number;
  readonly durata: number;
  readonly kmAnnui: number;
  readonly vfg: number | null;
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

/** Tasso del piano: il TAN; se manca il TAEG dichiarato, poi quello ricostruito; altrimenti zero (dichiarato nella scena). */
function tassoDelPiano(a: Analisi): number {
  return a.preventivo.tan ?? a.preventivo.taegDichiarato ?? a.taeg.taegRicostruito ?? 0;
}

function pianoDa(a: Analisi, prezzo: number | null): PianoDebito | null {
  const p = a.preventivo;
  if (p.tipo === 'noleggio' || prezzo == null || p.nRate <= 0) return null;
  const capitale = p.importoCreditoDichiarato ?? a.ricostruzione.importoCreditoRicostruito ?? Math.max(0, prezzo - p.anticipo);
  return { capitale, tanAnnuo: tassoDelPiano(a), nRate: p.nRate, rata: p.rata, maxiRata: p.maxiRata ?? 0 };
}

export function baseScena(a: Analisi, vfg: number | null = null): BaseScena {
  const prezzo = a.totali.prezzoRiferimento;
  return { prezzo, piano: pianoDa(a, prezzo), anticipo: a.preventivo.anticipo, durata: durataMesi(a.preventivo), kmAnnui: a.ipotesi.kmAnnui, vfg };
}

export function cursoriIniziali(b: BaseScena): Cursori {
  return { anticipo: b.anticipo, durata: b.durata, kmAnnui: b.kmAnnui };
}

export function limitiCursori(b: BaseScena): { readonly anticipo: Limite; readonly durata: Limite; readonly kmAnnui: Limite } {
  const prezzo = b.prezzo ?? b.anticipo;
  return {
    anticipo: { min: 0, max: Math.max(b.anticipo, Math.round(prezzo * 0.6)), passo: 1 },
    durata: { min: Math.min(DURATA_MIN, b.durata), max: Math.max(DURATA_MAX, b.durata), passo: 1 },
    kmAnnui: { min: KM_MIN, max: Math.max(KM_MAX, b.kmAnnui), passo: 500 },
  };
}

/**
 * Il piano con i cursori: il capitale cambia euro per euro con l'anticipo, la maxi rata resta la stessa,
 * la rata si sposta di quanto si sposta la rata teorica al TAN. Con i cursori iniziali il piano è quello del preventivo.
 */
export function pianoConCursori(b: BaseScena, c: Cursori): PianoDebito | null {
  const base = b.piano;
  if (!base) return null;
  const nRate = Math.max(1, base.maxiRata > 0 ? c.durata - 1 : c.durata);
  const capitale = Math.max(0, base.capitale + (b.anticipo - c.anticipo));
  if (nRate === base.nRate && capitale === base.capitale) return base;
  const teorica = (cap: number, n: number) => rataDelPiano(cap, base.tanAnnuo, n, base.maxiRata);
  const rata = Math.max(0, base.rata + teorica(capitale, nRate) - teorica(base.capitale, base.nRate));
  return { ...base, capitale, nRate, rata };
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

/** Riga breve per il testo da condividere: solo se c'è un incrocio. */
export function rigaIncrocio(s: SerieValoreDebito | null): string | null {
  if (!s || s.meseIncrocio == null) return null;
  return s.meseIncrocio === 0 ? 'Dalla firma devi all’auto più di quanto vale, stima.' : `Dal mese ${s.meseIncrocio} devi all’auto più di quanto vale, stima.`;
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
