import { useMemo, useState } from 'preact/hooks';
import { analizza, TIPI_CONTRATTO, type Analisi, type TipoContratto } from '~/lib/calc';
import { GRUPPI, preventivoDaForm, unisciEstrazione, type DefCampo, type StatoForm } from '~/lib/client/campi';
import type { RispostaEstrazione } from '~/lib/extract/schema';
import { inviaEvento } from '~/lib/client/evento';
import { salvaPreventivo } from '~/lib/client/sessione';
import CreaScheda from './CreaScheda';
import { MESSAGGIO_TOTALE_INCOERENTE } from '~/lib/calc/totale';
import FieldGroup from './FieldGroup';
import ResultCard from './ResultCard';
import UploadDropzone from './UploadDropzone';

const ETICHETTE_TIPO: Record<TipoContratto, string> = { finanziamento: 'Finanziamento', leasing: 'Leasing', noleggio: 'Noleggio' };

type Modo = 'foto' | 'manuale';
type Calcolo = { readonly analisi: Analisi | null; readonly errori: ReadonlyMap<string, string> };

function calcola(stato: StatoForm): Calcolo {
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
  const preventivo = useMemo(() => preventivoDaForm(stato), [stato]);

  function cambia(chiave: DefCampo['chiave'] | 'tipo', valore: string) {
    setStato((s) => ({ ...s, [chiave]: valore }));
    setDaConfermare((d) => new Set([...d].filter((k) => k !== chiave)));
  }

  function estratto(r: RispostaEstrazione) {
    setStato((s) => unisciEstrazione(s, r.campi));
    setDaConfermare(new Set(r.daConfermare));
    setLetto(true);
    setModo('manuale');
    setCalcolo(null);
  }

  function invia(e: Event) {
    e.preventDefault();
    const risultato = calcola(stato);
    setCalcolo(risultato);
    setSchedaAperta(false);
    if (risultato.analisi) {
      if (daConfermare.size === 0 && !letto) inviaEvento('decodifica_manuale');
      requestAnimationFrame(() => document.getElementById('risultato')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
    } else {
      // Il focus va sul primo campo da correggere, anche se è in un gruppo più in alto.
      requestAnimationFrame(() => (document.querySelector('form[aria-label="Numeri del preventivo"] [aria-invalid="true"]') as HTMLElement | null)?.focus());
    }
  }

  const errori = calcolo?.errori ?? new Map<string, string>();
  return (
    <div class="grid gap-10">
      <div class="grid gap-6">
        <div role="group" aria-label="Come vuoi inserire il preventivo" class="inline-flex w-fit border-2 border-inchiostro rounded overflow-hidden">
          {(['foto', 'manuale'] as const).map((m) => (
            <button key={m} type="button" aria-pressed={modo === m} onClick={() => setModo(m)}
              class={`px-4 py-2.5 font-semibold transition-colors ${modo === m ? 'bg-inchiostro text-carta' : 'hover:bg-carta-scura'}`}>
              {m === 'foto' ? 'Carica una foto' : 'Scrivi i numeri'}
            </button>
          ))}
        </div>

        {modo === 'foto' && <UploadDropzone siteKey={siteKey} onEstratto={estratto} />}

        {modo === 'manuale' && (
          <form onSubmit={invia} noValidate class="grid gap-2" aria-label="Numeri del preventivo">
            {daConfermare.size > 0 && (
              <p class="text-sm bg-[#FFF8E1] border-l-4 border-attenzione px-3 py-2" role="status">
                Abbiamo letto i numeri. Quelli evidenziati in giallo vanno confermati: controllali sul preventivo prima di calcolare.
              </p>
            )}
            <fieldset class="flex flex-wrap gap-2 py-2">
              <legend class="text-sm font-medium mb-2">Tipo di contratto</legend>
              {TIPI_CONTRATTO.map((t) => (
                <label key={t} class={`cursor-pointer rounded border-2 px-3 py-2.5 text-sm transition-colors ${(stato.tipo || 'finanziamento') === t ? 'border-inchiostro bg-inchiostro text-carta' : 'border-riga hover:border-inchiostro'}`}>
                  <input type="radio" name="tipo" value={t} class="sr-only" checked={(stato.tipo || 'finanziamento') === t} onChange={() => cambia('tipo', t)} />
                  {ETICHETTE_TIPO[t]}
                </label>
              ))}
            </fieldset>
            {GRUPPI.map((g) => (
              <FieldGroup key={g.titolo} gruppo={g} stato={stato} daConfermare={daConfermare} errori={errori} onCambia={cambia} />
            ))}
            <div class="grid gap-2 pt-4">
              <p id="errori-form" class="text-sm text-segnale-scuro" role="alert">
                {errori.size > 0 ? `Controlla ${errori.size === 1 ? 'il campo segnalato' : `i ${errori.size} campi segnalati`}: servono almeno anticipo, numero di rate e rata.` : ''}
              </p>
              <button type="submit" class="btn btn-primario w-full sm:w-auto" aria-describedby={errori.size > 0 ? 'errori-form' : undefined}>Calcola quanto paghi davvero</button>
            </div>
          </form>
        )}
      </div>

      <div id="risultato" class="scroll-mt-6" aria-live="polite">
        {calcolo?.analisi && (
          <ResultCard
            analisi={calcolo.analisi}
            azioni={
              <>
                <div class="flex flex-wrap gap-3">
                  {!calcolo.analisi.totali.messaggi.includes(MESSAGGIO_TOTALE_INCOERENTE) && (
                    <button type="button" class="btn btn-primario" aria-expanded={schedaAperta} onClick={() => setSchedaAperta((v) => !v)}>Crea la scheda da condividere</button>
                  )}
                  <a class="btn btn-secondario" href="/noleggio" onClick={() => salvaPreventivo(preventivo)}>Confronta le tre strade</a>
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
