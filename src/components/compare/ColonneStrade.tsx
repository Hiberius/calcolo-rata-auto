import { euro } from '~/lib/formato';
import { costoNetto } from '~/lib/calc/residuo';
import type { Strada, TipoContratto } from '~/lib/calc/tipi';

interface Props {
  strade: readonly Strada[];
  valoreResiduo?: number | null | undefined;
  tipo?: TipoContratto | undefined;
}

/** Tre colonne affiancate, stesso peso visivo, nessuna classifica (§4, §9). */
export default function ColonneStrade({ strade, valoreResiduo = null, tipo = 'finanziamento' }: Props) {
  return (
    <div class="grid gap-4">
      <ol class="grid gap-4 md:grid-cols-3" aria-label="Tre strade per la stessa auto">
        {strade.map((s) => {
          const netto = costoNetto(s, valoreResiduo, tipo);
          return (
            <li key={s.id} class="grid content-start gap-3 border-t-4 border-inchiostro bg-white/60 p-4" data-strada={s.id}>
              <p class="numeri text-xs text-tenue">Strada {s.id}</p>
              <h3 class="font-semibold leading-tight">{s.titolo}</h3>
              <p class="grid">
                <span class="text-sm text-tenue">Esce dal tuo conto</span>
                <span class="numeri text-2xl font-semibold">{euro(s.totaleUscito)}</span>
              </p>
              <p class="text-sm"><span class="font-medium">Alla fine: </span>{s.possiediAllaFine}</p>
              {netto != null && valoreResiduo != null && (
                <p class="text-sm">Se a fine contratto l'auto vale {euro(valoreResiduo, 0)}, la spesa netta è <span class="numeri font-semibold">{euro(netto)}</span>.</p>
              )}
              <p class="text-sm text-tenue">{s.dettaglio}</p>
              {s.ipotesi.length > 0 && (
                <ul class="grid gap-1 border-t border-riga pt-2 text-[0.8125rem] text-tenue">
                  {s.ipotesi.map((i) => <li key={i}>{i}</li>)}
                </ul>
              )}
            </li>
          );
        })}
      </ol>
      <p class="text-sm text-tenue">Le colonne non sono una classifica: cambiando le ipotesi cambiano i numeri. Il noleggio di solito comprende assicurazione, bollo e manutenzione, l'acquisto no.</p>
    </div>
  );
}
