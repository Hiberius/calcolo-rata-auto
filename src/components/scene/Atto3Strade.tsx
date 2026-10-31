import type { Strada } from '~/lib/calc/tipi';
import { importo } from '~/lib/formato';
import { t } from '~/markets';
import type { Mercato } from '~/markets/tipi';
import TestoConGlossario from '../ui/TestoConGlossario';
import { useAvanzamento } from './useAvanzamento';

interface Props {
  strade: readonly Strada[];
  possesso: Readonly<Record<Strada['id'], string>>;
  scala: number;
  statico: boolean;
  /** Link per cambiare le ipotesi (pagina del confronto). */
  onConfronta?: (() => void) | undefined;
  m: Mercato;
}

const euro = (v: number | null): string => importo(v, 'scena');
/** La strada del preventivo letto: è il soggetto della scena, le altre due sono il confronto. */
const DEL_PREVENTIVO: Strada['id'] = 'B';

function StradaScena({ s, possesso, quota, principale, m }: { s: Strada; possesso: string; quota: number; principale: boolean; m: Mercato }) {
  return (
    <li class={`grid content-start border-t pt-4 ${principale ? 'strada-principale gap-4 border-[var(--scena-carta)]' : 'gap-2.5 border-[var(--scena-riga)]'}`} data-strada-scena={s.id}>
      <p class="atto-numero text-[var(--scena-tenue)]">{t(m, 'atto3.strada', { id: s.id })}{principale ? ' · quella del preventivo' : ''}</p>
      <p class={principale ? 'frase-grande' : 'titolo-scheda'}>{s.titolo}</p>
      {/* Stessa scala per le tre barre: la lunghezza si confronta, lo spessore dice solo quale è la tua. */}
      <div class={`w-full overflow-hidden bg-[var(--scena-riga)] ${principale ? 'h-3' : 'h-1.5'}`}>
        <div class={`barra-strada h-full w-full ${principale ? 'bg-[var(--scena-carta)]' : 'bg-[var(--scena-tenue)]'}`} style={{ transform: `scaleX(${quota})` }} />
      </div>
      <p class={principale ? 'numero-scena text-[clamp(2rem,1.2rem+3vw,3.5rem)] tracking-[-0.04em]' : 'numero-scena'} data-totale-strada>{euro(s.totaleUscito)}</p>
      <p class={principale ? 'max-w-[48ch]' : 'nota'}>
        <span class="text-[var(--scena-tenue)]">{t(m, 'atto3.allaFine')}</span><TestoConGlossario testo={possesso} ambito={`scena-possesso-${s.id}`} />
      </p>
      {s.totaleUscito == null && <p class="nota text-[var(--scena-tenue)]">{s.dettaglio}</p>}
      {s.ipotesi.length > 0 && (
        <ul class="grid gap-1 text-xs text-[var(--scena-tenue)]">
          {s.ipotesi.map((i, k) => <li key={i}><TestoConGlossario testo={i} ambito={`scena-ipotesi-${s.id}-${k}`} /></li>)}
        </ul>
      )}
    </li>
  );
}

/** Atto 3: le tre strade sulla stessa scala, nessuna classifica. La strada del preventivo è il blocco grande. */
export default function Atto3Strade({ strade, possesso, scala, statico, onConfronta, m }: Props) {
  const { ref, avanzamento } = useAvanzamento(statico, 1200);
  const ordinate = [...strade.filter((s) => s.id === DEL_PREVENTIVO), ...strade.filter((s) => s.id !== DEL_PREVENTIVO)];
  return (
    <section ref={ref} class="atto grid gap-8" aria-labelledby="atto3-titolo" data-atto="3" data-avanzamento={avanzamento >= 1 ? '1' : '0'}>
      <div class="grid gap-5 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:items-end lg:gap-14">
        <div class="grid content-start gap-5">
          <p class="atto-numero">03</p>
          <h3 id="atto3-titolo" class="atto-titolo">{t(m, 'atto3.titolo')}</h3>
        </div>
        <p class="max-w-[52ch] text-[var(--scena-tenue)]">{t(m, 'atto3.sotto')}</p>
      </div>
      <ol class="strade">
        {ordinate.map((s) => (
          <StradaScena key={s.id} s={s} possesso={possesso[s.id]} m={m} principale={s.id === DEL_PREVENTIVO}
            quota={(s.totaleUscito != null ? Math.min(1, s.totaleUscito / scala) : 0) * avanzamento} />
        ))}
      </ol>
      {onConfronta && (
        <p><a class="btn btn-scena" href="/noleggio" onClick={onConfronta}>Cambia le ipotesi delle tre strade</a></p>
      )}
    </section>
  );
}
