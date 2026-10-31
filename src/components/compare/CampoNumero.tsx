interface Props {
  nome: string;
  etichetta: string;
  unita: string;
  valore: string;
  onCambia: (valore: string) => void;
  aiuto?: string | undefined;
  invalido?: boolean | undefined;
}

/** Campo numerico all'italiana (virgola decimale), con l'unità dentro il campo. */
export default function CampoNumero({ nome, etichetta, unita, valore, onCambia, aiuto, invalido = false }: Props) {
  const idAiuto = aiuto ? `${nome}-aiuto` : undefined;
  return (
    <label class="grid gap-1 text-sm">
      <span class="font-medium">{etichetta}</span>
      <span class="relative">
        <input
          class="campo pr-14"
          name={nome}
          inputMode="decimal"
          autoComplete="off"
          value={valore}
          aria-invalid={invalido}
          aria-describedby={idAiuto}
          onInput={(e) => onCambia((e.currentTarget as HTMLInputElement).value)}
        />
        <span class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 numeri text-xs text-tenue">{unita}</span>
      </span>
      {aiuto && <span id={idAiuto} class="text-[0.8125rem] leading-snug text-tenue">{aiuto}</span>}
    </label>
  );
}
