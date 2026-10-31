export interface ContatoreGiorno {
  readonly giorno: string;
  readonly voce: string;
  readonly n: number;
}

export interface DatiAdmin {
  readonly contatori: readonly ContatoreGiorno[];
  readonly schede: readonly Record<string, unknown>[];
  readonly richieste: readonly Record<string, unknown>[];
  readonly b2b: readonly Record<string, unknown>[];
  readonly verdetti: readonly Record<string, unknown>[];
  readonly eventi: readonly Record<string, unknown>[];
  readonly officina: readonly Record<string, unknown>[];
  readonly stampa: readonly Record<string, unknown>[];
}

const GIORNI = 30;
const RIGHE = 50;

/**
 * Contatori per giorno degli ultimi 30 giorni: eventi per nome e righe nuove per tabella.
 * D1 accetta pochi termini in una SELECT composta: le tabelle stanno in due query separate.
 */
const SQL_CONTATORI = `
  SELECT substr(created_at, 1, 10) AS giorno, nome AS voce, COUNT(*) AS n FROM eventi WHERE created_at >= ?1 GROUP BY giorno, voce
  UNION ALL SELECT substr(created_at, 1, 10), 'tabella:schede', COUNT(*) FROM schede WHERE created_at >= ?1 GROUP BY 1
  UNION ALL SELECT substr(created_at, 1, 10), 'tabella:richieste_noleggio', COUNT(*) FROM richieste_noleggio WHERE created_at >= ?1 GROUP BY 1`;
const SQL_CONTATORI_TABELLE = `
  SELECT substr(created_at, 1, 10) AS giorno, 'tabella:b2b_contatti' AS voce, COUNT(*) AS n FROM b2b_contatti WHERE created_at >= ?1 GROUP BY 1
  UNION ALL SELECT substr(created_at, 1, 10), 'tabella:richieste_verdetto', COUNT(*) FROM richieste_verdetto WHERE created_at >= ?1 GROUP BY 1
  UNION ALL SELECT substr(created_at, 1, 10), 'tabella:attese_officina', COUNT(*) FROM attese_officina WHERE created_at >= ?1 GROUP BY 1
  UNION ALL SELECT substr(created_at, 1, 10), 'tabella:richieste_stampa', COUNT(*) FROM richieste_stampa WHERE created_at >= ?1 GROUP BY 1`;

export async function leggiDatiAdmin(db: D1Database, adesso = new Date()): Promise<DatiAdmin> {
  const da = new Date(adesso.getTime() - GIORNI * 86_400_000).toISOString();
  const [contatori, contatoriTabelle, schede, richieste, b2b, verdetti, eventi, officina, stampa] = await db.batch<Record<string, unknown>>([
    db.prepare(SQL_CONTATORI).bind(da),
    db.prepare(SQL_CONTATORI_TABELLE).bind(da),
    db.prepare(`SELECT id, marca, modello, tipo, totale, costo_credito_pct, taeg_dichiarato, taeg_ricostruito, consenso_archivio, created_at FROM schede ORDER BY created_at DESC LIMIT ${RIGHE}`),
    db.prepare(`SELECT id, nome, email, telefono, provincia, modello, durata_mesi, km_annui, anticipo_zero, stato, created_at FROM richieste_noleggio ORDER BY created_at DESC LIMIT ${RIGHE}`),
    db.prepare(`SELECT id, nome, azienda, email, sito, messaggio, created_at FROM b2b_contatti ORDER BY created_at DESC LIMIT ${RIGHE}`),
    db.prepare(`SELECT id, scheda_id, email, riferimento_pagamento, nota, stato, created_at FROM richieste_verdetto ORDER BY created_at DESC LIMIT ${RIGHE}`),
    db.prepare(`SELECT nome, scheda_id, meta_json, created_at FROM eventi ORDER BY created_at DESC LIMIT 100`),
    db.prepare(`SELECT id, modello, intervento, importo, provincia, email, created_at FROM attese_officina ORDER BY created_at DESC LIMIT ${RIGHE}`),
    db.prepare(`SELECT id, email, testata, created_at FROM richieste_stampa ORDER BY created_at DESC LIMIT ${RIGHE}`),
  ]);
  return {
    contatori: [...(contatori?.results ?? []), ...(contatoriTabelle?.results ?? [])] as unknown as ContatoreGiorno[],
    schede: schede?.results ?? [],
    richieste: richieste?.results ?? [],
    b2b: b2b?.results ?? [],
    verdetti: verdetti?.results ?? [],
    eventi: eventi?.results ?? [],
    officina: officina?.results ?? [],
    stampa: stampa?.results ?? [],
  };
}

/** Da righe (giorno, voce, n) a tabella giorni × voci. */
export function pivotContatori(righe: readonly ContatoreGiorno[]): { voci: readonly string[]; giorni: readonly { giorno: string; valori: Readonly<Record<string, number>> }[] } {
  const voci = [...new Set(righe.map((r) => r.voce))].sort();
  const perGiorno = new Map<string, Record<string, number>>();
  for (const r of righe) perGiorno.set(r.giorno, { ...(perGiorno.get(r.giorno) ?? {}), [r.voce]: r.n });
  const giorni = [...perGiorno.entries()].sort(([a], [b]) => b.localeCompare(a)).map(([giorno, valori]) => ({ giorno, valori }));
  return { voci, giorni };
}
