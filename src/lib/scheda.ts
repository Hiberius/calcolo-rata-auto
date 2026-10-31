import { analizza, type Analisi } from './calc';
import { leggiScheda } from './db/queries';
import { ID_SCHEDA_RE } from './ids';

export const TTL_CACHE_SCHEDA = 60 * 60 * 24 * 30;

export interface SchedaCaricata {
  readonly id: string;
  readonly analisi: Analisi;
  readonly consensoArchivio: boolean;
  readonly createdAt: string;
}

interface InCache {
  readonly input: unknown;
  readonly consensoArchivio: boolean;
  readonly createdAt: string;
}

function daCache(id: string, c: InCache): SchedaCaricata | null {
  const esito = analizza(c.input);
  return esito.ok ? { id, analisi: esito.analisi, consensoArchivio: c.consensoArchivio, createdAt: c.createdAt } : null;
}

/** Legge la scheda da KV (30 giorni) o da D1, e ricalcola l'analisi dai numeri salvati. */
export async function caricaScheda(env: Pick<Env, 'DB' | 'KV'>, id: string): Promise<SchedaCaricata | null> {
  if (!ID_SCHEDA_RE.test(id)) return null;
  const chiave = `scheda:${id}`;
  const inCache = await env.KV.get<InCache>(chiave, 'json');
  if (inCache) return daCache(id, inCache);
  const riga = await leggiScheda(env.DB, id);
  if (!riga) return null;
  const valore: InCache = { input: JSON.parse(riga.input_json) as unknown, consensoArchivio: riga.consenso_archivio === 1, createdAt: riga.created_at };
  await env.KV.put(chiave, JSON.stringify(valore), { expirationTtl: TTL_CACHE_SCHEDA });
  return daCache(id, valore);
}
