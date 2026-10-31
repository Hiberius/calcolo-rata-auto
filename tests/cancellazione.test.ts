import type { APIContext } from 'astro';
import { beforeEach, describe, expect, it } from 'vitest';
import { DELETE, POST } from '~/pages/api/scheda/[id]';
import { eliminaScheda, generaTokenCancellazione, impronta, TOKEN_CANCELLAZIONE_RE } from '~/lib/cancellazione';
import { linkCancellazione, tokenDalFrammento } from '~/lib/client/cancellazione';
import { chiaviCacheScheda } from '~/lib/scheda';

/** D1 finto: una tabella schede (id -> impronta) e il registro delle istruzioni eseguite. */
class FintoD1 {
  readonly schede = new Map<string, string | null>();
  readonly eseguite: string[] = [];
  prepare(sql: string) {
    const db = this;
    return {
      bind: (...args: unknown[]) => ({
        sql,
        args,
        first: async () => {
          const id = String(args[0]);
          return db.schede.has(id) ? { impronta: db.schede.get(id) ?? null } : null;
        },
      }),
    };
  }
  async batch(istruzioni: { sql: string; args: unknown[] }[]) {
    for (const i of istruzioni) {
      this.eseguite.push(i.sql);
      if (i.sql.startsWith('DELETE FROM schede')) this.schede.delete(String(i.args[0]));
    }
    return [];
  }
}

class FintoKV {
  readonly dati = new Map<string, string>();
  async get(k: string) { return this.dati.get(k) ?? null; }
  async put(k: string, v: string) { this.dati.set(k, v); }
  async delete(k: string) { this.dati.delete(k); }
}

const ID = 'abcDEF12';
let db: FintoD1;
let kv: FintoKV;
let token: string;
const env = () => ({ DB: db, KV: kv, HASH_SALT: 'prova' }) as unknown as Env;

beforeEach(async () => {
  db = new FintoD1();
  kv = new FintoKV();
  token = generaTokenCancellazione();
  db.schede.set(ID, await impronta(token));
  for (const k of chiaviCacheScheda(ID)) kv.dati.set(k, 'x');
});

describe('codice di cancellazione della scheda', () => {
  it('43 caratteri base64url, ogni volta diverso; in D1 solo l’impronta SHA-256', async () => {
    expect(token).toMatch(TOKEN_CANCELLAZIONE_RE);
    expect(generaTokenCancellazione()).not.toBe(token);
    expect(await impronta(token)).toMatch(/^[0-9a-f]{64}$/);
  });

  it('il link porta il codice dopo il #, che non arriva al server, e si rilegge', () => {
    const link = linkCancellazione('https://ratavera.it', ID, token);
    expect(link).toBe(`https://ratavera.it/s/${ID}#elimina=${token}`);
    expect(tokenDalFrammento(new URL(link).hash)).toBe(token);
    expect(tokenDalFrammento('#elimina=corto')).toBeNull();
  });
});

describe('eliminaScheda', () => {
  it('con il codice giusto toglie scheda, consenso e cache, e stacca gli eventi', async () => {
    expect(await eliminaScheda(env(), ID, token)).toBe('eliminata');
    expect(db.schede.has(ID)).toBe(false);
    expect(db.eseguite).toEqual([
      'DELETE FROM consensi WHERE scheda_id = ?1',
      'UPDATE eventi SET scheda_id = NULL WHERE scheda_id = ?1',
      'DELETE FROM schede WHERE id = ?1',
    ]);
    expect([...kv.dati.keys()]).toEqual([]);
  });

  it('con un altro codice non tocca nulla', async () => {
    expect(await eliminaScheda(env(), ID, generaTokenCancellazione())).toBe('non_autorizzata');
    expect(db.schede.has(ID)).toBe(true);
    expect(db.eseguite).toEqual([]);
  });

  it('schede vecchie senza impronta: non si cancellano con un codice qualsiasi', async () => {
    db.schede.set(ID, null);
    expect(await eliminaScheda(env(), ID, token)).toBe('non_autorizzata');
  });

  it('scheda inesistente o dati malformati', async () => {
    expect(await eliminaScheda(env(), 'zzzZZZ99', token)).toBe('non_trovata');
    expect(await eliminaScheda(env(), 'corto', token)).toBe('non_valida');
    expect(await eliminaScheda(env(), ID, 'non-un-codice')).toBe('non_valida');
  });
});

describe('endpoint DELETE e POST /api/scheda/:id', () => {
  const chiama = (gestore: typeof DELETE, metodo: string, id: string, corpo: unknown) =>
    gestore({
      params: { id },
      request: new Request(`https://ratavera.it/api/scheda/${id}`, { method: metodo, headers: { 'content-type': 'application/json' }, body: JSON.stringify(corpo) }),
      locals: { runtime: { env: env() } },
    } as unknown as APIContext);

  it('DELETE con il codice giusto: 200, poi 404', async () => {
    const r = await chiama(DELETE, 'DELETE', ID, { token });
    expect(r.status).toBe(200);
    expect(await r.json()).toEqual({ ok: true, eliminata: true });
    expect((await chiama(DELETE, 'DELETE', ID, { token })).status).toBe(404);
  });

  it('POST funziona come DELETE; codice sbagliato 403, corpo malformato 400', async () => {
    expect((await chiama(POST, 'POST', ID, { token: generaTokenCancellazione() })).status).toBe(403);
    expect((await chiama(POST, 'POST', ID, { token: 'x' })).status).toBe(400);
    expect((await chiama(POST, 'POST', ID, { token, altro: 1 })).status).toBe(400);
    expect((await chiama(POST, 'POST', ID, { token })).status).toBe(200);
  });
});
