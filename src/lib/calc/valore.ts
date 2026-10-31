import { TESTI_IT } from '../../markets/it';
import { arrotonda } from './format';
import { tassoMensile } from './taeg';

/**
 * Modello dichiarato del valore stimato dell'auto nel tempo (specifica v2, §2 atto 2).
 * È una stima, non una quotazione: quando l'archivio avrà valori reali di rivendita, sostituiranno questi parametri.
 * - primo anno: −20% del prezzo; dal secondo anno: −12% l'anno sul valore residuo;
 * - km: per ogni 5.000 km all'anno sopra 15.000 la perdita annua cresce di 2 punti, sotto 15.000 cala di 2 (proporzionale);
 * - mai sotto il 10% del prezzo.
 */
export interface ModelloValore {
  readonly perditaPrimoAnno: number;
  readonly perditaAnniSuccessivi: number;
  readonly kmRiferimento: number;
  readonly passoKm: number;
  readonly correzionePerPasso: number;
  readonly quotaMinima: number;
}

export const MODELLO_VALORE: ModelloValore = {
  perditaPrimoAnno: 0.2,
  perditaAnniSuccessivi: 0.12,
  kmRiferimento: 15_000,
  passoKm: 5_000,
  correzionePerPasso: 0.02,
  quotaMinima: 0.1,
};

/** La frase che accompagna sempre la curva del valore. */
export const ETICHETTA_STIMA = TESTI_IT['scena.stima'];

/** Fattore annuo di conservazione del valore: mai sotto 0,5 né sopra 1, qualunque sia il chilometraggio. */
function fattoreAnnuo(perdita: number, kmAnnui: number, m: ModelloValore): number {
  const correzione = (m.correzionePerPasso * (kmAnnui - m.kmRiferimento)) / m.passoKm;
  return Math.min(1, Math.max(0.5, 1 - perdita - correzione));
}

/** Valore stimato al mese `mese` (0 = consegna) di un'auto pagata `prezzo`, con `kmAnnui` all'anno. */
export function valoreStimato(prezzo: number, mese: number, kmAnnui: number, m: ModelloValore = MODELLO_VALORE): number {
  if (prezzo <= 0) return 0;
  const primo = fattoreAnnuo(m.perditaPrimoAnno, kmAnnui, m);
  const poi = fattoreAnnuo(m.perditaAnniSuccessivi, kmAnnui, m);
  const t = Math.max(0, mese);
  const fattore = t <= 12 ? primo ** (t / 12) : primo * poi ** ((t - 12) / 12);
  return arrotonda(Math.max(prezzo * m.quotaMinima, prezzo * fattore));
}

/** Piano di rimborso: capitale finanziato, TAN, rate e maxi rata finale (pagata il mese dopo l'ultima rata). */
export interface PianoDebito {
  readonly capitale: number;
  readonly tanAnnuo: number;
  readonly nRate: number;
  readonly rata: number;
  readonly maxiRata: number;
}

/** Mesi del piano: le rate più il mese della maxi rata, se c'è. */
export function durataPiano(p: PianoDebito): number {
  return p.nRate + (p.maxiRata > 0 ? 1 : 0);
}

/** Capitale residuo dopo `mese` rate, dal piano di ammortamento al TAN; a fine piano resta la maxi rata. */
export function debitoResiduo(p: PianoDebito, mese: number): number {
  const durata = durataPiano(p);
  if (mese >= durata) return mese === durata && p.maxiRata > 0 ? arrotonda(p.maxiRata) : 0;
  const i = p.tanAnnuo / 100 / 12;
  const k = Math.max(0, mese);
  const crescita = (1 + i) ** k;
  const pagato = i === 0 ? p.rata * k : (p.rata * (crescita - 1)) / i;
  return arrotonda(Math.max(0, p.capitale * crescita - pagato));
}

/**
 * Rata che, al TAN, porta il capitale a lasciare esattamente la maxi rata da pagare il mese dopo l'ultima rata.
 * Serve ai cursori: cambiando anticipo o durata si ricalcola la rata con la stessa logica del piano.
 * Può essere negativa: vuol dire che la maxi rata da sola supera il capitale cresciuto agli interessi (piano impossibile).
 */
export function rataDelPiano(capitale: number, tanAnnuo: number, nRate: number, maxiRata: number): number {
  if (nRate <= 0 || capitale <= 0) return 0;
  const i = tanAnnuo / 100 / 12;
  if (i === 0) return (capitale - maxiRata) / nRate;
  const crescita = (1 + i) ** nRate;
  const residuoVoluto = maxiRata / (1 + i);
  return ((capitale * crescita - residuoVoluto) * i) / (crescita - 1);
}

/** Oltre questo scarto tra la rata del preventivo e quella che darebbe il TAN, TAN e rata non tornano. */
export const TOLLERANZA_RATA_EURO = 1;

/**
 * Tasso nominale annuo (punti percentuali) che fa tornare capitale, n rate uguali e maxi rata al mese n+1, senza spese.
 * null se non esiste: rate e maxi rata insieme non arrivano al capitale, o il tasso sarebbe oltre il 60% l'anno.
 */
export function tassoImplicito(capitale: number, rata: number, nRate: number, maxiRata: number): number | null {
  if (capitale <= 0 || nRate <= 0 || rata < 0 || maxiRata < 0) return null;
  const rate = Array.from({ length: nRate }, (_, k) => ({ mese: k + 1, importo: -rata }));
  const maxi = maxiRata > 0 ? [{ mese: nRate + 1, importo: -maxiRata }] : [];
  const i = tassoMensile([{ mese: 0, importo: capitale }, ...rate, ...maxi]);
  return i == null ? null : i * 1200;
}

export interface PuntoSerie {
  readonly mese: number;
  readonly valore: number;
  readonly debito: number;
}

export interface ConfrontoVfg {
  readonly importo: number;
  /** Valore stimato a fine piano, per confronto con il valore garantito dalla casa. */
  readonly stima: number;
  readonly sopraStima: boolean;
}

export interface SerieValoreDebito {
  readonly punti: readonly PuntoSerie[];
  readonly durata: number;
  /** Primo mese in cui il debito supera il valore stimato, o null se non succede mai. */
  readonly meseIncrocio: number | null;
  /** Mesi in cui il debito supera il valore stimato. */
  readonly mesiSopra: number;
  readonly valoreFinale: number;
  readonly debitoFinale: number;
  readonly vfg: ConfrontoVfg | null;
}

export interface InputSerie {
  readonly prezzo: number;
  readonly piano: PianoDebito;
  readonly kmAnnui: number;
  /** Valore futuro garantito dalla casa, se la promozione lo dichiara. */
  readonly vfg?: number | null | undefined;
  readonly modello?: ModelloValore | undefined;
}

/** Mese per mese: valore stimato dell'auto e debito residuo, con il primo mese in cui il debito supera il valore. */
export function serieValoreDebito(input: InputSerie): SerieValoreDebito {
  const durata = durataPiano(input.piano);
  const punti: PuntoSerie[] = Array.from({ length: durata + 1 }, (_, mese) => ({
    mese,
    valore: valoreStimato(input.prezzo, mese, input.kmAnnui, input.modello),
    debito: debitoResiduo(input.piano, mese),
  }));
  const sopra = punti.filter((x) => x.debito > x.valore);
  const ultimo = punti[punti.length - 1] ?? { mese: 0, valore: input.prezzo, debito: 0 };
  const vfg = input.vfg != null && input.vfg > 0
    ? { importo: arrotonda(input.vfg), stima: ultimo.valore, sopraStima: input.vfg > ultimo.valore }
    : null;
  return {
    punti,
    durata,
    meseIncrocio: sopra[0]?.mese ?? null,
    mesiSopra: sopra.length,
    valoreFinale: ultimo.valore,
    debitoFinale: ultimo.debito,
    vfg,
  };
}
