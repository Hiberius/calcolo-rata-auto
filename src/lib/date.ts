const MESI = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];

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
