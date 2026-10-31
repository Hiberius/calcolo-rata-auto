import { dataLunga, oggiItalia } from '../date';
import type { PromoDecodificata } from '../promo';

/**
 * Indice Rata Vera (specifica v2, §3): edizione mensile costruita dalle promozioni ufficiali in vigore.
 * Una sola classifica, per costo del credito in percentuale del prezzo, dal più basso. Si pubblica solo da 20 promo valide.
 */
export const SOGLIA_PUBBLICAZIONE = 20;
export const PRIMA_EDIZIONE = '2026-11-10';
export const LICENZA = { nome: 'CC BY 4.0', url: 'https://creativecommons.org/licenses/by/4.0/deed.it' } as const;
export const CRITERIO =
  'Ordine unico: costo del credito in percentuale del prezzo, dal più basso al più alto. A parità decide l’ordine alfabetico di marca e modello. Nessuna posizione a pagamento.';

const MESI = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];

export interface RigaIndice {
  readonly posizione: number;
  readonly id: string;
  readonly marca: string;
  readonly modello: string;
  readonly versione: string | null;
  readonly taegDichiarato: number | null;
  readonly taegRicostruito: number | null;
  /** Frazioni del prezzo (0,0842 = 8,42%). */
  readonly costoCreditoPct: number;
  readonly anticipoPct: number;
  readonly maxiRataPct: number;
  readonly abbinati: boolean;
  readonly scadenza: string;
  readonly urlFonte: string;
  readonly percorso: string;
}

export interface EdizioneIndice {
  /** 2026-11 */
  readonly chiave: string;
  /** «Novembre 2026» */
  readonly titolo: string;
  /** «novembre 2026», per la frase di citazione. */
  readonly mese: string;
  readonly pubblicabile: boolean;
  readonly nValide: number;
  /** Vuota finché l'edizione non è pubblicabile: nessuna classifica sotto le 20 promo. */
  readonly righe: readonly RigaIndice[];
  readonly citazione: string;
  /** Riga dell'attesa: la data della prima edizione, o quante promo mancano se la data è passata. */
  readonly attesa: string | null;
}

/** Valida per l'Indice: in vigore, non noleggio, con un prezzo e un costo del credito calcolabile. */
export function promoValida(d: PromoDecodificata): boolean {
  const t = d.analisi.totali;
  return !d.scaduta && d.promo.tipo !== 'noleggio' && t.prezzoRiferimento != null && t.prezzoRiferimento > 0 && t.costoCreditoPct != null;
}

function riga(d: PromoDecodificata, posizione: number): RigaIndice {
  const p = d.promo;
  const prezzo = d.analisi.totali.prezzoRiferimento ?? 1;
  return {
    posizione,
    id: p.id,
    marca: p.marca,
    modello: p.modello,
    versione: p.versione ?? null,
    taegDichiarato: p.taeg ?? null,
    taegRicostruito: d.analisi.taeg.taegRicostruito,
    costoCreditoPct: d.analisi.totali.costoCreditoPct ?? 0,
    anticipoPct: p.anticipo / prezzo,
    maxiRataPct: (p.maxiRata ?? 0) / prezzo,
    abbinati: (p.polizzeAbbinate ?? 0) + (p.serviziAbbinati ?? 0) > 0,
    scadenza: p.validoAl,
    urlFonte: p.urlFonte,
    percorso: `/promozioni/${d.slugMarca}/${d.slug}`,
  };
}

const nome = (d: PromoDecodificata) => `${d.promo.marca} ${d.promo.modello} ${d.promo.versione ?? ''}`.toLowerCase();

/** La classifica dichiarata: costo del credito in % crescente, poi marca e modello in ordine alfabetico, poi id. */
export function ordinaIndice(promo: readonly PromoDecodificata[]): readonly PromoDecodificata[] {
  const pct = (d: PromoDecodificata) => d.analisi.totali.costoCreditoPct ?? Number.POSITIVE_INFINITY;
  return [...promo].sort((a, b) => pct(a) - pct(b) || nome(a).localeCompare(nome(b), 'it') || a.promo.id.localeCompare(b.promo.id));
}

function rigaAttesa(nValide: number, oggi: string): string {
  if (oggi < PRIMA_EDIZIONE) return `Prima edizione il ${dataLunga(PRIMA_EDIZIONE)}.`;
  const mancano = SOGLIA_PUBBLICAZIONE - nValide;
  return `Prima edizione appena le promozioni valide sono ${SOGLIA_PUBBLICAZIONE}: ne mancano ${mancano}.`;
}

/** L'edizione del mese di `adesso` (ora di Roma), dalle promo del dataset. */
export function edizioneIndice(promo: readonly PromoDecodificata[], adesso: Date = new Date()): EdizioneIndice {
  const oggi = oggiItalia(adesso);
  const [anno = '', meseNumero = ''] = oggi.split('-');
  const mese = `${MESI[Number(meseNumero) - 1] ?? ''} ${anno}`;
  const valide = ordinaIndice(promo.filter(promoValida));
  const pubblicabile = valide.length >= SOGLIA_PUBBLICAZIONE;
  return {
    chiave: `${anno}-${meseNumero}`,
    titolo: mese.charAt(0).toUpperCase() + mese.slice(1),
    mese,
    pubblicabile,
    nValide: valide.length,
    righe: pubblicabile ? valide.map((d, k) => riga(d, k + 1)) : [],
    citazione: `Fonte: Indice Rata Vera, ${mese}`,
    attesa: pubblicabile ? null : rigaAttesa(valide.length, oggi),
  };
}
