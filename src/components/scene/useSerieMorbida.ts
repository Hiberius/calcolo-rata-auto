import { useEffect, useRef, useState } from 'preact/hooks';
import type { SerieValoreDebito } from '~/lib/calc/valore';
import { movimentoPermesso, tween } from '~/lib/motion';

const mix = (a: number, b: number, t: number): number => a + (b - a) * t;

export interface VistaCurve {
  readonly serie: SerieValoreDebito | null;
  readonly massimo: number;
  readonly minimo: number;
}

/**
 * F4. Le curve disegnate inseguono quelle scelte con i cursori in 260 ms expo-out, invece di scattare. Con una durata
 * diversa (numero di punti diverso) o senza movimento si cambia di colpo. Il testo e il riepilogo usano sempre la serie
 * vera: qui c'è solo quello che si disegna.
 */
export function useSerieMorbida(serie: SerieValoreDebito | null, massimo: number, minimo = 0, ms = 260): VistaCurve {
  const [vista, setVista] = useState<VistaCurve>({ serie, massimo, minimo });
  const ora = useRef<VistaCurve>(vista);
  useEffect(() => {
    const da = ora.current;
    const prima = da.serie;
    const stessa = prima != null && serie != null && prima.punti.length === serie.punti.length;
    if (!stessa || !serie || !movimentoPermesso()) {
      ora.current = { serie, massimo, minimo };
      setVista(ora.current);
      return undefined;
    }
    return tween({
      durata: ms,
      alPasso: (t) => {
        const punti = serie.punti.map((p, i) => {
          const q = prima.punti[i] ?? p;
          return { ...p, valore: mix(q.valore, p.valore, t), debito: mix(q.debito, p.debito, t) };
        });
        ora.current = { serie: { ...serie, punti }, massimo: mix(da.massimo, massimo, t), minimo: mix(da.minimo, minimo, t) };
        setVista(ora.current);
      },
    });
  }, [serie, massimo, minimo, ms]);
  return vista;
}
