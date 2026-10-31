import { describe, expect, it } from 'vitest';
import { GLOSSARIO, idTermine } from '~/lib/glossario';
import { rehypeGlossario } from '~/lib/glossarioRehype';

type Nodo = { type: string; value?: string; tagName?: string; properties?: Record<string, unknown>; children?: Nodo[] };

function testoDi(n: Nodo): string {
  return n.type === 'text' ? (n.value ?? '') : (n.children ?? []).map(testoDi).join('');
}
function pulsanti(n: Nodo): Nodo[] {
  return [...(n.tagName === 'button' ? [n] : []), ...(n.children ?? []).flatMap(pulsanti)];
}
const p = (...children: Nodo[]): Nodo => ({ type: 'element', tagName: 'p', properties: {}, children });
const t = (value: string): Nodo => ({ type: 'text', value });

describe('glossario in linea', () => {
  it('sette voci (con il debito residuo della scena), una riga ciascuna, niente punti esclamativi', () => {
    expect(Object.keys(GLOSSARIO).sort()).toEqual(['maxi', 'residuo', 'secci', 'taeg', 'tan', 'totaleDovuto', 'vfg']);
    for (const g of Object.values(GLOSSARIO)) {
      expect(g.definizione.length).toBeLessThan(160);
      expect(g.definizione).not.toMatch(/[!\n]/);
    }
  });

  it('id stabili e validi', () => {
    expect(idTermine('promo-seat-arona', 'tan')).toBe('gl-promo-seat-arona-tan');
    expect(idTermine('a b', 'taeg')).toBe('gl-a-b-taeg');
  });

  it('nelle guide spiega solo la prima occorrenza di ogni voce e salta titoli e link', () => {
    const albero: Nodo = {
      type: 'root',
      children: [
        { type: 'element', tagName: 'h2', properties: {}, children: [t('Il TAEG nel titolo')] },
        p(t('Il TAN è più basso del TAEG; il TAEG conta le spese. La maxi rata finale pesa.')),
        p({ type: 'element', tagName: 'a', properties: {}, children: [t('chiedi il SECCI')] }, t(' e poi il SECCI.')),
      ],
    };
    rehypeGlossario()(albero as never);
    const voci = pulsanti(albero).map(testoDi);
    expect(voci).toEqual(['TAN', 'TAEG', 'maxi rata', 'SECCI']);
    expect(testoDi(albero.children?.[0] as Nodo)).toBe('Il TAEG nel titolo');
    const b = pulsanti(albero)[0] as Nodo;
    expect(b.properties).toMatchObject({ type: 'button', ariaExpanded: 'false', ariaDescribedBy: 'gl-guida-tan' });
    // Il testo resta intero per chi legge la pagina senza stile: parola, poi definizione tra parentesi.
    expect(testoDi(albero.children?.[1] as Nodo)).toContain('TAN (Tasso annuo nominale');
  });
});
