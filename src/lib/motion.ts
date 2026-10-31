/**
 * Movimento minimo della scena (specifica v2, §2), senza librerie: curve, tween su requestAnimationFrame,
 * contatore numerico, IntersectionObserver e una sola funzione per prefers-reduced-motion (movimentoPermesso). Solo valori: chi disegna decide cosa muovere
 * (canvas, transform, opacity), mai proprietà di layout.
 */
export type Curva = (t: number) => number;

const limita = (t: number): number => Math.min(1, Math.max(0, t));

/** ease-out-expo: parte veloce, si posa piano. */
export const easeOutExpo: Curva = (t) => {
  const x = limita(t);
  return x === 1 ? 1 : 1 - 2 ** (-10 * x);
};

/** ease-in-out (cubica): per i passaggi da uno stato all'altro. */
export const easeInOut: Curva = (t) => {
  const x = limita(t);
  return x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2;
};

export interface OpzioniTween {
  readonly durata: number;
  readonly curva?: Curva;
  readonly alPasso: (avanzamento: number) => void;
  readonly allaFine?: () => void;
}

/** Avanzamento da 0 a 1 in `durata` ms, già passato per la curva. Restituisce la funzione per fermarlo. */
export function tween({ durata, curva = easeOutExpo, alPasso, allaFine }: OpzioniTween): () => void {
  if (typeof requestAnimationFrame !== 'function' || durata <= 0) {
    alPasso(1);
    allaFine?.();
    return () => undefined;
  }
  let fermo = false;
  let inizio: number | null = null;
  const passo = (ora: number) => {
    if (fermo) return;
    inizio ??= ora;
    const t = limita((ora - inizio) / durata);
    alPasso(curva(t));
    if (t < 1) requestAnimationFrame(passo);
    else allaFine?.();
  };
  requestAnimationFrame(passo);
  return () => { fermo = true; };
}

/** Valore intermedio del contatore: da `da` ad `a` con l'avanzamento (già curvato). */
export function contatore(da: number, a: number, avanzamento: number): number {
  return da + (a - da) * limita(avanzamento);
}

const QUERY_RIDOTTO = '(prefers-reduced-motion: reduce)';

/**
 * L'unica domanda sul movimento di tutto il sito (specifica di movimento, a6): si può animare?
 * No se chi guarda ha chiesto meno movimento, e no senza finestra (rendering lato server): lì si mostra lo stato finale.
 * Ogni animazione in JavaScript passa da qui; in CSS la stessa regola è `@media (prefers-reduced-motion: no-preference)`.
 */
export function movimentoPermesso(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  return !window.matchMedia(QUERY_RIDOTTO).matches;
}

/** Ascolta i cambi di preferenza: `alCambio(true)` quando il movimento torna permesso. Restituisce la funzione per smettere. */
export function seguiMovimento(alCambio: (permesso: boolean) => void): () => void {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return () => undefined;
  const mq = window.matchMedia(QUERY_RIDOTTO);
  const ascolta = (e: MediaQueryListEvent) => alCambio(!e.matches);
  mq.addEventListener('change', ascolta);
  return () => mq.removeEventListener('change', ascolta);
}

/** Porta un elemento in vista: scorrendo solo se il movimento è permesso, altrimenti con un salto. */
export function scorriVerso(el: Element | null, blocco: ScrollLogicalPosition = 'start'): void {
  el?.scrollIntoView({ behavior: movimentoPermesso() ? 'smooth' : 'auto', block: blocco });
}

interface NavigatorRidotto { readonly connection?: { readonly saveData?: boolean }; readonly deviceMemory?: number }

/**
 * Livello del movimento d'ambiente (a8): PIENO o RIDOTTO. Ridotto se il movimento non è permesso, con Save-Data,
 * con 2 GB di memoria o meno, o con meno di 4 core. Il quinto criterio (fotogrammi lenti) lo misura chi anima.
 */
export function livelloMovimento(): 'pieno' | 'ridotto' {
  if (!movimentoPermesso() || typeof navigator === 'undefined') return 'ridotto';
  const n = navigator as Navigator & NavigatorRidotto;
  const povero = n.connection?.saveData === true || (n.deviceMemory ?? 8) <= 2 || (navigator.hardwareConcurrency || 8) < 4;
  return povero ? 'ridotto' : 'pieno';
}

/**
 * Chiama `quandoVisibile` la prima volta che l'elemento entra nella vista (soglia di default 35%).
 * Senza IntersectionObserver lo chiama subito: il contenuto non deve mai restare nascosto.
 */
export function allaPrimaVista(el: Element, quandoVisibile: () => void, soglia = 0.35): () => void {
  if (typeof IntersectionObserver !== 'function') {
    quandoVisibile();
    return () => undefined;
  }
  const osservatore = new IntersectionObserver((voci) => {
    if (!voci.some((v) => v.isIntersecting)) return;
    osservatore.disconnect();
    quandoVisibile();
  }, { threshold: soglia });
  osservatore.observe(el);
  return () => osservatore.disconnect();
}
