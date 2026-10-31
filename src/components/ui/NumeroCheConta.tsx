import { useEffect, useRef, useState } from 'preact/hooks';
import { importo, type Contesto } from '~/lib/formato';
import { allaPrimaVista, contatore, movimentoPermesso, tween } from '~/lib/motion';

interface Props {
  valore: number;
  /** Regola dei decimali (lib/formato): la scena e il risultato contano al centesimo. */
  contesto?: Contesto;
  durata?: number;
  /** Quota dell'elemento in vista che fa partire il conteggio. */
  soglia?: number;
  class?: string;
  /** Attributo data-* sul valore finale, per chi cerca il numero (es. «totale-scena»). */
  dato?: string;
}

/**
 * F3. Numero che conta (specifica di movimento, interazioni 6 e 7): da zero al valore in 1,4 s expo-out, la prima volta
 * che è in vista; se il valore cambia riparte da dove era. Lo screen reader legge sempre il valore finale; senza movimento
 * (e nel rendering sul server) il numero è subito quello finale. A fine corsa mette data-contato: lì parte quello che segue.
 */
export default function NumeroCheConta({ valore, contesto = 'scena', durata = 1400, soglia = 0.6, class: classe = '', dato }: Props) {
  const radice = useRef<HTMLSpanElement>(null);
  const [x, setX] = useState(() => (movimentoPermesso() ? 0 : valore));
  const corrente = useRef(x);
  const fattore = contesto === 'scena' ? 100 : 1;

  useEffect(() => {
    const el = radice.current;
    if (!el || !movimentoPermesso()) {
      corrente.current = valore;
      setX(valore);
      return undefined;
    }
    const da = corrente.current;
    let ferma = () => undefined as void;
    const smetti = allaPrimaVista(el, () => {
      ferma = tween({
        durata,
        alPasso: (t) => {
          corrente.current = Math.round(contatore(da, valore, t) * fattore) / fattore;
          setX(corrente.current);
        },
        allaFine: () => { corrente.current = valore; setX(valore); },
      });
    }, soglia);
    return () => { smetti(); ferma(); };
  }, [valore, durata, soglia, fattore]);

  const finale = importo(valore, contesto);
  const attributi = dato ? { [`data-${dato}`]: '' } : {};
  return (
    <span ref={radice} class={`inline-block whitespace-nowrap ${classe}`} style={{ minWidth: `${finale.length}ch` }} data-contato={x === valore ? '' : undefined}>
      {/* Il dato (per chi cerca il numero, test compresi) sta sul valore finale, che lo screen reader legge subito. */}
      <span class="sr-only" {...attributi}>{finale}</span>
      <span aria-hidden="true">{importo(x, contesto)}</span>
    </span>
  );
}
