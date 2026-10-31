import { arrotonda, euro } from './format';
import { rataCostante } from './rata';
import type { Ipotesi, Preventivo, Scenari, Totali } from './tipi';
import { costoKmEccedenti } from './totale';

const NOTA_STATO_AUTO = "Alla riconsegna contano anche le condizioni dell'auto (danni, usura): chiedi il documento con i criteri di valutazione.";

export function scenariFineContratto(p: Preventivo, t: Totali, ipotesi: Ipotesi): Scenari {
  const maxi = p.maxiRata ?? 0;
  if (p.tipo === 'noleggio') {
    return { conMaxiRata: false, tieni: null, restituisci: null, cambi: null, nota: "A fine noleggio riconsegni l'auto: non c'è maxi rata da pagare." };
  }
  if (maxi <= 0) {
    return { conMaxiRata: false, tieni: null, restituisci: null, cambi: null, nota: "Senza maxi rata: con l'ultima rata l'auto è tua." };
  }
  const rataRif = rataCostante(maxi, ipotesi.tanRifinanziamento, ipotesi.mesiRifinanziamento);
  const costoAggiuntivo = arrotonda(rataRif * ipotesi.mesiRifinanziamento - maxi);
  const km = costoKmEccedenti(p, ipotesi);
  return {
    conMaxiRata: true,
    tieni: {
      maxiRata: maxi,
      totale: t.totalePagatoTenendo,
      rifinanziamento: {
        tan: ipotesi.tanRifinanziamento,
        mesi: ipotesi.mesiRifinanziamento,
        rata: arrotonda(rataRif),
        costoAggiuntivo,
        totale: arrotonda(t.totalePagatoTenendo + costoAggiuntivo),
      },
    },
    restituisci: {
      kmInclusi: p.kmInclusi ?? null,
      kmStimati: km.kmStimati,
      kmEccedenti: km.kmEccedenti,
      costoKmEccedenti: km.costo,
      totale: t.totalePagatoRestituendo,
      nota: NOTA_STATO_AUTO,
    },
    cambi: {
      nuovoAnticipo: p.anticipo,
      totale: arrotonda(t.totalePagatoRestituendo + p.anticipo),
      nota: `Restituisci e firmi un nuovo contratto: di solito serve un altro anticipo. Ipotesi: lo stesso di oggi, ${euro(p.anticipo)}.`,
    },
    nota: `Alla fine hai tre possibilità: pagare la maxi rata di ${euro(maxi)}, restituire l'auto o cambiarla.`,
  };
}
