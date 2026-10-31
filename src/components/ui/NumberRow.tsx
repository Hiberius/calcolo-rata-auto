import type { VoceGlossario } from '~/lib/glossario';
import Termine from './Termine';

interface Props {
  etichetta: string;
  valore: string;
  tono?: 'normale' | 'segnale' | 'tenue' | 'forte';
  nota?: string | undefined;
  /** Se c'è, l'etichetta diventa una parola del glossario (serve anche ambito, per l'id). */
  termine?: VoceGlossario | undefined;
  ambito?: string | undefined;
  /** Posizione nello scontrino: con un indice la riga si stampa dopo le precedenti (F1). */
  indice?: number | undefined;
}

const COLORE: Record<NonNullable<Props['tono']>, string> = {
  normale: '',
  segnale: 'text-segnale-scuro font-semibold',
  tenue: 'text-tenue',
  forte: 'font-semibold',
};

/** Riga di scontrino: etichetta a sinistra, numero tabulare a destra. */
export default function NumberRow({ etichetta, valore, tono = 'normale', nota, termine, ambito, indice }: Props) {
  return (
    <div class={`riga-tratteggiata flex items-baseline justify-between gap-4 py-2 ${COLORE[tono]} ${indice != null ? 'riga-scontrino' : ''}`}
      style={indice != null ? { '--i': indice } : undefined}>
      <span>
        {termine && ambito ? <Termine voce={termine} ambito={ambito}>{etichetta}</Termine> : etichetta}
        {nota && <span class="numeri block text-[0.8125rem] text-tenue font-normal">{nota}</span>}
      </span>
      <span class="numeri whitespace-nowrap">{valore}</span>
    </div>
  );
}
