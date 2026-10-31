import { useState } from 'preact/hooks';
import { CONSENSI } from '~/lib/consent';
import TurnstileBox from './TurnstileBox';

interface Props {
  siteKey: string;
  preventivo: Record<string, unknown>;
}

type Stato = { readonly tipo: 'pronto' } | { readonly tipo: 'invio' } | { readonly tipo: 'errore'; readonly messaggio: string };

/** Consenso archivio: casella separata, non preselezionata, testo esatto registrato con la versione. */
export default function CreaScheda({ siteKey, preventivo }: Props) {
  const [archivio, setArchivio] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [stato, setStato] = useState<Stato>({ tipo: 'pronto' });
  const consenso = CONSENSI.archivio;

  async function crea() {
    if (!token) return;
    setStato({ tipo: 'invio' });
    try {
      const r = await fetch('/api/scheda', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ preventivo, consensoArchivio: archivio, versioneConsenso: consenso.versione, turnstileToken: token }),
      });
      const dati = (await r.json()) as { ok: true; url: string } | { ok: false; errore: string };
      if (dati.ok) {
        window.location.assign(dati.url);
        return;
      }
      setStato({ tipo: 'errore', messaggio: dati.errore });
    } catch {
      setStato({ tipo: 'errore', messaggio: 'Connessione assente o lenta: riprova tra poco.' });
    }
    setToken(null);
  }

  return (
    <div class="grid gap-4 border border-inchiostro/20 rounded p-4 bg-white/50 entra">
      <p class="text-sm">La scheda è anonima: marca, modello, numeri. Nessun nome, targa o concessionario.</p>
      <label class="flex items-start gap-3 text-sm cursor-pointer">
        <input type="checkbox" class="mt-1 size-5 accent-[#15171A]" checked={archivio} onChange={(e) => setArchivio((e.currentTarget as HTMLInputElement).checked)} />
        <span>{consenso.testo} <span class="text-tenue">(facoltativo)</span></span>
      </label>
      <TurnstileBox siteKey={siteKey} onToken={setToken} />
      <div class="flex flex-wrap items-center gap-3">
        <button type="button" class="btn btn-primario" disabled={!token || stato.tipo === 'invio'} onClick={crea}>
          {stato.tipo === 'invio' ? 'Creo la scheda…' : 'Crea la scheda'}
        </button>
        {stato.tipo === 'errore' && <p class="text-sm text-segnale-scuro" role="alert">{stato.messaggio}</p>}
      </div>
    </div>
  );
}
