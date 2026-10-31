import { numero } from '../calc/format';
import type { RigaIndice } from '.';

/** Le metriche del grafico ordinabile. La classifica resta una sola (costo del credito); il grafico si può riordinare. */
export const METRICHE = ['costo', 'taeg', 'anticipo', 'maxi'] as const;
export type Metrica = (typeof METRICHE)[number];

export const ETICHETTE_METRICA: Readonly<Record<Metrica, string>> = {
  costo: 'Costo del credito',
  taeg: 'TAEG ricostruito',
  anticipo: 'Anticipo',
  maxi: 'Maxi rata',
};

/** Definizioni pubblicate in /indice e /indice/metodologia: le stesse parole nelle due pagine. */
export const DEFINIZIONI: readonly { readonly nome: string; readonly testo: string }[] = [
  { nome: 'Costo del credito', testo: 'Quello che paghi in tutto tenendo l’auto (anticipo, rate, maxi rata, spese) meno il prezzo, in percentuale del prezzo. È il criterio della classifica.' },
  { nome: 'TAEG dichiarato e ricostruito', testo: 'Il TAEG scritto dalla casa e quello che ricaviamo dai numeri visibili della promozione, con lo stesso metodo dei preventivi.' },
  { nome: 'Anticipo', testo: 'L’anticipo in percentuale del prezzo.' },
  { nome: 'Maxi rata', testo: 'La rata finale in percentuale del prezzo; zero se la promozione non la prevede.' },
  { nome: 'Polizze o servizi abbinati', testo: 'Sì se la promozione vale solo con una polizza o un servizio a pagamento; no se non ne richiede.' },
  { nome: 'Scadenza', testo: 'L’ultimo giorno di validità scritto nella fonte.' },
];

/** Il valore della metrica per una riga: frazione del prezzo, o punti percentuali per il TAEG. null se manca. */
export function valoreMetrica(r: RigaIndice, m: Metrica): number | null {
  if (m === 'costo') return r.costoCreditoPct * 100;
  if (m === 'taeg') return r.taegRicostruito;
  if (m === 'anticipo') return r.anticipoPct * 100;
  return r.maxiRataPct * 100;
}

/** 8,42% oppure «non indicato». */
export function testoMetrica(v: number | null): string {
  return v == null ? 'n. d.' : `${numero(v, 2)}%`;
}
