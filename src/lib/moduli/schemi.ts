import { z } from 'zod';
import { EVENTI_CLIENT } from '../client/evento';
import { ID_SCHEDA_RE } from '../ids';
import { normalizzaNumero } from '../numeri';
import { IMPORTO_MAX_OFFICINA, INTERVENTI, MODELLI_OFFICINA } from '../officina';
import { eSiglaProvincia } from '../province';

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

export const EventoSchema = z
  .object({
    nome: z.enum(EVENTI_CLIENT),
    schedaId: z.string().regex(ID_SCHEDA_RE).optional(),
  })
  .strict();

const provinciaItaliana = z.string().trim().toUpperCase().refine(eSiglaProvincia, { error: 'Scegli la provincia dalla lista' });
const modelloOfficina = z.string().refine((v) => MODELLI_OFFICINA.includes(v), { error: 'Scegli il modello dalla lista' });

/**
 * §4, officina: solo modello (lista chiusa), intervento, importo, provincia ed email facoltativa con il suo consenso.
 * Nessun nome, nessuna targa, nessuna officina. L'email senza consenso, o il consenso senza email, non passano.
 */
export const AttesaOfficinaSchema = z
  .object({
    modello: modelloOfficina,
    intervento: z.enum(INTERVENTI, { error: 'Scegli l’intervento dalla lista' }),
    importo: z.preprocess(
      normalizzaNumero,
      z.number({ error: 'Scrivi l’importo del preventivo in euro' }).positive({ error: 'L’importo deve essere maggiore di zero' }).max(IMPORTO_MAX_OFFICINA, { error: 'Importo troppo alto: controllalo' }),
    ),
    provincia: provinciaItaliana,
    email: email.optional(),
    consensoAvviso: casella.default(false),
    versioneConsenso: z.string().max(20).optional(),
  })
  .strict()
  .superRefine((v, ctx) => {
    if (v.email && !v.consensoAvviso) ctx.addIssue({ code: 'custom', path: ['consensoAvviso'], message: 'Per ricevere l’avviso serve il consenso' });
    if (!v.email && v.consensoAvviso) ctx.addIssue({ code: 'custom', path: ['email'], message: 'Scrivi l’email a cui avvisarti' });
  });
export type AttesaOfficina = z.output<typeof AttesaOfficinaSchema>;

/** §3, modulo per la stampa dell'Indice: email, testata e consenso. Nient'altro. */
export const RichiestaStampaSchema = z
  .object({
    email,
    testata: testo(2, 80, 'Scrivi il nome della testata'),
    consensoStampa: casella.refine((v) => v, { error: 'Serve il consenso per ricevere l’avviso' }),
    versioneConsenso: z.string().max(20),
  })
  .strict();
export type RichiestaStampa = z.output<typeof RichiestaStampaSchema>;
