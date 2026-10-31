import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import type { APIContext } from 'astro';
import { describe, expect, it } from 'vitest';
import { ALL as apiB2b } from '~/pages/api/b2b';
import { ALL as apiVerdetto } from '~/pages/api/verdetto';
import { ALL as paginaConcessionari } from '~/pages/per-concessionari';
import { ALL as paginaVerdetto } from '~/pages/verdetto';
import { ENDPOINT_RIMOSSI, PAGINE_RIMOSSE } from '~/lib/rimosse';

const contesto = (metodo: string) => ({ request: new Request('https://ratavera.it/x', { method: metodo }) }) as unknown as APIContext;

function fileDi(cartella: string): string[] {
  return readdirSync(cartella).flatMap((nome) => {
    const percorso = join(cartella, nome);
    return statSync(percorso).isDirectory() ? fileDi(percorso) : [percorso];
  });
}

describe('offerta concessionarie e verdetto esperto tolti (31/10/2026)', () => {
  it('le pagine rispondono 410 a ogni metodo, in HTML, fuori dai motori di ricerca', async () => {
    for (const rotta of [paginaConcessionari, paginaVerdetto]) {
      for (const metodo of ['GET', 'HEAD', 'POST']) {
        const r = await rotta(contesto(metodo));
        expect(r.status).toBe(410);
        expect(r.headers.get('content-type')).toContain('text/html');
        expect(r.headers.get('x-robots-tag')).toBe('noindex');
      }
    }
  });

  it('gli endpoint sono disattivati con 410 e non scrivono nulla', async () => {
    for (const rotta of [apiB2b, apiVerdetto]) {
      const r = await rotta(contesto('POST'));
      expect(r.status).toBe(410);
      expect(await r.json()).toEqual({ ok: false, errore: 'Questo servizio non è più attivo.' });
    }
  });

  it('nessun link alle pagine tolte; le tabelle D1 restano nelle migrazioni', () => {
    const sorgenti = fileDi('src').filter((f) => /\.(astro|tsx?|md)$/.test(f) && !f.endsWith('rimosse.ts'));
    for (const f of sorgenti) {
      const testo = readFileSync(f, 'utf8');
      for (const p of [...PAGINE_RIMOSSE, ...ENDPOINT_RIMOSSI]) expect(testo, `${f} → ${p}`).not.toMatch(new RegExp(`["'(]${p}["')]`));
    }
    const migrazioni = fileDi('src/lib/db/migrations').map((f) => readFileSync(f, 'utf8')).join('\n');
    expect(migrazioni).toContain('CREATE TABLE IF NOT EXISTS b2b_contatti');
    expect(migrazioni).toContain('CREATE TABLE IF NOT EXISTS richieste_verdetto');
  });
});
