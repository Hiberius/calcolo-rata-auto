import { arrotonda, euro, numero, punti } from './format';
import { rataCostante, tanNominaleDaTaeg } from './rata';
import type { Ipotesi, Preventivo, Strada, Totali } from './tipi';
import { durataMesi } from './totale';

function stradaContanti(p: Preventivo, t: Totali, ipotesi: Ipotesi): Strada {
  const titolo = 'Contanti o prestito personale';
  const possiedi = "L'auto è tua dal primo giorno.";
  const prezzo = t.prezzoRiferimento;
  if (prezzo == null) {
    return { id: 'A', titolo, totaleUscito: null, possiediAllaFine: possiedi, ipotesi: [], dettaglio: 'Serve il prezzo in contanti per calcolare questa strada.' };
  }
  const mesi = ipotesi.mesiPrestito ?? Math.max(12, durataMesi(p));
  const capitale = Math.max(0, prezzo - p.anticipo);
  const rata = rataCostante(capitale, tanNominaleDaTaeg(ipotesi.taegPrestito), mesi);
  const totale = arrotonda(p.anticipo + rata * mesi);
  return {
    id: 'A',
    titolo,
    totaleUscito: totale,
    possiediAllaFine: possiedi,
    ipotesi: [
      `TAN prestito ${punti(ipotesi.tanPrestito)}, TAEG ${punti(ipotesi.taegPrestito)} (il totale usa il TAEG, che comprende le spese)`,
      `${mesi} mesi`,
      `Stesso anticipo del preventivo: ${euro(p.anticipo)}`,
    ],
    dettaglio: `In contanti paghi ${euro(prezzo)}. Con un prestito di ${euro(capitale)} in ${mesi} mesi la rata è circa ${euro(rata)}.`,
  };
}

function stradaPreventivo(p: Preventivo, t: Totali): Strada {
  const maxi = p.maxiRata ?? 0;
  const possiedi = maxi > 0
    ? `L'auto è tua solo se paghi la maxi rata di ${euro(maxi)}. Se la restituisci hai pagato ${euro(t.totalePagatoRestituendo)} senza tenerla.`
    : p.tipo === 'noleggio'
      ? "Nulla: a fine contratto riconsegni l'auto."
      : "L'auto è tua con l'ultima rata.";
  return {
    id: 'B',
    titolo: 'Il tuo preventivo',
    totaleUscito: t.totalePagatoTenendo,
    possiediAllaFine: possiedi,
    ipotesi: ['Numeri del preventivo, nessuna ipotesi aggiunta'],
    dettaglio: `Anticipo ${euro(p.anticipo)}, ${p.nRate} rate da ${euro(p.rata)}${maxi > 0 ? `, maxi rata ${euro(maxi)}` : ''}.`,
  };
}

function stradaNoleggio(p: Preventivo, ipotesi: Ipotesi): Strada {
  const titolo = 'Noleggio a lungo termine';
  const possiedi = "Nulla: a fine contratto riconsegni l'auto.";
  const mesi = ipotesi.mesiNoleggio ?? Math.max(12, durataMesi(p));
  if (ipotesi.canoneNoleggio == null) {
    return { id: 'C', titolo, totaleUscito: null, possiediAllaFine: possiedi, ipotesi: [`${mesi} mesi`], dettaglio: 'Inserisci un canone mensile di noleggio per confrontare questa strada.' };
  }
  const totale = arrotonda(ipotesi.canoneNoleggio * mesi + ipotesi.anticipoNoleggio);
  return {
    id: 'C',
    titolo,
    totaleUscito: totale,
    possiediAllaFine: possiedi,
    ipotesi: [
      `Canone ${euro(ipotesi.canoneNoleggio)} al mese per ${mesi} mesi`,
      `Anticipo noleggio ${euro(ipotesi.anticipoNoleggio)}`,
      `${numero(ipotesi.kmAnnui, 0)} km all'anno`,
      'Di solito il canone comprende bollo, assicurazione e manutenzione: verificalo nell’offerta',
    ],
    dettaglio: `${mesi} canoni da ${euro(ipotesi.canoneNoleggio)} più ${euro(ipotesi.anticipoNoleggio)} di anticipo.`,
  };
}

/** Tre colonne affiancate, nessuna classifica. */
export function treStrade(p: Preventivo, t: Totali, ipotesi: Ipotesi): readonly Strada[] {
  return [stradaContanti(p, t, ipotesi), stradaPreventivo(p, t), stradaNoleggio(p, ipotesi)];
}
