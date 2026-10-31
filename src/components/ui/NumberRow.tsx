interface Props {
  etichetta: string;
  valore: string;
  tono?: 'normale' | 'segnale' | 'tenue' | 'forte';
  nota?: string | undefined;
}

const COLORE: Record<NonNullable<Props['tono']>, string> = {
  normale: '',
  segnale: 'text-segnale-scuro font-semibold',
  tenue: 'text-tenue',
  forte: 'font-semibold',
};

/** Riga di scontrino: etichetta a sinistra, numero tabulare a destra. */
export default function NumberRow({ etichetta, valore, tono = 'normale', nota }: Props) {
  return (
    <div class={`riga-tratteggiata flex items-baseline justify-between gap-4 py-2 ${COLORE[tono]}`}>
      <span>
        {etichetta}
        {nota && <span class="block text-xs text-tenue font-normal">{nota}</span>}
      </span>
      <span class="numeri whitespace-nowrap">{valore}</span>
    </div>
  );
}
