import { movimentoPermesso } from '../motion';

/**
 * F1 alla vista (revisione del 31/10): lo scontrino si stampa quando il suo bordo alto entra nello schermo, non al
 * montaggio, che sulla home e sulle promo avveniva 3.000 px più in basso. Lo scontrino è sempre intero finché non parte
 * la stampa: l'attributo data-stampa (che fa partire l'animazione CSS) arriva solo qui, mai dall'HTML del server.
 * Con meno movimento, o senza IntersectionObserver, non si mette niente: lo scontrino resta fermo e intero.
 */
export function stampaAllaVista(el: HTMLElement): () => void {
  if (!movimentoPermesso() || typeof IntersectionObserver !== 'function' || el.hasAttribute('data-stampa')) return () => undefined;
  const osservatore = new IntersectionObserver((voci) => {
    if (!voci.some((v) => v.isIntersecting)) return;
    osservatore.disconnect();
    el.setAttribute('data-stampa', '');
  }, { threshold: 0 });
  osservatore.observe(el);
  return () => osservatore.disconnect();
}

/** Tutti gli scontrini della pagina resi dal server con data-stampa-vista. */
export function stampaScontrini(doc: Document): void {
  for (const el of doc.querySelectorAll<HTMLElement>('[data-stampa-vista]')) stampaAllaVista(el);
}
