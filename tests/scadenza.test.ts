import { describe, expect, it } from 'vitest';
import { applicaFiltri, VUOTO_CON_FILTRI, VUOTO_SENZA_PROMO, type RiquadroPromo } from '~/lib/client/filtriPromo';
import { oggiItalia } from '~/lib/date';
import { eScaduta, tutteLePromo } from '~/lib/promo';

const ARONA = { validoAl: '2026-11-30' } as const;

describe('scadenza delle promozioni (bug del 31/10: Arona data per scaduta)', () => {
  it('prima di validoAl è in vigore: il 31/10/2026 l’Arona non è scaduta', () => {
    expect(eScaduta(ARONA, new Date('2026-10-31T12:00:00+01:00'))).toBe(false);
    expect(eScaduta(ARONA, new Date('2026-11-29T23:59:00+01:00'))).toBe(false);
  });

  it('il giorno di validoAl è ancora in vigore, fino a mezzanotte di Roma', () => {
    expect(eScaduta(ARONA, new Date('2026-11-30T00:00:00+01:00'))).toBe(false);
    expect(eScaduta(ARONA, new Date('2026-11-30T23:59:59+01:00'))).toBe(false);
  });

  it('dal giorno dopo validoAl è scaduta, anche quando in UTC è ancora il 30', () => {
    // 1/12 alle 00:30 a Roma = 30/11 alle 23:30 UTC: con toISOString() risultava ancora valida.
    expect(eScaduta(ARONA, new Date('2026-11-30T23:30:00Z'))).toBe(true);
    expect(eScaduta(ARONA, new Date('2026-12-01T12:00:00+01:00'))).toBe(true);
  });

  it('oggi si calcola sull’ora italiana, con l’ora legale', () => {
    expect(oggiItalia(new Date('2026-10-31T23:30:00Z'))).toBe('2026-11-01');
    expect(oggiItalia(new Date('2026-07-31T22:30:00Z'))).toBe('2026-08-01');
    expect(oggiItalia(new Date('2026-07-31T21:30:00Z'))).toBe('2026-07-31');
  });

  it('l’elenco del 31/10/2026 contiene l’Arona tra quelle in vigore', () => {
    const inVigore = tutteLePromo(new Date('2026-10-31T16:00:00+01:00')).filter((d) => !d.scaduta);
    expect(inVigore.map((d) => d.promo.id)).toContain('seat-arona-black-edition-2026-11');
  });
});

describe('filtri nel browser su /promozioni', () => {
  const riquadro = (validoAl: string, extra: Record<string, string> = {}): RiquadroPromo => ({
    hidden: false,
    dataset: { validoAl, marca: 'SEAT', anticipo: '3400', rata: '169', maxi: '1', ...extra },
  });
  const modulo = (voci: Record<string, string> = {}) => {
    const f = new FormData();
    for (const [k, v] of Object.entries(voci)) f.set(k, v);
    return f;
  };

  it('promo in vigore visibile e nessun messaggio di elenco vuoto', () => {
    const r = riquadro('2026-11-30');
    const vuoto = { textContent: null as string | null };
    expect(applicaFiltri([r], vuoto, modulo(), '2026-10-31')).toBe(1);
    expect(r.hidden).toBe(false);
    expect(vuoto.textContent).toBe('');
  });

  it('valida il giorno di validoAl, nascosta dal giorno dopo', () => {
    const r = riquadro('2026-11-30');
    const vuoto = { textContent: '' as string | null };
    expect(applicaFiltri([r], vuoto, modulo(), '2026-11-30')).toBe(1);
    expect(applicaFiltri([r], vuoto, modulo(), '2026-12-01')).toBe(0);
    expect(r.hidden).toBe(true);
    expect(vuoto.textContent).toBe(VUOTO_SENZA_PROMO);
  });

  it('il messaggio «con questi filtri» compare solo se un filtro è attivo', () => {
    const vuoto = { textContent: '' as string | null };
    expect(applicaFiltri([riquadro('2026-11-30')], vuoto, modulo({ rata: '100' }), '2026-10-31')).toBe(0);
    expect(vuoto.textContent).toBe(VUOTO_CON_FILTRI);
    expect(applicaFiltri([riquadro('2026-11-30')], vuoto, modulo({ rata: '200' }), '2026-10-31')).toBe(1);
    expect(vuoto.textContent).toBe('');
  });
});
