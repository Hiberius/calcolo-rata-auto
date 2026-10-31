import type { ComponentChildren } from 'preact';
import type { Analisi } from '~/lib/calc';
import { euro, percentuale } from '~/lib/calc/format';
import Callout from '../ui/Callout';
import Disclaimer from '../ui/Disclaimer';
import ComposizioneTotale from '../ui/ComposizioneTotale';
import { SPIEGAZIONE_TAEG_COSTO } from '~/lib/calc/composizione';
import ScenariFine from './ScenariFine';

const TIPO_PREZZO = { contanti: 'in contanti', promo: 'promozionale', listino: 'di listino', assente: '' } as const;

function Taeg({ a }: { a: Analisi }) {
  const { stato, nota } = a.taeg;
  if (stato === 'non_calcolabile') return <p class="text-sm text-tenue">{nota}</p>;
  return (
    <Callout tono={stato === 'in_linea' ? 'ok' : 'attenzione'} titolo={stato === 'in_linea' ? 'TAEG: i conti tornano' : stato === 'da_verificare' ? 'TAEG: da verificare' : 'TAEG non indicato'}>
      {nota}
    </Callout>
  );
}

interface Props {
  analisi: Analisi;
  azioni: ComponentChildren;
}

export default function ResultCard({ analisi: a, azioni }: Props) {
  const t = a.totali;
  const p = a.preventivo;
  const titolo = [p.marca, p.modello, p.versione].filter(Boolean).join(' ');
  return (
    <article class="scontrino rounded-t px-5 py-8 sm:px-10 sm:py-12 grid gap-10 entra" aria-labelledby="totale-titolo" data-risultato>
      <header class="grid gap-3">
        <p class="numeri text-sm text-tenue">{titolo || 'Il tuo preventivo'} · <s>a {euro(p.rata)} al mese</s></p>
        <h2 id="totale-titolo" class="grid gap-1">
          <span class="text-lg font-medium">Paghi davvero</span>
          <span class="numeri totale-grande" data-totale>{euro(t.totalePagatoTenendo)}</span>
        </h2>
        {t.prezzoRiferimento != null && (
          <p class="numeri">Prezzo {TIPO_PREZZO[t.prezzoRiferimentoTipo]} {euro(t.prezzoRiferimento)}</p>
        )}
      </header>

      {t.costoCredito != null && (
        <section class="grid gap-2 border-y-2 border-segnale py-4" aria-label="Costo del credito">
          <p class="flex flex-wrap items-baseline justify-between gap-3 text-segnale-scuro">
            <span class="font-semibold text-lg">Costo del credito</span>
            <span class="numeri flex flex-wrap items-baseline gap-x-3 font-semibold">
              <span class="text-3xl sm:text-4xl whitespace-nowrap">{euro(t.costoCredito)}</span>
              <span class="text-xl sm:text-2xl whitespace-nowrap">{percentuale(t.costoCreditoPct)} del prezzo</span>
            </span>
          </p>
          <p class="font-medium">{a.verdetto.etichetta}</p>
          {a.verdetto.fraseQuotaRata && <p class="text-tenue">{a.verdetto.fraseQuotaRata}</p>}
          <p class="text-sm text-tenue" data-spiegazione-taeg>{SPIEGAZIONE_TAEG_COSTO}</p>
        </section>
      )}
      {t.costoCredito == null && <p class="font-medium">{a.verdetto.etichetta}</p>}

      {t.messaggi.length > 0 && <div class="grid gap-2">{t.messaggi.map((m) => <Callout key={m}>{m}</Callout>)}</div>}

      <section class="grid gap-3" aria-labelledby="composizione-titolo">
        <h3 id="composizione-titolo" class="font-semibold text-lg">Da dove viene il totale</h3>
        <ComposizioneTotale analisi={a} />
      </section>

      <section class="grid gap-3">
        <Taeg a={a} />
        {a.ricostruzione.discrepanze.map((d) => (
          <Callout key={d.campo} tono="attenzione" titolo={`${d.etichetta}: ${euro(d.dichiarato)} dichiarato, ${euro(d.ricostruito)} dai numeri visibili`}>
            {d.messaggio}
          </Callout>
        ))}
      </section>

      <section class="grid gap-3" aria-labelledby="fine-titolo">
        <h3 id="fine-titolo" class="font-semibold text-lg">Alla fine del contratto</h3>
        <ScenariFine scenari={a.scenari} />
      </section>

      <div class="grid gap-4">{azioni}</div>
      <Disclaimer />
    </article>
  );
}
