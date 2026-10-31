/** Tempi di conservazione dichiarati in /privacy, applicati ogni notte dal cron del Worker. */
export const CONSERVAZIONE = { richiesteMesi: 12, eventiMesi: 12, schedeMesi: 24 } as const;

export function istruzioniPulizia(db: D1Database): D1PreparedStatement[] {
  const r = `-${CONSERVAZIONE.richiesteMesi} months`;
  const e = `-${CONSERVAZIONE.eventiMesi} months`;
  const s = `-${CONSERVAZIONE.schedeMesi} months`;
  const prima = "strftime('%Y-%m-%dT%H:%M:%fZ', 'now', ?1)";
  return [
    db.prepare(`DELETE FROM consensi WHERE richiesta_id IN (SELECT id FROM richieste_noleggio WHERE created_at < ${prima})`).bind(r),
    db.prepare(`DELETE FROM richieste_noleggio WHERE created_at < ${prima}`).bind(r),
    db.prepare(`DELETE FROM consensi WHERE b2b_id IN (SELECT id FROM b2b_contatti WHERE created_at < ${prima})`).bind(r),
    db.prepare(`DELETE FROM b2b_contatti WHERE created_at < ${prima}`).bind(r),
    db.prepare(`DELETE FROM richieste_verdetto WHERE created_at < ${prima}`).bind(r),
    db.prepare(`DELETE FROM eventi WHERE created_at < ${prima}`).bind(e),
    db.prepare(`DELETE FROM consensi WHERE scheda_id IN (SELECT id FROM schede WHERE created_at < ${prima})`).bind(s),
    db.prepare(`DELETE FROM schede WHERE created_at < ${prima}`).bind(s),
  ];
}

export async function pulisci(db: D1Database): Promise<void> {
  await db.batch(istruzioniPulizia(db));
}
