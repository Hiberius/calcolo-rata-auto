import { describe, expect, it } from 'vitest';
import { csvEdizione, campoCsv } from '~/lib/indice/csv';
import { edizioneIndice, ordinaIndice, PRIMA_EDIZIONE, promoValida, SOGLIA_PUBBLICAZIONE } from '~/lib/indice';
import { decodificaPromo, type PromoDecodificata } from '~/lib/promo';
import { PromoSchema } from '~/lib/promo/schema';
import { rataDelPiano } from '~/lib/calc/valore';

const OGGI = new Date('2026-11-12T10:00:00Z');
const MARCHE = ['Alfa', 'Beta', 'Gamma', 'Delta', 'Epsilon'] as const;

/** 25 promozioni finte e diverse: prezzo, anticipo, rata e maxi rata cambiano con l'indice. */
function promoFinta(k: number, extra: Record<string, unknown> = {}): PromoDecodificata {
  const prezzo = 15_000 + k * 1_000;
  const anticipo = 2_000 + (k % 5) * 500;
  const tan = 2 + (k % 9) * 0.75;
  const maxi = k % 4 === 0 ? 0 : Math.round(prezzo * 0.45);
  const rata = Math.round(rataDelPiano(prezzo - anticipo, tan, 35, maxi) * 100) / 100;
  const p = PromoSchema.parse({
    id: `finta-${String(k).padStart(2, '0')}`,
    marca: MARCHE[k % MARCHE.length],
    modello: `Modello ${k}`,
    tipo: 'finanziamento',
    prezzoContanti: prezzo,
    anticipo,
    nRate: 35,
    rata,
    maxiRata: maxi > 0 ? maxi : undefined,
    tan,
    taeg: Math.round((tan + 0.6) * 100) / 100,
    ...(k === 3 ? { polizzeAbbinate: 300 } : {}),
    validoAl: '2026-11-30',
    urlFonte: `https://esempio.it/offerte/finta-${k}`,
    dataVerifica: '2026-11-03',
    ...extra,
  });
  return decodificaPromo(p, OGGI);
}

const VENTICINQUE = Array.from({ length: 25 }, (_, k) => promoFinta(k + 1));

describe('Indice Rata Vera con 25 promo (specifica v2, §3)', () => {
  const e = edizioneIndice(VENTICINQUE, OGGI);

  it('l’edizione è di novembre 2026, pubblicabile, con la frase di citazione', () => {
    expect(e.titolo).toBe('Novembre 2026');
    expect(e.chiave).toBe('2026-11');
    expect(e.pubblicabile).toBe(true);
    expect(e.nValide).toBe(25);
    expect(e.righe).toHaveLength(25);
    expect(e.citazione).toBe('Fonte: Indice Rata Vera, novembre 2026');
    expect(e.attesa).toBeNull();
  });

  it('una sola classifica: costo del credito in % crescente, posizioni da 1 a 25', () => {
    const pct = e.righe.map((r) => r.costoCreditoPct);
    expect(pct).toEqual([...pct].sort((a, b) => a - b));
    expect(e.righe.map((r) => r.posizione)).toEqual(Array.from({ length: 25 }, (_, k) => k + 1));
  });

  it('metriche per marca e modello calcolate sul prezzo', () => {
    for (const r of e.righe) {
      const d = VENTICINQUE.find((x) => x.promo.id === r.id)!;
      const prezzo = d.promo.prezzoContanti!;
      expect(r.anticipoPct).toBeCloseTo(d.promo.anticipo / prezzo, 10);
      expect(r.maxiRataPct).toBeCloseTo((d.promo.maxiRata ?? 0) / prezzo, 10);
      // Le polizze abbinate sono costi dell'auto, non del credito: restano fuori dal costo del credito (metodologia).
      expect(r.costoCreditoPct).toBeCloseTo((d.analisi.totali.totalePagatoTenendo - prezzo - (d.promo.polizzeAbbinate ?? 0)) / prezzo, 10);
      expect(r.taegDichiarato).toBe(d.promo.taeg);
      expect(r.taegRicostruito).not.toBeNull();
      expect(r.abbinati).toBe(d.promo.id === 'finta-03');
      expect(r.scadenza).toBe('2026-11-30');
      expect(r.percorso).toMatch(/^\/promozioni\/[a-z]+\/finta-\d{2}$/);
    }
  });

  it('a parità di costo decide l’ordine alfabetico di marca e modello', () => {
    const a = promoFinta(1, { id: 'zeta-1', marca: 'Zeta', modello: 'Uno' });
    const b = promoFinta(1, { id: 'acca-1', marca: 'Acca', modello: 'Uno' });
    expect(ordinaIndice([a, b]).map((d) => d.promo.id)).toEqual(['acca-1', 'zeta-1']);
  });

  it('scadute, noleggio e promo senza prezzo non sono valide', () => {
    expect(promoValida(promoFinta(30, { validoAl: '2026-11-01' }))).toBe(false);
    expect(promoValida(promoFinta(31, { tipo: 'noleggio', maxiRata: undefined }))).toBe(false);
    expect(promoValida(promoFinta(32, { prezzoContanti: undefined }))).toBe(false);
  });

  it('una promo che parte dopo oggi non è valida e non conta per la soglia (revisione del 31/10)', () => {
    const futura = promoFinta(33, { validoDal: '2026-12-01', validoAl: '2026-12-31' });
    expect(promoValida(futura, '2026-11-12')).toBe(false);
    expect(promoValida(futura, '2026-12-01')).toBe(true);
    const diciannove = [...VENTICINQUE.slice(0, SOGLIA_PUBBLICAZIONE - 1), futura];
    const e = edizioneIndice(diciannove, OGGI);
    expect(e.nValide).toBe(SOGLIA_PUBBLICAZIONE - 1);
    expect(e.pubblicabile).toBe(false);
  });

  it('mai pubblicata prima della data annunciata, anche con 25 promo valide', () => {
    const e = edizioneIndice(VENTICINQUE, new Date('2026-11-05T10:00:00Z'));
    expect(e.nValide).toBe(25);
    expect(e.pubblicabile).toBe(false);
    expect(e.righe).toEqual([]);
    expect(e.attesa).toContain('Prima edizione il');
    expect(edizioneIndice(VENTICINQUE, new Date(`${PRIMA_EDIZIONE}T08:00:00Z`)).pubblicabile).toBe(true);
  });

  it('CSV: licenza CC BY 4.0, citazione, intestazione e una riga per promo, decimali con la virgola', () => {
    const csv = csvEdizione(e)!;
    const righe = csv.replace(/^﻿/, '').trim().split('\r\n');
    expect(righe[0]).toContain('Indice Rata Vera, novembre 2026');
    expect(righe[1]).toContain('CC BY 4.0');
    expect(righe[1]).toContain('Fonte: Indice Rata Vera, novembre 2026');
    expect(righe[2]?.split(';')[0]).toBe('posizione');
    expect(righe).toHaveLength(3 + 25);
    const prima = righe[3]!.split(';');
    expect(prima[0]).toBe('1');
    expect(prima[4]).toMatch(/^\d+,\d{2}$/);
  });

  it('il CSV non lascia passare formule né separatori nei testi', () => {
    expect(campoCsv('=SOMMA(A1)')).toBe("'=SOMMA(A1)");
    expect(campoCsv('a;b')).toBe('"a;b"');
    expect(campoCsv('dice "ciao"')).toBe('"dice ""ciao"""');
  });
});

describe('Indice in attesa', () => {
  it('con una sola promo: nessuna classifica, nessun CSV, prima edizione il 10 novembre 2026', () => {
    const e = edizioneIndice([promoFinta(1)], new Date('2026-10-31T10:00:00Z'));
    expect(e.pubblicabile).toBe(false);
    expect(e.nValide).toBe(1);
    expect(e.righe).toEqual([]);
    expect(csvEdizione(e)).toBeNull();
    expect(e.attesa).toBe('Prima edizione il 10 novembre 2026.');
    expect(PRIMA_EDIZIONE).toBe('2026-11-10');
  });

  it('dopo il 10 novembre, se mancano promo, lo dice con il numero vero', () => {
    const e = edizioneIndice(VENTICINQUE.slice(0, 7), OGGI);
    expect(e.pubblicabile).toBe(false);
    expect(e.attesa).toBe(`Prima edizione appena le promozioni valide sono ${SOGLIA_PUBBLICAZIONE}: ne mancano 13.`);
  });

  it('il dataset vero di oggi (1 promo) tiene l’Indice in attesa', async () => {
    const { tutteLePromo } = await import('~/lib/promo');
    const e = edizioneIndice(tutteLePromo(new Date('2026-10-31T10:00:00Z')), new Date('2026-10-31T10:00:00Z'));
    expect(e.pubblicabile).toBe(false);
    expect(e.righe).toEqual([]);
  });
});
