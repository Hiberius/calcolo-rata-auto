import { describe, expect, it } from 'vitest';
import { analizza, type Analisi } from '~/lib/calc';
import { ripartizioneTotale, sommaContenitori } from '~/lib/calc/ripartizione';

function ok(input: unknown): Analisi {
  const esito = analizza(input);
  if (!esito.ok) throw new Error(JSON.stringify(esito.errori));
  return esito.analisi;
}

const ARONA = {
  prezzoPromo: 22183.6, anticipo: 3400, importoCreditoDichiarato: 19163.6, nRate: 35, rata: 169, maxiRata: 14750.6,
  tan: 2.95, taegDichiarato: 4.17, importoTotaleDovutoDichiarato: 20838.9, speseIstruttoria: 380, speseIncassoRata: 3.4, impostaBollo: 47.9,
};
const P208 = { prezzoPromo: 14950, anticipo: 4326, nRate: 35, rata: 99, maxiRata: 10434, tan: 7.49, taegDichiarato: 11.03, importoTotaleDovutoDichiarato: 13927.25 };

const chiavi = (a: Analisi) => ripartizioneTotale(a).contenitori.map((c) => c.chiave);
const importo = (a: Analisi, k: string) => ripartizioneTotale(a).contenitori.find((c) => c.chiave === k)?.importo;

describe('ripartizione del totale in quattro contenitori', () => {
  it('Arona: prezzo, interessi, spese (istruttoria, incasso, bollo) e polizze sommano al totale al centesimo', () => {
    const a = ok(ARONA);
    const r = ripartizioneTotale(a);
    expect(r.conPrezzo).toBe(true);
    expect(chiavi(a)).toEqual(['capitale', 'interessi', 'spese', 'polizze']);
    expect(r.totale).toBe(24_232.5);
    expect(sommaContenitori(r)).toBe(r.totale);
    expect(r.spese).toEqual({ istruttoria: 380, incasso: 119, bollo: 47.9, altre: 0 });
    expect(importo(a, 'capitale')).toBe(22_183.6);
    expect(importo(a, 'spese')).toBe(546.9);
    expect(importo(a, 'interessi')).toBe(1_502);
    expect(importo(a, 'polizze')).toBe(0);
  });

  it('208: le spese non dettagliate del totale dovuto finiscono tra le spese', () => {
    const r = ripartizioneTotale(ok(P208));
    expect(r.spese.altre).toBe(28.25);
    expect(sommaContenitori(r)).toBe(18_253.25);
    expect(r.contenitori.find((c) => c.chiave === 'interessi')?.importo).toBe(3_275);
  });

  it('polizze, servizi, IPT e messa su strada: ognuno nel suo contenitore, somma esatta con i decimali', () => {
    const a = ok({ prezzoContanti: 15_999.99, anticipo: 1_000.01, nRate: 47, rata: 333.33, maxiRata: 3_333.33, tan: 6.99,
      speseIstruttoria: 350.1, speseIncassoRata: 3.3, impostaBollo: 16, polizzeAbbinate: 480.7, serviziAbbinati: 199.9, ipt: 450.45, messaSuStrada: 300.3 });
    const r = ripartizioneTotale(a);
    expect(sommaContenitori(r)).toBe(r.totale);
    expect(r.totale).toBe(a.totali.totalePagatoTenendo);
    expect(r.contenitori.find((c) => c.chiave === 'polizze')?.importo).toBe(680.6);
    expect(r.spese.altre).toBe(750.75);
    expect(r.spese.incasso).toBe(155.1);
  });

  it('senza prezzo di riferimento: solo totale e spese, niente interessi', () => {
    const a = ok({ anticipo: 4326, nRate: 35, rata: 99, maxiRata: 10434, speseIncassoRata: 2.5, impostaBollo: 16 });
    const r = ripartizioneTotale(a);
    expect(r.conPrezzo).toBe(false);
    expect(chiavi(a)).toEqual(['resto', 'spese']);
    expect(chiavi(a)).not.toContain('interessi');
    expect(sommaContenitori(r)).toBe(r.totale);
    expect(r.nota).toContain('prezzo in contanti');
  });

  it('noleggio: canoni e spese, nessun interesse', () => {
    const r = ripartizioneTotale(ok({ tipo: 'noleggio', anticipo: 2_000, nRate: 36, rata: 299, speseIncassoRata: 2 }));
    expect(r.conPrezzo).toBe(false);
    expect(r.contenitori.map((c) => c.etichetta)).toEqual(['Canoni e anticipo', 'Spese']);
    expect(sommaContenitori(r)).toBe(r.totale);
  });

  it('interessi negativi (manca un numero): niente interessi inventati', () => {
    const r = ripartizioneTotale(ok({ prezzoContanti: 20_000, anticipo: 5_000, nRate: 36, rata: 300, maxiRata: 4_000 }));
    expect(r.contenitori.some((c) => c.chiave === 'interessi')).toBe(false);
    expect(sommaContenitori(r)).toBe(r.totale);
  });
});
