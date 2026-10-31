import { describe, expect, it } from 'vitest';
import { importo, quota, REGOLE } from '~/lib/formato';

describe('formattazione condivisa per contesto (problema 9)', () => {
  it('anteprima a euro interi, scena al centesimo, dallo stesso numero', () => {
    expect(REGOLE.anteprima.decimaliEuro).toBe(0);
    expect(REGOLE.scena.decimaliEuro).toBe(2);
    expect(importo(18_253.25, 'anteprima')).toBe('18.253\u00A0€');
    expect(importo(18_253.25, 'scena')).toBe('18.253,25\u00A0€');
    expect(importo(null, 'scena')).toBe('—');
  });

  it('una voce piccola ma presente non diventa mai 0%, e la regola è la stessa ovunque', () => {
    // Spese della 208 d'esempio: 28,25 € su 18.253,25 € (0,15%).
    expect(quota(28.25, 18_253.25)).toBe('<1%');
    expect(quota(0, 18_253.25)).toBe('0%');
    expect(quota(14_950, 18_253.25)).toBe('82%');
    expect(quota(3_274.97, 18_253.25)).toBe('18%');
    expect(quota(10, 0)).toBe('0%');
  });

  it('spazio non separabile prima di € e %, e il costo del credito con un decimale', async () => {
    const { costoCreditoPct, euro, tipografia } = await import('~/lib/formato');
    expect(euro(4326)).toBe('4.326,00\u00A0€');
    expect(tipografia('Totale 18.253,25 € e TAEG 9,24 %')).toBe('Totale 18.253,25\u00A0€ e TAEG 9,24\u00A0%');
    expect(costoCreditoPct(0.22096)).toBe('22,1%');
  });

  it('le percentuali intere arrotondano al punto più vicino', () => {
    expect(quota(1, 100)).toBe('1%');
    expect(quota(1.5, 100)).toBe('2%');
    expect(quota(99.6, 100)).toBe('100%');
  });
});
