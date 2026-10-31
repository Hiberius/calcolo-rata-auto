import { useCallback, useMemo } from 'preact/hooks';
import { euro, euroIntero, numero, punti } from '~/lib/calc/format';
import { fraseIncrocio, limitiCursori, pianoConCursori, serieScena, type BaseScena, type Cursori } from '~/lib/calc/scena';
import { ETICHETTA_STIMA, MODELLO_VALORE, type SerieValoreDebito } from '~/lib/calc/valore';
import Cursore from './Cursore';
import { disegnaCurve } from './disegno/curve';
import { useAvanzamento } from './useAvanzamento';
import { useTela, type Area } from './useTela';

interface Props {
  base: BaseScena;
  cursori: Cursori;
  onCursori: (c: Cursori) => void;
  statico: boolean;
  tipo: 'finanziamento' | 'leasing' | 'noleggio';
}

const ANNI: Readonly<Record<number, string>> = { 2: 'due', 3: 'tre', 4: 'quattro', 5: 'cinque', 6: 'sei' };

/** «I quattro anni», o la durata del contratto in mesi se non è un numero intero di anni. */
export function titoloDurata(mesi: number): string {
  const anni = mesi / 12;
  if (anni === 1) return 'Un anno';
  const parola = ANNI[anni];
  return parola ? `I ${parola} anni` : `I ${mesi} mesi`;
}

const MODELLO = `Valore stimato con un modello dichiarato: −${MODELLO_VALORE.perditaPrimoAnno * 100}% il primo anno, −${MODELLO_VALORE.perditaAnniSuccessivi * 100}% l’anno dopo, ±${MODELLO_VALORE.correzionePerPasso * 100}% ogni ${numero(MODELLO_VALORE.passoKm, 0)} km sopra o sotto ${numero(MODELLO_VALORE.kmRiferimento, 0)} km l’anno, mai sotto il ${MODELLO_VALORE.quotaMinima * 100}% del prezzo.`;

function riepilogo(s: SerieValoreDebito): string {
  const vfg = s.vfg ? ` Valore garantito dalla casa ${euro(s.vfg.importo)}, ${s.vfg.sopraStima ? 'sopra' : 'sotto'} la stima.` : '';
  return `${fraseIncrocio(s)} A fine piano devi ${euro(s.debitoFinale)} e l’auto vale circa ${euro(s.valoreFinale)}.${vfg}`;
}

function SenzaCurva({ tipo }: { tipo: Props['tipo'] }) {
  return (
    <p class="atto-frase max-w-[34ch]">
      {tipo === 'noleggio'
        ? 'Nel noleggio l’auto non è tua: non c’è un debito da mettere contro il suo valore.'
        : 'Senza il prezzo dell’auto non si può stimare quanto vale nel tempo: chiedi il prezzo in contanti.'}
    </p>
  );
}

export default function Atto2Curve({ base, cursori, onCursori, statico, tipo }: Props) {
  const { ref, avanzamento } = useAvanzamento(statico, 1600);
  const serie = useMemo(() => serieScena(base, cursori), [base, cursori]);
  const piano = useMemo(() => pianoConCursori(base, cursori), [base, cursori]);
  const limiti = useMemo(() => limitiCursori(base), [base]);
  const massimo = useMemo(() => {
    if (!serie) return 1;
    return Math.max(base.prezzo ?? 0, serie.vfg?.importo ?? 0, ...serie.punti.map((p) => p.debito)) * 1.06;
  }, [serie, base.prezzo]);
  const disegno = useCallback((ctx: CanvasRenderingContext2D, area: Area) => {
    if (serie) disegnaCurve(ctx, area, { serie, massimo, avanzamento });
  }, [serie, massimo, avanzamento]);
  const tela = useTela(disegno);
  const cambiata = piano != null && base.piano != null && piano !== base.piano;

  return (
    <section ref={ref} class="atto grid gap-8" aria-labelledby="atto2-titolo" data-atto="2" data-avanzamento={avanzamento >= 1 ? '1' : '0'}>
      <div class="grid gap-5 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:items-end lg:gap-14">
        <div class="grid content-start gap-5">
          <p class="atto-numero">02</p>
          <h3 id="atto2-titolo" class="atto-titolo">{titoloDurata(cursori.durata)}</h3>
        </div>
        {serie ? <p class="atto-frase" data-frase-incrocio data-mese-incrocio={serie.meseIncrocio ?? 'nessuno'}>{fraseIncrocio(serie)}</p> : <SenzaCurva tipo={tipo} />}
      </div>
      {serie && piano && (
        <>
          <div class="relative grid gap-3">
            <p class="etichetta-stima justify-self-end sm:absolute sm:right-0 sm:top-0" data-etichetta-stima>{ETICHETTA_STIMA}</p>
            <canvas ref={tela} class="block h-[260px] w-full sm:h-[360px]" aria-hidden="true" data-tela="curve" />
          </div>
          <ul class="flex flex-wrap gap-x-6 gap-y-2 text-sm text-[var(--scena-tenue)]" aria-hidden="true">
            <li class="flex items-center gap-2"><span class="h-0.5 w-6 bg-[var(--scena-carta)]" />Valore stimato dell’auto</li>
            <li class="flex items-center gap-2"><span class="h-[3px] w-6 bg-[var(--scena-segnale)]" />Debito residuo</li>
            {serie.mesiSopra > 0 && <li class="flex items-center gap-2"><span class="h-3 w-6 bg-[rgba(242,130,95,0.3)]" />Qui devi all’auto più di quanto vale</li>}
          </ul>
          <dl class="grid gap-x-10 gap-y-4 sm:grid-cols-3">
            <div class="grid gap-1">
              <dt class="text-sm text-[var(--scena-tenue)]">A fine piano devi</dt>
              <dd class="numeri text-2xl font-semibold text-[var(--scena-segnale)]" data-debito-finale>{euro(serie.debitoFinale)}</dd>
            </div>
            <div class="grid gap-1">
              <dt class="text-sm text-[var(--scena-tenue)]">L’auto vale circa</dt>
              <dd class="numeri text-2xl font-semibold" data-valore-finale>{euro(serie.valoreFinale)}</dd>
            </div>
            <div class="grid gap-1">
              <dt class="text-sm text-[var(--scena-tenue)]">{cambiata ? 'Rata stimata' : 'Rata del preventivo'}</dt>
              <dd class="numeri text-2xl font-semibold" data-rata-scena>{euro(piano.rata)}</dd>
            </div>
          </dl>
          {serie.vfg && (
            <p class="max-w-prose text-sm" data-vfg>
              Valore garantito dalla casa: <span class="numeri font-semibold text-[var(--scena-attenzione)]">{euro(serie.vfg.importo)}</span>,{' '}
              {serie.vfg.sopraStima ? 'sopra' : 'sotto'} la nostra stima di {euroIntero(serie.vfg.stima)}. Leggi le condizioni: di solito valgono solo con i km e lo stato previsti.
            </p>
          )}
          <fieldset class="grid gap-6 border-t border-[var(--scena-riga)] pt-6 sm:grid-cols-3">
            <legend class="sr-only">Cambia anticipo, durata e km all’anno</legend>
            <Cursore id="scena-anticipo" etichetta="Anticipo" valore={cursori.anticipo} limite={limiti.anticipo} testo={euroIntero(cursori.anticipo)} onCambia={(v) => onCursori({ ...cursori, anticipo: v })} />
            <Cursore id="scena-durata" etichetta="Durata" valore={cursori.durata} limite={limiti.durata} testo={`${cursori.durata} mesi`} onCambia={(v) => onCursori({ ...cursori, durata: v })} />
            <Cursore id="scena-km" etichetta="Km all’anno" valore={cursori.kmAnnui} limite={limiti.kmAnnui} testo={`${numero(cursori.kmAnnui, 0)} km`} onCambia={(v) => onCursori({ ...cursori, kmAnnui: v })} />
          </fieldset>
          <p class="max-w-prose text-xs text-[var(--scena-tenue)]">
            {MODELLO} Debito: capitale residuo del piano al tasso {punti(piano.tanAnnuo)}, più la maxi rata a fine piano. Cambiando anticipo o durata la maxi rata resta la stessa e la rata si ricalcola. <a class="link" href="/metodologia#valore">Come lo calcoliamo</a>
          </p>
          <p class="sr-only" data-riepilogo="2" aria-live="polite">{riepilogo(serie)}</p>
        </>
      )}
    </section>
  );
}
