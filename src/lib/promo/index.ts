import { analizza, type Analisi, type PreventivoInput } from '../calc';
import { PromoSchema, type Promo } from './schema';

export type { Promo } from './schema';

export interface PromoDecodificata {
  readonly promo: Promo;
  readonly analisi: Analisi;
  readonly slugMarca: string;
  readonly slug: string;
  readonly scaduta: boolean;
}

export function slugDi(testo: string): string {
  return testo.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

/** Dalla promo all'input del modulo calcolo: stessi nomi tranne TAEG, credito e totale dovuto (dichiarati). */
export function preventivoDaPromo(p: Promo): PreventivoInput {
  const { id: _id, taeg, importoCredito, importoTotaleDovuto, requisiti: _r, validoDal: _d, validoAl: _a, urlFonte, dataVerifica: _v, note: _n, discrepanze: _x, ...numeri } = p;
  return {
    ...numeri,
    ...(taeg !== undefined ? { taegDichiarato: taeg } : {}),
    ...(importoCredito !== undefined ? { importoCreditoDichiarato: importoCredito } : {}),
    ...(importoTotaleDovuto !== undefined ? { importoTotaleDovutoDichiarato: importoTotaleDovuto } : {}),
    fonte: urlFonte,
  };
}

/** Scaduta se validoAl è prima di oggi (date ISO confrontabili come stringhe). */
export function eScaduta(p: Pick<Promo, 'validoAl'>, oggi: Date = new Date()): boolean {
  return p.validoAl < oggi.toISOString().slice(0, 10);
}

export function decodificaPromo(p: Promo, oggi: Date = new Date()): PromoDecodificata {
  const esito = analizza(preventivoDaPromo(p));
  if (!esito.ok) throw new Error(`Promo ${p.id}: numeri non validi (${esito.errori.map((e) => e.campo).join(', ')})`);
  const slugMarca = slugDi(p.marca);
  const slug = slugDi(p.id).replace(new RegExp(`^${slugMarca}-`), '');
  return { promo: p, analisi: esito.analisi, slugMarca, slug, scaduta: eScaduta(p, oggi) };
}

/** Ordinamento unico dichiarato in /criteri: costo del credito in % crescente; senza costo calcolabile in fondo. */
export function ordinaPerCostoCredito(promo: readonly PromoDecodificata[]): readonly PromoDecodificata[] {
  const chiave = (d: PromoDecodificata) => d.analisi.totali.costoCreditoPct ?? Number.POSITIVE_INFINITY;
  return [...promo].sort((a, b) => chiave(a) - chiave(b) || a.promo.id.localeCompare(b.promo.id));
}

/** Valida i JSON (un file per promo): un file non valido ferma la build con il nome del file. */
export function validaPromo(file: Readonly<Record<string, unknown>>): readonly Promo[] {
  return Object.entries(file).map(([percorso, contenuto]) => {
    const esito = PromoSchema.safeParse(contenuto);
    if (!esito.success) throw new Error(`${percorso}: ${esito.error.issues.map((i) => `${i.path.join('.')} ${i.message}`).join('; ')}`);
    return esito.data;
  });
}

const FILE = import.meta.glob<unknown>('../../data/promos/*.json', { eager: true, import: 'default' });

/** Tutte le promo del dataset, decodificate e ordinate. Le scadute restano (pagina con avviso), l'elenco le nasconde. */
export function tutteLePromo(oggi: Date = new Date()): readonly PromoDecodificata[] {
  return ordinaPerCostoCredito(validaPromo(FILE).map((p) => decodificaPromo(p, oggi)));
}

/** §6: la promo in vigore dello stesso modello, se c'è nel dataset (confronto per marca e modello, senza maiuscole). */
export function promoDelloStessoModello(marca: string | undefined, modello: string | undefined, oggi: Date = new Date()): PromoDecodificata | null {
  if (!marca || !modello) return null;
  const chiave = (m: string, n: string) => `${slugDi(m)}|${slugDi(n)}`;
  return tutteLePromo(oggi).find((d) => !d.scaduta && chiave(d.promo.marca, d.promo.modello) === chiave(marca, modello)) ?? null;
}
