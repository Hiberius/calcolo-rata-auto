import type { DatiScheda } from './template';

/** Albero di elementi per Satori (stessa forma di un elemento React, senza JSX). */
export interface Nodo {
  readonly type: string;
  readonly props: { readonly style?: Readonly<Record<string, string | number>>; readonly children?: string | Nodo | readonly (Nodo | string)[] };
}

export type FormatoOg = 'orizzontale' | 'quadrato';
/** §1.9 in forma breve: l'immagine esce dal sito, l'avvertenza deve uscire con lei. */
export const AVVERTENZA_BREVE = 'Non siamo un mediatore creditizio. Chiedi il SECCI prima di firmare.';

export const DIMENSIONI_OG: Readonly<Record<FormatoOg, { width: number; height: number }>> = {
  orizzontale: { width: 1200, height: 630 },
  quadrato: { width: 1080, height: 1080 },
};

const COLORI = { carta: '#F6F3EE', inchiostro: '#15171A', segnale: '#E4572E', tenue: '#6B6A66', riga: '#D9D3C7' } as const;
const MONO = 'JetBrains Mono';
const SANS = 'Instrument Sans';

function h(type: string, style: Record<string, string | number>, children?: Nodo['props']['children']): Nodo {
  return { type, props: { style: { display: 'flex', ...style }, ...(children !== undefined ? { children } : {}) } };
}

function riga(etichetta: string, valore: string, quadrato: boolean, colore: string = COLORI.inchiostro, grande = false): Nodo {
  const scala = quadrato ? 1 : 0.85;
  return h('div', { justifyContent: 'space-between', alignItems: 'baseline', width: '100%', borderBottom: `2px dashed ${COLORI.riga}`, padding: quadrato ? '14px 0' : '9px 0' }, [
    h('div', { fontFamily: SANS, fontSize: Math.round((grande ? 34 : 28) * scala), color: colore }, etichetta),
    h('div', { fontFamily: MONO, fontSize: Math.round((grande ? 40 : 30) * scala), color: colore }, valore),
  ]);
}

export function nodoScheda(d: DatiScheda, formato: FormatoOg): Nodo {
  const quadrato = formato === 'quadrato';
  const righe = [
    ...(d.prezzo ? [riga('Prezzo', d.prezzo, quadrato)] : []),
    ...(d.costoCredito ? [riga('Costo del credito', `${d.costoCredito} (${d.costoCreditoPct})`, quadrato, COLORI.segnale, true)] : []),
  ];
  const composizione = h('div', { flexDirection: 'column', width: '100%', paddingTop: quadrato ? 16 : 10 }, [
    h('div', { fontFamily: SANS, fontSize: quadrato ? 24 : 19, color: COLORI.tenue }, 'Da dove viene il totale'),
    h('div', { fontFamily: MONO, fontSize: quadrato ? 28 : 22, flexWrap: 'wrap', lineHeight: 1.3 }, d.composizione),
  ]);
  return h('div', { width: '100%', height: '100%', background: COLORI.carta, color: COLORI.inchiostro, padding: quadrato ? 80 : 48, flexDirection: 'column', justifyContent: 'space-between' }, [
    h('div', { flexDirection: 'column' }, [
      h('div', { justifyContent: 'space-between', fontFamily: SANS, fontSize: 26, color: COLORI.tenue }, [h('div', {}, 'RATA VERA'), h('div', {}, d.taeg)]),
      h('div', { fontFamily: SANS, fontSize: quadrato ? 52 : 40, marginTop: quadrato ? 24 : 12 }, d.titolo),
      h('div', { fontFamily: MONO, fontSize: 30, color: COLORI.tenue, textDecoration: 'line-through', marginTop: 8 }, `a ${d.rataPubblicizzata}`),
    ]),
    h('div', { flexDirection: 'column' }, [
      h('div', { fontFamily: SANS, fontSize: quadrato ? 30 : 26 }, 'Paghi davvero'),
      h('div', { fontFamily: MONO, fontSize: quadrato ? 150 : 100, lineHeight: 1, letterSpacing: -4 }, d.totale),
    ]),
    h('div', { flexDirection: 'column', width: '100%' }, [...righe, composizione]),
    // Nel quadrato indirizzo e avvertenza vanno su due righe: affiancati si sovrapponevano.
    h('div', { flexDirection: quadrato ? 'column' : 'row', justifyContent: 'space-between', gap: quadrato ? 6 : 16, fontFamily: SANS, fontSize: quadrato ? 22 : 18, color: COLORI.tenue, marginTop: 8 }, [
      h('div', { fontFamily: MONO }, d.urlBreve),
      h('div', {}, AVVERTENZA_BREVE),
    ]),
  ]);
}

/** Tutto il testo della scheda: serve a scaricare solo i glifi necessari dei font. */
export function testoUsato(d: DatiScheda): string {
  // Anche l'avvertenza: senza le sue lettere nel sottoinsieme del font, N, u, I e f sparivano dall'immagine.
  return ['RATA VERA', 'Paghi davvero', 'Prezzo', 'Costo del credito', 'Da dove viene il totale', AVVERTENZA_BREVE, 'a ', '()+×/%€.,=', ...Object.values(d).filter((v): v is string => typeof v === 'string')].join(' ');
}
