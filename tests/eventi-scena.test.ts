import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { EVENTI_CLIENT } from '~/lib/client/evento';
import { NOMI_EVENTO } from '~/lib/db/queries';
import { EventoSchema } from '~/lib/moduli/schemi';

const MIGRAZIONE = readFileSync(new URL('../src/lib/db/migrations/0004_eventi_scena.sql', import.meta.url), 'utf8');
const SCHEMA = readFileSync(new URL('../src/lib/db/schema.sql', import.meta.url), 'utf8');

describe('eventi della scena (v2)', () => {
  it.each(['scena_vista', 'scena_atto2_interagito', 'mostra_venditore'])('%s arriva dal browser e si registra', (nome) => {
    expect(EventoSchema.safeParse({ nome }).success).toBe(true);
    expect(NOMI_EVENTO).toContain(nome);
  });

  it('niente dati in più negli eventi della scena', () => {
    expect(EventoSchema.safeParse({ nome: 'scena_atto2_interagito', anticipo: 4326 }).success).toBe(false);
  });

  it('ogni evento del browser è ammesso dal vincolo della tabella, nella migrazione e nello schema', () => {
    for (const nome of EVENTI_CLIENT) expect(NOMI_EVENTO).toContain(nome);
    for (const nome of NOMI_EVENTO) {
      expect(MIGRAZIONE).toContain(`'${nome}'`);
      expect(SCHEMA).toContain(`'${nome}'`);
    }
  });

  it('la migrazione copia le righe esistenti prima di sostituire la tabella', () => {
    expect(MIGRAZIONE.indexOf('INSERT INTO eventi_nuova')).toBeLessThan(MIGRAZIONE.indexOf('DROP TABLE eventi'));
  });
});
