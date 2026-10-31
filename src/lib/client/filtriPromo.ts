import { oggiItalia } from '../date';
import { normalizzaNumero } from '../numeri';

export const VUOTO_CON_FILTRI = 'Nessuna promozione in vigore con questi filtri.';
export const VUOTO_SENZA_PROMO = 'Nessuna promozione in vigore in questo momento.';

/** Il minimo del DOM che serve ai filtri: così la funzione si prova anche senza browser. */
export interface RiquadroPromo { hidden: boolean; readonly dataset: DOMStringMap }
export interface MessaggioVuoto { textContent: string | null }

/**
 * Filtri nel browser su /promozioni. Nasconde anche le promo scadute dopo che la pagina è stata servita.
 * Il messaggio di elenco vuoto si scrive solo quando serve: un testo nascosto con `hidden` resta leggibile
 * da chi legge la pagina senza CSS (anteprime, lettori di testo) e contraddiceva l'elenco.
 */
export function applicaFiltri(riquadri: Iterable<RiquadroPromo>, vuoto: MessaggioVuoto | null, dati: FormData, oggi: string = oggiItalia()): number {
  const marca = String(dati.get('marca') ?? '');
  const anticipoMax = normalizzaNumero(String(dati.get('anticipo') ?? ''));
  const rataMax = normalizzaNumero(String(dati.get('rata') ?? ''));
  const maxi = String(dati.get('maxi') ?? '');
  const conFiltri = Boolean(marca || maxi) || anticipoMax != null || rataMax != null;
  let visibili = 0;
  for (const el of riquadri) {
    const d = el.dataset;
    const ok = (d['validoAl'] ?? '') >= oggi
      && (!marca || d['marca'] === marca)
      && (anticipoMax == null || Number(d['anticipo']) <= anticipoMax)
      && (rataMax == null || Number(d['rata']) <= rataMax)
      && (!maxi || d['maxi'] === maxi);
    el.hidden = !ok;
    if (ok) visibili += 1;
  }
  if (vuoto) vuoto.textContent = visibili > 0 ? '' : conFiltri ? VUOTO_CON_FILTRI : VUOTO_SENZA_PROMO;
  return visibili;
}
