import { afterEach, describe, expect, it, vi } from 'vitest';
import { contatore, easeInOut, easeOutExpo, livelloMovimento, movimentoPermesso, scorriVerso, seguiMovimento, tween } from '~/lib/motion';

/** Finestra finta con la sola preferenza sul movimento: quanto basta a movimentoPermesso. */
function finestraCon(ridotto: boolean) {
  const ascoltatori = new Set<(e: { matches: boolean }) => void>();
  vi.stubGlobal('window', {
    matchMedia: (q: string) => ({
      matches: q.includes('reduce') ? ridotto : false,
      addEventListener: (_t: string, f: (e: { matches: boolean }) => void) => ascoltatori.add(f),
      removeEventListener: (_t: string, f: (e: { matches: boolean }) => void) => ascoltatori.delete(f),
    }),
  });
  return { cambia: (r: boolean) => { for (const f of ascoltatori) f({ matches: r }); }, ascoltatori };
}

afterEach(() => vi.unstubAllGlobals());

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

  it('senza finestra (server) il movimento non è permesso e il tween arriva subito alla fine', () => {
    expect(movimentoPermesso()).toBe(false);
    expect(livelloMovimento()).toBe('ridotto');
    const passi: number[] = [];
    let finito = false;
    tween({ durata: 500, alPasso: (v) => passi.push(v), allaFine: () => { finito = true; } });
    expect(passi).toEqual([1]);
    expect(finito).toBe(true);
  });
});

describe('una sola funzione per prefers-reduced-motion (problema 1)', () => {
  it('con «riduci il movimento» la risposta è no, senza preferenza è sì', () => {
    finestraCon(true);
    expect(movimentoPermesso()).toBe(false);
    finestraCon(false);
    expect(movimentoPermesso()).toBe(true);
  });

  it('lo scorrimento verso il risultato è un salto con meno movimento, morbido senza', () => {
    const chiamate: ScrollIntoViewOptions[] = [];
    const el = { scrollIntoView: (o: ScrollIntoViewOptions) => chiamate.push(o) } as unknown as Element;
    finestraCon(true);
    scorriVerso(el);
    finestraCon(false);
    scorriVerso(el, 'center');
    expect(chiamate).toEqual([{ behavior: 'auto', block: 'start' }, { behavior: 'smooth', block: 'center' }]);
    expect(() => scorriVerso(null)).not.toThrow();
  });

  it('segue il cambio di preferenza e smette quando richiesto', () => {
    const f = finestraCon(false);
    const visti: boolean[] = [];
    const smetti = seguiMovimento((p) => visti.push(p));
    f.cambia(true);
    f.cambia(false);
    smetti();
    f.cambia(true);
    expect(visti).toEqual([false, true]);
    expect(f.ascoltatori.size).toBe(0);
  });

  it('livello ridotto con Save-Data o con pochi core anche se il movimento è permesso', () => {
    finestraCon(false);
    vi.stubGlobal('navigator', { hardwareConcurrency: 8, connection: { saveData: true } });
    expect(livelloMovimento()).toBe('ridotto');
    vi.stubGlobal('navigator', { hardwareConcurrency: 2 });
    expect(livelloMovimento()).toBe('ridotto');
    vi.stubGlobal('navigator', { hardwareConcurrency: 8, deviceMemory: 8 });
    expect(livelloMovimento()).toBe('pieno');
  });
});
