import { z } from 'zod';
import { ID_SCHEDA_RE } from '../ids';

/** Le caselle dei form HTML arrivano come "on": le trasformiamo in booleani. */
const casella = z.preprocess((v) => v === true || v === 'on' || v === '1' || v === 'si', z.boolean());
const testo = (min: number, max: number, errore: string) => z.string().trim().min(min, { error: errore }).max(max, { error: errore });
const email = z.string().trim().toLowerCase().pipe(z.email({ error: 'Email non valida' })).pipe(z.string().max(120));
const intero = z.coerce.number({ error: 'Deve essere un numero' }).int({ error: 'Deve essere un numero intero' });

export const DURATE_NOLEGGIO = [24, 36, 48] as const;

/**
 * §9: solo i campi ammessi. .strict() rifiuta qualunque altro campo (reddito, rata massima, anticipo disponibile):
 * il modulo noleggio non raccoglie dati di credito.
 */
export const RichiestaNoleggioSchema = z
  .object({
    nome: testo(2, 80, 'Scrivi nome e cognome'),
    email,
    telefono: z.string().trim().regex(/^\+?[0-9 ]{6,20}$/, { error: 'Numero di telefono non valido' }),
    provincia: z.string().trim().toUpperCase().regex(/^[A-Z]{2}$/, { error: 'Sigla di provincia di 2 lettere' }),
    modello: testo(2, 80, 'Scrivi il modello che ti interessa'),
    durataMesi: intero.refine((n) => (DURATE_NOLEGGIO as readonly number[]).includes(n), { error: 'Durata: 24, 36 o 48 mesi' }),
    kmAnnui: intero.min(5_000, { error: 'Almeno 5.000 km' }).max(100_000, { error: 'Al massimo 100.000 km' }),
    anticipoZero: casella.default(false),
    consensoContatto: casella.refine((v) => v, { error: 'Serve il consenso per essere contattati' }),
    versioneConsenso: z.string().max(20),
  })
  .strict();
export type RichiestaNoleggio = z.output<typeof RichiestaNoleggioSchema>;

export const ContattoB2bSchema = z
  .object({
    nome: testo(2, 80, 'Scrivi il tuo nome'),
    azienda: testo(2, 120, 'Scrivi il nome della concessionaria'),
    email,
    sito: z.union([z.literal(''), z.url({ protocol: /^https?$/, error: 'Indirizzo del sito non valido' }).max(200)]).optional(),
    messaggio: z.string().trim().max(1000, { error: 'Al massimo 1.000 caratteri' }).optional(),
    consensoContatto: casella.refine((v) => v, { error: 'Serve il consenso per essere ricontattati' }),
    versioneConsenso: z.string().max(20),
  })
  .strict();
export type ContattoB2b = z.output<typeof ContattoB2bSchema>;

export const RichiestaVerdettoSchema = z
  .object({
    schedaId: z.string().trim().regex(ID_SCHEDA_RE, { error: 'Codice scheda di 8 caratteri, lo trovi nel link /s/…' }),
    email,
    riferimentoPagamento: z.string().trim().max(100).optional(),
    nota: z.string().trim().max(500, { error: 'Al massimo 500 caratteri' }).optional(),
  })
  .strict();
export type RichiestaVerdetto = z.output<typeof RichiestaVerdettoSchema>;

export const EventoSchema = z
  .object({
    nome: z.enum(['scheda_condivisa', 'tre_strade_usato', 'verdetto_click', 'b2b_click', 'decodifica_manuale']),
    schedaId: z.string().regex(ID_SCHEDA_RE).optional(),
  })
  .strict();
