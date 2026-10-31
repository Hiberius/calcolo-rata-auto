import { t } from '../../markets';
import { MERCATO_IT } from '../../markets/it';
import type { Mercato } from '../../markets/tipi';
import { arrotonda, euro, numero, punti } from './format';
import { rataCostante, tanNominaleDaTaeg } from './rata';
import type { Ipotesi, Preventivo, Strada, Totali } from './tipi';
import { durataMesi, speseAccessorie } from './totale';

function stradaContanti(p: Preventivo, tot: Totali, ipotesi: Ipotesi, m: Mercato): Strada {
  const titolo = t(m, 'strade.contanti');
  const possiedi = t(m, 'strade.dalPrimoGiorno');
  const prezzo = tot.prezzoRiferimento;
  if (prezzo == null) {
    return { id: 'A', titolo, totaleUscito: null, possiediAllaFine: possiedi, ipotesi: [], dettaglio: 'Serve il prezzo in contanti per calcolare questa strada.' };
  }
  const mesi = ipotesi.mesiPrestito ?? Math.max(12, durataMesi(p));
  const capitale = Math.max(0, prezzo - p.anticipo);
  const rata = rataCostante(capitale, tanNominaleDaTaeg(ipotesi.taegPrestito), mesi);
  const accessori = speseAccessorie(p);
  const totale = arrotonda(p.anticipo + rata * mesi + accessori);
  return {
    id: 'A',
    titolo,
    totaleUscito: totale,
    possiediAllaFine: possiedi,
    ipotesi: [
      `TAEG del prestito ${punti(ipotesi.taegPrestito)} (comprende le spese)`,
      `${mesi} mesi`,
      `Stesso anticipo del preventivo: ${euro(p.anticipo)}`,
      ...(accessori > 0 ? [`Stesse spese fuori prezzo del preventivo: ${euro(accessori)}`] : []),
    ],
    dettaglio: `In contanti paghi ${euro(prezzo)}. Con un prestito di ${euro(capitale)} in ${mesi} mesi la rata è circa ${euro(rata)}.`,
  };
}

function stradaPreventivo(p: Preventivo, tot: Totali, m: Mercato): Strada {
  const maxi = p.maxiRata ?? 0;
  const possiedi = maxi > 0
    ? t(m, 'strade.conMaxi', { importo: euro(maxi), restituendo: euro(tot.totalePagatoRestituendo) })
    : p.tipo === 'noleggio'
      ? t(m, 'strade.nulla')
      : t(m, 'strade.ultimaRata');
  return {
    id: 'B',
    titolo: t(m, 'strade.preventivo'),
    totaleUscito: tot.totalePagatoTenendo,
    possiediAllaFine: possiedi,
    ipotesi: ['Numeri del preventivo, nessuna ipotesi aggiunta'],
    dettaglio: `Anticipo ${euro(p.anticipo)}, ${p.nRate} rate da ${euro(p.rata)}${maxi > 0 ? `, maxi rata ${euro(maxi)}` : ''}.`,
  };
}

function stradaNoleggio(p: Preventivo, ipotesi: Ipotesi, m: Mercato): Strada {
  const titolo = t(m, 'strade.noleggio');
  const possiedi = t(m, 'strade.nulla');
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

/** Tre colonne affiancate, nessuna classifica. Titoli e possesso nella lingua del mercato. */
export function treStrade(p: Preventivo, tot: Totali, ipotesi: Ipotesi, m: Mercato = MERCATO_IT): readonly Strada[] {
  return [stradaContanti(p, tot, ipotesi, m), stradaPreventivo(p, tot, m), stradaNoleggio(p, ipotesi, m)];
}
