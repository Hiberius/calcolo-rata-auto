import { useCallback } from 'preact/hooks';
import { euro, euroIntero, percentuale } from '~/lib/calc/format';
import type { Ripartizione } from '~/lib/calc/ripartizione';
import { contatore } from '~/lib/motion';
import { COLORE_CONTENITORE } from './disegno/colori';
import { disegnaFlusso } from './disegno/flusso';
import { useAvanzamento } from './useAvanzamento';
import { useTela, type Area } from './useTela';

interface Props {
  ripartizione: Ripartizione;
  scala: number;
  statico: boolean;
  /** Quota del totale coperta dalle rate pubblicizzate (0..1), se calcolabile. */
  quotaRata: number | null;
  nRate: number;
  rata: number;
  sommaRate: number;
}

function riepilogo(r: Ripartizione, quota: string | null): string {
  const parti = r.contenitori.map((c) => `${c.etichetta} ${euro(c.importo)}`).join(', ');
  return `Paghi in tutto ${euro(r.totale)}: ${parti}.${quota ? ` La rata pubblicizzata copre il ${quota} di quello che paghi.` : ''}`;
}

export default function Atto1Flusso({ ripartizione: r, scala, statico, quotaRata, nRate, rata, sommaRate }: Props) {
  const { ref, avanzamento } = useAvanzamento(statico, 1800);
  const disegno = useCallback(
    (ctx: CanvasRenderingContext2D, area: Area) => disegnaFlusso(ctx, area, { voci: r.contenitori, totale: r.totale, scala, avanzamento }),
    [r, scala, avanzamento],
  );
  const tela = useTela(disegno);
  const quota = quotaRata != null ? percentuale(quotaRata, 0) : null;
  const colonne = r.contenitori.length;

  return (
    <section ref={ref} class="atto grid gap-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-14" aria-labelledby="atto1-titolo" data-atto="1" data-avanzamento={avanzamento >= 1 ? '1' : '0'}>
      <div class="grid content-start gap-5">
        <p class="atto-numero">01</p>
        <h3 id="atto1-titolo" class="atto-titolo">Dove vanno i tuoi euro</h3>
        {quota && (
          <p class="atto-frase" data-frase-quota>
            La rata pubblicizzata copre il <span class="numeri text-[var(--scena-segnale)]">{quota}</span> di quello che paghi.
          </p>
        )}
        {quota && <p class="numeri text-sm text-[var(--scena-tenue)]">{nRate} × {euro(rata)} = {euro(sommaRate)} su {euro(r.totale)}</p>}
        {r.nota && <p class="text-sm text-[var(--scena-tenue)] max-w-[44ch]">{r.nota}</p>}
      </div>
      <div class="grid gap-4" aria-hidden="true">
        <p class="numeri flex items-baseline justify-between gap-3 text-sm text-[var(--scena-tenue)]">
          <span>Dalla tua tasca</span>
          <span class="text-[var(--scena-carta)] text-base" data-totale-scena>{euro(contatore(0, r.totale, avanzamento))}</span>
        </p>
        <canvas ref={tela} class="block h-[220px] w-full sm:h-[300px]" aria-hidden="true" data-tela="flusso" />
        <ul class="grid gap-2" style={{ gridTemplateColumns: `repeat(${colonne}, minmax(0, 1fr))` }}>
          {r.contenitori.map((c) => (
            <li key={c.chiave} class="grid content-start gap-1" data-contenitore={c.chiave} data-importo={c.importo}>
              <span class="h-1 w-6" style={{ background: COLORE_CONTENITORE[c.chiave] }} aria-hidden="true" />
              <span class="text-xs leading-tight text-[var(--scena-tenue)]">{c.etichetta}</span>
              <span class="numeri whitespace-nowrap text-[13px] font-semibold sm:text-lg" data-importo-vivo>
                <span class="sm:hidden">{euroIntero(contatore(0, c.importo, avanzamento))}</span>
                <span class="hidden sm:inline">{euro(contatore(0, c.importo, avanzamento))}</span>
              </span>
              <span class="numeri text-xs text-[var(--scena-tenue)]">{percentuale(r.totale > 0 ? c.importo / r.totale : 0, 0)}</span>
            </li>
          ))}
        </ul>
      </div>
      <p class="sr-only" data-riepilogo="1">{riepilogo(r, quota)}</p>
    </section>
  );
}
