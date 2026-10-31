import { describe, expect, it } from 'vitest';
import { analizza } from '~/lib/calc';
import { composizioneTotale, formulaTotale } from '~/lib/calc/composizione';
import { euro } from '~/lib/calc/format';
import { preventivoDaForm } from '~/lib/client/campi';
import { ESEMPIO_208, ETICHETTA_ESEMPIO } from '~/lib/esempio';

describe('preventivo d’esempio della home', () => {
  it('i numeri della 208 di ottobre 2026 danno subito il risultato: 18.253,25 €', () => {
    const esito = analizza(preventivoDaForm(ESEMPIO_208));
    if (!esito.ok) throw new Error(JSON.stringify(esito.errori));
    const a = esito.analisi;
    expect(a.preventivo).toMatchObject({ prezzoPromo: 14950, anticipo: 4326, nRate: 35, rata: 99, maxiRata: 10434, tan: 7.49, taegDichiarato: 11.03, importoTotaleDovutoDichiarato: 13927.25 });
    expect(euro(a.totali.totalePagatoTenendo)).toBe('18.253,25 €');
    expect(formulaTotale(composizioneTotale(a))).toBe('4.326,00 + 3.465,00 + 10.434,00 + 28,25 = 18.253,25 €');
  });

  it('l’etichetta dice che è un esempio reale e scaduto', () => {
    expect(ETICHETTA_ESEMPIO).toBe('esempio reale, offerta scaduta il 31/10/2026');
  });
});
