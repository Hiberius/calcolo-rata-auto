import type { Analisi } from '../calc';
import { euroIntero } from '../calc/format';
import { baseScena, cursoriIniziali, fraseIncrocio, serieScena } from '../calc/scena';
import { ETICHETTA_STIMA, type SerieValoreDebito } from '../calc/valore';
import { AVVERTENZA_BREVE } from './card';

/** Immagine statica dell'atto 2 per la scheda condivisa: curve in SVG, testi con Satori. Nessun dato personale. */
export const DIMENSIONI_SCENA = { width: 1200, height: 630 } as const;
const GRAFICO = { larghezza: 1104, altezza: 260 } as const;
const C = { fondo: '#15171A', carta: '#F6F3EE', tenue: '#A6A29A', riga: '#34373C', segnale: '#F2825F', attenzione: '#E2B93B' } as const;
const SANS = 'Instrument Sans';
const MONO = 'JetBrains Mono';

export interface DatiScena {
  readonly titolo: string;
  readonly frase: string;
  readonly debitoFinale: string;
  readonly valoreFinale: string;
  readonly urlBreve: string;
  readonly svg: string;
}

const fmt = (n: number): string => n.toFixed(1);

function polilinea(s: SerieValoreDebito, campo: 'valore' | 'debito', x: (m: number) => number, y: (e: number) => number): string {
  return s.punti.map((p) => `${fmt(x(p.mese))},${fmt(y(p[campo]))}`).join(' ');
}

function zone(s: SerieValoreDebito, x: (m: number) => number, y: (e: number) => number): string {
  const poligoni: string[] = [];
  for (let k = 1; k < s.punti.length; k += 1) {
    const a = s.punti[k - 1];
    const b = s.punti[k];
    if (!a || !b || (a.debito <= a.valore && b.debito <= b.valore)) continue;
    const pts = [[a.mese, Math.max(a.debito, a.valore)], [b.mese, Math.max(b.debito, b.valore)], [b.mese, Math.min(b.debito, b.valore)], [a.mese, Math.min(a.debito, a.valore)]];
    poligoni.push(`<polygon points="${pts.map(([m, e]) => `${fmt(x(m ?? 0))},${fmt(y(e ?? 0))}`).join(' ')}" fill="${C.segnale}" fill-opacity="0.25"/>`);
  }
  return poligoni.join('');
}

/** Il grafico dell'atto 2 come SVG puro (solo forme, nessun testo): valore stimato, debito, zona sopra, punti finali. */
export function svgScena(s: SerieValoreDebito, prezzo: number): string {
  const { larghezza: w, altezza: h } = GRAFICO;
  const massimo = Math.max(prezzo, s.vfg?.importo ?? 0, ...s.punti.map((p) => p.debito)) * 1.06;
  const x = (m: number) => 6 + (m / Math.max(1, s.durata)) * (w - 22);
  const y = (e: number) => 8 + (h - 16) * (1 - e / massimo);
  const righe = [0.25, 0.5, 0.75, 1].map((q) => `<line x1="0" x2="${w}" y1="${fmt(y(massimo * q))}" y2="${fmt(y(massimo * q))}" stroke="${C.riga}" stroke-width="1"/>`).join('');
  const fine = x(s.durata);
  const vfg = s.vfg ? `<circle cx="${fmt(fine)}" cy="${fmt(y(s.vfg.importo))}" r="9" fill="none" stroke="${C.attenzione}" stroke-width="3"/>` : '';
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">`,
    righe,
    `<line x1="0" x2="${w}" y1="${fmt(y(0))}" y2="${fmt(y(0))}" stroke="${C.tenue}" stroke-width="1"/>`,
    zone(s, x, y),
    `<polyline points="${polilinea(s, 'valore', x, y)}" fill="none" stroke="${C.carta}" stroke-width="3" stroke-linejoin="round"/>`,
    `<polyline points="${polilinea(s, 'debito', x, y)}" fill="none" stroke="${C.segnale}" stroke-width="4" stroke-linejoin="round"/>`,
    `<circle cx="${fmt(fine)}" cy="${fmt(y(s.debitoFinale))}" r="6" fill="${C.segnale}"/>`,
    `<circle cx="${fmt(fine)}" cy="${fmt(y(s.valoreFinale))}" r="6" fill="${C.carta}"/>`,
    vfg,
    '</svg>',
  ].join('');
}

/** null se la scena non ha la curva (noleggio, prezzo mancante): allora la scheda mostra solo lo scontrino. */
export function datiScena(a: Analisi, urlBreve: string): DatiScena | null {
  const base = baseScena(a);
  const serie = serieScena(base, cursoriIniziali(base));
  if (!serie || base.prezzo == null) return null;
  const p = a.preventivo;
  return {
    titolo: [p.marca, p.modello, p.versione].filter(Boolean).join(' ') || 'Il preventivo',
    frase: fraseIncrocio(serie),
    debitoFinale: euroIntero(serie.debitoFinale),
    valoreFinale: euroIntero(serie.valoreFinale),
    urlBreve,
    svg: svgScena(serie, base.prezzo),
  };
}

interface NodoScena {
  readonly type: string;
  readonly props: Readonly<Record<string, unknown>>;
}

function h(type: string, style: Record<string, string | number>, children?: string | readonly NodoScena[]): NodoScena {
  return { type, props: { style: { display: 'flex', ...style }, ...(children !== undefined ? { children } : {}) } };
}

function voce(colore: string, testo: string): NodoScena {
  return h('div', { alignItems: 'center', gap: 10 }, [h('div', { width: 28, height: 4, background: colore }), h('div', { fontFamily: SANS, fontSize: 20, color: C.tenue }, testo)]);
}

export function nodoScena(d: DatiScena): NodoScena {
  const svg = `data:image/svg+xml;base64,${btoa(d.svg)}`;
  return h('div', { width: '100%', height: '100%', background: C.fondo, color: C.carta, padding: 48, flexDirection: 'column', justifyContent: 'space-between' }, [
    h('div', { justifyContent: 'space-between', alignItems: 'center' }, [
      h('div', { fontFamily: SANS, fontSize: 22, color: C.tenue }, `RATA VERA · ${d.titolo}`),
      h('div', { fontFamily: MONO, fontSize: 16, color: C.attenzione, border: `1.5px solid ${C.attenzione}`, padding: '4px 10px' }, ETICHETTA_STIMA.toUpperCase()),
    ]),
    h('div', { fontFamily: SANS, fontSize: 40, lineHeight: 1.1, maxWidth: 1000 }, d.frase),
    { type: 'img', props: { src: svg, width: GRAFICO.larghezza, height: GRAFICO.altezza, style: { width: GRAFICO.larghezza, height: GRAFICO.altezza } } },
    h('div', { gap: 36 }, [voce(C.carta, `Valore stimato: ${d.valoreFinale} a fine piano`), voce(C.segnale, `Debito: ${d.debitoFinale} a fine piano`)]),
    // URL e avvertenza su una riga loro: accanto alla legenda uscivano dall'immagine.
    h('div', { justifyContent: 'space-between', fontFamily: SANS, fontSize: 17, color: C.tenue, borderTop: `1px solid ${C.riga}`, paddingTop: 12 }, [
      h('div', { fontFamily: MONO }, d.urlBreve),
      h('div', {}, AVVERTENZA_BREVE),
    ]),
  ]);
}

/** Testo dell'immagine: serve a scaricare solo i glifi necessari dei font. */
export function testoScena(d: DatiScena): string {
  return ['RATA VERA · ', d.titolo, d.frase, ETICHETTA_STIMA.toUpperCase(), 'Valore stimato: ', 'Debito: ', ' a fine piano', d.valoreFinale, d.debitoFinale, d.urlBreve, AVVERTENZA_BREVE].join(' ');
}
