import type { ComponentChildren } from 'preact';
import type { Scenari } from '~/lib/calc';
import { euro, numero, punti } from '~/lib/formato';

function Colonna({ titolo, totale, children }: { titolo: string; totale: number; children: ComponentChildren }) {
  return (
    <div class="grid content-start gap-2 border-t border-inchiostro pt-3">
      {/* Una riga per possibilità, nome e totale sulla stessa linea: niente tre colonne uguali (specifica, f). */}
      <div class="flex flex-wrap items-baseline justify-between gap-x-4">
        <h4 class="font-semibold">{titolo}</h4>
        <p class="numeri text-xl whitespace-nowrap">{euro(totale)}</p>
      </div>
      <div class="nota text-tenue grid gap-1 max-w-[34em]">{children}</div>
    </div>
  );
}

export default function ScenariFine({ scenari }: { scenari: Scenari }) {
  const { tieni, restituisci, cambi } = scenari;
  if (!scenari.conMaxiRata || !tieni || !restituisci || !cambi) {
    return <p class="text-tenue">{scenari.nota}</p>;
  }
  return (
    <div class="grid gap-4">
      <p>{scenari.nota}</p>
      <div class="grid gap-5">
        <Colonna titolo="La tieni" totale={tieni.totale}>
          <p>Paghi la maxi rata di {euro(tieni.maxiRata)}.</p>
          <p>
            Se la rifinanzi (ipotesi TAN {punti(tieni.rifinanziamento.tan)} su {tieni.rifinanziamento.mesi} mesi): rata {euro(tieni.rifinanziamento.rata)}, costano{' '}
            <span class="text-segnale-scuro font-semibold">{euro(tieni.rifinanziamento.costoAggiuntivo)}</span> in più, totale {euro(tieni.rifinanziamento.totale)}.
          </p>
        </Colonna>
        <Colonna titolo="La restituisci" totale={restituisci.totale}>
          <p>Hai pagato questo e non hai l’auto.</p>
          {restituisci.kmInclusi != null ? (
            <p>
              Km inclusi {numero(restituisci.kmInclusi, 0)}, stimati {numero(restituisci.kmStimati, 0)}
              {restituisci.kmEccedenti > 0 ? `: ${numero(restituisci.kmEccedenti, 0)} km in più costano ${euro(restituisci.costoKmEccedenti)}.` : '.'}
            </p>
          ) : (
            <p>Chiedi quanti km sono inclusi e quanto costa ogni km in più.</p>
          )}
          <p>{restituisci.nota}</p>
        </Colonna>
        <Colonna titolo="La cambi" totale={cambi.totale}>
          <p>{cambi.nota}</p>
        </Colonna>
      </div>
    </div>
  );
}
