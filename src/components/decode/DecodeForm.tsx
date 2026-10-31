import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import type { Analisi, TipoContratto } from '~/lib/calc';
import { GRUPPI, preventivoDaForm, unisciEstrazione, type DefCampo, type StatoForm } from '~/lib/client/campi';
import type { RispostaEstrazione } from '~/lib/extract/schema';
import { inviaEvento } from '~/lib/client/evento';
import { ESEMPIO_208, etichettaEsempio } from '~/lib/esempio';
import { salvaPreventivo } from '~/lib/client/sessione';
import { ascoltaEsempio } from '~/lib/client/esempio';
import { scorriVerso } from '~/lib/motion';
import CreaScheda from './CreaScheda';
import { MESSAGGIO_TOTALE_INCOERENTE } from '~/lib/calc/totale';
import FieldGroup from './FieldGroup';
import ResultCard from './ResultCard';
import ScenaPigra from '../scene/ScenaPigra';
import UploadDropzone from './UploadDropzone';

const ETICHETTE_TIPO: Record<TipoContratto, string> = { finanziamento: 'Finanziamento', leasing: 'Leasing', noleggio: 'Noleggio' };
const TIPI: readonly TipoContratto[] = ['finanziamento', 'leasing', 'noleggio'];

/**
 * Il motore di calcolo con la validazione (zod, circa 30 kB gzip) non serve per mostrare il modulo: si scarica al primo
 * gesto sul modulo o alla richiesta dell'esempio, e il calcolo resta nel browser come prima.
 */
let motore: Promise<typeof import('~/lib/calc')> | null = null;
function caricaMotore(): Promise<typeof import('~/lib/calc')> {
  motore ??= import('~/lib/calc').catch((e: unknown) => { motore = null; throw e; });
  return motore;
}

type Modo = 'foto' | 'manuale';
type Calcolo = { readonly analisi: Analisi | null; readonly errori: ReadonlyMap<string, string> };

async function calcola(stato: StatoForm): Promise<Calcolo> {
  const { analizza } = await caricaMotore();
  const esito = analizza(preventivoDaForm(stato));
  if (esito.ok) return { analisi: esito.analisi, errori: new Map() };
  return { analisi: null, errori: new Map(esito.errori.map((e) => [e.campo, e.messaggio])) };
}

export default function DecodeForm({ siteKey }: { siteKey: string }) {
  const [modo, setModo] = useState<Modo>('foto');
  const [stato, setStato] = useState<StatoForm>({});
  const [daConfermare, setDaConfermare] = useState<ReadonlySet<string>>(new Set());
  const [calcolo, setCalcolo] = useState<Calcolo | null>(null);
  const [schedaAperta, setSchedaAperta] = useState(false);
  const [letto, setLetto] = useState(false);
  const [esempio, setEsempio] = useState(false);
  /** Campi appena letti dalla foto, con l'ordine in cui si accendono (F5): il lampo vale solo la prima volta. */
  const [letti, setLetti] = useState<ReadonlyMap<string, number>>(new Map());
  const [erroreMotore, setErroreMotore] = useState(false);
  const preventivo = useMemo(() => preventivoDaForm(stato), [stato]);
  const caricaEsempio = useRef<() => void>(() => undefined);

  function vaiAlRisultato() {
    // Il fuoco va sul risultato: chi usa un lettore di schermo lo sente arrivare senza una regione live da 1.800 caratteri.
    requestAnimationFrame(() => {
      const el = document.getElementById('risultato');
      scorriVerso(el);
      el?.focus({ preventScroll: true });
    });
  }

  function cambia(chiave: DefCampo['chiave'] | 'tipo', valore: string) {
    setEsempio(false);
    setLetti((l) => (l.has(chiave) ? new Map([...l].filter(([k]) => k !== chiave)) : l));
    setStato((s) => ({ ...s, [chiave]: valore }));
    setDaConfermare((d) => new Set([...d].filter((k) => k !== chiave)));
  }

  /** Carica il preventivo d'esempio e mostra subito il risultato, con l'etichetta che dice cos'è. */
  async function provaEsempio() {
    setStato(ESEMPIO_208);
    setDaConfermare(new Set());
    setLetti(new Map());
    setLetto(false);
    setModo('manuale');
    setSchedaAperta(false);
    setEsempio(true);
    const risultato = await calcolaSicuro(ESEMPIO_208);
    if (!risultato) return;
    setCalcolo(risultato);
    vaiAlRisultato();
  }

  /** Calcola; se il motore non si scarica (rete), lo dice invece di restare fermo. */
  async function calcolaSicuro(s: StatoForm): Promise<Calcolo | null> {
    try {
      const risultato = await calcola(s);
      setErroreMotore(false);
      return risultato;
    } catch {
      setErroreMotore(true);
      return null;
    }
  }

  caricaEsempio.current = provaEsempio;
  // Il pulsante dell'esempio sta nell'hero: arriva con un evento, o con /?esempio=1 se il JavaScript non c'era ancora.
  useEffect(() => ascoltaEsempio(document, window, () => caricaEsempio.current()), []);

  function estratto(r: RispostaEstrazione) {
    setEsempio(false);
    // Si accendono solo i campi che arrivano dalla foto, non quelli già scritti a mano (unisciEstrazione li tiene).
    const giaScritti = new Set(Object.entries(stato).filter(([, v]) => v && v.trim() !== '').map(([k]) => k));
    setLetti(new Map(Object.keys(r.campi).filter((k) => !giaScritti.has(k)).map((k, i) => [k, i])));
    setStato((s) => unisciEstrazione(s, r.campi));
    setDaConfermare(new Set(r.daConfermare));
    setLetto(true);
    setModo('manuale');
    setCalcolo(null);
  }

  async function invia(e: Event) {
    e.preventDefault();
    const risultato = await calcolaSicuro(stato);
    if (!risultato) return;
    setCalcolo(risultato);
    setSchedaAperta(false);
    if (risultato.analisi) {
      if (daConfermare.size === 0 && !letto && !esempio) inviaEvento('decodifica_manuale');
      vaiAlRisultato();
    } else {
      // Il focus va sul primo campo da correggere, anche se è in un gruppo più in alto.
      requestAnimationFrame(() => (document.querySelector('form[aria-label="Numeri del preventivo"] [aria-invalid="true"]') as HTMLElement | null)?.focus());
    }
  }

  const errori = calcolo?.errori ?? new Map<string, string>();
  return (
    <div class="grid gap-10" onPointerDown={() => void caricaMotore().catch(() => undefined)} onFocusIn={() => void caricaMotore().catch(() => undefined)}>
      <div class="grid gap-6">
        <div class="flex flex-wrap items-center gap-3">
          {/* Niente overflow sul gruppo: l'anello del fuoco (3 px) sta dentro il pulsante e non viene tagliato. */}
          <div role="group" aria-label="Come vuoi inserire il preventivo" class="grid w-full grid-cols-2 border-2 border-inchiostro rounded-[var(--raggio)] sm:inline-grid sm:w-fit">
            {(['foto', 'manuale'] as const).map((m) => (
              <button key={m} type="button" aria-pressed={modo === m} onClick={() => setModo(m)}
                class={`relative min-h-11 px-4 py-2.5 font-semibold transition-colors focus-visible:z-10 focus-visible:[outline-offset:-5px] ${modo === m ? 'bg-inchiostro text-carta focus-visible:[outline-color:var(--scena-segnale)]' : 'hover:bg-carta-scura'}`}>
                {m === 'foto' ? 'Carica una foto' : 'Scrivi i numeri'}
              </button>
            ))}
          </div>
        </div>

        {modo === 'foto' && <UploadDropzone siteKey={siteKey} onEstratto={estratto} />}

        {modo === 'manuale' && (
          <form onSubmit={invia} noValidate class="grid gap-2" aria-label="Numeri del preventivo">
            {daConfermare.size > 0 && (
              <p class="text-sm bg-[#FFF8E1] border-t-2 border-attenzione px-3 py-2" role="status">
                Abbiamo letto i numeri. Quelli evidenziati in giallo vanno confermati: controllali sul preventivo prima di calcolare.
              </p>
            )}
            <fieldset class="flex flex-wrap gap-2 py-2">
              <legend class="text-sm font-medium mb-2">Tipo di contratto</legend>
              {TIPI.map((t) => (
                <label key={t} class={`cursor-pointer rounded border-2 px-3 py-2.5 text-sm transition-colors ${(stato.tipo || 'finanziamento') === t ? 'border-inchiostro bg-inchiostro text-carta' : 'border-riga hover:border-inchiostro'}`}>
                  <input type="radio" name="tipo" value={t} class="sr-only" checked={(stato.tipo || 'finanziamento') === t} onChange={() => cambia('tipo', t)} />
                  {ETICHETTE_TIPO[t]}
                </label>
              ))}
            </fieldset>
            {GRUPPI.map((g) => (
              <FieldGroup key={g.titolo} gruppo={g} stato={stato} daConfermare={daConfermare} errori={errori} letti={letti} onCambia={cambia} />
            ))}
            <div class="grid gap-2 pt-4">
              <p id="errori-form" class="text-sm text-segnale-scuro" role="alert">
                {erroreMotore ? 'Il calcolo non si è caricato: controlla la connessione e riprova.'
                  : errori.size > 0 ? `Controlla ${errori.size === 1 ? 'il campo segnalato' : `i ${errori.size} campi segnalati`}: servono almeno anticipo, numero di rate e rata.` : ''}
              </p>
              <button type="submit" class="btn btn-primario w-full sm:w-auto" aria-describedby={errori.size > 0 ? 'errori-form' : undefined}>Calcola quanto paghi davvero</button>
            </div>
          </form>
        )}
      </div>

      <div id="risultato" class="scroll-mt-6 grid gap-10 focus:outline-none" tabIndex={-1} aria-label="Risultato">
        {calcolo?.analisi && <ScenaPigra preventivo={calcolo.analisi.preventivo} etichetta={esempio ? etichettaEsempio() : undefined} />}
        {calcolo?.analisi && (
          <ResultCard
            analisi={calcolo.analisi}
            conta={false}
            etichetta={esempio ? etichettaEsempio() : undefined}
            azioni={
              <>
                <div class="flex flex-wrap gap-3">
                  {/* L'esempio non diventa una scheda: l'archivio raccoglie solo preventivi veri delle persone. */}
                  {!esempio && !calcolo.analisi.totali.messaggi.includes(MESSAGGIO_TOTALE_INCOERENTE) && (
                    <button type="button" class="btn btn-primario" aria-expanded={schedaAperta} onClick={() => setSchedaAperta((v) => !v)}>Crea la scheda da condividere</button>
                  )}
                  <a class="btn btn-secondario" href="/noleggio" onClick={() => salvaPreventivo(preventivo)}>Confronta con contanti e noleggio</a>
                </div>
                {schedaAperta && <CreaScheda siteKey={siteKey} preventivo={preventivo} />}
              </>
            }
          />
        )}
      </div>
    </div>
  );
}
