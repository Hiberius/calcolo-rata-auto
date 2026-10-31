import type { ComponentChildren } from 'preact';
import { useEffect, useRef } from 'preact/hooks';
import type { Analisi } from '~/lib/calc';
import { costoCreditoPct, importo, percentuale, tipografia } from '~/lib/formato';
import { stampaAllaVista } from '~/lib/client/stampa';
import NumeroCheConta from '../ui/NumeroCheConta';
import Callout from '../ui/Callout';
import Disclaimer from '../ui/Disclaimer';
import ComposizioneTotale from '../ui/ComposizioneTotale';
import SpiegazioneTaeg from '../ui/SpiegazioneTaeg';
import ScenariFine from './ScenariFine';
import { attorno, t as testo } from '~/markets';

const TIPO_PREZZO = { contanti: 'in contanti', promo: 'promozionale', listino: 'di listino', assente: '' } as const;
const euro = (v: number | null | undefined): string => importo(v, 'scena');

/** Dove sta il costo rispetto alle soglie dichiarate, senza ripetere la percentuale già scritta sopra in grande. */
function fraseSoglia(a: Analisi): string {
  const { livello } = a.verdetto;
  const { basso, alto } = a.mercato.soglie;
  if (a.mercato.lingua !== 'it-IT' || livello === 'non_applicabile') return tipografia(a.verdetto.etichetta);
  const b = percentuale(basso, 0);
  const s = percentuale(alto, 0);
  if (livello === 'basso') return `Sotto il ${b} del prezzo, la soglia bassa che usiamo.`;
  if (livello === 'medio') return `Tra il ${b} e il ${s} del prezzo, le soglie che usiamo.`;
  return `Oltre il ${s} del prezzo, la soglia alta che usiamo.`;
}

/**
 * Controlli sui numeri in un blocco solo: il titolo sul TAEG non dice «i conti tornano» se un'altra riga dice che
 * qualcosa non torna (revisione del 31/10: SEAT Arona, TAEG coerente ma totale dovuto diverso di 6,40 € dalla somma
 * delle voci della stessa fonte).
 */
function Controlli({ a }: { a: Analisi }) {
  const { stato, nota } = a.taeg;
  const discrepanze = a.ricostruzione.discrepanze;
  const messaggi = a.totali.messaggi;
  if (stato === 'non_calcolabile' && discrepanze.length === 0 && messaggi.length === 0) return <p class="nota text-tenue">{tipografia(nota)}</p>;
  const titoloTaeg = stato === 'in_linea'
    ? (discrepanze.length > 0 ? 'TAEG coerente con i numeri del preventivo' : 'TAEG: torna con i numeri del preventivo')
    : stato === 'da_verificare' ? 'TAEG: da verificare' : 'TAEG non indicato';
  return (
    <section class="grid gap-3" aria-labelledby="controlli-titolo">
      <h3 id="controlli-titolo" class="font-semibold text-lg">Controlli sui numeri</h3>
      {stato !== 'non_calcolabile'
        ? <Callout tono={stato === 'in_linea' ? 'ok' : 'attenzione'} titolo={titoloTaeg}>{tipografia(nota)}</Callout>
        : <p class="nota text-tenue">{tipografia(nota)}</p>}
      {discrepanze.map((d) => (
        <Callout key={d.campo} tono="attenzione" titolo={`${d.etichetta}: da verificare`}>
          {tipografia(`${euro(d.dichiarato)} dichiarato, ${euro(d.ricostruito)} dai numeri visibili. ${d.messaggio}`)}
        </Callout>
      ))}
      {messaggi.map((m) => <Callout key={m}>{tipografia(m)}</Callout>)}
    </section>
  );
}

interface Props {
  analisi: Analisi;
  azioni: ComponentChildren;
  /** Prefisso degli id del glossario: unico nella pagina. */
  ambito?: string;
  /** Etichetta sopra il risultato (es. per il preventivo d'esempio). */
  etichetta?: string | undefined;
  /** false quando la scena sopra ha già contato lo stesso totale: qui resta fermo, conta una volta sola. */
  conta?: boolean;
}

/**
 * Il risultato: lo scontrino (36rem, la stessa misura di scheda e promo) e accanto, da 1024 px, la fine del contratto e
 * le azioni. Lo scontrino si stampa quando entra nello schermo (F1), non al montaggio.
 */
export default function ResultCard({ analisi: a, azioni, ambito = 'risultato', etichetta, conta = true }: Props) {
  const t = a.totali;
  const p = a.preventivo;
  const m = a.mercato;
  const titolo = [p.marca, p.modello, p.versione].filter(Boolean).join(' ');
  const scontrino = useRef<HTMLElement>(null);
  useEffect(() => (scontrino.current ? stampaAllaVista(scontrino.current) : undefined), []);
  const [primaRata, dopoRata] = attorno(m, 'risultato.alMese', 'importo');
  return (
    <div class="risultato-griglia" data-risultato-griglia>
      <article ref={scontrino} class="scontrino px-5 py-8 sm:px-9 sm:py-10 grid gap-9" aria-labelledby="totale-titolo" data-risultato data-stampa-vista
        style={conta ? undefined : { '--ritardo-traccia': '760ms' }}>
        <header class="grid gap-3">
          {etichetta && <p class="riga-scontrino numeri w-fit border border-inchiostro px-2 py-0.5 text-xs uppercase tracking-[0.08em]" style={{ '--i': 0 }} data-etichetta-esempio>{etichetta}</p>}
          <p class="riga-scontrino numeri text-sm text-tenue" style={{ '--i': 1 }}>
            <span class="block">{titolo || testo(m, 'risultato.tuoPreventivo')}</span>
            <span class="whitespace-nowrap">{primaRata}<s class="rata-barrata">{euro(p.rata)}</s>{dopoRata}</span>
          </p>
          {/* F3: il totale conta da zero quando lo scontrino è in vista; poi si sottolinea il costo del credito. */}
          <h2 id="totale-titolo" class="riga-scontrino grid gap-1" style={{ '--i': 2 }}>
            <span class="text-lg font-medium">{testo(m, 'risultato.paghiDavvero')}</span>{' '}
            <NumeroCheConta valore={t.totalePagatoTenendo} class="numero-eroe numero-scontrino" dato="totale" conta={conta} />
          </h2>
          {t.prezzoRiferimento != null && (
            <p class="riga-scontrino numeri" style={{ '--i': 3 }}>Prezzo {TIPO_PREZZO[t.prezzoRiferimentoTipo]} {euro(t.prezzoRiferimento)}</p>
          )}
        </header>

        {t.costoCredito != null && (
          <section class="riga-scontrino grid gap-2 border-y-2 border-segnale py-4" style={{ '--i': 4 }} aria-label="Costo del credito">
            <p class="grid gap-1 text-segnale-scuro">
              <span class="font-semibold text-lg">{testo(m, 'risultato.costoCredito')}</span>
              <span class="numeri flex flex-wrap items-baseline gap-x-3 gap-y-1 font-semibold">
                <span class="traccia-costo text-3xl sm:text-4xl whitespace-nowrap">{euro(t.costoCredito)}</span>
                <span class="text-xl sm:text-2xl whitespace-nowrap">{costoCreditoPct(t.costoCreditoPct)} {testo(m, 'risultato.delPrezzo')}</span>
              </span>
            </p>
            <p class="font-medium">{fraseSoglia(a)}</p>
            {a.verdetto.fraseQuotaRata && <p class="text-tenue">{tipografia(a.verdetto.fraseQuotaRata)}</p>}
            <SpiegazioneTaeg ambito={`${ambito}-costo`} />
          </section>
        )}
        {t.costoCredito == null && <p class="font-medium">{tipografia(a.verdetto.etichetta)}</p>}

        <section class="grid gap-3" aria-labelledby="composizione-titolo">
          <h3 id="composizione-titolo" class="font-semibold text-lg">{testo(m, 'risultato.composizione')}</h3>
          <ComposizioneTotale analisi={a} ambito={`${ambito}-voci`} primaRiga={5} />
        </section>

        <Controlli a={a} />
      </article>

      <div class="grid content-start gap-10">
        <section class="grid gap-3" aria-labelledby="fine-titolo">
          <h3 id="fine-titolo" class="titolo-scheda">{testo(m, 'risultato.fineContratto')}</h3>
          <ScenariFine scenari={a.scenari} />
        </section>
        {azioni && <div class="grid gap-4">{azioni}</div>}
        <Disclaimer ambito={`${ambito}-avvertenza`} />
      </div>
    </div>
  );
}
