import { useMemo, useState } from 'preact/hooks';
import { analizza, TIPI_CONTRATTO, type Analisi, type TipoContratto } from '~/lib/calc';
import { GRUPPI, preventivoDaForm, unisciEstrazione, type DefCampo, type StatoForm } from '~/lib/client/campi';
import type { RispostaEstrazione } from '~/lib/extract/schema';
import CreaScheda from './CreaScheda';
import FieldGroup from './FieldGroup';
import ResultCard from './ResultCard';
import UploadDropzone from './UploadDropzone';

export const CHIAVE_SESSIONE = 'ratavera:preventivo';
const ETICHETTE_TIPO: Record<TipoContratto, string> = { finanziamento: 'Finanziamento', leasing: 'Leasing', noleggio: 'Noleggio' };

type Modo = 'foto' | 'manuale';
type Calcolo = { readonly analisi: Analisi | null; readonly errori: ReadonlyMap<string, string> };

function calcola(stato: StatoForm): Calcolo {
  const esito = analizza(preventivoDaForm(stato));
  if (esito.ok) return { analisi: esito.analisi, errori: new Map() };
  return { analisi: null, errori: new Map(esito.errori.map((e) => [e.campo, e.messaggio])) };
}

function salvaInSessione(preventivo: Record<string, unknown>): void {
  try {
    sessionStorage.setItem(CHIAVE_SESSIONE, JSON.stringify(preventivo));
  } catch {
    // sessionStorage può essere bloccato: il confronto parte comunque con l'inserimento manuale.
  }
}

export default function DecodeForm({ siteKey }: { siteKey: string }) {
  const [modo, setModo] = useState<Modo>('foto');
  const [stato, setStato] = useState<StatoForm>({});
  const [daConfermare, setDaConfermare] = useState<ReadonlySet<string>>(new Set());
  const [calcolo, setCalcolo] = useState<Calcolo | null>(null);
  const [schedaAperta, setSchedaAperta] = useState(false);
  const preventivo = useMemo(() => preventivoDaForm(stato), [stato]);

  function cambia(chiave: DefCampo['chiave'] | 'tipo', valore: string) {
    setStato((s) => ({ ...s, [chiave]: valore }));
    setDaConfermare((d) => new Set([...d].filter((k) => k !== chiave)));
  }

  function estratto(r: RispostaEstrazione) {
    setStato((s) => unisciEstrazione(s, r.campi));
    setDaConfermare(new Set(r.daConfermare));
    setModo('manuale');
    setCalcolo(null);
  }

  function invia(e: Event) {
    e.preventDefault();
    const risultato = calcola(stato);
    setCalcolo(risultato);
    setSchedaAperta(false);
    if (risultato.analisi) {
      requestAnimationFrame(() => document.getElementById('risultato')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
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
                <label key={t} class={`cursor-pointer rounded border-2 px-3 py-1.5 text-sm transition-colors ${(stato.tipo || 'finanziamento') === t ? 'border-inchiostro bg-inchiostro text-carta' : 'border-riga hover:border-inchiostro'}`}>
                  <input type="radio" name="tipo" value={t} class="sr-only" checked={(stato.tipo || 'finanziamento') === t} onChange={() => cambia('tipo', t)} />
                  {ETICHETTE_TIPO[t]}
                </label>
              ))}
            </fieldset>
            {GRUPPI.map((g) => (
              <FieldGroup key={g.titolo} gruppo={g} stato={stato} daConfermare={daConfermare} errori={errori} onCambia={cambia} />
            ))}
            {errori.size > 0 && <p class="text-sm text-segnale-scuro" role="alert">Controlla i campi segnalati: servono almeno anticipo, numero di rate e rata.</p>}
            <div class="pt-4"><button type="submit" class="btn btn-primario w-full sm:w-auto">Calcola quanto paghi davvero</button></div>
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
                  <button type="button" class="btn btn-primario" aria-expanded={schedaAperta} onClick={() => setSchedaAperta((v) => !v)}>Crea la scheda da condividere</button>
                  <a class="btn btn-secondario" href="/noleggio" onClick={() => salvaInSessione(preventivo)}>Confronta le tre strade</a>
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
