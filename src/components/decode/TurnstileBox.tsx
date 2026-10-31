import { useEffect, useRef, useState } from 'preact/hooks';
import { montaTurnstile } from '~/lib/client/turnstile';
import { MESSAGGIO_NON_ATTIVO } from '~/lib/turnstile';

/**
 * Widget anti-robot di Cloudflare caricato solo quando serve, invisibile finché non chiede un'interazione.
 * Con la chiave vuota (verifica non ancora accesa sul server) non si monta: lo dice una riga, senza scritte di test.
 */
export default function TurnstileBox({ siteKey, onToken }: { siteKey: string; onToken: (t: string | null) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [errore, setErrore] = useState(false);
  useEffect(() => {
    if (!siteKey) return undefined;
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
  if (!siteKey) return <p class="nota text-tenue" data-antirobot-spento>{MESSAGGIO_NON_ATTIVO}</p>;
  return (
    <div>
      <div ref={ref} class="empty:hidden" />
      {errore && <p class="text-sm text-segnale-scuro">La verifica anti-robot non si carica: controlla la connessione e ricarica la pagina.</p>}
    </div>
  );
}
