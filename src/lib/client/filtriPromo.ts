import { normalizzaNumero } from '../numeri';

/** Filtri nel browser su /promozioni: nasconde anche le promo scadute dopo la build. */
export function applicaFiltri(radice: ParentNode, dati: FormData, oggi: string = new Date().toISOString().slice(0, 10)): number {
  const marca = String(dati.get('marca') ?? '');
  const anticipoMax = normalizzaNumero(String(dati.get('anticipo') ?? ''));
  const rataMax = normalizzaNumero(String(dati.get('rata') ?? ''));
  const maxi = String(dati.get('maxi') ?? '');
  let visibili = 0;
  for (const el of radice.querySelectorAll<HTMLElement>('[data-promo]')) {
    const d = el.dataset;
    const ok = (d['validoAl'] ?? '') >= oggi
      && (!marca || d['marca'] === marca)
      && (anticipoMax == null || Number(d['anticipo']) <= anticipoMax)
      && (rataMax == null || Number(d['rata']) <= rataMax)
      && (!maxi || d['maxi'] === maxi);
    el.hidden = !ok;
    if (ok) visibili += 1;
  }
  const vuoto = radice.querySelector<HTMLElement>('[data-vuoto]');
  if (vuoto) vuoto.hidden = visibili > 0;
  return visibili;
}

/** Sulla pagina della singola promo: mostra l'avviso se è scaduta dopo la build. */
export function segnalaScadute(radice: ParentNode, oggi: string = new Date().toISOString().slice(0, 10)): void {
  for (const el of radice.querySelectorAll<HTMLElement>('[data-promo]')) {
    const avviso = el.querySelector<HTMLElement>('[data-avviso-scaduta]');
    if (avviso && (el.dataset['validoAl'] ?? '') < oggi) avviso.hidden = false;
  }
}
