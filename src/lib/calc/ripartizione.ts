import { t } from '../../markets';
import type { Mercato } from '../../markets/tipi';
import type { Analisi } from './tipi';

/** Dove vanno i tuoi euro (specifica v2, §2 atto 1): il totale pagato diviso in contenitori, al centesimo. */
export type ChiaveContenitore = 'capitale' | 'interessi' | 'spese' | 'polizze' | 'resto';

export interface Contenitore {
  readonly chiave: ChiaveContenitore;
  readonly etichetta: string;
  readonly importo: number;
}

/** Le spese, una per una: istruttoria, incasso delle rate, bollo e le altre (non dettagliate, IPT, messa su strada). */
export interface DettaglioSpese {
  readonly istruttoria: number;
  readonly incasso: number;
  readonly bollo: number;
  readonly altre: number;
}

export interface Ripartizione {
  readonly totale: number;
  /** false senza prezzo di riferimento (o nel noleggio): capitale e interessi non si possono separare. */
  readonly conPrezzo: boolean;
  readonly contenitori: readonly Contenitore[];
  readonly spese: DettaglioSpese;
  readonly nota: string | null;
}

const NOTA_SENZA_PREZZO = 'Senza il prezzo in contanti non si può separare il prezzo dell’auto dagli interessi: chiedilo al venditore.';
const NOTA_NOLEGGIO = 'Nel noleggio non ci sono interessi da separare: paghi canoni, anticipo e spese.';
const NOTA_INCOERENTE = 'Con questi numeri gli interessi verrebbero negativi: manca qualcosa nel preventivo, per ora mostriamo solo totale e spese.';

/** In centesimi interi: la somma dei contenitori coincide con il totale senza errori di virgola mobile. */
const cent = (euro: number | undefined): number => Math.round((euro ?? 0) * 100);
const euro = (centesimi: number): number => centesimi / 100;

function speseInCentesimi(a: Analisi): { readonly dettaglio: Record<keyof DettaglioSpese, number>; readonly polizze: number } {
  const p = a.preventivo;
  const accessori = !p.accessoriInclusiNelPrezzo;
  return {
    dettaglio: {
      // Istruttoria e bollo si pagano anche quando sono dentro il credito: lì li paghi con le rate.
      istruttoria: cent(p.speseIstruttoria),
      incasso: cent(a.totali.speseRicorrenti),
      bollo: cent(p.impostaBollo),
      altre: cent(a.totali.speseImplicite) + (accessori ? cent(p.ipt) + cent(p.messaSuStrada) : 0),
    },
    polizze: accessori ? cent(p.polizzeAbbinate) + cent(p.serviziAbbinati) : 0,
  };
}

function contenitore(chiave: ChiaveContenitore, etichetta: string, centesimi: number): Contenitore {
  return { chiave, etichetta, importo: euro(centesimi) };
}

function senzaPrezzo(m: Mercato, totale: number, spese: number, polizze: number, etichettaResto: string): readonly Contenitore[] {
  const resto = totale - spese - polizze;
  if (resto < 0) return [contenitore('resto', t(m, 'contenitore.totale'), totale)];
  return [contenitore('resto', etichettaResto, resto), contenitore('spese', t(m, 'contenitore.spese'), spese), contenitore('polizze', t(m, 'contenitore.polizze'), polizze)]
    .filter((c) => c.chiave !== 'polizze' || c.importo > 0);
}

/**
 * Divide il totale «paghi davvero» in prezzo dell'auto (capitale), interessi, spese e polizze e servizi.
 * Gli interessi sono quello che resta: totale − prezzo − spese − polizze. Senza prezzo di riferimento: solo totale e spese.
 */
export function ripartizioneTotale(a: Analisi): Ripartizione {
  const totale = cent(a.totali.totalePagatoTenendo);
  const { dettaglio, polizze } = speseInCentesimi(a);
  const spese = dettaglio.istruttoria + dettaglio.incasso + dettaglio.bollo + dettaglio.altre;
  const speseEuro: DettaglioSpese = {
    istruttoria: euro(dettaglio.istruttoria), incasso: euro(dettaglio.incasso), bollo: euro(dettaglio.bollo), altre: euro(dettaglio.altre),
  };
  const prezzo = a.totali.prezzoRiferimento;
  const noleggio = a.preventivo.tipo === 'noleggio';
  const interessi = prezzo != null ? totale - cent(prezzo) - spese - polizze : -1;
  if (noleggio || prezzo == null || a.totali.costoCredito == null || interessi < 0) {
    const nota = noleggio ? NOTA_NOLEGGIO : prezzo == null ? NOTA_SENZA_PREZZO : NOTA_INCOERENTE;
    const etichetta = t(a.mercato, noleggio ? 'contenitore.canoni' : 'contenitore.insieme');
    return { totale: euro(totale), conPrezzo: false, contenitori: senzaPrezzo(a.mercato, totale, spese, polizze, etichetta), spese: speseEuro, nota };
  }
  return {
    totale: euro(totale),
    conPrezzo: true,
    contenitori: [
      contenitore('capitale', t(a.mercato, 'contenitore.capitale'), cent(prezzo)),
      contenitore('interessi', t(a.mercato, 'contenitore.interessi'), interessi),
      contenitore('spese', t(a.mercato, 'contenitore.spese'), spese),
      contenitore('polizze', t(a.mercato, 'contenitore.polizze'), polizze),
    ],
    spese: speseEuro,
    nota: null,
  };
}

/** Somma dei contenitori in centesimi: deve coincidere con il totale. */
export function sommaContenitori(r: Ripartizione): number {
  return euro(r.contenitori.reduce((s, c) => s + cent(c.importo), 0));
}
