import { describe, expect, it } from 'vitest';
import { analizza, type Analisi } from '~/lib/calc';
import { rataCostante } from '~/lib/calc/rata';
import { baseScena, cursoriIniziali, fraseIncrocio, pianoConCursori, rigaIncrocio, serieScena } from '~/lib/calc/scena';
import { debitoResiduo, durataPiano, MODELLO_VALORE, rataDelPiano, serieValoreDebito, valoreStimato, type PianoDebito } from '~/lib/calc/valore';

function ok(input: unknown): Analisi {
  const esito = analizza(input);
  if (!esito.ok) throw new Error(JSON.stringify(esito.errori));
  return esito.analisi;
}

const P208 = { marca: 'Peugeot', modello: '208', prezzoPromo: 14950, anticipo: 4326, nRate: 35, rata: 99, maxiRata: 10434, tan: 7.49, taegDichiarato: 11.03, importoTotaleDovutoDichiarato: 13927.25 };
const ARONA = {
  marca: 'SEAT', modello: 'Arona', prezzoPromo: 22183.6, anticipo: 3400, importoCreditoDichiarato: 19163.6, nRate: 35, rata: 169, maxiRata: 14750.6,
  tan: 2.95, taegDichiarato: 4.17, importoTotaleDovutoDichiarato: 20838.9, speseIstruttoria: 380, speseIncassoRata: 3.4, impostaBollo: 47.9,
};

describe('valore stimato: modello dichiarato', () => {
  it('primo anno −20%, poi −12% l’anno a 15.000 km', () => {
    expect(valoreStimato(10_000, 0, 15_000)).toBe(10_000);
    expect(valoreStimato(10_000, 12, 15_000)).toBe(8_000);
    expect(valoreStimato(10_000, 24, 15_000)).toBe(7_040);
    expect(valoreStimato(10_000, 36, 15_000)).toBeCloseTo(6_195.2, 2);
  });

  it('km alti perdono 2 punti in più l’anno ogni 5.000 km, km bassi 2 in meno', () => {
    expect(valoreStimato(10_000, 12, 25_000)).toBe(7_600);
    expect(valoreStimato(10_000, 24, 25_000)).toBe(6_384);
    expect(valoreStimato(10_000, 12, 5_000)).toBe(8_400);
    expect(valoreStimato(10_000, 24, 5_000)).toBe(7_728);
    expect(valoreStimato(10_000, 36, 30_000)).toBeLessThan(valoreStimato(10_000, 36, 15_000));
  });

  it('mai sotto il 10% del prezzo', () => {
    expect(valoreStimato(10_000, 300, 15_000)).toBe(10_000 * MODELLO_VALORE.quotaMinima);
    expect(valoreStimato(10_000, 600, 100_000)).toBe(1_000);
  });
});

describe('debito residuo dal piano di ammortamento', () => {
  it('rataDelPiano lascia la maxi rata da pagare il mese dopo l’ultima rata', () => {
    const rata = rataDelPiano(19_163.6, 2.95, 35, 14_750.6);
    const piano: PianoDebito = { capitale: 19_163.6, tanAnnuo: 2.95, nRate: 35, rata, maxiRata: 14_750.6 };
    expect(debitoResiduo(piano, 35) * (1 + 2.95 / 1200)).toBeCloseTo(14_750.6, 0);
    expect(debitoResiduo(piano, 36)).toBe(14_750.6);
    expect(debitoResiduo(piano, 37)).toBe(0);
  });

  it('senza maxi rata il debito si chiude con l’ultima rata', () => {
    const rata = rataCostante(10_000, 5, 36);
    const piano: PianoDebito = { capitale: 10_000, tanAnnuo: 5, nRate: 36, rata, maxiRata: 0 };
    expect(durataPiano(piano)).toBe(36);
    expect(debitoResiduo(piano, 0)).toBe(10_000);
    expect(debitoResiduo(piano, 35)).toBeGreaterThan(0);
    expect(debitoResiduo(piano, 36)).toBe(0);
  });

  it('TAN zero: il capitale scende della rata ogni mese', () => {
    const piano: PianoDebito = { capitale: 12_000, tanAnnuo: 0, nRate: 24, rata: 500, maxiRata: 0 };
    expect(debitoResiduo(piano, 12)).toBe(6_000);
  });
});

describe('serie valore e debito', () => {
  it('208: il debito supera il valore stimato prima della maxi rata (incrocio)', () => {
    const b = baseScena(ok(P208));
    const s = serieScena(b, cursoriIniziali(b));
    if (!s) throw new Error('serie assente');
    expect(s.durata).toBe(36);
    expect(s.punti).toHaveLength(37);
    expect(s.meseIncrocio).not.toBeNull();
    const m = s.meseIncrocio as number;
    expect(s.punti[m]?.debito).toBeGreaterThan(s.punti[m]?.valore ?? Infinity);
    expect(s.punti.slice(0, m).every((x) => x.debito <= x.valore)).toBe(true);
    expect(s.debitoFinale).toBe(10_434);
    expect(s.valoreFinale).toBeLessThan(10_434);
    expect(fraseIncrocio(s)).toBe(`Dal mese ${m} devi all’auto più di quanto vale (stima, non quotazione).`);
    expect(rigaIncrocio(s)).toBe(`Dal mese ${m} devi all’auto più di quanto vale, stima.`);
  });

  it('prestito classico senza maxi rata: nessun incrocio', () => {
    const piano: PianoDebito = { capitale: 10_000, tanAnnuo: 6, nRate: 36, rata: rataCostante(10_000, 6, 36), maxiRata: 0 };
    const s = serieValoreDebito({ prezzo: 15_000, piano, kmAnnui: 15_000 });
    expect(s.meseIncrocio).toBeNull();
    expect(s.mesiSopra).toBe(0);
    expect(s.debitoFinale).toBe(0);
    expect(fraseIncrocio(s)).toContain('resta sotto il valore stimato');
    expect(rigaIncrocio(s)).toBeNull();
  });

  it('valore garantito sopra la stima a 15.000 km, sotto la stima a 5.000 km', () => {
    const b = baseScena(ok(ARONA), 14_750.6);
    const a15 = serieScena(b, cursoriIniziali(b));
    expect(a15?.vfg).toEqual({ importo: 14_750.6, stima: a15?.valoreFinale, sopraStima: true });
    const a5 = serieScena(b, { ...cursoriIniziali(b), kmAnnui: 5_000 });
    expect(a5?.vfg?.sopraStima).toBe(false);
  });

  it('km alti anticipano l’incrocio, km bassi lo spostano in avanti', () => {
    const b = baseScena(ok(P208));
    const c = cursoriIniziali(b);
    const alti = serieScena(b, { ...c, kmAnnui: 35_000 })?.meseIncrocio ?? 99;
    const base = serieScena(b, c)?.meseIncrocio ?? 99;
    const bassi = serieScena(b, { ...c, kmAnnui: 5_000 })?.meseIncrocio ?? 99;
    expect(alti).toBeLessThan(base);
    expect(bassi).toBeGreaterThanOrEqual(base);
  });

  it.each([24, 36, 48])('durata %i mesi: una riga per mese, rata ricalcolata, valore garantito solo alla durata della promo', (durata) => {
    const b = baseScena(ok(ARONA), 14_750.6);
    const c = { ...cursoriIniziali(b), durata };
    const piano = pianoConCursori(b, c);
    const s = serieScena(b, c);
    expect(piano?.nRate).toBe(durata - 1);
    expect(s?.punti).toHaveLength(durata + 1);
    if (durata === 36) expect(piano?.rata).toBe(169);
    if (durata === 24) expect(piano?.rata).toBeGreaterThan(169);
    if (durata === 48) expect(piano?.rata).toBeLessThan(169);
    expect(s?.vfg != null).toBe(durata === 36);
  });

  it('più anticipo, meno debito: il capitale scende euro per euro', () => {
    const b = baseScena(ok(P208));
    const c = cursoriIniziali(b);
    const piu = pianoConCursori(b, { ...c, anticipo: c.anticipo + 1_000 });
    expect(piu?.capitale).toBe((b.piano?.capitale ?? 0) - 1_000);
    expect(piu?.rata).toBeLessThan(99);
  });

  it('maxi rata zero: il piano finisce con l’ultima rata, nessun punto di valore garantito', () => {
    const b = baseScena(ok({ prezzoContanti: 15_000, anticipo: 3_000, nRate: 48, rata: 280, tan: 6 }));
    const s = serieScena(b, cursoriIniziali(b));
    expect(s?.durata).toBe(48);
    expect(s?.debitoFinale).toBe(0);
    expect(s?.vfg).toBeNull();
  });

  it('noleggio e preventivi senza prezzo non hanno curva del debito', () => {
    const nol = baseScena(ok({ tipo: 'noleggio', anticipo: 0, nRate: 36, rata: 299 }));
    expect(serieScena(nol, cursoriIniziali(nol))).toBeNull();
    const senza = baseScena(ok({ anticipo: 2_000, nRate: 35, rata: 150, maxiRata: 9_000, tan: 6 }));
    expect(serieScena(senza, cursoriIniziali(senza))).toBeNull();
  });
});
