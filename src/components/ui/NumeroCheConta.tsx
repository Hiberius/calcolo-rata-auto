import { useEffect, useLayoutEffect, useRef, useState } from 'preact/hooks';
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
  /** false: il numero è fermo al valore finale (es. il totale dello scontrino quando la scena sopra ha già contato). */
  conta?: boolean;
}

/** L'elemento è già (anche solo in parte) nello schermo? */
function inVista(el: Element): boolean {
  const r = el.getBoundingClientRect();
  return r.bottom > 0 && r.top < (window.innerHeight || 0);
}

/**
 * F3. Numero che conta (specifica di movimento, interazioni 6 e 7): da zero al valore in 1,4 s expo-out, la prima volta
 * che è in vista; se il valore cambia riparte da dove era. Lo screen reader legge sempre il valore finale; senza movimento
 * (e nel rendering sul server) il numero è subito quello finale. A fine corsa mette data-contato: lì parte quello che segue.
 */
export default function NumeroCheConta({ valore, contesto = 'scena', durata = 1400, soglia = 0.6, class: classe = '', dato, conta = true }: Props) {
  const radice = useRef<HTMLSpanElement>(null);
  // Lo stato iniziale è il valore finale (revisione del 31/10): uno screenshot, la stampa o la ricerca nella pagina
  // non leggono mai «0,00 €». Lo zero arriva solo quando il numero entra nello schermo, appena prima di contare.
  const [x, setX] = useState(valore);
  const corrente = useRef(x);
  const primaVolta = useRef(true);
  const fattore = contesto === 'scena' ? 100 : 1;

  // Già in vista al montaggio (es. dopo lo scorrimento al risultato): lo zero prima del primo disegno, niente lampo.
  useLayoutEffect(() => {
    const el = radice.current;
    if (!conta || !el || !movimentoPermesso() || !inVista(el)) return;
    corrente.current = 0;
    setX(0);
  }, []);

  useEffect(() => {
    const el = radice.current;
    if (!conta || !el || !movimentoPermesso()) {
      corrente.current = valore;
      setX(valore);
      return undefined;
    }
    // Fuori dallo schermo la prima volta: resta il valore finale, e si azzera quando il bordo entra in vista.
    let smettiZero = () => undefined as void;
    if (primaVolta.current && corrente.current !== 0) {
      smettiZero = allaPrimaVista(el, () => { corrente.current = 0; setX(0); }, 0);
    }
    primaVolta.current = false;
    let ferma = () => undefined as void;
    const smetti = allaPrimaVista(el, () => {
      const da = corrente.current;
      ferma = tween({
        durata,
        alPasso: (t) => {
          corrente.current = Math.round(contatore(da, valore, t) * fattore) / fattore;
          setX(corrente.current);
        },
        allaFine: () => { corrente.current = valore; setX(valore); },
      });
    }, soglia);
    return () => { smettiZero(); smetti(); ferma(); };
  }, [valore, durata, soglia, fattore, conta]);

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
