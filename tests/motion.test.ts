import { describe, expect, it } from 'vitest';
import { contatore, easeInOut, easeOutExpo, menoMovimento, tween } from '~/lib/motion';

describe('movimento minimo', () => {
  it('le curve partono da 0, arrivano a 1 e restano nell’intervallo', () => {
    for (const curva of [easeOutExpo, easeInOut]) {
      expect(curva(0)).toBe(0);
      expect(curva(1)).toBe(1);
      expect(curva(-1)).toBe(0);
      expect(curva(2)).toBe(1);
    }
    expect(easeOutExpo(0.3)).toBeGreaterThan(0.3);
    expect(easeInOut(0.5)).toBeCloseTo(0.5, 5);
  });

  it('il contatore va dal primo al secondo numero con l’avanzamento', () => {
    expect(contatore(0, 18_253.25, 0)).toBe(0);
    expect(contatore(0, 18_253.25, 1)).toBe(18_253.25);
    expect(contatore(100, 200, 0.5)).toBe(150);
  });

  it('senza finestra (server) niente movimento e il tween arriva subito alla fine', () => {
    expect(menoMovimento()).toBe(true);
    const passi: number[] = [];
    let finito = false;
    tween({ durata: 500, alPasso: (v) => passi.push(v), allaFine: () => { finito = true; } });
    expect(passi).toEqual([1]);
    expect(finito).toBe(true);
  });
});
