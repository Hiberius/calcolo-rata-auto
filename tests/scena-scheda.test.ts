import { describe, expect, it } from 'vitest';
import { analizza, type Analisi } from '~/lib/calc';
import { datiScena, nodoScena, testoScena } from '~/lib/og/scena';
import { datiScheda, testoCondivisione } from '~/lib/og/template';
import { chiaviCacheScheda } from '~/lib/scheda';

function ok(input: unknown): Analisi {
  const esito = analizza(input);
  if (!esito.ok) throw new Error(JSON.stringify(esito.errori));
  return esito.analisi;
}

const P208 = { marca: 'Peugeot', modello: '208', versione: 'Style', prezzoPromo: 14950, anticipo: 4326, nRate: 35, rata: 99, maxiRata: 10434, tan: 7.49, taegDichiarato: 11.03, importoTotaleDovutoDichiarato: 13927.25 };
const PRESTITO = { marca: 'Fiat', modello: 'Panda', prezzoContanti: 15_000, anticipo: 3_000, nRate: 48, rata: 280, tan: 6 };
const VIETATE = /truff|fregatur|trappol/i;

describe('scheda: immagine dell’atto 2 e riga dell’incrocio', () => {
  it('il testo da copiare dice da quale mese il debito supera il valore stimato', () => {
    const testo = testoCondivisione(datiScheda(ok(P208), 'abcDEF12', 'https://ratavera.it'));
    // Debito al tasso che fa tornare rata e maxi rata (10,41%): al TAN dichiarato, 7,49%, non tornano (revisione del 31/10).
    expect(testo).toContain('TAEG 11,03%. Dal mese 25 devi all’auto più di quanto vale (stima, non quotazione). ratavera.it/s/abcDEF12');
    expect(testo).not.toMatch(VIETATE);
  });

  it('senza incrocio il testo non aggiunge nulla', () => {
    const testo = testoCondivisione(datiScheda(ok(PRESTITO), 'abcDEF12', 'https://ratavera.it'));
    expect(testo).not.toContain('Dal mese');
  });

  it('il grafico è un SVG di sole forme, in ASCII (base64 nel Worker), senza dati personali', () => {
    const d = datiScena(ok(P208), 'ratavera.it/s/abcDEF12');
    if (!d) throw new Error('scena assente');
    expect(d.svg.startsWith('<svg')).toBe(true);
    expect(d.svg).toContain('<polyline');
    expect(d.svg).toContain('<polygon');
    expect(/^[\x20-\x7E]*$/.test(d.svg)).toBe(true);
    expect(d.svg).not.toContain('<text');
    expect(d.frase).toBe('Dal mese 25 devi all’auto più di quanto vale (stima, non quotazione).');
    expect(JSON.stringify(nodoScena(d))).toContain('data:image/svg+xml;base64,');
    expect(testoScena(d)).toContain('STIMA, NON QUOTAZIONE');
  });

  it('noleggio: niente immagine della scena', () => {
    expect(datiScena(ok({ tipo: 'noleggio', anticipo: 0, nRate: 36, rata: 299 }), 'x')).toBeNull();
  });

  it('la cancellazione toglie anche l’immagine della scena dalla cache', () => {
    expect(chiaviCacheScheda('abcDEF12')).toContain('og:v9:abcDEF12:scena');
  });
});
