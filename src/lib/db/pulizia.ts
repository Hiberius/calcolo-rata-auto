/** Tempi di conservazione dichiarati in /privacy, applicati ogni notte dal cron del Worker. */
export const CONSERVAZIONE = { richiesteMesi: 12, eventiMesi: 12, schedeMesi: 24, emailOfficinaMesi: 6, officinaMesi: 24, stampaMesi: 24 } as const;

export function istruzioniPulizia(db: D1Database): D1PreparedStatement[] {
  const r = `-${CONSERVAZIONE.richiesteMesi} months`;
  const e = `-${CONSERVAZIONE.eventiMesi} months`;
  const s = `-${CONSERVAZIONE.schedeMesi} months`;
  const eo = `-${CONSERVAZIONE.emailOfficinaMesi} months`;
  const o = `-${CONSERVAZIONE.officinaMesi} months`;
  const st = `-${CONSERVAZIONE.stampaMesi} months`;
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
    // Officina: l'email (tabella a parte) serve solo all'avviso e si toglie dopo 6 mesi con il suo consenso;
    // il preventivo anonimo resta 24 mesi.
    db.prepare(`DELETE FROM consensi WHERE avviso_id IN (SELECT id FROM avvisi_officina WHERE created_at < ${prima})`).bind(eo),
    db.prepare(`DELETE FROM avvisi_officina WHERE created_at < ${prima}`).bind(eo),
    db.prepare(`DELETE FROM consensi WHERE officina_id IN (SELECT id FROM attese_officina WHERE created_at < ${prima})`).bind(o),
    db.prepare(`DELETE FROM attese_officina WHERE created_at < ${prima}`).bind(o),
    db.prepare(`DELETE FROM consensi WHERE stampa_id IN (SELECT id FROM richieste_stampa WHERE created_at < ${prima})`).bind(st),
    db.prepare(`DELETE FROM richieste_stampa WHERE created_at < ${prima}`).bind(st),
  ];
}

export async function pulisci(db: D1Database): Promise<void> {
  await db.batch(istruzioniPulizia(db));
}
