import { useEffect, useRef } from 'preact/hooks';
import { costoCreditoPct, punti } from '~/lib/formato';
import { importo } from '~/lib/formato';
import type { VoceGlossario } from '~/lib/glossario';
import type { Analisi } from '~/lib/calc/tipi';
import { t } from '~/markets';
import type { ChiaveTesto } from '~/markets/tipi';
import Termine from '../ui/Termine';
import TestoConGlossario from '../ui/TestoConGlossario';

const euro = (v: number | null | undefined): string => importo(v, 'scena');

interface Props {
  analisi: Analisi;
  aperta: boolean;
  onChiudi: () => void;
}

const TIPO_PREZZO: Readonly<Record<Analisi['totali']['prezzoRiferimentoTipo'], ChiaveTesto>> = { contanti: 'prezzo.contanti', promo: 'prezzo.promo', listino: 'prezzo.listino', assente: 'prezzo.assente' };

/** Le domande da fare al venditore, a partire da quello che manca o non torna nel preventivo. */
export function domandeAlVenditore(a: Analisi): readonly string[] {
  const p = a.preventivo;
  const m = a.mercato;
  const chiavi: readonly ChiaveTesto[] = [
    ...(a.totali.prezzoRiferimentoTipo !== 'contanti' ? (['domanda.contanti'] as const) : []),
    'domanda.incasso',
    ...(p.maxiRata ? (['domanda.maxi'] as const) : []),
    ...(a.ricostruzione.discrepanze.length > 0 || a.taeg.stato === 'da_verificare' ? (['domanda.differenza'] as const) : []),
    'domanda.documento',
  ];
  return chiavi.map((k) => t(m, k));
}

function Riga({ etichetta, valore, segnale = false, voce }: { etichetta: string; valore: string; segnale?: boolean; voce?: VoceGlossario }) {
  return (
    <div class="grid gap-0.5 border-b border-[var(--scena-riga)] py-3">
      <dt class="text-base text-[var(--scena-tenue)]">{voce ? <Termine voce={voce} ambito={`venditore-${voce}-${etichetta.length}`}>{etichetta}</Termine> : etichetta}</dt>
      <dd class={`numeri text-[clamp(1.75rem,1rem+4vw,3rem)] font-semibold leading-none ${segnale ? 'text-[var(--scena-segnale)]' : ''}`}>{valore}</dd>
    </div>
  );
}

/** Vista a schermo intero per il telefono in concessionaria: pochi numeri, grandi, e le domande da fare. */
export default function MostraVenditore({ analisi: a, aperta, onChiudi }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const tot = a.totali;
  const p = a.preventivo;
  const m = a.mercato;

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (aperta && !d.open) {
      if (typeof d.showModal === 'function') d.showModal();
      else d.setAttribute('open', '');
    }
    if (!aperta && d.open) d.close();
  }, [aperta]);

  /** Chiude subito il dialogo: l'evento close (anche con Esc) aggiorna lo stato della scena. */
  function chiudi() {
    const d = ref.current;
    if (d?.open) d.close();
    else onChiudi();
  }

  return (
    <dialog ref={ref} class="vista-venditore" aria-labelledby="venditore-titolo" onClose={onChiudi} data-vista-venditore>
      <div class="contenitore grid min-h-[100dvh] content-start gap-8 py-6">
        <div class="flex items-start justify-between gap-4">
          <h2 id="venditore-titolo" class="text-2xl font-semibold leading-tight">{t(m, 'venditore.titolo')}</h2>
          <button type="button" class="btn btn-scena shrink-0" onClick={chiudi} data-esci-venditore>{t(m, 'venditore.esci')}</button>
        </div>
        <dl class="grid sm:grid-cols-2 sm:gap-x-10">
          <Riga etichetta={t(m, 'venditore.pagoInTutto')} valore={euro(tot.totalePagatoTenendo)} />
          {tot.prezzoRiferimento != null && <Riga etichetta={t(m, TIPO_PREZZO[tot.prezzoRiferimentoTipo])} valore={euro(tot.prezzoRiferimento)} />}
          {tot.costoCredito != null && <Riga etichetta={t(m, 'risultato.costoCredito')} valore={`${euro(tot.costoCredito)} · ${costoCreditoPct(tot.costoCreditoPct)}`} segnale />}
          {p.maxiRata ? <Riga etichetta={t(m, 'venditore.maxi')} valore={euro(p.maxiRata)} voce="maxi" /> : null}
          {p.taegDichiarato != null && <Riga etichetta={t(m, 'venditore.tassoDichiarato')} valore={punti(p.taegDichiarato)} voce="taeg" />}
          {a.taeg.taegRicostruito != null && <Riga etichetta={t(m, 'venditore.tassoRicostruito')} valore={punti(a.taeg.taegRicostruito)} />}
        </dl>
        <div class="grid gap-3">
          <h3 class="text-xl font-semibold">{t(m, 'venditore.domande')}</h3>
          <ol class="grid gap-3 text-[clamp(1.125rem,1rem+1vw,1.5rem)] leading-snug">
            {domandeAlVenditore(a).map((d, k) => (
              <li key={d} class="grid grid-cols-[2rem_1fr] gap-2"><span class="numeri text-[var(--scena-segnale)]">{k + 1}</span><span><TestoConGlossario testo={d} ambito={`venditore-domanda-${k}`} /></span></li>
            ))}
          </ol>
        </div>
        <p class="text-sm text-[var(--scena-tenue)]">{t(m, 'venditore.piede')}</p>
      </div>
    </dialog>
  );
}
