import { useMemo, useState } from 'preact/hooks';
import { euro, percentuale, punti } from '~/lib/calc/format';
import { analizzaLeggero, type NumeriLeggeri } from '~/lib/calc/leggero';
import type { Analisi } from '~/lib/calc/tipi';
import Disclaimer from '../ui/Disclaimer';
import NumberRow from '../ui/NumberRow';
import ComposizioneTotale from '../ui/ComposizioneTotale';
import { SPIEGAZIONE_TAEG_COSTO } from '~/lib/calc/composizione';
import { CAMPI_PER_VARIANTE, CAMPI_VIVO, daValori, type ValoriVivo, type Variante } from '~/lib/client/campiVivo';
import CampoNumero from './CampoNumero';
import ColonneStrade from './ColonneStrade';

interface Props {
  variante: Variante;
  iniziale: ValoriVivo;
  /** Numeri completi di partenza (promo): i campi modificabili li sovrascrivono. */
  base?: NumeriLeggeri | undefined;
  titolo?: string | undefined;
}

function Totale({ a }: { a: Analisi }) {
  const t = a.totali;
  return (
    <div class="grid gap-2">
      <p class="grid">
        <span class="font-medium">Paghi davvero</span>
        <span class="numeri text-4xl font-semibold tracking-tight" data-totale-vivo>{euro(t.totalePagatoTenendo)}</span>
      </p>
      {t.costoCredito != null && (
        <p class="numeri text-segnale-scuro font-semibold">Costo del credito {euro(t.costoCredito)} · {percentuale(t.costoCreditoPct)} del prezzo</p>
      )}
      {t.costoCredito != null && <p class="text-xs text-tenue">{SPIEGAZIONE_TAEG_COSTO}</p>}
      {a.verdetto.fraseQuotaRata && <p class="text-sm text-tenue">{a.verdetto.fraseQuotaRata}</p>}
      <ComposizioneTotale analisi={a} compatta />
    </div>
  );
}

function FineContratto({ a }: { a: Analisi }) {
  const s = a.scenari;
  if (!s.conMaxiRata || !s.tieni) return <p class="text-sm text-tenue">{s.nota}</p>;
  const r = s.tieni.rifinanziamento;
  return (
    <div class="grid">
      <NumberRow etichetta="Tieni l'auto pagando la maxi rata" valore={euro(s.tieni.totale)} tono="forte" />
      <NumberRow etichetta={`Tieni l'auto rifinanziando: ${r.mesi} rate da ${euro(r.rata)} al ${punti(r.tan)}`} valore={euro(r.totale)} nota={`Interessi in più: ${euro(r.costoAggiuntivo)}`} />
      {s.restituisci && <NumberRow etichetta="Restituisci l'auto" valore={euro(s.restituisci.totale)} nota="Hai pagato questo senza tenere l'auto" />}
      {s.cambi && <NumberRow etichetta="Cambi auto con un nuovo anticipo" valore={euro(s.cambi.totale)} nota={s.cambi.nota} />}
    </div>
  );
}

function Taeg({ a }: { a: Analisi }) {
  return (
    <div class="grid gap-1">
      <NumberRow etichetta="TAEG ricostruito dai numeri" valore={punti(a.taeg.taegRicostruito)} tono="forte" />
      <p class="text-sm text-tenue">{a.taeg.nota}</p>
    </div>
  );
}

/** Calcolo vivo delle guide e delle promo: pochi campi, stesso motore della home, senza zod. */
export default function CalcoloVivo({ variante, iniziale, base, titolo }: Props) {
  const [valori, setValori] = useState<ValoriVivo>(iniziale);
  const campi = CAMPI_PER_VARIANTE[variante];
  const analisi = useMemo(() => {
    const dati = daValori(valori, base ?? null);
    return dati ? analizzaLeggero(dati.numeri, dati.ipotesi) : null;
  }, [valori, base]);

  return (
    <section class="scontrino rounded-t grid gap-6 px-5 py-7 sm:px-8" aria-label={titolo ?? 'Calcolo'} data-calcolo-vivo={variante}>
      {titolo && <h2 class="text-xl font-semibold tracking-tight">{titolo}</h2>}
      <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {campi.map((k) => (
          <CampoNumero key={k} nome={k} etichetta={CAMPI_VIVO[k].etichetta} unita={CAMPI_VIVO[k].unita} valore={valori[k] ?? ''}
            onCambia={(v) => setValori((s) => ({ ...s, [k]: v }))} />
        ))}
      </div>
      {!analisi && <p class="text-sm text-segnale-scuro" role="alert">Controlla i numeri: servono valori positivi, con la virgola per i decimali.</p>}
      {analisi && (
        <div class="grid gap-6" aria-live="polite">
          {variante !== 'taeg' && <Totale a={analisi} />}
          {variante === 'taeg' && <Taeg a={analisi} />}
          {(variante === 'vfg' || variante === 'fine' || variante === 'maxi') && <FineContratto a={analisi} />}
          {(variante === 'noleggio' || variante === 'promo') && <ColonneStrade strade={analisi.treStrade} />}
        </div>
      )}
      <Disclaimer />
    </section>
  );
}
