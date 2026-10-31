import { AVVERTENZA } from '~/lib/calc/config';
import Termine from './Termine';

/** Avvertenza fissa §1.9: presente in ogni risultato. Con un ambito, «SECCI» si spiega al tocco. */
export default function Disclaimer({ ambito }: { ambito?: string | undefined }) {
  const [prima, dopo] = AVVERTENZA.split('SECCI');
  return (
    <p class="nota text-tenue border-t border-inchiostro pt-3 max-w-[36em]" data-avvertenza>
      {ambito && dopo !== undefined ? <>{prima}<Termine voce="secci" ambito={ambito} />{dopo}</> : AVVERTENZA}
    </p>
  );
}
