import { describe, expect, it } from 'vitest';
import { analizza, type Analisi } from '~/lib/calc';
import { euro, percentuale } from '~/lib/calc/format';

function ok(input: unknown, ipotesi = {}): Analisi {
  const esito = analizza(input, ipotesi);
  if (!esito.ok) throw new Error(JSON.stringify(esito.errori));
  return esito.analisi;
}

const PAROLE_VIETATE = /truff|fregatur|trappol|errat|sbagliat/i;
function testiDi(a: Analisi): string {
  return JSON.stringify([a.totali.messaggi, a.ricostruzione.discrepanze, a.taeg.nota, a.scenari, a.treStrade, a.verdetto]);
}

describe('Peugeot 208 Style (brief, offerta al 31/10/2026)', () => {
  const p208 = {
    marca: 'Peugeot', modello: '208', versione: 'Style', prezzoPromo: 14950, anticipo: 4326, nRate: 35, rata: 99,
    maxiRata: 10434, tan: 7.49, taegDichiarato: 11.03, importoTotaleDovutoDichiarato: 13927.25,
  };
  const a = ok(p208);

  it('somma rate, spese implicite e totale', () => {
    expect(a.totali.sommaRate).toBe(3465);
    expect(a.ricostruzione.speseImplicite).toBeCloseTo(28.25, 2);
    expect(a.totali.totalePagatoTenendo).toBeCloseTo(18253.25, 2);
    expect(euro(a.totali.totalePagatoTenendo)).toBe('18.253,25 €');
  });

  it('costo del credito circa 3.303 € e 22%', () => {
    expect(a.totali.costoCredito).toBeCloseTo(3303.25, 2);
    expect(a.totali.costoCreditoPct).toBeGreaterThan(0.215);
    expect(a.totali.costoCreditoPct).toBeLessThan(0.225);
    expect(a.verdetto.livello).toBe('alto');
    expect(a.totali.prezzoRiferimentoTipo).toBe('promo');
  });

  it('TAEG ricostruito entro 2 punti, mai un giudizio di errore', () => {
    expect(a.taeg.taegRicostruito).not.toBeNull();
    expect(Math.abs((a.taeg.taegRicostruito as number) - 11.03)).toBeLessThanOrEqual(2);
    expect(['in_linea', 'da_verificare']).toContain(a.taeg.stato);
    expect(testiDi(a)).not.toMatch(PAROLE_VIETATE);
  });

  it('senza il totale dovuto le spese ignote fanno scendere il TAEG ma resta entro 2 punti', () => {
    const b = ok({ ...p208, importoTotaleDovutoDichiarato: undefined });
    expect(b.ricostruzione.speseImplicite).toBe(0);
    expect(Math.abs((b.taeg.taegRicostruito as number) - 11.03)).toBeLessThanOrEqual(2);
  });

  it('scenari di fine contratto con la maxi rata', () => {
    expect(a.scenari.conMaxiRata).toBe(true);
    expect(a.scenari.tieni?.maxiRata).toBe(10434);
    expect(a.scenari.tieni?.rifinanziamento.costoAggiuntivo).toBeGreaterThan(1000);
    expect(a.scenari.restituisci?.totale).toBeCloseTo(18253.25 - 10434, 2);
    expect(a.scenari.cambi?.totale).toBeCloseTo(18253.25 - 10434 + 4326, 2);
  });

  it('tre strade senza classifica', () => {
    expect(a.treStrade.map((s) => s.id)).toEqual(['A', 'B', 'C']);
    expect(a.treStrade[1]?.totaleUscito).toBeCloseTo(18253.25, 2);
    expect(a.treStrade[2]?.totaleUscito).toBeNull();
    const conCanone = ok(p208, { canoneNoleggio: 250, mesiNoleggio: 36 });
    expect(conCanone.treStrade[2]?.totaleUscito).toBe(9000);
  });
});

describe('SEAT Arona Black Edition (seat-italia.it/offerte, scad. 30/11/2026)', () => {
  const a = ok({
    marca: 'SEAT', modello: 'Arona', versione: 'Black Edition', prezzoPromo: 22183.6, anticipo: 3400,
    importoCreditoDichiarato: 19163.6, nRate: 35, rata: 169, maxiRata: 14750.6, tan: 2.95, taegDichiarato: 4.17,
    importoTotaleDovutoDichiarato: 20838.9, speseIstruttoria: 380, speseIncassoRata: 3.4, impostaBollo: 47.9,
  });

  it('istruttoria riconosciuta come finanziata', () => {
    expect(a.ricostruzione.istruttoriaFinanziata).toBe(true);
    expect(a.ricostruzione.importoCreditoRicostruito).toBeCloseTo(19163.6, 2);
    expect(a.ricostruzione.discrepanze.find((d) => d.campo === 'importoCredito')).toBeUndefined();
  });

  it('istruttoria finanziata non contata due volte nel totale', () => {
    expect(a.totali.speseUnaTantum).toBeCloseTo(47.9, 2);
    expect(a.totali.totalePagatoTenendo).toBeCloseTo(3400 + 5915 + 14750.6 + 119 + 47.9, 2);
  });

  it('TAEG ricostruito entro 0,5 punti da 4,17', () => {
    expect(Math.abs((a.taeg.taegRicostruito as number) - 4.17)).toBeLessThanOrEqual(0.5);
    expect(a.taeg.stato).toBe('in_linea');
  });
});

describe('Fiat Grande Panda POP (fiat.it, scad. 31/10/2026)', () => {
  const input = {
    marca: 'Fiat', modello: 'Grande Panda', versione: 'POP', prezzoPromo: 14950, anticipo: 2747, nRate: 35, rata: 128.99,
    maxiRata: 10638.4, tan: 5.99, taegDichiarato: 9.08, importoCreditoDichiarato: 12474,
    importoTotaleDovutoDichiarato: 15185.38, speseIstruttoria: 420, speseIncassoRata: 4, impostaBollo: 32.24,
  };

  it('produce discrepanze senza eccezioni', () => {
    expect(() => analizza(input)).not.toThrow();
    const a = ok(input);
    const campi = a.ricostruzione.discrepanze.map((d) => d.campo);
    expect(campi).toContain('importoCredito');
    expect(campi).toContain('importoTotaleDovuto');
  });

  it('il messaggio dice "non torna di X €" e chiede al venditore', () => {
    const a = ok(input);
    for (const d of a.ricostruzione.discrepanze) {
      expect(d.messaggio).toMatch(/non torna di [\d.]+,\d{2} €/);
      expect(d.messaggio).toContain('chiedi al venditore');
      expect(Math.abs(d.differenza)).toBeGreaterThan(2);
    }
    expect(testiDi(a)).not.toMatch(PAROLE_VIETATE);
  });
});

describe('Casi limite', () => {
  it('senza maxi rata (prestito classico)', () => {
    const a = ok({ prezzoContanti: 12000, anticipo: 2000, nRate: 48, rata: 240 });
    expect(a.totali.totalePagatoTenendo).toBe(2000 + 48 * 240);
    expect(a.scenari.conMaxiRata).toBe(false);
    expect(a.scenari.tieni).toBeNull();
    expect(a.taeg.stato).toBe('non_dichiarato');
    expect(a.taeg.taegRicostruito).toBeGreaterThan(0);
  });

  it('senza TAN né TAEG e senza prezzo', () => {
    const a = ok({ anticipo: 3000, nRate: 36, rata: 199, maxiRata: 9000 });
    expect(a.totali.costoCredito).toBeNull();
    expect(a.totali.messaggi.join(' ')).toContain('prezzo in contanti');
    expect(a.taeg.stato).toBe('non_calcolabile');
  });

  it('nRate 0', () => {
    const a = ok({ prezzoContanti: 15000, anticipo: 15000, nRate: 0, rata: 0 });
    expect(a.totali.sommaRate).toBe(0);
    expect(a.totali.costoCredito).toBe(0);
    expect(a.taeg.stato).toBe('non_calcolabile');
    expect(a.verdetto.fraseQuotaRata).toBeNull();
  });

  it('leasing con primo canone diverso', () => {
    const a = ok({ tipo: 'leasing', prezzoListino: 30000, anticipo: 0, nRate: 36, rata: 300, primaRataDiversa: 3000, maxiRata: 18000 });
    expect(a.totali.sommaRate).toBe(3000 + 35 * 300);
    expect(a.totali.totalePagatoTenendo).toBe(3000 + 35 * 300 + 18000);
    expect(a.taeg.taegRicostruito).not.toBeNull();
  });

  it('noleggio puro: nessun costo del credito, solo il totale', () => {
    const a = ok({ tipo: 'noleggio', anticipo: 3000, nRate: 36, rata: 289 });
    expect(a.totali.totalePagatoTenendo).toBe(3000 + 36 * 289);
    expect(a.totali.costoCredito).toBeNull();
    expect(a.verdetto.livello).toBe('non_applicabile');
    expect(a.taeg.stato).toBe('non_calcolabile');
  });

  it('rifiuta valori negativi o non numerici', () => {
    expect(analizza({ anticipo: -1, nRate: 36, rata: 199 }).ok).toBe(false);
    expect(analizza({ anticipo: 1000, nRate: 36, rata: '199' }).ok).toBe(false);
    expect(analizza({ anticipo: 1000, nRate: 36.5, rata: 199 }).ok).toBe(false);
    expect(analizza({ anticipo: Number.NaN, nRate: 36, rata: 199 }).ok).toBe(false);
    expect(analizza({ anticipo: 1000, nRate: 36, rata: 199, provincia: 'Milano' }).ok).toBe(false);
    const errato = analizza({ anticipo: -5, nRate: 36, rata: 199 });
    expect(errato.ok === false && errato.errori[0]?.campo).toBe('anticipo');
  });
});

describe('Formato italiano', () => {
  it('euro e percentuali', () => {
    expect(euro(1234.56)).toBe('1.234,56 €');
    expect(euro(1234567)).toBe('1.234.567,00 €');
    expect(euro(99)).toBe('99,00 €');
    expect(percentuale(0.1103)).toBe('11,03%');
  });
});
