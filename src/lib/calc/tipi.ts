import { z } from 'zod';
import { IPOTESI_PREDEFINITE as D } from './config';
import { normalizzaMarca, normalizzaModello, normalizzaVersione } from './veicolo';

/** Tetto agli importi: nessun preventivo d'auto supera 10 milioni; evita Infinity e notazione esponenziale. */
export const EURO_MAX = 10_000_000;

/** Importo in euro: numero finito, non negativo. Le stringhe vanno normalizzate prima (vedi extract/validate). */
const euro = z.number({ error: 'Deve essere un numero' }).nonnegative({ error: 'Non può essere negativo' }).max(EURO_MAX, { error: 'Importo troppo alto' });
const percento = z.number({ error: 'Deve essere un numero' }).min(0).max(100, { error: 'Percentuale fuori scala' });
const testo = (max: number) => z.string().trim().max(max);

export const TIPI_CONTRATTO = ['finanziamento', 'leasing', 'noleggio'] as const;
export type TipoContratto = (typeof TIPI_CONTRATTO)[number];

export const PreventivoSchema = z.object({
  // Testi pubblici sulla scheda: se non sembrano marca, modello o versione vengono scartati (vedi veicolo.ts).
  marca: testo(40).optional().transform(normalizzaMarca),
  modello: testo(60).optional().transform(normalizzaModello),
  versione: testo(80).optional().transform(normalizzaVersione),
  tipo: z.enum(TIPI_CONTRATTO).default('finanziamento'),
  prezzoListino: euro.optional(),
  prezzoPromo: euro.optional(),
  prezzoContanti: euro.optional(),
  anticipo: euro,
  nRate: z.number({ error: 'Deve essere un numero' }).int({ error: 'Numero di rate intero' }).min(0).max(120),
  rata: euro,
  maxiRata: euro.optional(),
  tan: percento.optional(),
  taegDichiarato: percento.optional(),
  importoCreditoDichiarato: euro.optional(),
  importoTotaleDovutoDichiarato: euro.optional(),
  speseIstruttoria: euro.optional(),
  impostaBollo: euro.optional(),
  speseIncassoRata: euro.optional(),
  ipt: euro.optional(),
  messaSuStrada: euro.optional(),
  polizzeAbbinate: euro.optional(),
  serviziAbbinati: euro.optional(),
  /** true se IPT, messa su strada, polizze e servizi sono già compresi nel prezzo. */
  accessoriInclusiNelPrezzo: z.boolean().default(false),
  kmInclusi: z.number().int().nonnegative().optional(),
  costoKmEccedente: euro.optional(),
  primaRataDiversa: euro.optional(),
  provincia: z.string().trim().toUpperCase().regex(/^[A-Z]{2}$/, { error: 'Sigla di provincia di 2 lettere' }).optional(),
  fonte: testo(300).optional(),
});

export type PreventivoInput = z.input<typeof PreventivoSchema>;
export type Preventivo = z.output<typeof PreventivoSchema>;

/** Ipotesi dichiarate e modificabili: non vengono dal preventivo. */
export const IpotesiSchema = z.object({
  tanRifinanziamento: percento.default(D.tanRifinanziamento),
  mesiRifinanziamento: z.number().int().min(1).max(120).default(D.mesiRifinanziamento),
  tanPrestito: percento.default(D.tanPrestito),
  taegPrestito: percento.default(D.taegPrestito),
  mesiPrestito: z.number().int().min(1).max(120).optional(),
  canoneNoleggio: euro.optional(),
  anticipoNoleggio: euro.default(D.anticipoNoleggio),
  mesiNoleggio: z.number().int().min(1).max(120).optional(),
  kmAnnui: z.number().int().min(0).max(200_000).default(D.kmAnnui),
});
export type IpotesiInput = z.input<typeof IpotesiSchema>;
export type Ipotesi = z.output<typeof IpotesiSchema>;

export type PrezzoRiferimentoTipo = 'contanti' | 'promo' | 'listino' | 'assente';

export interface Discrepanza {
  readonly campo: 'importoCredito' | 'importoTotaleDovuto';
  readonly etichetta: string;
  readonly dichiarato: number;
  readonly ricostruito: number;
  readonly differenza: number;
  readonly messaggio: string;
}

export interface Ricostruzione {
  readonly importoCreditoRicostruito: number | null;
  readonly istruttoriaFinanziata: boolean;
  readonly bolloNelCredito: boolean;
  readonly importoTotaleDovutoRicostruito: number;
  readonly speseImplicite: number;
  readonly discrepanze: readonly Discrepanza[];
}

export interface Totali {
  readonly prezzoRiferimento: number | null;
  readonly prezzoRiferimentoTipo: PrezzoRiferimentoTipo;
  readonly sommaRate: number;
  readonly speseRicorrenti: number;
  readonly speseUnaTantum: number;
  readonly speseImplicite: number;
  readonly costoKmEccedenti: number;
  readonly totalePagatoTenendo: number;
  readonly totalePagatoRestituendo: number;
  readonly costoCredito: number | null;
  readonly costoCreditoPct: number | null;
  readonly messaggi: readonly string[];
}

export type StatoTaeg = 'in_linea' | 'da_verificare' | 'non_dichiarato' | 'non_calcolabile';

export interface EsitoTaeg {
  readonly taegRicostruito: number | null;
  readonly taegDichiarato: number | null;
  readonly differenzaPunti: number | null;
  readonly stato: StatoTaeg;
  readonly nota: string;
}

export interface ScenarioTieni {
  readonly maxiRata: number;
  readonly totale: number;
  readonly rifinanziamento: { readonly tan: number; readonly mesi: number; readonly rata: number; readonly costoAggiuntivo: number; readonly totale: number };
}
export interface ScenarioRestituisci {
  readonly kmInclusi: number | null;
  readonly kmStimati: number;
  readonly kmEccedenti: number;
  readonly costoKmEccedenti: number;
  readonly totale: number;
  readonly nota: string;
}
export interface ScenarioCambi { readonly nuovoAnticipo: number; readonly totale: number; readonly nota: string }
export interface Scenari {
  readonly conMaxiRata: boolean;
  readonly tieni: ScenarioTieni | null;
  readonly restituisci: ScenarioRestituisci | null;
  readonly cambi: ScenarioCambi | null;
  readonly nota: string;
}

export interface Strada {
  readonly id: 'A' | 'B' | 'C';
  readonly titolo: string;
  readonly totaleUscito: number | null;
  readonly possiediAllaFine: string;
  readonly ipotesi: readonly string[];
  readonly dettaglio: string;
}

export type LivelloVerdetto = 'basso' | 'medio' | 'alto' | 'non_applicabile';
export interface Verdetto {
  readonly livello: LivelloVerdetto;
  readonly etichetta: string;
  readonly quotaRata: number | null;
  readonly fraseQuotaRata: string | null;
}

export interface Analisi {
  readonly preventivo: Preventivo;
  readonly ipotesi: Ipotesi;
  readonly ricostruzione: Ricostruzione;
  readonly totali: Totali;
  readonly taeg: EsitoTaeg;
  readonly scenari: Scenari;
  readonly treStrade: readonly Strada[];
  readonly verdetto: Verdetto;
}
