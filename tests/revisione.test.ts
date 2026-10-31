import { describe, expect, it } from 'vitest';
import { analizza } from '~/lib/calc';
import { analizzaLeggero } from '~/lib/calc/leggero';
import { MESSAGGIO_TOTALE_INCOERENTE } from '~/lib/calc/totale';
import { normalizzaMarca, normalizzaModello, normalizzaVersione } from '~/lib/calc/veicolo';
import { daValori } from '~/lib/client/campiVivo';
import { rinvio } from '~/lib/rinvio';
import { segretoTurnstile, TURNSTILE_SECRET_KEY_TEST, verificaTurnstile } from '~/lib/turnstile';

function ok(input: Record<string, unknown>, ipotesi?: Record<string, unknown>) {
  const esito = analizza(input, ipotesi);
  if (!esito.ok) throw new Error(JSON.stringify(esito.errori));
  return esito.analisi;
}

describe('TAEG con TAN 0%', () => {
  it('rate decimali che sommano esattamente al credito danno TAEG 0, non «non calcolabile»', () => {
    const a = ok({ prezzoContanti: 1068.22, anticipo: 1000, nRate: 6, rata: 11.37, tan: 0 });
    expect(a.taeg.taegRicostruito).toBe(0);
    expect(a.taeg.stato).not.toBe('non_calcolabile');
  });
});

describe('totale più basso del prezzo', () => {
  it('maxi rata dimenticata: niente costo del credito negativo né «basso»', () => {
    const a = ok({ prezzoPromo: 14950, anticipo: 4326, nRate: 35, rata: 99 });
    expect(a.totali.costoCredito).toBeNull();
    expect(a.verdetto.livello).toBe('non_applicabile');
    expect(a.verdetto.etichetta).toBe(MESSAGGIO_TOTALE_INCOERENTE);
  });

  it('nelle guide un campo obbligatorio vuoto è un errore, non uno zero', () => {
    expect(daValori({ prezzo: '15000', anticipo: '3000', nRate: '', rata: '200', maxiRata: '5000' }, null)).toBeNull();
  });
});

describe('etichette del verdetto', () => {
  it('nessun confronto con una «media delle promozioni» non calcolata', () => {
    const a = ok({ prezzoPromo: 14950, anticipo: 4326, nRate: 35, rata: 99, maxiRata: 10434 });
    expect(a.verdetto.etichetta).not.toMatch(/media/i);
    expect(a.verdetto.etichetta).toContain('del prezzo');
  });
});

describe('noleggio', () => {
  it('il totale principale comprende i km eccedenti stimati', () => {
    const a = ok({ tipo: 'noleggio', anticipo: 3000, nRate: 36, rata: 399, kmInclusi: 30000, costoKmEccedente: 0.2 });
    expect(a.totali.totalePagatoTenendo).toBe(20364);
    expect(a.totali.totalePagatoTenendo).toBe(a.totali.totalePagatoRestituendo);
    expect(a.treStrade[1]?.totaleUscito).toBe(20364);
  });
});

describe('spese fuori prezzo', () => {
  it('entrano nel totale ma non nel costo del credito, e anche nella strada A', () => {
    const a = ok({ prezzoContanti: 15000, anticipo: 2000, nRate: 36, rata: 350, ipt: 500, messaSuStrada: 400, polizzeAbbinate: 900, serviziAbbinati: 300 });
    expect(a.totali.totalePagatoTenendo).toBe(16700);
    expect(a.totali.costoCredito).toBe(-400);
    expect(a.treStrade[0]?.totaleUscito).toBeGreaterThan(17000);
  });
});

describe('limiti dei numeri', () => {
  it('importi oltre 10 milioni e prezzo zero', () => {
    expect(analizza({ prezzoContanti: 1e308, anticipo: 0, nRate: 120, rata: 1e308 }).ok).toBe(false);
    const a = ok({ prezzoContanti: 0, anticipo: 0, nRate: 36, rata: 270 });
    expect(a.totali.prezzoRiferimentoTipo).toBe('assente');
    expect(a.treStrade[0]?.totaleUscito).toBeNull();
  });

  it('il calcolo leggero applica gli stessi limiti di zod', () => {
    const base = { anticipo: 0, nRate: 36, rata: 300 };
    expect(analizzaLeggero(base, { mesiNoleggio: 0 })).toBeNull();
    expect(analizzaLeggero(base, { tanRifinanziamento: 500 })).toBeNull();
    expect(analizzaLeggero(base, { mesiRifinanziamento: 0 })).toBeNull();
    expect(analizzaLeggero(base)).not.toBeNull();
  });
});

describe('marca, modello e versione sulla scheda pubblica', () => {
  it('accetta nomi d’auto e scarta concessionari, telefoni e parole vietate', () => {
    expect(normalizzaMarca('peugeot')).toBe('Peugeot');
    expect(normalizzaMarca('Truffa')).toBeUndefined();
    expect(normalizzaModello('Grande Panda')).toBe('Grande Panda');
    expect(normalizzaModello('Rossi Auto Milano')).toBeUndefined();
    expect(normalizzaModello('500 truffa')).toBeUndefined();
    expect(normalizzaVersione('1.2 PureTech 100 S&S Style')).toBe('1.2 PureTech 100 S&S Style');
    expect(normalizzaVersione('tel 3331234567')).toBeUndefined();
    expect(normalizzaVersione('www.rossiauto.it')).toBeUndefined();
  });

  it('lo schema scarta i testi non ammessi senza bloccare il calcolo', () => {
    const a = ok({ marca: 'Truffa', modello: 'Rossi Auto Milano', versione: 'tel 3331234567', anticipo: 0, nRate: 12, rata: 100 });
    expect([a.preventivo.marca, a.preventivo.modello, a.preventivo.versione]).toEqual([undefined, undefined, undefined]);
  });
});

describe('Turnstile', () => {
  it('fuori da localhost, senza segreto, rifiuta (fail closed)', async () => {
    expect(segretoTurnstile(undefined, 'https://ratavera.hiberius.workers.dev/api/scheda')).toBeNull();
    expect(segretoTurnstile('', 'https://ratavera.it/api/scheda')).toBeNull();
    expect(segretoTurnstile(undefined, 'http://127.0.0.1:8787/api/scheda')).toBe(TURNSTILE_SECRET_KEY_TEST);
    expect(segretoTurnstile('vero', 'https://ratavera.it/api/scheda')).toBe('vero');
    const esito = await verificaTurnstile('token-finto', undefined, '1.2.3.4', 'https://ratavera.it/api/scheda');
    expect(esito).toEqual({ ok: false, codici: ['segreto-mancante'] });
  });
});

describe('un indirizzo per pagina e icone di default (revisione del 31/10)', () => {
  it('il .html va alla versione pulita, le icone chieste dai browser all’icona vera', () => {
    expect(rinvio(new URL('https://x.dev/guide/taeg-finanziamento-auto.html'))).toBe('/guide/taeg-finanziamento-auto');
    expect(rinvio(new URL('https://x.dev/index.html'))).toBe('/');
    expect(rinvio(new URL('https://x.dev/cookie.html?a=1'))).toBe('/cookie?a=1');
    expect(rinvio(new URL('https://x.dev/guide'))).toBeNull();
    expect(rinvio(new URL('https://x.dev/favicon.ico'))).toBe('/icone/favicon-32.png');
  });
});
