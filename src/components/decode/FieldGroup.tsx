import type { DefCampo, Gruppo, StatoForm } from '~/lib/client/campi';
import { GLOSSARIO } from '~/lib/glossario';
import Termine from '../ui/Termine';

interface Props {
  gruppo: Gruppo;
  stato: StatoForm;
  daConfermare: ReadonlySet<string>;
  errori: ReadonlyMap<string, string>;
  /** Campi appena letti dalla foto e il loro ordine: si accendono uno dopo l'altro (specifica di movimento, F5). */
  letti?: ReadonlyMap<string, number> | undefined;
  onCambia: (chiave: DefCampo['chiave'], valore: string) => void;
}

/** Testo di aiuto, con la voce del glossario spiegabile al tocco se compare nel testo. */
function Aiuto({ def }: { def: DefCampo }) {
  const testo = def.aiuto ?? '';
  const voce = def.glossarioAiuto;
  const parola = voce ? GLOSSARIO[voce].termine : '';
  const i = voce ? testo.indexOf(parola) : -1;
  if (!voce || i < 0) return <>{testo}</>;
  return <>{testo.slice(0, i)}<Termine voce={voce} ambito="modulo-aiuto" />{testo.slice(i + parola.length)}</>;
}

function Campo({ def, valore, incerto, errore, letto, onCambia }: { def: DefCampo; valore: string; incerto: boolean; errore?: string | undefined; letto?: number | undefined; onCambia: Props['onCambia'] }) {
  const id = `campo-${def.chiave}`;
  const descrizione = [def.aiuto && `${id}-aiuto`, incerto && `${id}-incerto`, errore && `${id}-errore`].filter(Boolean).join(' ') || undefined;
  return (
    <div class="grid content-start gap-1">
      {/* Il «?» del glossario sta fuori dalla label: un pulsante non può stare dentro una label. */}
      <div class="text-sm font-medium flex items-center justify-between gap-2">
        <span class="inline-flex items-center">
          <label for={id}>{def.etichetta}{def.obbligatorio && <span class="text-segnale-scuro" aria-hidden="true"> *</span>}</label>
          {def.glossario && <Termine voce={def.glossario} ambito="modulo" icona />}
        </span>
        {def.unita && <span class="numeri text-xs text-tenue">{def.unita}</span>}
      </div>
      <input
        id={id}
        name={def.chiave}
        class={`campo ${incerto ? 'campo-da-confermare' : ''} ${letto != null ? 'campo-letto' : ''}`}
        style={letto != null ? { '--i': letto } : undefined}
        inputMode={def.tipo === 'testo' ? 'text' : def.tipo === 'intero' ? 'numeric' : 'decimal'}
        autoComplete="off"
        value={valore}
        required={def.obbligatorio}
        aria-invalid={errore ? 'true' : undefined}
        aria-describedby={descrizione}
        maxLength={def.chiave === 'provincia' ? 2 : 80}
        onInput={(e) => onCambia(def.chiave, (e.currentTarget as HTMLInputElement).value)}
      />
      {def.aiuto && <span id={`${id}-aiuto`} class="text-[0.8125rem] leading-snug text-tenue"><Aiuto def={def} /></span>}
      {incerto && <span id={`${id}-incerto`} class="text-[0.8125rem] text-[#8A6A00]">Da confermare: controlla questo numero sul preventivo.</span>}
      {errore && <span id={`${id}-errore`} class="text-[0.8125rem] text-segnale-scuro">{errore}</span>}
    </div>
  );
}

export default function FieldGroup({ gruppo, stato, daConfermare, errori, letti, onCambia }: Props) {
  const incerti = gruppo.campi.filter((c) => daConfermare.has(c.chiave)).length;
  const conErrori = gruppo.campi.some((c) => errori.has(c.chiave));
  return (
    <details class="group border-t border-riga py-4" open={gruppo.aperto || incerti > 0 || conErrori}>
      <summary class="flex min-h-11 cursor-pointer items-center justify-between gap-3 list-none py-2 font-semibold">
        <span>{gruppo.titolo}</span>
        <span class="flex items-center gap-3 text-sm font-normal">
          {incerti > 0 && <span class="numeri rounded-sm bg-attenzione/20 px-2 py-0.5 text-[#8A6A00]">{incerti} da confermare</span>}
          <span aria-hidden="true" class="transition-transform duration-200 group-open:rotate-45 text-xl leading-none">+</span>
        </span>
      </summary>
      {gruppo.nota && <p class="mt-2 text-sm text-tenue max-w-prose">{gruppo.nota}</p>}
      <div class="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {gruppo.campi.map((def) => (
          <Campo key={def.chiave} def={def} valore={stato[def.chiave] ?? ''} incerto={daConfermare.has(def.chiave)} errore={errori.get(def.chiave)} letto={letti?.get(def.chiave)} onCambia={onCambia} />
        ))}
      </div>
    </details>
  );
}
