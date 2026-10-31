import type { ComponentChildren } from 'preact';

type Tono = 'attenzione' | 'ok' | 'neutro' | 'segnale';
/** Filo in alto del colore del significato e carta appena tinta: nessun bordo laterale colorato (specifica, f). */
const COLORI: Record<Tono, { readonly filo: string; readonly sfondo: string }> = {
  attenzione: { filo: 'var(--color-attenzione)', sfondo: '#FFF8E1' },
  ok: { filo: 'var(--color-ok)', sfondo: '#EEF6F0' },
  neutro: { filo: 'var(--color-riga)', sfondo: 'transparent' },
  segnale: { filo: 'var(--color-segnale)', sfondo: '#FDEEE9' },
};

export default function Callout({ tono = 'neutro', titolo, children }: { tono?: Tono; titolo?: string; children: ComponentChildren }) {
  const c = COLORI[tono];
  return (
    <div class="callout" style={{ '--colore-callout': c.filo, '--sfondo-callout': c.sfondo }} role={tono === 'attenzione' || tono === 'segnale' ? 'note' : undefined}>
      {titolo && <p class="font-semibold mb-1">{titolo}</p>}
      <div class="text-[0.95rem]">{children}</div>
    </div>
  );
}
