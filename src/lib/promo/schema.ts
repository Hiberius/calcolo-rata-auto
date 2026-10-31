import { z } from 'zod';
import { TIPI_CONTRATTO } from '../calc/tipi';

const euro = z.number().nonnegative();
const percento = z.number().min(0).max(100);
const data = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { error: 'Data nel formato AAAA-MM-GG' });

export const REQUISITI = ['permuta', 'rottamazione', 'finanziamento obbligatorio', 'pronta consegna'] as const;

/** §7: una promozione ufficiale, con fonte e data di verifica. Cifre riscritte con parole nostre, nessun testo copiato. */
export const PromoSchema = z
  .object({
    id: z.string().regex(/^[a-z0-9-]{3,80}$/),
    marca: z.string().trim().min(2).max(40),
    modello: z.string().trim().min(1).max(60),
    versione: z.string().trim().max(80).optional(),
    tipo: z.enum(TIPI_CONTRATTO),
    prezzoListino: euro.optional(),
    prezzoPromo: euro.optional(),
    prezzoContanti: euro.optional(),
    anticipo: euro,
    nRate: z.number().int().min(0).max(120),
    rata: euro,
    maxiRata: euro.optional(),
    /** Valore futuro garantito dalla casa, se la promozione lo dichiara (di solito coincide con la maxi rata). */
    valoreFuturoGarantito: euro.optional(),
    tan: percento.optional(),
    taeg: percento.optional(),
    importoCredito: euro.optional(),
    importoTotaleDovuto: euro.optional(),
    speseIstruttoria: euro.optional(),
    speseIncassoRata: euro.optional(),
    impostaBollo: euro.optional(),
    /** Polizze e servizi abbinati obbligatori, se la promozione li richiede (Indice: «abbinati sì/no»). */
    polizzeAbbinate: euro.optional(),
    serviziAbbinati: euro.optional(),
    kmInclusi: z.number().int().nonnegative().optional(),
    costoKmEccedente: euro.optional(),
    requisiti: z.array(z.enum(REQUISITI)).default([]),
    validoDal: data.optional(),
    validoAl: data,
    // La fonte è la pagina della promozione, non la home del marchio (§1.5).
    urlFonte: z.url({ protocol: /^https$/ }).refine((u) => new URL(u).pathname.replace(/\/+$/, '') !== '', { error: 'urlFonte deve essere la pagina della promozione, non la home' }),
    dataVerifica: data,
    note: z.string().max(400).optional(),
    /** Note del controllo aritmetico fatto in raccolta (il calcolo vivo le ricava comunque dai numeri). */
    discrepanze: z.array(z.string().max(200)).default([]),
  })
  .strict();

export type Promo = z.output<typeof PromoSchema>;
