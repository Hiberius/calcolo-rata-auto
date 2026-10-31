import type { Analisi } from '~/lib/calc';
import { composizioneTotale, formulaTotale } from '~/lib/calc/composizione';
import { euro } from '~/lib/calc/format';
import NumberRow from './NumberRow';

interface Props {
  analisi: Analisi;
  /** Versione stretta per i riquadri delle promo e i calcoli delle guide. */
  compatta?: boolean;
}

/** Le voci del totale una sotto l'altra, il totale, la somma scritta per esteso e le spese già nel credito. */
export default function ComposizioneTotale({ analisi, compatta = false }: Props) {
  const c = composizioneTotale(analisi);
  return (
    <div class={`grid ${compatta ? 'text-sm' : ''}`} data-composizione>
      {c.voci.map((v) => (
        <NumberRow key={v.chiave} etichetta={v.etichetta} valore={euro(v.importo)} nota={v.dettaglio ?? undefined} tono={v.chiave === 'maxiRata' ? 'forte' : 'normale'} />
      ))}
      <NumberRow etichetta="Totale" valore={euro(c.totale)} tono="forte" />
      <p class="numeri text-xs text-tenue pt-2 break-words" data-formula>{formulaTotale(c)}</p>
      {c.note.map((n) => <p key={n} class="text-xs text-tenue pt-1">{n}</p>)}
    </div>
  );
}
