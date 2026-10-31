import type { DefCampo, Gruppo, StatoForm } from '~/lib/client/campi';

interface Props {
  gruppo: Gruppo;
  stato: StatoForm;
  daConfermare: ReadonlySet<string>;
  errori: ReadonlyMap<string, string>;
  onCambia: (chiave: DefCampo['chiave'], valore: string) => void;
}

function Campo({ def, valore, incerto, errore, onCambia }: { def: DefCampo; valore: string; incerto: boolean; errore?: string | undefined; onCambia: Props['onCambia'] }) {
  const id = `campo-${def.chiave}`;
  const descrizione = [def.aiuto && `${id}-aiuto`, incerto && `${id}-incerto`, errore && `${id}-errore`].filter(Boolean).join(' ') || undefined;
  return (
    <div class="grid gap-1">
      <label for={id} class="text-sm font-medium flex items-baseline justify-between gap-2">
        <span>{def.etichetta}{def.obbligatorio && <span class="text-segnale" aria-hidden="true"> *</span>}</span>
        {def.unita && <span class="numeri text-xs text-tenue">{def.unita}</span>}
      </label>
      <input
        id={id}
        name={def.chiave}
        class={`campo ${incerto ? 'campo-da-confermare' : ''}`}
        inputMode={def.tipo === 'testo' ? 'text' : def.tipo === 'intero' ? 'numeric' : 'decimal'}
        autoComplete="off"
        value={valore}
        required={def.obbligatorio}
        aria-invalid={errore ? 'true' : undefined}
        aria-describedby={descrizione}
        maxLength={def.chiave === 'provincia' ? 2 : 80}
        onInput={(e) => onCambia(def.chiave, (e.currentTarget as HTMLInputElement).value)}
      />
      {def.aiuto && <span id={`${id}-aiuto`} class="text-xs text-tenue">{def.aiuto}</span>}
      {incerto && <span id={`${id}-incerto`} class="text-xs text-[#8A6A00]">Da confermare: controlla questo numero sul preventivo.</span>}
      {errore && <span id={`${id}-errore`} class="text-xs text-segnale-scuro">{errore}</span>}
    </div>
  );
}

export default function FieldGroup({ gruppo, stato, daConfermare, errori, onCambia }: Props) {
  const incerti = gruppo.campi.filter((c) => daConfermare.has(c.chiave)).length;
  return (
    <details class="group border-t border-riga py-4" open={gruppo.aperto || incerti > 0}>
      <summary class="flex cursor-pointer items-center justify-between gap-3 list-none font-semibold">
        <span>{gruppo.titolo}</span>
        <span class="flex items-center gap-3 text-sm font-normal">
          {incerti > 0 && <span class="numeri rounded-sm bg-attenzione/20 px-2 py-0.5 text-[#8A6A00]">{incerti} da confermare</span>}
          <span aria-hidden="true" class="transition-transform duration-200 group-open:rotate-45 text-xl leading-none">+</span>
        </span>
      </summary>
      {gruppo.nota && <p class="mt-2 text-sm text-tenue max-w-prose">{gruppo.nota}</p>}
      <div class="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {gruppo.campi.map((def) => (
          <Campo key={def.chiave} def={def} valore={stato[def.chiave] ?? ''} incerto={daConfermare.has(def.chiave)} errore={errori.get(def.chiave)} onCambia={onCambia} />
        ))}
      </div>
    </details>
  );
}
