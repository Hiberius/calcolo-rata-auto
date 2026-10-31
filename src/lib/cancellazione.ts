import { ID_SCHEDA_RE } from './ids';
import { chiaviCacheScheda } from './scheda';

import { TOKEN_CANCELLAZIONE_RE } from './tokenCancellazione';

/** Codice di cancellazione: lo vede solo chi crea la scheda. */
export { TOKEN_CANCELLAZIONE_RE };

export function generaTokenCancellazione(): string {
  const byte = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...byte)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** In D1 va solo l'impronta: chi legge il database non può cancellare le schede degli altri. */
export async function impronta(token: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Confronto a tempo costante tra due impronte della stessa lunghezza. */
function uguali(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diversi = 0;
  for (let i = 0; i < a.length; i += 1) diversi |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diversi === 0;
}

export type EsitoCancellazione = 'eliminata' | 'non_valida' | 'non_trovata' | 'non_autorizzata';

/**
 * Elimina la scheda se il codice è quello giusto: riga in D1, consenso all'archivio collegato, cache e immagini in KV.
 * Gli eventi restano, senza il codice della scheda.
 */
export async function eliminaScheda(env: Pick<Env, 'DB' | 'KV'>, id: string, token: string): Promise<EsitoCancellazione> {
  if (!ID_SCHEDA_RE.test(id) || !TOKEN_CANCELLAZIONE_RE.test(token)) return 'non_valida';
  const riga = await env.DB.prepare('SELECT token_cancellazione_hash AS impronta FROM schede WHERE id = ?1').bind(id).first<{ impronta: string | null }>();
  if (!riga) return 'non_trovata';
  if (!riga.impronta || !uguali(riga.impronta, await impronta(token))) return 'non_autorizzata';
  await env.DB.batch([
    env.DB.prepare('DELETE FROM consensi WHERE scheda_id = ?1').bind(id),
    env.DB.prepare('UPDATE eventi SET scheda_id = NULL WHERE scheda_id = ?1').bind(id),
    env.DB.prepare('DELETE FROM schede WHERE id = ?1').bind(id),
  ]);
  await Promise.all(chiaviCacheScheda(id).map((k) => env.KV.delete(k)));
  return 'eliminata';
}
