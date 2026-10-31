import { describe, expect, it } from 'vitest';
import { FonteSchema, cifraConfermata, dominioUfficiale, percorsoDentro } from '../scripts/promo/fonti';

const base = { id: 'peugeot-208-style', marca: 'Peugeot', modello: '208 Style' };

describe('fonti delle promozioni', () => {
  it('accetta solo https su una pagina di un dominio ufficiale', () => {
    expect(FonteSchema.safeParse({ ...base, url: 'https://www.peugeot.it/acquista/offerte-privati.html' }).success).toBe(true);
    expect(FonteSchema.safeParse({ ...base, url: 'https://www.peugeot.it/' }).success).toBe(false);
    expect(FonteSchema.safeParse({ ...base, url: 'http://www.peugeot.it/offerte' }).success).toBe(false);
    expect(FonteSchema.safeParse({ ...base, url: 'https://www.autoscout24.it/offerte' }).success).toBe(false);
    expect(FonteSchema.safeParse({ ...base, id: '../../etc/passwd', url: 'https://www.peugeot.it/offerte' }).success).toBe(false);
  });

  it('riconosce i sottodomini e rifiuta i domini somiglianti', () => {
    expect(dominioUfficiale('www.fiat.it')).toBe(true);
    expect(dominioUfficiale('fiat.it.esempio.com')).toBe(false);
  });

  it('tiene i percorsi dentro la cartella', () => {
    expect(() => percorsoDentro('/tmp/promo', '../fuori.json')).toThrow();
    expect(percorsoDentro('/tmp/promo', 'dentro.json').endsWith('/tmp/promo/dentro.json')).toBe(true);
  });

  it('conferma una cifra presente nel testo grezzo', () => {
    expect(cifraConfermata('35 rate da 99 € al mese, TAEG 11,03%', [99, 11.03])).toBe(true);
    expect(cifraConfermata('anticipo 4.326 €', [4326])).toBe(true);
    expect(cifraConfermata('rata 129 €', [4326, 10.5])).toBe(false);
  });
});
