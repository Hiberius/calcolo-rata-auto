import { AVVERTENZA } from '~/lib/calc';

/** Avvertenza fissa §1.9: presente in ogni risultato. */
export default function Disclaimer() {
  return (
    <p class="text-sm text-tenue border-l-2 border-inchiostro pl-3 max-w-prose" data-avvertenza>
      {AVVERTENZA}
    </p>
  );
}
