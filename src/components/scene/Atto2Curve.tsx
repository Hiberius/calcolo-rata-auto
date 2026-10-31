import { useCallback, useMemo } from 'preact/hooks';
import { euro, euroIntero, numero, punti } from '~/lib/calc/format';
import { fraseIncrocio, limitiCursori, pianoConCursori, serieScena, type BaseScena, type Cursori } from '~/lib/calc/scena';
import { MODELLO_VALORE, type SerieValoreDebito } from '~/lib/calc/valore';
import { t } from '~/markets';
import { MERCATO_IT } from '~/markets/it';
import type { ChiaveTesto, Mercato } from '~/markets/tipi';
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
  m: Mercato;
}

const ANNI: Readonly<Record<number, ChiaveTesto>> = { 2: 'anni.2', 3: 'anni.3', 4: 'anni.4', 5: 'anni.5', 6: 'anni.6' };

/** «I quattro anni», o la durata del contratto in mesi se non è un numero intero di anni, nella lingua del mercato. */
export function titoloDurata(mesi: number, m: Mercato = MERCATO_IT): string {
  const anni = mesi / 12;
  if (anni === 1) return t(m, 'atto2.unAnno');
  const parola = ANNI[anni];
  return parola ? t(m, 'atto2.anni', { parola: t(m, parola) }) : t(m, 'atto2.mesiTitolo', { mesi });
}

const MODELLO = `Valore stimato con un modello dichiarato: −${MODELLO_VALORE.perditaPrimoAnno * 100}% il primo anno, −${MODELLO_VALORE.perditaAnniSuccessivi * 100}% l’anno dopo, ±${MODELLO_VALORE.correzionePerPasso * 100}% ogni ${numero(MODELLO_VALORE.passoKm, 0)} km sopra o sotto ${numero(MODELLO_VALORE.kmRiferimento, 0)} km l’anno, mai sotto il ${MODELLO_VALORE.quotaMinima * 100}% del prezzo.`;

function riepilogo(s: SerieValoreDebito, m: Mercato): string {
  const vfg = s.vfg ? ` ${t(m, 'atto2.vfg')} ${euro(s.vfg.importo)}, ${s.vfg.sopraStima ? 'sopra' : 'sotto'} la stima.` : '';
  return `${fraseIncrocio(s, m)} ${t(m, 'atto2.fineDebito')} ${euro(s.debitoFinale)}. ${t(m, 'atto2.fineValore')} ${euro(s.valoreFinale)}.${vfg}`;
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

export default function Atto2Curve({ base, cursori, onCursori, statico, tipo, m }: Props) {
  const { ref, avanzamento } = useAvanzamento(statico, 1600);
  const serie = useMemo(() => serieScena(base, cursori), [base, cursori]);
  const piano = useMemo(() => pianoConCursori(base, cursori), [base, cursori]);
  const limiti = useMemo(() => limitiCursori(base), [base]);
  const massimo = useMemo(() => {
    if (!serie) return 1;
    return Math.max(base.prezzo ?? 0, serie.vfg?.importo ?? 0, ...serie.punti.map((p) => p.debito)) * 1.06;
  }, [serie, base.prezzo]);
  const disegno = useCallback((ctx: CanvasRenderingContext2D, area: Area) => {
    if (serie) disegnaCurve(ctx, area, { serie, massimo, avanzamento, etichette: { vfg: t(m, 'atto2.vfgGrafico'), mese: (n) => t(m, 'atto2.mese', { mese: n }) } });
  }, [serie, massimo, avanzamento, m]);
  const tela = useTela(disegno);
  const cambiata = piano != null && base.piano != null && piano !== base.piano;

  return (
    <section ref={ref} class="atto grid gap-8" aria-labelledby="atto2-titolo" data-atto="2" data-avanzamento={avanzamento >= 1 ? '1' : '0'}>
      <div class="grid gap-5 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:items-end lg:gap-14">
        <div class="grid content-start gap-5">
          <p class="atto-numero">02</p>
          <h3 id="atto2-titolo" class="atto-titolo">{titoloDurata(cursori.durata, m)}</h3>
        </div>
        {serie ? <p class="atto-frase" data-frase-incrocio data-mese-incrocio={serie.meseIncrocio ?? 'nessuno'}>{fraseIncrocio(serie, m)}</p> : <SenzaCurva tipo={tipo} />}
      </div>
      {serie && piano && (
        <>
          <div class="relative grid gap-3">
            <p class="etichetta-stima justify-self-end sm:absolute sm:right-0 sm:top-0" data-etichetta-stima>{t(m, 'scena.stima')}</p>
            <canvas ref={tela} class="block h-[260px] w-full sm:h-[360px]" aria-hidden="true" data-tela="curve" />
          </div>
          <ul class="flex flex-wrap gap-x-6 gap-y-2 text-sm text-[var(--scena-tenue)]" aria-hidden="true">
            <li class="flex items-center gap-2"><span class="h-0.5 w-6 bg-[var(--scena-carta)]" />{t(m, 'atto2.legendaValore')}</li>
            <li class="flex items-center gap-2"><span class="h-[3px] w-6 bg-[var(--scena-segnale)]" />{t(m, 'atto2.legendaDebito')}</li>
            {serie.mesiSopra > 0 && <li class="flex items-center gap-2"><span class="h-3 w-6 bg-[rgba(242,130,95,0.36)]" />{t(m, 'atto2.legendaZona')}</li>}
          </ul>
          <dl class="grid gap-x-10 gap-y-4 sm:grid-cols-3">
            <div class="grid gap-1">
              <dt class="text-sm text-[var(--scena-tenue)]">{t(m, 'atto2.fineDebito')}</dt>
              <dd class="numeri text-2xl font-semibold text-[var(--scena-segnale)]" data-debito-finale>{euro(serie.debitoFinale)}</dd>
            </div>
            <div class="grid gap-1">
              <dt class="text-sm text-[var(--scena-tenue)]">{t(m, 'atto2.fineValore')}</dt>
              <dd class="numeri text-2xl font-semibold" data-valore-finale>{euro(serie.valoreFinale)}</dd>
            </div>
            <div class="grid gap-1">
              <dt class="text-sm text-[var(--scena-tenue)]">{t(m, cambiata ? 'atto2.rataStimata' : 'atto2.rataPreventivo')}</dt>
              <dd class="numeri text-2xl font-semibold" data-rata-scena>{euro(piano.rata)}</dd>
            </div>
          </dl>
          {serie.vfg && (
            <p class="max-w-prose text-sm" data-vfg>
              {t(m, 'atto2.vfg')}: <span class="numeri font-semibold text-[var(--scena-attenzione)]">{euro(serie.vfg.importo)}</span>,{' '}
              {serie.vfg.sopraStima ? 'sopra' : 'sotto'} la nostra stima di {euroIntero(serie.vfg.stima)}. Leggi le condizioni: di solito valgono solo con i km e lo stato previsti.
            </p>
          )}
          <fieldset class="grid gap-6 border-t border-[var(--scena-riga)] pt-6 sm:grid-cols-3">
            <legend class="sr-only">Cambia anticipo, durata e km all’anno</legend>
            <Cursore id="scena-anticipo" etichetta={t(m, 'atto2.anticipo')} valore={cursori.anticipo} limite={limiti.anticipo} testo={euroIntero(cursori.anticipo)} onCambia={(v) => onCursori({ ...cursori, anticipo: v })} />
            <Cursore id="scena-durata" etichetta={t(m, 'atto2.durata')} valore={cursori.durata} limite={limiti.durata} testo={t(m, 'atto2.mesi', { n: cursori.durata })} onCambia={(v) => onCursori({ ...cursori, durata: v })} />
            <Cursore id="scena-km" etichetta={t(m, 'atto2.km')} valore={cursori.kmAnnui} limite={limiti.kmAnnui} testo={`${numero(cursori.kmAnnui, 0)} km`} onCambia={(v) => onCursori({ ...cursori, kmAnnui: v })} />
          </fieldset>
          <p class="max-w-prose text-xs text-[var(--scena-tenue)]">
            {MODELLO} Debito: capitale residuo del piano al tasso {punti(piano.tanAnnuo)}, più la maxi rata a fine piano. Cambiando anticipo o durata la maxi rata resta la stessa e la rata si ricalcola. <a class="link" href="/metodologia#valore">Come lo calcoliamo</a>
          </p>
          <p class="sr-only" data-riepilogo="2" aria-live="polite">{riepilogo(serie, m)}</p>
        </>
      )}
    </section>
  );
}
