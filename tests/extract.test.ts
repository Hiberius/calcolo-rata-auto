import { describe, expect, it } from 'vitest';
import { DATI_PERSONALI_VIETATI, PROMPT_SISTEMA } from '~/lib/extract/prompt';
import { JSON_SCHEMA_ESTRAZIONE } from '~/lib/extract/schema';
import { contieneDatiPersonali, leggiJson, validaEstrazione } from '~/lib/extract/validate';
import { base64Da } from '~/lib/extract';
import { normalizzaNumero } from '~/lib/numeri';

describe('normalizzaNumero', () => {
  it.each([
    ['4.326,00 €', 4326], ['€ 10.434', 10434], ['7,49 %', 7.49], ['35 mesi', 35], ['13927.25', 13927.25],
    ['1,234.50', 1234.5], ['99', 99], [128.99, 128.99], ['22.183,60', 22183.6],
  ])('%s -> %s', (ingresso, atteso) => {
    expect(normalizzaNumero(ingresso)).toBe(atteso);
  });
  it.each([[''], ['n.d.'], ['-200'], [null], [Number.NaN], [-3], [{}]])('%s -> null', (ingresso) => {
    expect(normalizzaNumero(ingresso)).toBeNull();
  });
});

describe('validaEstrazione', () => {
  const grezzo = {
    marca: 'Peugeot', modello: '208', versione: 'Style', tipo: 'Finanziamento', prezzoPromo: '14.950,00 €', anticipo: 4326,
    nRate: '35', rata: '99,00', maxiRata: '10.434,00', tan: '7,49%', taegDichiarato: 11.03, importoTotaleDovutoDichiarato: '13.927,25',
    valuta: 'EUR', testoRilevante: 'Mario Rossi, targa AB123CD, mario@example.com',
    confidenza: { anticipo: 0.95, nRate: 0.9, rata: 0.92, maxiRata: 0.4, prezzoPromo: 0.9, tan: 0.9, taegDichiarato: 0.9, importoTotaleDovutoDichiarato: 0.85, marca: 0.99, modello: 0.99, versione: 0.5 },
  };

  it('normalizza i numeri e segna da confermare i campi a bassa confidenza', () => {
    const esito = validaEstrazione(grezzo);
    expect(esito.ok).toBe(true);
    if (!esito.ok) return;
    const { campi, daConfermare } = esito.risposta;
    expect(campi).toMatchObject({ prezzoPromo: 14950, anticipo: 4326, nRate: 35, rata: 99, maxiRata: 10434, tan: 7.49, tipo: 'finanziamento' });
    expect(daConfermare).toContain('maxiRata');
    expect(daConfermare).toContain('versione');
    expect(daConfermare).not.toContain('anticipo');
  });

  it('non restituisce mai testoRilevante né dati personali', () => {
    const esito = validaEstrazione({ ...grezzo, modello: 'mario.rossi@example.com', versione: 'AB123CD' });
    expect(esito.ok).toBe(true);
    if (!esito.ok) return;
    const serializzato = JSON.stringify(esito.risposta);
    expect(serializzato).not.toContain('Mario');
    expect(serializzato).not.toContain('AB123CD');
    expect(serializzato).not.toContain('@');
    expect(serializzato).not.toContain('testoRilevante');
  });

  it('scarta valori non plausibili e li chiede a mano', () => {
    const esito = validaEstrazione({ anticipo: 1000, nRate: 400, rata: 199, tan: 95, confidenza: { anticipo: 1, nRate: 1, rata: 1, tan: 1 } });
    expect(esito.ok).toBe(true);
    if (!esito.ok) return;
    expect(esito.risposta.campi.nRate).toBeUndefined();
    expect(esito.risposta.campi.tan).toBeUndefined();
    expect(esito.risposta.daConfermare).toEqual(expect.arrayContaining(['nRate', 'tan']));
  });

  it('segna gli obbligatori mancanti e rifiuta output non oggetto', () => {
    const esito = validaEstrazione({ confidenza: {} });
    expect(esito.ok && esito.risposta.daConfermare).toEqual(expect.arrayContaining(['anticipo', 'nRate', 'rata']));
    expect(validaEstrazione('testo').ok).toBe(false);
    expect(validaEstrazione({ anticipo: { a: 1 } }).ok).toBe(false);
  });

  it('non accetta un prezzo in contanti copiato dal prezzo promozionale', () => {
    const esito = validaEstrazione({ prezzoPromo: 14950, prezzoContanti: '14.950', anticipo: 1, nRate: 2, rata: 3 });
    expect(esito.ok && esito.risposta.campi.prezzoContanti).toBeUndefined();
    expect(esito.ok && esito.risposta.campi.prezzoPromo).toBe(14950);
  });

  it('legge il JSON anche dentro testo libero', () => {
    expect(leggiJson('ecco: {"rata": 99} fine')).toEqual({ rata: 99 });
    expect(leggiJson('niente')).toBeNull();
  });

  it('riconosce i dati personali', () => {
    expect(contieneDatiPersonali('scrivi a a.b@c.it')).toBe(true);
    expect(contieneDatiPersonali('targa AB123CD')).toBe(true);
    expect(contieneDatiPersonali('Grande Panda POP')).toBe(false);
  });
});

describe('prompt di estrazione', () => {
  it('vieta i dati personali e le invenzioni', () => {
    for (const dato of DATI_PERSONALI_VIETATI) expect(PROMPT_SISTEMA).toContain(dato);
    expect(PROMPT_SISTEMA).toMatch(/non inventare/i);
    expect(PROMPT_SISTEMA).toMatch(/null/);
    expect(PROMPT_SISTEMA).toMatch(/banca o della finanziaria/);
  });

  it('lo schema JSON non ha campi per dati personali', () => {
    const chiavi = Object.keys(JSON_SCHEMA_ESTRAZIONE.properties).join(' ').toLowerCase();
    for (const vietata of ['nome', 'cognome', 'targa', 'telaio', 'indirizzo', 'telefono', 'email', 'banca', 'finanziaria']) {
      expect(chiavi).not.toContain(vietata);
    }
  });
});

describe('base64Da', () => {
  it('codifica buffer grandi senza esplodere lo stack', () => {
    const buffer = new Uint8Array(300_000).fill(65).buffer;
    expect(base64Da(buffer).length).toBe(400_000);
  });
});
