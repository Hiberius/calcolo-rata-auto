import { useEffect, useRef } from 'preact/hooks';
import { euro, percentuale, punti } from '~/lib/calc/format';
import type { Analisi } from '~/lib/calc/tipi';

interface Props {
  analisi: Analisi;
  aperta: boolean;
  onChiudi: () => void;
}

const TIPO_PREZZO = { contanti: 'Prezzo in contanti', promo: 'Prezzo promozionale', listino: 'Prezzo di listino', assente: 'Prezzo' } as const;

/** Le domande da fare al venditore, a partire da quello che manca o non torna nel preventivo. */
export function domandeAlVenditore(a: Analisi): readonly string[] {
  const p = a.preventivo;
  const domande = [
    ...(a.totali.prezzoRiferimentoTipo !== 'contanti' ? ['Qual è il prezzo in contanti?'] : []),
    'Il TAEG include le spese di incasso delle rate?',
    ...(p.maxiRata ? ['La maxi rata è un valore futuro garantito? Con quali km e in che stato deve essere l’auto?'] : []),
    ...(a.ricostruzione.discrepanze.length > 0 || a.taeg.stato === 'da_verificare' ? ['Mi mostra le spese che spiegano la differenza nel SECCI?'] : []),
    'Mi dà il SECCI da portare a casa prima di firmare?',
  ];
  return domande;
}

function Riga({ etichetta, valore, segnale = false }: { etichetta: string; valore: string; segnale?: boolean }) {
  return (
    <div class="grid gap-0.5 border-b border-[var(--scena-riga)] py-3">
      <dt class="text-base text-[var(--scena-tenue)]">{etichetta}</dt>
      <dd class={`numeri text-[clamp(1.75rem,1rem+4vw,3rem)] font-semibold leading-none ${segnale ? 'text-[var(--scena-segnale)]' : ''}`}>{valore}</dd>
    </div>
  );
}

/** Vista a schermo intero per il telefono in concessionaria: pochi numeri, grandi, e le domande da fare. */
export default function MostraVenditore({ analisi: a, aperta, onChiudi }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const t = a.totali;
  const p = a.preventivo;

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
          <h2 id="venditore-titolo" class="text-2xl font-semibold leading-tight">Prima di firmare, questi numeri</h2>
          <button type="button" class="btn btn-scena shrink-0" onClick={chiudi} data-esci-venditore>Esci</button>
        </div>
        <dl class="grid sm:grid-cols-2 sm:gap-x-10">
          <Riga etichetta="Pago in tutto" valore={euro(t.totalePagatoTenendo)} />
          {t.prezzoRiferimento != null && <Riga etichetta={TIPO_PREZZO[t.prezzoRiferimentoTipo]} valore={euro(t.prezzoRiferimento)} />}
          {t.costoCredito != null && <Riga etichetta="Costo del credito" valore={`${euro(t.costoCredito)} · ${percentuale(t.costoCreditoPct, 0)}`} segnale />}
          {p.maxiRata ? <Riga etichetta="Maxi rata finale" valore={euro(p.maxiRata)} /> : null}
          {p.taegDichiarato != null && <Riga etichetta="TAEG dichiarato" valore={punti(p.taegDichiarato)} />}
          {a.taeg.taegRicostruito != null && <Riga etichetta="TAEG dai numeri del preventivo" valore={punti(a.taeg.taegRicostruito)} />}
        </dl>
        <div class="grid gap-3">
          <h3 class="text-xl font-semibold">Le domande da fare</h3>
          <ol class="grid gap-3 text-[clamp(1.125rem,1rem+1vw,1.5rem)] leading-snug">
            {domandeAlVenditore(a).map((d, k) => (
              <li key={d} class="grid grid-cols-[2rem_1fr] gap-2"><span class="numeri text-[var(--scena-segnale)]">{k + 1}</span>{d}</li>
            ))}
          </ol>
        </div>
        <p class="text-sm text-[var(--scena-tenue)]">Conti fatti da Rata Vera sui numeri del preventivo. Rata Vera non è un mediatore creditizio.</p>
      </div>
    </dialog>
  );
}
