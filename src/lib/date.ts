const MESI = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];

/** Le scadenze delle promo sono date italiane: "oggi" si calcola sull'ora di Roma, non su UTC. */
const GIORNO_ITALIA = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Rome', year: 'numeric', month: '2-digit', day: '2-digit' });

/** Data di oggi a Roma nel formato AAAA-MM-GG (confrontabile come stringa con validoAl). */
export function oggiItalia(adesso: Date = new Date()): string {
  return GIORNO_ITALIA.format(adesso);
}

/** 2026-10-31 -> 31/10/2026 */
export function dataBreve(iso: string): string {
  const [a, m, g] = iso.slice(0, 10).split('-');
  return a && m && g ? `${g}/${m}/${a}` : iso;
}

/** 2026-10-31 -> 31 ottobre 2026 */
export function dataLunga(iso: string): string {
  const [a, m, g] = iso.slice(0, 10).split('-');
  const mese = MESI[Number(m) - 1];
  return a && mese && g ? `${Number(g)} ${mese} ${a}` : iso;
}
