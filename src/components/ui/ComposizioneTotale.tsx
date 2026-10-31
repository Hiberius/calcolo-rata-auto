import type { Analisi } from '~/lib/calc';
import { composizioneTotale, formulaTotale } from '~/lib/calc/composizione';
import { euro } from '~/lib/formato';
import NumberRow from './NumberRow';

interface Props {
  analisi: Analisi;
  /** Versione stretta per i riquadri delle promo e i calcoli delle guide. */
  compatta?: boolean;
  /** Con un ambito, «Maxi rata finale» si spiega al tocco (glossario). */
  ambito?: string | undefined;
  /** Indice della prima riga nello scontrino che si stampa (F1); senza, le righe non si animano. */
  primaRiga?: number | undefined;
}

/** Le voci del totale una sotto l'altra, il totale, la somma scritta per esteso e le spese già nel credito. */
export default function ComposizioneTotale({ analisi, compatta = false, ambito, primaRiga }: Props) {
  const c = composizioneTotale(analisi);
  return (
    <div class={`grid ${compatta ? 'text-sm' : ''}`} data-composizione>
      {c.voci.map((v, k) => (
        <NumberRow key={v.chiave} etichetta={v.etichetta} valore={euro(v.importo)} nota={v.dettaglio ?? undefined} tono={v.chiave === 'maxiRata' ? 'forte' : 'normale'}
          termine={v.chiave === 'maxiRata' ? 'maxi' : undefined} ambito={ambito} indice={primaRiga != null ? primaRiga + k : undefined} />
      ))}
      <NumberRow etichetta="Totale" valore={euro(c.totale)} tono="forte" indice={primaRiga != null ? primaRiga + c.voci.length : undefined} />
      <p class="numeri text-[0.8125rem] text-tenue pt-2 break-words" data-formula>{formulaTotale(c)}</p>
      {c.note.map((n) => <p key={n} class="nota text-tenue pt-1">{n}</p>)}
    </div>
  );
}
