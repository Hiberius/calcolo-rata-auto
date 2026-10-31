import { arrotonda } from './format';
import type { Ipotesi, Preventivo, PrezzoRiferimentoTipo, Ricostruzione, Totali } from './tipi';

export interface PrezzoRiferimento {
  readonly valore: number | null;
  readonly tipo: PrezzoRiferimentoTipo;
}

/** prezzoContanti ?? prezzoPromo ?? prezzoListino, con il tipo usato. */
export function prezzoDiRiferimento(p: Preventivo): PrezzoRiferimento {
  if (p.prezzoContanti != null) return { valore: p.prezzoContanti, tipo: 'contanti' };
  if (p.prezzoPromo != null) return { valore: p.prezzoPromo, tipo: 'promo' };
  if (p.prezzoListino != null) return { valore: p.prezzoListino, tipo: 'listino' };
  return { valore: null, tipo: 'assente' };
}

export function sommaRate(p: Preventivo): number {
  const base = p.nRate * p.rata;
  const correzione = p.primaRataDiversa != null && p.nRate > 0 ? p.primaRataDiversa - p.rata : 0;
  return arrotonda(base + correzione);
}

export function speseRicorrenti(p: Preventivo): number {
  return arrotonda(p.nRate * (p.speseIncassoRata ?? 0));
}

/** Mesi di contratto: le rate più il mese della maxi rata, se c'è. */
export function durataMesi(p: Preventivo): number {
  return p.nRate + (p.maxiRata ? 1 : 0);
}

function speseAccessorie(p: Preventivo): number {
  if (p.accessoriInclusiNelPrezzo) return 0;
  return (p.ipt ?? 0) + (p.messaSuStrada ?? 0) + (p.polizzeAbbinate ?? 0) + (p.serviziAbbinati ?? 0);
}

/** Spese pagate una volta. L'istruttoria e il bollo già dentro il credito sono pagati con le rate: non si contano due volte. */
export function speseUnaTantum(p: Preventivo, r: Ricostruzione): number {
  const istruttoria = r.istruttoriaFinanziata ? 0 : (p.speseIstruttoria ?? 0);
  const bollo = r.bolloNelCredito ? 0 : (p.impostaBollo ?? 0);
  return arrotonda(istruttoria + bollo + speseAccessorie(p));
}

export function costoKmEccedenti(p: Preventivo, ipotesi: Ipotesi): { kmStimati: number; kmEccedenti: number; costo: number } {
  const kmStimati = Math.round((ipotesi.kmAnnui * durataMesi(p)) / 12);
  if (p.kmInclusi == null || p.costoKmEccedente == null) return { kmStimati, kmEccedenti: 0, costo: 0 };
  const kmEccedenti = Math.max(0, kmStimati - p.kmInclusi);
  return { kmStimati, kmEccedenti, costo: arrotonda(kmEccedenti * p.costoKmEccedente) };
}

function messaggi(p: Preventivo, prezzo: PrezzoRiferimento, r: Ricostruzione): string[] {
  const lista: string[] = [];
  if (p.tipo === 'noleggio') {
    lista.push("Nel noleggio non c'è un costo del credito: conta il totale, e a fine contratto l'auto non è tua.");
  } else if (prezzo.valore == null) {
    lista.push('Chiedi il prezzo in contanti: senza un prezzo il costo del credito non si può calcolare.');
  } else if (prezzo.tipo !== 'contanti') {
    lista.push(`Il costo del credito è calcolato sul prezzo ${prezzo.tipo === 'promo' ? 'promozionale' : 'di listino'}: chiedi anche il prezzo in contanti, spesso è diverso.`);
  }
  if (r.speseImplicite > 0) {
    lista.push('Nel totale dovuto ci sono spese non dettagliate nel preventivo: sono incluse nel totale.');
  }
  return lista;
}

export function calcolaTotali(p: Preventivo, r: Ricostruzione, ipotesi: Ipotesi): Totali {
  const prezzo = prezzoDiRiferimento(p);
  const rate = sommaRate(p);
  const ricorrenti = speseRicorrenti(p);
  const unaTantum = speseUnaTantum(p, r);
  const km = costoKmEccedenti(p, ipotesi);
  const base = p.anticipo + rate + unaTantum + ricorrenti + r.speseImplicite;
  const totaleTenendo = arrotonda(base + (p.maxiRata ?? 0));
  const totaleRestituendo = arrotonda(base + km.costo);
  const conCredito = p.tipo !== 'noleggio' && prezzo.valore != null && prezzo.valore > 0;
  const costo = conCredito ? arrotonda(totaleTenendo - (prezzo.valore as number)) : null;
  return {
    prezzoRiferimento: prezzo.valore,
    prezzoRiferimentoTipo: prezzo.tipo,
    sommaRate: rate,
    speseRicorrenti: ricorrenti,
    speseUnaTantum: unaTantum,
    speseImplicite: r.speseImplicite,
    costoKmEccedenti: km.costo,
    totalePagatoTenendo: totaleTenendo,
    totalePagatoRestituendo: totaleRestituendo,
    costoCredito: costo,
    costoCreditoPct: costo != null ? costo / (prezzo.valore as number) : null,
    messaggi: messaggi(p, prezzo, r),
  };
}
