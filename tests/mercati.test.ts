import { describe, expect, it } from 'vitest';
import { renderToString } from 'preact-render-to-string';
import { h } from 'preact';
import { analizza } from '~/lib/calc';
import { analizzaLeggero } from '~/lib/calc/leggero';
import { ripartizioneTotale, sommaContenitori } from '~/lib/calc/ripartizione';
import { baseScena, cursoriIniziali, fraseIncrocio, possessoFinale, serieScena } from '~/lib/calc/scena';
import { attorno, mercatoAttivo, t, type Mercato } from '~/markets';
import { MERCATO_IT, TESTI_IT } from '~/markets/it';
import { CODICI_MERCATO } from '~/markets/tipi';
import { MERCATI, mercatiAttivi } from '~/markets/tutti';
import Scena from '~/components/scene/Scena';
import { domandeAlVenditore } from '~/components/scene/MostraVenditore';
import { titoloDurata } from '~/components/scene/Atto2Curve';

const ARONA = {
  marca: 'SEAT', modello: 'Arona', prezzoPromo: 22183.6, anticipo: 3400, importoCreditoDichiarato: 19163.6, nRate: 35, rata: 169, maxiRata: 14750.6,
  tan: 2.95, taegDichiarato: 4.17, importoTotaleDovutoDichiarato: 20838.9, speseIstruttoria: 380, speseIncassoRata: 3.4, impostaBollo: 47.9,
};
const P208 = { prezzoPromo: 14950, anticipo: 4326, nRate: 35, rata: 99, maxiRata: 10434, tan: 7.49, taegDichiarato: 11.03, importoTotaleDovutoDichiarato: 13927.25 };

/** Termini che ogni mercato deve usare al posto di quelli italiani. */
const ATTESI: Readonly<Record<'es' | 'fr' | 'de', { tasso: RegExp; maxi: RegExp; documento: RegExp; italiano: RegExp }>> = {
  es: { tasso: /\bTAE\b/, maxi: /cuota final/, documento: /\bINE\b/, italiano: /\bTAEG\b|maxi rata|SECCI|Paghi/ },
  fr: { tasso: /\bTAEG\b/, maxi: /valeur résiduelle/, documento: /FIPEN/, italiano: /maxi rata|SECCI|Paghi davvero/ },
  de: { tasso: /effektive Jahreszins/, maxi: /Schlussrate/, documento: /Standardinformationen/, italiano: /\bTAEG\b|maxi rata|SECCI|Paghi/ },
};

describe('mercati (specifica v2, §5)', () => {
  it('quattro mercati, tutti con le stesse chiavi di testo e i campi richiesti', () => {
    expect(Object.keys(MERCATI).sort()).toEqual([...CODICI_MERCATO].sort());
    for (const m of Object.values(MERCATI)) {
      expect(Object.keys(m.testi).sort()).toEqual(Object.keys(TESTI_IT).sort());
      expect(Object.values(m.testi).every((v) => v.trim().length > 0)).toBe(true);
      expect(m.valuta).toBe('EUR');
      expect(m.documento.sigla.length).toBeGreaterThan(0);
      expect(m.tasso.formula).toContain('(1 + i)^12');
      expect(m.fonti.length).toBeGreaterThan(0);
      for (const f of m.fonti) expect(f.url.startsWith('https://')).toBe(true);
      expect(m.soglie.basso).toBeLessThan(m.soglie.alto);
      expect(m.avvertenza.length).toBeGreaterThan(40);
    }
  });

  it('solo l’Italia è attiva e indicizzata', () => {
    expect(mercatiAttivi().map((m) => m.codice)).toEqual(['it']);
    expect(Object.values(MERCATI).filter((m) => m.indicizzato).map((m) => m.codice)).toEqual(['it']);
    expect(mercatoAttivo()).toBe(MERCATO_IT);
  });

  it('t() sostituisce i segnaposto, mette i termini del mercato e lascia visibili quelli mancanti', () => {
    expect(t(MERCATO_IT, 'taeg.inLinea', { dichiarato: '4,17%' })).toBe('Il TAEG dichiarato (4,17%) torna con i numeri del preventivo.');
    expect(t(MERCATI.es, 'domanda.incasso')).toBe('¿La TAE incluye los gastos de cobro de las cuotas?');
    expect(t(MERCATO_IT, 'atto2.incrocioMese')).toContain('{mese}');
    expect(attorno(MERCATO_IT, 'atto1.quota', 'quota')).toEqual(['La rata pubblicizzata copre il ', ' di quello che paghi.']);
  });

  it('nessuna parola vietata in nessuna lingua', () => {
    for (const m of Object.values(MERCATI)) {
      expect(JSON.stringify(m).toLowerCase()).not.toMatch(/truff|fregatur|trappol|estafa|arnaque|betrug|abzocke/);
    }
  });
});

describe('il calcolo riceve il mercato come parametro', () => {
  it('in Italia i testi restano quelli della v1', () => {
    const a = analizza(ARONA);
    if (!a.ok) throw new Error('analisi');
    expect(a.analisi.mercato.codice).toBe('it');
    expect(a.analisi.taeg.nota).toContain('Il TAEG dichiarato (4,17%)');
    expect(a.analisi.verdetto.fraseQuotaRata).toMatch(/^Le rate pubblicizzate coprono il \d+%/);
  });

  for (const codice of ['es', 'fr', 'de'] as const) {
    it(`${codice}: stessi numeri, termini del mercato`, () => {
      const m: Mercato = MERCATI[codice];
      const it_ = analizza(P208);
      const loro = analizza(P208, {}, m);
      if (!it_.ok || !loro.ok) throw new Error('analisi');
      const a = loro.analisi;
      expect(a.totali).toEqual(it_.analisi.totali);
      expect(a.taeg.taegRicostruito).toBe(it_.analisi.taeg.taegRicostruito);
      const attesi = ATTESI[codice];
      expect(a.taeg.nota).toMatch(attesi.tasso);
      expect(a.treStrade[1]?.possiediAllaFine).toMatch(attesi.maxi);
      const testi = JSON.stringify([a.taeg.nota, a.verdetto, a.treStrade.map((s) => [s.titolo, s.possiediAllaFine]), ripartizioneTotale(a).contenitori]);
      expect(testi).not.toMatch(attesi.italiano);
      expect(sommaContenitori(ripartizioneTotale(a))).toBe(a.totali.totalePagatoTenendo);
    });
  }
});

describe('la scena gira con es, fr, de', () => {
  for (const codice of ['es', 'fr', 'de'] as const) {
    it(`${codice}: dati della scena, domande al venditore e isola resa con i termini del mercato`, () => {
      const m = MERCATI[codice];
      const a = analizzaLeggero(ARONA, {}, m);
      if (!a) throw new Error('analisi');
      const base = baseScena(a, 14750.6);
      const serie = serieScena(base, cursoriIniziali(base));
      expect(serie?.meseIncrocio).toBe(14);
      expect(fraseIncrocio(serie!, m)).toContain('14');
      expect(fraseIncrocio(serie!, m)).toContain(m.testi['scena.stima']);
      expect(possessoFinale(a, base).B).toMatch(ATTESI[codice].maxi);
      expect(titoloDurata(36, m)).toBe(t(m, 'atto2.anni', { parola: t(m, 'anni.3') }));
      expect(domandeAlVenditore(a).join(' ')).toMatch(ATTESI[codice].documento);
      const html = renderToString(h(Scena, { preventivo: ARONA, vfg: 14750.6, mercato: m }));
      expect(html).toContain(m.testi['scena.titolo']);
      expect(html).toContain(m.testi['atto1.titolo']);
      expect(html).toContain(m.testi['atto3.titolo']);
      expect(html).toContain(m.testi['scena.stima']);
      expect(html).not.toMatch(/La scena del tuo preventivo|Dove vanno i tuoi euro|Le tre strade/);
    });
  }

  it('in Italia l’isola resa ha i titoli di sempre', () => {
    const html = renderToString(h(Scena, { preventivo: P208 }));
    expect(html).toContain('Dove vanno i tuoi euro');
    expect(html).toContain('I tre anni');
    expect(html).toContain('stima, non quotazione');
  });
});
