import { SPIEGAZIONE_TAEG_COSTO } from '~/lib/calc/composizione';
import Termine from './Termine';

/** La riga fissa TAEG contro costo del credito, con «TAEG» spiegato al tocco se c'è un ambito. */
export default function SpiegazioneTaeg({ ambito, classe = 'text-sm text-tenue' }: { ambito?: string | undefined; classe?: string }) {
  const [prima, dopo] = SPIEGAZIONE_TAEG_COSTO.split('TAEG');
  return (
    <p class={classe} data-spiegazione-taeg>
      {ambito ? <>{prima}<Termine voce="taeg" ambito={ambito} />{dopo}</> : SPIEGAZIONE_TAEG_COSTO}
    </p>
  );
}
