import type { ComponentType } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import type { NumeriLeggeri } from '~/lib/calc/leggero';

interface PropsScena {
  preventivo: NumeriLeggeri;
  vfg?: number | null | undefined;
  etichetta?: string | undefined;
}

/**
 * La scena si scarica solo quando c'è un risultato (specifica v2, §2): fino ad allora la home non paga i suoi kB.
 * Se il download fallisce, resta il risultato completo sotto e un messaggio onesto.
 */
export default function ScenaPigra(props: PropsScena) {
  const [Scena, setScena] = useState<ComponentType<PropsScena> | null>(null);
  const [errore, setErrore] = useState(false);

  useEffect(() => {
    let vivo = true;
    import('./Scena')
      .then((m) => { if (vivo) setScena(() => m.default); })
      .catch(() => { if (vivo) setErrore(true); });
    return () => { vivo = false; };
  }, []);

  if (errore) return <p class="text-sm text-tenue">Non siamo riusciti a caricare il grafico: i numeri completi sono qui sotto.</p>;
  if (!Scena) return <div class="pannello-scena min-h-[60vh]" aria-busy="true" aria-label="Caricamento della scena" />;
  return <Scena {...props} />;
}
