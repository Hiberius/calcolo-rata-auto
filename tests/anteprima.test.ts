import { describe, expect, it } from 'vitest';
import { BASE_ANTEPRIMA, fotogramma, serieAnteprima, TEMPI } from '~/lib/calc/anteprima';
import { analizza } from '~/lib/calc';
import { preventivoDaForm } from '~/lib/client/campi';
import { ESEMPIO_208 } from '~/lib/esempio';
import { baseScena, cursoriIniziali, serieScena } from '~/lib/calc/scena';

describe('anteprima della scena in home (§1)', () => {
  it('con l’anticipo del preventivo è la stessa serie della scena dell’esempio', () => {
    const a = analizza(preventivoDaForm(ESEMPIO_208));
    if (!a.ok) throw new Error('esempio');
    const base = baseScena(a.analisi);
    expect(BASE_ANTEPRIMA.piano).toEqual(base.piano);
    expect(serieAnteprima(BASE_ANTEPRIMA.anticipo)).toEqual(serieScena(base, cursoriIniziali(base)));
  });

  it('meno anticipo, prima il debito supera il valore stimato', () => {
    const pieno = serieAnteprima(BASE_ANTEPRIMA.anticipo).meseIncrocio ?? Infinity;
    const zero = serieAnteprima(0).meseIncrocio ?? Infinity;
    expect(zero).toBeLessThan(pieno);
  });

  it('il loop: disegno una volta, poi l’anticipo scende a zero e risale, sempre dentro i limiti', () => {
    expect(fotogramma(0)).toEqual({ avanzamento: 0, anticipo: BASE_ANTEPRIMA.anticipo });
    expect(fotogramma(TEMPI.disegno).avanzamento).toBe(1);
    const fondo = TEMPI.disegno + TEMPI.pausa + TEMPI.discesa + TEMPI.fermo / 2;
    expect(fotogramma(fondo).anticipo).toBe(0);
    for (let ms = 0; ms < 30_000; ms += 137) {
      const f = fotogramma(ms);
      expect(f.anticipo).toBeGreaterThanOrEqual(0);
      expect(f.anticipo).toBeLessThanOrEqual(BASE_ANTEPRIMA.anticipo);
    }
    const giro = TEMPI.pausa + TEMPI.discesa + TEMPI.fermo + TEMPI.risalita + TEMPI.coda;
    expect(fotogramma(fondo + giro).anticipo).toBe(0);
  });
});
