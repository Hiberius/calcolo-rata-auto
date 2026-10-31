import { useEffect, useRef, useState } from 'preact/hooks';
import { montaTurnstile } from '~/lib/client/turnstile';

/** Widget anti-robot di Cloudflare caricato solo quando serve. */
export default function TurnstileBox({ siteKey, onToken }: { siteKey: string; onToken: (t: string | null) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [errore, setErrore] = useState(false);
  useEffect(() => {
    let pulisci: (() => void) | null = null;
    let attivo = true;
    if (ref.current) {
      montaTurnstile(ref.current, siteKey, onToken)
        .then((fn) => (attivo ? (pulisci = fn) : fn()))
        .catch(() => setErrore(true));
    }
    return () => {
      attivo = false;
      pulisci?.();
    };
  }, [siteKey]);
  return (
    <div>
      <div ref={ref} class="min-h-[65px]" />
      {errore && <p class="text-sm text-segnale-scuro">La verifica anti-robot non si carica: controlla la connessione e ricarica la pagina.</p>}
    </div>
  );
}
