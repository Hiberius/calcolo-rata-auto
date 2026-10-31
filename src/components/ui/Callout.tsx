import type { ComponentChildren } from 'preact';

type Tono = 'attenzione' | 'ok' | 'neutro' | 'segnale';
/**
 * Un filo in alto del colore del significato, nessun fondo tinto e nessun bordo laterale (specifica, d-f). Il testo è
 * allineato al bordo di chi lo contiene. «I conti tornano» non è verde: è un filo d'inchiostro con la spunta, perché
 * la specifica vieta il semaforo come giudizio sull'offerta.
 */
const FILO: Record<Tono, string> = {
  attenzione: 'var(--color-attenzione)',
  ok: 'var(--color-inchiostro)',
  neutro: 'var(--color-riga)',
  segnale: 'var(--color-segnale)',
};

export default function Callout({ tono = 'neutro', titolo, children }: { tono?: Tono; titolo?: string; children: ComponentChildren }) {
  return (
    <div class="callout" style={{ '--colore-callout': FILO[tono] }} role={tono === 'attenzione' || tono === 'segnale' ? 'note' : undefined} data-tono={tono}>
      {titolo && <p class="font-semibold mb-1">{tono === 'ok' && <span aria-hidden="true">✓ </span>}{titolo}</p>}
      <div class="text-[0.95rem]">{children}</div>
    </div>
  );
}
