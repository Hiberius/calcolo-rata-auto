import { useEffect, useRef, useState } from 'preact/hooks';
import { DIMENSIONE_MAX, MESSAGGI_FILE, preparaImmagine } from '~/lib/client/immagine';
import type { RispostaEstrazione } from '~/lib/extract/schema';
import TurnstileBox from './TurnstileBox';

type Fase =
  | { readonly tipo: 'vuoto' }
  | { readonly tipo: 'preparo' }
  | { readonly tipo: 'anteprima'; readonly blob: Blob; readonly url: string }
  | { readonly tipo: 'invio'; readonly blob: Blob; readonly url: string }
  | { readonly tipo: 'errore'; readonly messaggio: string };

interface Props {
  siteKey: string;
  onEstratto: (r: RispostaEstrazione) => void;
}

/** Oltre questo tempo la lettura si interrompe: meglio un messaggio chiaro che un'attesa senza uscita. */
const TIMEOUT_MS = 15_000;
const AVVISO_LENTO_MS = 3_000;
const MSG = {
  rete: 'Connessione assente o lenta: riprova, oppure inserisci i numeri a mano.',
  lento: 'Ci sta mettendo troppo: riprova o scrivi i numeri.',
  annullato: 'Lettura annullata. Puoi riprovare o scrivere i numeri.',
} as const;

async function invia(blob: Blob, token: string, segnale: AbortSignal): Promise<{ ok: true; dati: RispostaEstrazione } | { ok: false; messaggio: string }> {
  const form = new FormData();
  form.append('immagine', new File([blob], 'preventivo.jpg', { type: 'image/jpeg' }));
  form.append('cf-turnstile-response', token);
  try {
    const r = await fetch('/api/estrai', { method: 'POST', body: form, signal: segnale });
    const dati = (await r.json()) as ({ ok: true } & RispostaEstrazione) | { ok: false; errore: string };
    return dati.ok ? { ok: true, dati } : { ok: false, messaggio: dati.errore };
  } catch {
    if (segnale.aborted) return { ok: false, messaggio: segnale.reason === 'annullato' ? MSG.annullato : MSG.lento };
    return { ok: false, messaggio: MSG.rete };
  }
}

export default function UploadDropzone({ siteKey, onEstratto }: Props) {
  const [fase, setFase] = useState<Fase>({ tipo: 'vuoto' });
  const [token, setToken] = useState<string | null>(null);
  const [trascino, setTrascino] = useState(false);
  const [lento, setLento] = useState(false);
  const controllo = useRef<AbortController | null>(null);

  const urlAnteprima = 'url' in fase ? fase.url : null;
  useEffect(() => () => { if (urlAnteprima) URL.revokeObjectURL(urlAnteprima); }, [urlAnteprima]);

  async function scegli(file: File | undefined) {
    if (!file) return;
    setFase({ tipo: 'preparo' });
    try {
      const blob = await preparaImmagine(file);
      if (blob.size > DIMENSIONE_MAX) return setFase({ tipo: 'errore', messaggio: MESSAGGI_FILE.grande });
      setFase({ tipo: 'anteprima', blob, url: URL.createObjectURL(blob) });
    } catch {
      setFase({ tipo: 'errore', messaggio: MESSAGGI_FILE.formato });
    }
  }

  async function leggi() {
    if (fase.tipo !== 'anteprima' || !token) return;
    setFase({ ...fase, tipo: 'invio' });
    const c = new AbortController();
    controllo.current = c;
    const scadenza = setTimeout(() => c.abort('tempo'), TIMEOUT_MS);
    const avviso = setTimeout(() => setLento(true), AVVISO_LENTO_MS);
    const esito = await invia(fase.blob, token, c.signal);
    clearTimeout(scadenza);
    clearTimeout(avviso);
    setLento(false);
    controllo.current = null;
    if (esito.ok) {
      onEstratto(esito.dati);
      setFase({ tipo: 'vuoto' });
    } else {
      setFase({ tipo: 'errore', messaggio: esito.messaggio });
    }
    setToken(null);
  }

  if (fase.tipo === 'anteprima' || fase.tipo === 'invio') {
    return (
      <div class="grid gap-4 md:grid-cols-[minmax(0,18rem)_1fr] items-start entra">
        <img src={fase.url} alt="Anteprima del preventivo" class="w-full max-h-96 object-contain bg-white border border-riga rounded" />
        <div class="grid gap-4">
          <p class="font-medium">Copri o ritaglia nome e targa se vuoi: a noi servono solo i numeri.</p>
          <p class="text-sm text-tenue">L’immagine serve solo a leggere i numeri e non viene salvata da nessuna parte.</p>
          <TurnstileBox siteKey={siteKey} onToken={setToken} />
          <div class="flex flex-wrap gap-3">
            <button type="button" class="btn btn-primario" disabled={!token || fase.tipo === 'invio'} onClick={leggi}>
              {fase.tipo === 'invio' ? 'Leggo i numeri…' : 'Leggi i numeri'}
            </button>
            {fase.tipo === 'invio'
              ? <button type="button" class="btn btn-secondario" onClick={() => controllo.current?.abort('annullato')}>Annulla</button>
              : <button type="button" class="btn btn-secondario" onClick={() => setFase({ tipo: 'vuoto' })}>Scegli un altro file</button>}
          </div>
          <p class="text-sm text-tenue" role="status">
            {fase.tipo === 'invio' && lento ? 'Sto ancora leggendo: di solito servono dai 5 agli 8 secondi.' : ''}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div class="grid gap-3">
      <label
        class={`flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded px-6 py-10 text-center cursor-pointer transition-colors ${trascino ? 'border-segnale bg-[#FDEEE9]' : 'border-inchiostro/40 hover:border-inchiostro bg-white/40'}`}
        onDragOver={(e) => { e.preventDefault(); setTrascino(true); }}
        onDragLeave={() => setTrascino(false)}
        onDrop={(e) => { e.preventDefault(); setTrascino(false); void scegli(e.dataTransfer?.files[0]); }}
      >
        <span class="font-semibold text-lg">{fase.tipo === 'preparo' ? 'Preparo l’immagine…' : 'Fotografa o carica il preventivo'}</span>
        <span class="text-sm text-tenue">Foto, screenshot o PDF. La riduciamo nel telefono prima di inviarla.</span>
        <input
          type="file"
          accept="image/*,application/pdf"
          class="sr-only"
          disabled={fase.tipo === 'preparo'}
          onChange={(e) => void scegli((e.currentTarget as HTMLInputElement).files?.[0])}
        />
      </label>
      <label class="btn btn-secondario justify-self-start cursor-pointer">
        Scatta una foto
        <input
          type="file"
          accept="image/*"
          capture="environment"
          class="sr-only"
          disabled={fase.tipo === 'preparo'}
          onChange={(e) => void scegli((e.currentTarget as HTMLInputElement).files?.[0])}
        />
      </label>
      <p class="text-sm text-segnale-scuro" role="alert">{fase.tipo === 'errore' ? fase.messaggio : ''}</p>
    </div>
  );
}
