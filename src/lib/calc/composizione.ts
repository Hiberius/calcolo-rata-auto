import { arrotonda, euro, numero } from './format';
import type { Analisi } from './tipi';

/** Una voce del totale: la somma delle voci è il totale «paghi davvero», al centesimo. */
export interface VoceTotale {
  readonly chiave: string;
  readonly etichetta: string;
  /** Come nasce l'importo, se non è un numero letto così com'è (es. "35 × 3,40 €"). */
  readonly dettaglio: string | null;
  readonly importo: number;
}

export interface ComposizioneTotale {
  readonly voci: readonly VoceTotale[];
  /** Spese che non si sommano perché sono già dentro il credito, dette a vista. */
  readonly note: readonly string[];
  readonly totale: number;
}

/** Riga fissa accanto a TAEG e costo del credito: sono due misure diverse e i testi del 31/10 le confondevano. */
export const SPIEGAZIONE_TAEG_COSTO = 'Il TAEG è un tasso annuo; il costo del credito è quanto paghi in più sul prezzo in tutta la durata.';

function per(n: number, importo: number): string {
  return `${n} × ${euro(importo)}`;
}

function voce(chiave: string, etichetta: string, importo: number | undefined, dettaglio: string | null = null): VoceTotale[] {
  return importo != null && importo > 0 ? [{ chiave, etichetta, dettaglio, importo: arrotonda(importo) }] : [];
}

function vociRate(a: Analisi): VoceTotale[] {
  const p = a.preventivo;
  if (p.nRate <= 0) return [];
  const dettaglio = p.primaRataDiversa != null
    ? `prima rata ${euro(p.primaRataDiversa)}, poi ${per(p.nRate - 1, p.rata)}`
    : per(p.nRate, p.rata);
  return voce('rate', 'Rate', a.totali.sommaRate, dettaglio);
}

function vociAccessorie(a: Analisi): VoceTotale[] {
  const p = a.preventivo;
  if (p.accessoriInclusiNelPrezzo) return [];
  return [
    ...voce('ipt', 'IPT (immatricolazione)', p.ipt),
    ...voce('messaSuStrada', 'Messa su strada', p.messaSuStrada),
    ...voce('polizze', 'Polizze abbinate', p.polizzeAbbinate),
    ...voce('servizi', 'Servizi abbinati', p.serviziAbbinati),
  ];
}

function noteCredito(a: Analisi): string[] {
  const p = a.preventivo;
  const r = a.ricostruzione;
  const note: string[] = [];
  if (r.istruttoriaFinanziata && p.speseIstruttoria) {
    note.push(`L'istruttoria di ${euro(p.speseIstruttoria)} è già dentro l'importo del credito: la paghi con le rate, non si conta due volte.`);
  }
  if (r.bolloNelCredito && p.impostaBollo) {
    note.push(`L'imposta di bollo di ${euro(p.impostaBollo)} è già dentro l'importo del credito: la paghi con le rate.`);
  }
  if (p.accessoriInclusiNelPrezzo) note.push('IPT, messa su strada, polizze e servizi sono già compresi nel prezzo.');
  return note;
}

/**
 * Le voci che compongono il totale «paghi davvero», nello stesso ordine del preventivo:
 * anticipo, rate, maxi rata, spese di incasso, bollo, istruttoria se non è nel credito, altre spese.
 * Restituisce le stesse cifre di calcolaTotali: la somma delle voci è il totale.
 */
export function composizioneTotale(a: Analisi): ComposizioneTotale {
  const p = a.preventivo;
  const r = a.ricostruzione;
  const t = a.totali;
  const voci: VoceTotale[] = [
    ...voce('anticipo', 'Anticipo', p.anticipo),
    ...vociRate(a),
    ...(p.tipo === 'noleggio' ? [] : voce('maxiRata', 'Maxi rata finale', p.maxiRata)),
    ...voce('incasso', 'Spese di incasso delle rate', t.speseRicorrenti, p.speseIncassoRata ? per(p.nRate, p.speseIncassoRata) : null),
    ...(r.bolloNelCredito ? [] : voce('bollo', 'Imposta di bollo', p.impostaBollo)),
    ...(r.istruttoriaFinanziata ? [] : voce('istruttoria', 'Spese di istruttoria', p.speseIstruttoria)),
    ...vociAccessorie(a),
    ...voce('altre', 'Altre spese', t.speseImplicite, 'comprese nel totale dovuto, non dettagliate nel preventivo'),
    ...(p.tipo === 'noleggio' ? voce('km', 'Km oltre quelli inclusi', t.costoKmEccedenti, 'stima') : []),
  ];
  return { voci, note: noteCredito(a), totale: t.totalePagatoTenendo };
}

/** Somma delle voci, per controllo: deve coincidere con il totale. */
export function sommaVoci(c: ComposizioneTotale): number {
  return arrotonda(c.voci.reduce((s, v) => s + v.importo, 0));
}

/** "3.400,00 + 5.915,00 + 14.750,60 + 119,00 + 47,90 = 24.232,50 €": la somma da rifare a mano. */
export function formulaTotale(c: ComposizioneTotale): string {
  if (c.voci.length < 2) return `${euro(c.totale)}`;
  return `${c.voci.map((v) => numero(v.importo)).join(' + ')} = ${euro(c.totale)}`;
}
