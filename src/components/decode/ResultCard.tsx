import type { ComponentChildren } from 'preact';
import type { Analisi } from '~/lib/calc';
import { percentuale } from '~/lib/calc/format';
import { importo } from '~/lib/formato';
import NumeroCheConta from '../ui/NumeroCheConta';
import Callout from '../ui/Callout';
import Disclaimer from '../ui/Disclaimer';
import ComposizioneTotale from '../ui/ComposizioneTotale';
import SpiegazioneTaeg from '../ui/SpiegazioneTaeg';
import ScenariFine from './ScenariFine';
import { t as testo } from '~/markets';

const TIPO_PREZZO = { contanti: 'in contanti', promo: 'promozionale', listino: 'di listino', assente: '' } as const;
const euro = (v: number | null | undefined): string => importo(v, 'scena');

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
  /** Prefisso degli id del glossario: unico nella pagina. */
  ambito?: string;
  /** Etichetta sopra il risultato (es. per il preventivo d'esempio). */
  etichetta?: string | undefined;
}

export default function ResultCard({ analisi: a, azioni, ambito = 'risultato', etichetta }: Props) {
  const t = a.totali;
  const p = a.preventivo;
  const m = a.mercato;
  const titolo = [p.marca, p.modello, p.versione].filter(Boolean).join(' ');
  return (
    <article class="scontrino px-5 py-8 sm:px-10 sm:py-12 grid gap-10" aria-labelledby="totale-titolo" data-risultato data-stampa>
      <header class="grid gap-3">
        {etichetta && <p class="riga-scontrino numeri w-fit border border-inchiostro px-2 py-0.5 text-xs uppercase tracking-[0.08em]" style={{ '--i': 0 }} data-etichetta-esempio>{etichetta}</p>}
        <p class="riga-scontrino numeri text-sm text-tenue" style={{ '--i': 1 }}>{titolo || testo(m, 'risultato.tuoPreventivo')} · <s class="rata-barrata">{testo(m, 'risultato.alMese', { importo: euro(p.rata) })}</s></p>
        {/* F3: il totale conta da zero quando lo scontrino è in vista; poi si sottolinea il costo del credito. */}
        <h2 id="totale-titolo" class="riga-scontrino grid gap-1" style={{ '--i': 2 }}>
          <span class="text-lg font-medium">{testo(m, 'risultato.paghiDavvero')}</span>{' '}
          <NumeroCheConta valore={t.totalePagatoTenendo} class="numero-eroe" dato="totale" />
        </h2>
        {t.prezzoRiferimento != null && (
          <p class="riga-scontrino numeri" style={{ '--i': 3 }}>Prezzo {TIPO_PREZZO[t.prezzoRiferimentoTipo]} {euro(t.prezzoRiferimento)}</p>
        )}
      </header>

      {t.costoCredito != null && (
        <section class="riga-scontrino grid gap-2 border-y-2 border-segnale py-4" style={{ '--i': 4 }} aria-label="Costo del credito">
          <p class="flex flex-wrap items-baseline justify-between gap-3 text-segnale-scuro">
            <span class="font-semibold text-lg">{testo(m, 'risultato.costoCredito')}</span>
            <span class="numeri flex flex-wrap items-baseline gap-x-3 font-semibold">
              <span class="traccia-costo text-3xl sm:text-4xl whitespace-nowrap">{euro(t.costoCredito)}</span>
              <span class="text-xl sm:text-2xl whitespace-nowrap">{percentuale(t.costoCreditoPct)} {testo(m, 'risultato.delPrezzo')}</span>
            </span>
          </p>
          <p class="font-medium">{a.verdetto.etichetta}</p>
          {a.verdetto.fraseQuotaRata && <p class="text-tenue">{a.verdetto.fraseQuotaRata}</p>}
          <SpiegazioneTaeg ambito={`${ambito}-costo`} />
        </section>
      )}
      {t.costoCredito == null && <p class="font-medium">{a.verdetto.etichetta}</p>}

      {t.messaggi.length > 0 && <div class="grid gap-2">{t.messaggi.map((m) => <Callout key={m}>{m}</Callout>)}</div>}

      <section class="grid gap-3" aria-labelledby="composizione-titolo">
        <h3 id="composizione-titolo" class="font-semibold text-lg">{testo(m, 'risultato.composizione')}</h3>
        <ComposizioneTotale analisi={a} ambito={`${ambito}-voci`} primaRiga={5} />
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
        <h3 id="fine-titolo" class="font-semibold text-lg">{testo(m, 'risultato.fineContratto')}</h3>
        <ScenariFine scenari={a.scenari} />
      </section>

      <div class="grid gap-4">{azioni}</div>
      <Disclaimer ambito={`${ambito}-avvertenza`} />
    </article>
  );
}
