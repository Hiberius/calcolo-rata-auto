/** Dati fissi del sito, usati da privacy, chi siamo e contatti. */
export const TITOLARE = 'Christian Calabrò';
export const EMAIL_CONTATTO = 'ciao@ratavera.it';
export const DATA_AGGIORNAMENTO_TESTI = '2026-10-31';

/** Un link Stripe pubblico è valido solo se è https su buy.stripe.com: altrimenti "disponibile a breve". */
export function linkPagamento(valore: string | undefined): string | null {
  if (!valore) return null;
  try {
    const u = new URL(valore);
    return u.protocol === 'https:' && (u.hostname === 'buy.stripe.com' || u.hostname.endsWith('.stripe.com')) ? u.toString() : null;
  } catch {
    return null;
  }
}
