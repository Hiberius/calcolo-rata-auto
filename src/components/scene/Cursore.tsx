import type { Limite } from '~/lib/calc/scena';

interface Props {
  id: string;
  etichetta: string;
  valore: number;
  limite: Limite;
  /** Testo del valore, visibile e letto dagli screen reader (es. «4.326 €»). */
  testo: string;
  onCambia: (valore: number) => void;
}

/** Input range nativo, stilizzato (.cursore): tastiera, tocco e screen reader funzionano come il browser li conosce. */
export default function Cursore({ id, etichetta, valore, limite, testo, onCambia }: Props) {
  const pieno = limite.max > limite.min ? ((valore - limite.min) / (limite.max - limite.min)) * 100 : 0;
  return (
    <div class="grid gap-2">
      <div class="flex items-baseline justify-between gap-3">
        <label for={id} class="text-sm text-[var(--scena-tenue)]">{etichetta}</label>
        <output for={id} class="numeri text-base font-semibold" data-lettura={id}>{testo}</output>
      </div>
      <input
        id={id}
        name={id}
        type="range"
        class="cursore"
        min={limite.min}
        max={limite.max}
        step={limite.passo}
        value={valore}
        aria-valuetext={testo}
        style={{ '--pieno': `${pieno}%` }}
        onInput={(e) => {
          const n = Number((e.currentTarget as HTMLInputElement).value);
          if (Number.isFinite(n)) onCambia(n);
        }}
        data-cursore={id}
      />
    </div>
  );
}
