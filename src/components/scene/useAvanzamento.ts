import { useEffect, useRef, useState } from 'preact/hooks';
import { allaPrimaVista, easeOutExpo, tween } from '~/lib/motion';

/**
 * Avanzamento 0..1 di un atto: parte la prima volta che l'atto entra nella vista.
 * Con meno movimento è subito 1: grafici statici già completi.
 */
export function useAvanzamento(statico: boolean, durata: number) {
  const ref = useRef<HTMLElement>(null);
  const [avanzamento, setAvanzamento] = useState(statico ? 1 : 0);

  useEffect(() => {
    if (statico) {
      setAvanzamento(1);
      return undefined;
    }
    const el = ref.current;
    if (!el) return undefined;
    let ferma = () => undefined as void;
    const smetti = allaPrimaVista(el, () => {
      ferma = tween({ durata, curva: easeOutExpo, alPasso: setAvanzamento });
    });
    return () => {
      smetti();
      ferma();
    };
  }, [statico, durata]);

  return { ref, avanzamento };
}
