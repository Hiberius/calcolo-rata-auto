import { describe, expect, it } from 'vitest';
import { euro } from '~/lib/calc/format';
import { decodificaPromo, eScaduta, ordinaPerCostoCredito, preventivoDaPromo, slugDi, tutteLePromo, validaPromo } from '~/lib/promo';
import { PromoSchema } from '~/lib/promo/schema';

const OGGI = new Date('2026-10-31T10:00:00Z');

describe('dataset promozioni', () => {
  const promo = tutteLePromo(OGGI);

  it('le 3 promo del §4 sono valide, con fonte https e data di verifica', () => {
    expect(promo).toHaveLength(3);
    for (const d of promo) {
      expect(d.promo.urlFonte.startsWith('https://')).toBe(true);
      expect(d.promo.dataVerifica).toBe('2026-10-31');
    }
  });

  it('la 208 decodificata dà 18.253,25 €', () => {
    const p208 = promo.find((d) => d.promo.id === 'peugeot-208-style-2026-10');
    expect(euro(p208?.analisi.totali.totalePagatoTenendo)).toBe('18.253,25 €');
  });

  it('ordinate per costo del credito in % crescente', () => {
    const pct = promo.map((d) => d.analisi.totali.costoCreditoPct ?? Infinity);
    expect(pct).toEqual([...pct].sort((a, b) => a - b));
    expect(promo[0]?.promo.marca).toBe('SEAT');
  });

  it('la Grande Panda porta le discrepanze dal modulo calcolo', () => {
    const panda = promo.find((d) => d.promo.modello === 'Grande Panda');
    expect(panda?.analisi.ricostruzione.discrepanze.length).toBeGreaterThan(0);
  });

  it('scadenza: valida fino al giorno incluso, scaduta dal giorno dopo', () => {
    expect(eScaduta({ validoAl: '2026-10-31' }, OGGI)).toBe(false);
    expect(eScaduta({ validoAl: '2026-10-31' }, new Date('2026-11-01T08:00:00Z'))).toBe(true);
    const scadute = tutteLePromo(new Date('2026-11-15T08:00:00Z')).filter((d) => d.scaduta).map((d) => d.promo.marca);
    expect(scadute.sort()).toEqual(['Fiat', 'Peugeot']);
  });
});

describe('schema Promo', () => {
  const base = {
    id: 'prova-1', marca: 'Prova', modello: 'X', tipo: 'finanziamento', anticipo: 0, nRate: 36, rata: 100,
    validoAl: '2026-12-31', urlFonte: 'https://esempio.it/offerta', dataVerifica: '2026-10-31',
  };

  it('rifiuta campi sconosciuti, url non https, numeri negativi e date malformate', () => {
    expect(PromoSchema.safeParse(base).success).toBe(true);
    expect(PromoSchema.safeParse({ ...base, finanziatore: 'Banca X' }).success).toBe(false);
    expect(PromoSchema.safeParse({ ...base, urlFonte: 'http://esempio.it' }).success).toBe(false);
    expect(PromoSchema.safeParse({ ...base, rata: -1 }).success).toBe(false);
    expect(PromoSchema.safeParse({ ...base, validoAl: '31/12/2026' }).success).toBe(false);
  });

  it('un file non valido ferma la validazione con il nome del file', () => {
    expect(() => validaPromo({ 'rotto.json': { ...base, nRate: 'tante' } })).toThrow(/rotto\.json/);
  });

  it('preventivoDaPromo porta TAEG e importi dichiarati nei campi del calcolo', () => {
    const p = PromoSchema.parse({ ...base, taeg: 9, importoCredito: 5000, importoTotaleDovuto: 6000 });
    expect(preventivoDaPromo(p)).toMatchObject({ taegDichiarato: 9, importoCreditoDichiarato: 5000, importoTotaleDovutoDichiarato: 6000 });
    expect(preventivoDaPromo(p)).not.toHaveProperty('urlFonte');
  });

  it('ordinamento: le promo senza costo del credito calcolabile vanno in fondo', () => {
    const conPrezzo = decodificaPromo(PromoSchema.parse({ ...base, id: 'a-1', prezzoContanti: 3000 }), OGGI);
    const senza = decodificaPromo(PromoSchema.parse({ ...base, id: 'b-1' }), OGGI);
    expect(ordinaPerCostoCredito([senza, conPrezzo]).map((d) => d.promo.id)).toEqual(['a-1', 'b-1']);
  });

  it('slug senza accenti né spazi', () => {
    expect(slugDi('Città Nuova 2.0')).toBe('citta-nuova-2-0');
  });
});

describe('promo sulla scheda (§6)', () => {
  it('trova la promo dello stesso modello senza badare a maiuscole e la ignora se scaduta', async () => {
    const { promoDelloStessoModello } = await import('~/lib/promo');
    expect(promoDelloStessoModello('peugeot', '208', OGGI)?.promo.id).toBe('peugeot-208-style-2026-10');
    expect(promoDelloStessoModello('Peugeot', '208', new Date('2026-11-02T00:00:00Z'))).toBeNull();
    expect(promoDelloStessoModello('Peugeot', undefined, OGGI)).toBeNull();
  });
});
