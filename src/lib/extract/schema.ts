import { z } from 'zod';

/** Campi numerici del preventivo (§4) che l'estrazione può restituire. */
export const CAMPI_NUMERICI = [
  'prezzoListino', 'prezzoPromo', 'prezzoContanti', 'anticipo', 'nRate', 'rata', 'maxiRata', 'tan', 'taegDichiarato',
  'importoCreditoDichiarato', 'importoTotaleDovutoDichiarato', 'speseIstruttoria', 'impostaBollo', 'speseIncassoRata',
  'ipt', 'messaSuStrada', 'polizzeAbbinate', 'serviziAbbinati', 'kmInclusi', 'costoKmEccedente', 'primaRataDiversa',
] as const;
export const CAMPI_TESTO = ['marca', 'modello', 'versione'] as const;
export type CampoNumerico = (typeof CAMPI_NUMERICI)[number];
export type CampoTesto = (typeof CAMPI_TESTO)[number];
export type CampoEstratto = CampoNumerico | CampoTesto | 'tipo';

const valoreGrezzo = z.union([z.number(), z.string(), z.null()]).optional();

/** Quello che il modello può restituire: tollerante sui tipi, la normalizzazione viene dopo. */
export const EstrazioneGrezzaSchema = z.object({
  ...Object.fromEntries(CAMPI_NUMERICI.map((c) => [c, valoreGrezzo])),
  ...Object.fromEntries(CAMPI_TESTO.map((c) => [c, z.string().nullable().optional()])),
  tipo: z.string().nullable().optional(),
  valuta: z.string().nullable().optional(),
  confidenza: z.record(z.string(), z.union([z.number(), z.string(), z.null()])).nullable().optional(),
  testoRilevante: z.string().nullable().optional(),
}) as z.ZodType<EstrazioneGrezza>;

export type EstrazioneGrezza = Partial<Record<CampoNumerico, number | string | null>> &
  Partial<Record<CampoTesto, string | null>> & {
    tipo?: string | null;
    valuta?: string | null;
    confidenza?: Record<string, number | string | null> | null;
    testoRilevante?: string | null;
  };

const numeroONull = { type: ['number', 'null'] } as const;
const testoONull = { type: ['string', 'null'] } as const;

/** JSON schema per response_format (Workers AI) e input_schema (Claude). */
export const JSON_SCHEMA_ESTRAZIONE = {
  type: 'object',
  properties: {
    ...Object.fromEntries(CAMPI_NUMERICI.map((c) => [c, numeroONull])),
    ...Object.fromEntries(CAMPI_TESTO.map((c) => [c, testoONull])),
    tipo: { type: ['string', 'null'], enum: ['finanziamento', 'leasing', 'noleggio', null] },
    valuta: testoONull,
    confidenza: {
      type: 'object',
      description: 'Per ogni campo trovato, fiducia da 0 a 1 nella lettura.',
      properties: Object.fromEntries([...CAMPI_NUMERICI, ...CAMPI_TESTO].map((c) => [c, { type: 'number' }])),
    },
    testoRilevante: { type: 'string', description: 'Le righe del documento con i numeri, senza dati personali.' },
  },
  required: ['anticipo', 'nRate', 'rata', 'confidenza'],
} as const;

/** Risposta dell'endpoint al browser. */
export interface RispostaEstrazione {
  readonly campi: Readonly<Partial<Record<CampoNumerico, number>>> & Readonly<Partial<Record<CampoTesto, string>>> & { readonly tipo?: 'finanziamento' | 'leasing' | 'noleggio' };
  readonly daConfermare: readonly CampoEstratto[];
  readonly campiTrovati: number;
}
