import { useCallback, useMemo, useState } from 'preact/hooks';
import { numero, punti } from '~/lib/formato';
import { importo } from '~/lib/formato';
import { fraseIncrocio, limitiCursori, pianoConCursori, serieScena, type BaseScena, type Cursori } from '~/lib/calc/scena';
import type { PianoDebito } from '~/lib/calc/valore';
import { MODELLO_VALORE, type SerieValoreDebito } from '~/lib/calc/valore';
import { t } from '~/markets';
import { MERCATO_IT } from '~/markets/it';
import type { ChiaveTesto, Mercato } from '~/markets/tipi';
import Termine from '../ui/Termine';
import TestoConGlossario from '../ui/TestoConGlossario';
import Cursore from './Cursore';
import { disegnaCurve, meseSotto, minimoAsse, notaAsse, type Mirino } from './disegno/curve';
import { useSerieMorbida } from './useSerieMorbida';
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

const euro = (v: number): string => importo(v, 'scena');
/** Il valore stimato è una stima: euro interi ovunque (scena, atto 3, scheda, immagine), mai «circa» con i centesimi. */
const stima = (v: number): string => importo(v, 'anteprima');
const ETICHETTE_MIRINO: Mirino['etichette'] = { valore: 'valore', debito: 'debito', mese: 'mese' };

function riepilogo(s: SerieValoreDebito, m: Mercato): string {
  const vfg = s.vfg ? ` ${t(m, 'atto2.vfg')} ${euro(s.vfg.importo)}, ${s.vfg.sopraStima ? 'sopra' : 'sotto'} la stima.` : '';
  return `${fraseIncrocio(s, m)} ${t(m, 'atto2.fineDebito')} ${euro(s.debitoFinale)}. ${t(m, 'atto2.fineValore')} ${stima(s.valoreFinale)}.${vfg}`;
}

/** Interazione 9: il numero cambiato da un cursore riceve un velo vermiglio che si spegne (la key lo riavvia). */
function Vivo({ testo }: { testo: string }) {
  return <span key={testo} class="velo">{testo}</span>;
}

/** Da dove viene il tasso del debito, detto in chiaro: il TAN se torna, altrimenti il tasso ricavato e perché. */
export function notaTasso(base: BaseScena, piano: PianoDebito, m: Mercato = MERCATO_IT): string {
  const valori = { nominale: m.termini.tassoNominale, valore: punti(piano.tanAnnuo), tan: base.tanDichiarato != null ? punti(base.tanDichiarato) : '' };
  const chiave: ChiaveTesto = base.fonteTasso === 'tan' ? 'atto2.tassoTan'
    : base.fonteTasso === 'implicito' ? (base.tanDichiarato != null ? 'atto2.tassoImplicito' : 'atto2.tassoImplicitoSenzaTan')
    : base.fonteTasso === 'taeg' ? 'atto2.tassoTaeg' : 'atto2.tassoNessuno';
  return `${t(m, chiave, valori)} ${t(m, 'atto2.ricalcolo')}`;
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
    return Math.max(base.prezzo ?? 0, serie.vfg?.importo ?? 0, ...serie.punti.map((p) => p.debito)) * 1.03;
  }, [serie, base.prezzo]);
  const minimo = useMemo(() => (serie ? minimoAsse(serie, massimo) : 0), [serie, massimo]);
  const vista = useSerieMorbida(serie, massimo, minimo);
  const [mese, setMese] = useState<number | null>(null);
  const disegno = useCallback((ctx: CanvasRenderingContext2D, area: Area) => {
    if (!vista.serie) return;
    const mirino = mese != null ? { mese, euro, etichette: ETICHETTE_MIRINO } : null;
    disegnaCurve(ctx, area, { serie: vista.serie, massimo: vista.massimo, minimo: vista.minimo, avanzamento, mirino, etichette: { vfg: t(m, 'atto2.vfgGrafico'), mese: (n) => t(m, 'atto2.mese', { mese: n }) } });
  }, [vista, avanzamento, m, mese]);
  const tela = useTela(disegno);
  /** F4. Mirino: segue il puntatore (o il dito che scorre in orizzontale) senza ritardo; i numeri restano anche nel riepilogo. */
  function punta(e: PointerEvent) {
    const el = e.currentTarget as HTMLCanvasElement;
    if (!vista.serie) return;
    const r = el.getBoundingClientRect();
    setMese(meseSotto(e.clientX - r.left, r.width, vista.serie.durata));
  }
  const cambiata = piano != null && base.piano != null && piano !== base.piano;
  // I cursori restano anche quando la combinazione non è possibile, così si torna indietro.
  const conCursori = base.piano != null && base.prezzo != null;
  const impossibile = conCursori && piano == null;

  return (
    <section ref={ref} class="atto grid gap-8" aria-labelledby="atto2-titolo" data-atto="2" data-avanzamento={avanzamento >= 1 ? '1' : '0'}>
      <div class="grid gap-5 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:items-end lg:gap-14">
        <div class="grid content-start gap-5">
          <p class="atto-numero">02</p>
          <h3 id="atto2-titolo" class="atto-titolo">{titoloDurata(cursori.durata, m)}</h3>
        </div>
        {serie ? <p class="atto-frase" data-frase-incrocio data-mese-incrocio={serie.meseIncrocio ?? 'nessuno'}>{fraseIncrocio(serie, m)}</p>
          : impossibile ? <p class="atto-frase max-w-[34ch]" data-combinazione-impossibile>{t(m, 'atto2.impossibile')}</p>
          : <SenzaCurva tipo={tipo} />}
      </div>
      {serie && piano && (
        <>
          <div class="relative grid gap-3">
            {/* Il timbro sta nel flusso, sopra la tela: assoluto copriva l'etichetta del mese dell'incrocio a 768 px. */}
            <p class="etichetta-stima justify-self-end" data-etichetta-stima>{t(m, 'scena.stima')}</p>
            <canvas ref={tela} class="block h-[300px] w-full cursor-crosshair touch-pan-y sm:h-[420px]" aria-hidden="true" data-tela="curve"
              onPointerMove={punta} onPointerDown={punta} onPointerLeave={() => setMese(null)} onPointerCancel={() => setMese(null)} />
          </div>
          <ul class="flex flex-wrap gap-x-6 gap-y-2 text-sm text-[var(--scena-tenue)]">
            <li class="flex items-center gap-2"><span class="h-0.5 w-6 bg-[var(--scena-carta)]" />{t(m, 'atto2.legendaValore')}</li>
            <li class="flex items-center gap-2"><span class="h-[3px] w-6 bg-[var(--scena-segnale)]" /><TestoConGlossario testo={t(m, 'atto2.legendaDebito')} ambito="scena-legenda" /></li>
            {serie.mesiSopra > 0 && <li class="flex items-center gap-2"><span class="h-3 w-6 bg-[rgba(242,130,95,0.5)]" />{t(m, 'atto2.legendaZona')}</li>}
          </ul>
          {notaAsse(minimo) && <p class="nota -mt-4 text-[var(--scena-tenue)]" data-nota-asse>{notaAsse(minimo)}</p>}
          {/* Il debito a fine piano è il numero che pesa: grande e in vermiglio; valore e rata accanto, una misura sotto. */}
          <dl class="grid gap-x-10 gap-y-5 sm:grid-cols-[minmax(0,5fr)_minmax(0,4fr)_minmax(0,4fr)] sm:items-end">
            <div class="grid gap-1.5">
              <dt class="nota text-[var(--scena-tenue)]">{t(m, 'atto2.fineDebito')}</dt>
              <dd class="numero-scena text-[clamp(1.75rem,1.2rem+2vw,2.75rem)] text-[var(--scena-segnale)]" data-debito-finale><Vivo testo={euro(serie.debitoFinale)} /></dd>
            </div>
            <div class="grid gap-1.5">
              <dt class="nota text-[var(--scena-tenue)]">{t(m, 'atto2.fineValore')}</dt>
              <dd class="numero-scena" data-valore-finale><Vivo testo={stima(serie.valoreFinale)} /></dd>
            </div>
            <div class="grid gap-1.5">
              <dt class="nota text-[var(--scena-tenue)]">{t(m, cambiata ? 'atto2.rataStimata' : 'atto2.rataPreventivo')}</dt>
              <dd class="numero-scena" data-rata-scena><Vivo testo={euro(piano.rata)} /></dd>
            </div>
          </dl>
          {serie.vfg && (
            <p class="max-w-prose nota" data-vfg>
              <Termine voce="vfg" ambito="scena-vfg">{t(m, 'atto2.vfg')}</Termine>: <span class="numeri font-semibold text-[var(--scena-attenzione)]">{euro(serie.vfg.importo)}</span>,{' '}
              {serie.vfg.sopraStima ? 'sopra' : 'sotto'} la nostra stima di {stima(serie.vfg.stima)}. Leggi le condizioni: di solito valgono solo con i km e lo stato previsti.
            </p>
          )}
        </>
      )}
      {conCursori && (
        <fieldset class="grid gap-6 border-t border-[var(--scena-riga)] pt-6 sm:grid-cols-3">
          <legend class="sr-only">Cambia anticipo, durata e km all’anno</legend>
          <Cursore id="scena-anticipo" etichetta={t(m, 'atto2.anticipo')} valore={cursori.anticipo} limite={limiti.anticipo} testo={euro(cursori.anticipo)} onCambia={(v) => onCursori({ ...cursori, anticipo: v })} />
          <Cursore id="scena-durata" etichetta={t(m, 'atto2.durata')} valore={cursori.durata} limite={limiti.durata} testo={t(m, 'atto2.mesi', { n: cursori.durata })} onCambia={(v) => onCursori({ ...cursori, durata: v })} />
          <Cursore id="scena-km" etichetta={t(m, 'atto2.km')} valore={cursori.kmAnnui} limite={limiti.kmAnnui} testo={`${numero(cursori.kmAnnui, 0)} km`} onCambia={(v) => onCursori({ ...cursori, kmAnnui: v })} />
        </fieldset>
      )}
      {serie && piano && (
        <>
          {/* Una frase sul tasso (è quella che cambia da preventivo a preventivo); il modello del valore sta nel «?» e in metodologia. */}
          <p class="max-w-[36em] nota text-[var(--scena-tenue)]" data-nota-tasso={base.fonteTasso}>
            <TestoConGlossario testo={notaTasso(base, piano, m)} ambito="scena-tasso" />
          </p>
          <details class="nota max-w-[36em] text-[var(--scena-tenue)]">
            <summary class="tocco cursor-pointer underline decoration-1 underline-offset-4">Come stimiamo il valore dell’auto</summary>
            <p class="pt-1">{MODELLO} <a class="link" href="/metodologia#valore">Tutte le formule</a></p>
          </details>
          <p class="sr-only" data-riepilogo="2" aria-live="polite">{riepilogo(serie, m)}</p>
        </>
      )}
    </section>
  );
}
