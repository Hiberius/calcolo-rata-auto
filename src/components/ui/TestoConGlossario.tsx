import { FORME_NEL_TESTO, type VoceGlossario } from '~/lib/glossario';
import Termine from './Termine';

interface Props {
  testo: string;
  /** Parte degli id: unica nella pagina per ogni blocco di testo (es. «scena-tasso»). */
  ambito: string;
  /** Voci da non spiegare qui (già spiegate accanto). */
  salta?: readonly VoceGlossario[];
}

interface Pezzo { readonly inizio: number; readonly fine: number; readonly voce: VoceGlossario }

/**
 * Testo con il glossario in linea (problema 3 della revisione): la prima occorrenza di ogni voce (TAEG, maxi rata,
 * debito residuo, valore futuro garantito…) diventa la stessa parola spiegabile al tocco delle guide e del risultato.
 */
export default function TestoConGlossario({ testo, ambito, salta = [] }: Props) {
  const pezzi: Pezzo[] = [];
  for (const [voce, forma] of FORME_NEL_TESTO) {
    if (salta.includes(voce)) continue;
    const m = forma.exec(testo);
    if (!m) continue;
    const pezzo = { inizio: m.index, fine: m.index + m[0].length, voce };
    if (!pezzi.some((p) => pezzo.inizio < p.fine && p.inizio < pezzo.fine)) pezzi.push(pezzo);
  }
  pezzi.sort((a, b) => a.inizio - b.inizio);
  const nodi = [];
  let da = 0;
  for (const p of pezzi) {
    nodi.push(testo.slice(da, p.inizio));
    nodi.push(<Termine key={p.voce} voce={p.voce} ambito={ambito}>{testo.slice(p.inizio, p.fine)}</Termine>);
    da = p.fine;
  }
  nodi.push(testo.slice(da));
  return <>{nodi}</>;
}
