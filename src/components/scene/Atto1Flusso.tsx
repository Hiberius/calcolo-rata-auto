import { useCallback } from 'preact/hooks';
import type { Contenitore, Ripartizione } from '~/lib/calc/ripartizione';
import { importo, quota } from '~/lib/formato';
import { contatore } from '~/lib/motion';
import { attorno, t } from '~/markets';
import type { Mercato } from '~/markets/tipi';
import NumeroCheConta from '../ui/NumeroCheConta';
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
  m: Mercato;
}

/** Un contenitore vuoto non è un riquadro a zero: è una frase (problema 5 della revisione). */
const FRASE_VUOTO: Readonly<Partial<Record<Contenitore['chiave'], string>>> = {
  spese: 'Nessuna spesa accessoria dichiarata.',
  polizze: 'Nessuna polizza o servizio abbinato dichiarato.',
  interessi: 'Nessun interesse: il credito non costa.',
};

function riepilogo(r: Ripartizione, quotaTesto: string | null, m: Mercato): string {
  const parti = r.contenitori.map((c) => `${c.etichetta} ${importo(c.importo, 'scena')}`).join(', ');
  return `${t(m, 'atto1.riepilogo', { totale: importo(r.totale, 'scena'), parti })}${quotaTesto ? ` ${t(m, 'atto1.quota', { quota: quotaTesto })}` : ''}`;
}

/** Le spese dette una per una, solo quelle che ci sono: «incasso 12,25 € · bollo 16,00 €». */
function dettaglioSpese(r: Ripartizione): string {
  const s = r.spese;
  return ([['istruttoria', s.istruttoria], ['incasso', s.incasso], ['bollo', s.bollo], ['altre', s.altre]] as const)
    .filter(([, v]) => v > 0).map(([k, v]) => `${k} ${importo(v, 'scena')}`).join(' · ');
}

export default function Atto1Flusso({ ripartizione: r, scala, statico, quotaRata, nRate, rata, sommaRate, m }: Props) {
  const { ref, avanzamento } = useAvanzamento(statico, 1800);
  const piene = r.contenitori.filter((c) => c.importo > 0);
  const vuote = r.contenitori.filter((c) => c.importo <= 0);
  const disegno = useCallback(
    (ctx: CanvasRenderingContext2D, area: Area) => disegnaFlusso(ctx, area, { voci: piene, totale: r.totale, scala, avanzamento }),
    [r, scala, avanzamento],
  );
  const tela = useTela(disegno);
  const quotaTesto = quotaRata != null ? quota(quotaRata, 1) : null;
  const [primaQuota, dopoQuota] = attorno(m, 'atto1.quota', 'quota');
  const spese = dettaglioSpese(r);
  // Con quattro colonne gli importi al centesimo scendono di una misura: devono stare sotto il loro contenitore.
  const misuraImporto = piene.length >= 4 ? 'text-[clamp(1rem,0.8rem+0.5vw,1.25rem)]' : 'text-[clamp(1.125rem,0.95rem+0.75vw,1.625rem)]';

  return (
    <section ref={ref} class="atto grid gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-x-14 lg:gap-y-12" aria-labelledby="atto1-titolo" data-atto="1" data-avanzamento={avanzamento >= 1 ? '1' : '0'}>
      {/* Il totale è il titolo dell'atto (problema 2): la domanda piccola sopra, il numero che conta a tutta larghezza. */}
      <div class="grid gap-4 lg:col-span-2">
        <p class="atto-numero">01</p>
        <h3 id="atto1-titolo" class="grid gap-3">
          <span class="frase-grande text-[var(--scena-tenue)]">{t(m, 'atto1.titolo')}</span>{' '}
          <NumeroCheConta valore={r.totale} class="numero-eroe numero-atto text-[var(--scena-carta)]" dato="totale-scena" soglia={0.35} />
        </h3>
        <p class="nota text-[var(--scena-tenue)]">
          {t(m, 'atto1.tasca')}, in tutto. Il cartello diceva <s class="rata-barrata text-[var(--scena-carta)]">{importo(rata, 'scena')}</s> al mese.
        </p>
      </div>
      <div class="grid content-start gap-5">
        {quotaTesto && (
          <p class="atto-frase" data-frase-quota>
            {primaQuota}<span class="numeri text-[var(--scena-segnale)]">{quotaTesto}</span>{dopoQuota}
          </p>
        )}
        {quotaTesto && <p class="numeri nota text-[var(--scena-tenue)]">{nRate} × {importo(rata, 'scena')} = {importo(sommaRate, 'scena')} su {importo(r.totale, 'scena')}</p>}
        {r.nota && <p class="nota max-w-[44ch] text-[var(--scena-tenue)]">{r.nota}</p>}
      </div>
      <div class="grid content-start gap-6">
        <canvas ref={tela} class="block h-[200px] w-full sm:h-[280px]" aria-hidden="true" data-tela="flusso" />
        <ul class="contenitori" style={{ '--colonne': piene.length }} aria-hidden="true">
          {piene.map((c) => (
            <li key={c.chiave} class="contenitore-voce" data-contenitore={c.chiave} data-importo={c.importo}>
              <span class="contenitore-etichetta">
                <span class="inline-block h-1 w-6 shrink-0" style={{ background: COLORE_CONTENITORE[c.chiave] }} />
                <span class="nota text-[var(--scena-tenue)]">{c.etichetta}</span>
              </span>
              <span class={`numeri font-medium tracking-[-0.02em] whitespace-nowrap ${misuraImporto}`} data-importo-vivo>{importo(contatore(0, c.importo, avanzamento), 'scena')}</span>
              <span class="numeri text-xs text-[var(--scena-tenue)]">{quota(c.importo, r.totale)}{c.chiave === 'spese' && spese ? ` · ${spese}` : ''}</span>
            </li>
          ))}
        </ul>
        {vuote.length > 0 && (
          <p class="nota text-[var(--scena-tenue)]" data-contenitori-vuoti>
            {vuote.map((c) => FRASE_VUOTO[c.chiave] ?? `${c.etichetta}: nessun importo.`).join(' ')}
          </p>
        )}
      </div>
      <p class="sr-only" data-riepilogo="1">{riepilogo(r, quotaTesto, m)}</p>
    </section>
  );
}
