import { euro } from '~/lib/calc/format';
import type { Strada } from '~/lib/calc/tipi';
import { useAvanzamento } from './useAvanzamento';

interface Props {
  strade: readonly Strada[];
  possesso: Readonly<Record<Strada['id'], string>>;
  scala: number;
  statico: boolean;
  /** Link per cambiare le ipotesi (pagina del confronto). */
  onConfronta?: (() => void) | undefined;
}

function riepilogo(strade: readonly Strada[], possesso: Props['possesso']): string {
  return strade.map((s) => `${s.titolo}: ${s.totaleUscito != null ? `escono ${euro(s.totaleUscito)}` : 'manca un numero per calcolarla'}. ${possesso[s.id]}`).join(' ');
}

/** Atto 3: le tre strade sulla stessa scala della scena, stesso peso, nessuna classifica. */
export default function Atto3Strade({ strade, possesso, scala, statico, onConfronta }: Props) {
  const { ref, avanzamento } = useAvanzamento(statico, 1200);
  return (
    <section ref={ref} class="atto grid gap-8" aria-labelledby="atto3-titolo" data-atto="3" data-avanzamento={avanzamento >= 1 ? '1' : '0'}>
      <div class="grid content-start gap-5">
        <p class="atto-numero">03</p>
        <h3 id="atto3-titolo" class="atto-titolo">Le tre strade</h3>
        <p class="max-w-[52ch] text-[var(--scena-tenue)]">Stessa auto, stessa scala. Non è una classifica: ogni strada ha le sue ipotesi, scritte sotto il numero.</p>
      </div>
      <ol class="grid gap-8 md:grid-cols-3 md:gap-6" aria-hidden="true">
        {strade.map((s) => {
          const quota = s.totaleUscito != null ? Math.min(1, s.totaleUscito / scala) : 0;
          return (
            <li key={s.id} class="grid content-start gap-3 border-t border-[var(--scena-riga)] pt-4" data-strada-scena={s.id}>
              <p class="numeri text-xs text-[var(--scena-tenue)]">Strada {s.id}</p>
              <p class="text-lg font-semibold leading-tight">{s.titolo}</p>
              <div class="h-2 w-full overflow-hidden bg-[var(--scena-riga)]">
                <div class="barra-strada h-full w-full bg-[var(--scena-carta)]" style={{ transform: `scaleX(${quota * avanzamento})` }} />
              </div>
              <p class="numeri text-2xl font-semibold" data-totale-strada>{euro(s.totaleUscito)}</p>
              <p class="text-sm"><span class="text-[var(--scena-tenue)]">Alla fine: </span>{possesso[s.id]}</p>
              {s.totaleUscito == null && <p class="text-sm text-[var(--scena-tenue)]">{s.dettaglio}</p>}
              {s.ipotesi.length > 0 && (
                <ul class="grid gap-1 text-xs text-[var(--scena-tenue)]">
                  {s.ipotesi.map((i) => <li key={i}>{i}</li>)}
                </ul>
              )}
            </li>
          );
        })}
      </ol>
      {onConfronta && (
        <p><a class="btn btn-scena" href="/noleggio" onClick={onConfronta}>Cambia le ipotesi delle tre strade</a></p>
      )}
      <p class="sr-only" data-riepilogo="3">{riepilogo(strade, possesso)}</p>
    </section>
  );
}
