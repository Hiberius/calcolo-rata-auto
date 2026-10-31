import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { leggiJsonc, problemiConfigurazione, SEGRETI_NECESSARI } from '~/lib/configurazione';
import { TURNSTILE_SITE_KEY_TEST, turnstileNonConfigurato } from '~/lib/turnstile';
import { messaggioErrore } from '~/lib/moduli';

const COMPLETA = {
  vars: { PUBLIC_TURNSTILE_SITE_KEY: '0x4AAAAAAAvera', PUBLIC_PIVA: '01234567890', PUBLIC_SEDE: 'Via Roma 1, Torino' },
  segreti: [...SEGRETI_NECESSARI],
};

describe('controllo della configurazione prima del deploy (revisione del 31/10)', () => {
  it('configurazione completa: nessun problema', () => {
    expect(problemiConfigurazione(COMPLETA)).toEqual([]);
  });

  it('chiave Turnstile di test, segreto mancante, P.IVA e sede vuote: tutti segnalati', () => {
    const p = problemiConfigurazione({ vars: { PUBLIC_TURNSTILE_SITE_KEY: TURNSTILE_SITE_KEY_TEST, PUBLIC_PIVA: '', PUBLIC_SEDE: ' ' }, segreti: ['HASH_SALT', 'ADMIN_TOKEN'] });
    expect(p.join('\n')).toMatch(/chiave di test/);
    expect(p.join('\n')).toMatch(/TURNSTILE_SECRET_KEY/);
    expect(p.join('\n')).toMatch(/PUBLIC_PIVA/);
    expect(p.join('\n')).toMatch(/PUBLIC_SEDE/);
  });

  it('il wrangler.jsonc del repo si legge e oggi il controllo trova la chiave di test (deploy solo provvisorio)', () => {
    const w = leggiJsonc(readFileSync('wrangler.jsonc', 'utf8')) as { vars: Record<string, string> };
    expect(w.vars['PUBLIC_SITE_URL']).toBe('https://ratavera.it');
    expect(problemiConfigurazione({ vars: w.vars, segreti: [...SEGRETI_NECESSARI] }).join('\n')).toMatch(/chiave di test/);
  });

  it('senza segreto il modulo dice che non è attivo, non che sei un robot', () => {
    expect(turnstileNonConfigurato({ ok: false, codici: ['segreto-mancante'] })).toBe(true);
    expect(turnstileNonConfigurato({ ok: false, codici: ['invalid-input-response'] })).toBe(false);
    expect(messaggioErrore('non_attivo')).toMatch(/non è ancora attivo/);
  });
});
