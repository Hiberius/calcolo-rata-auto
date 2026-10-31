import type { ComponentChildren } from 'preact';

type Tono = 'attenzione' | 'ok' | 'neutro' | 'segnale';
const BORDI: Record<Tono, string> = {
  attenzione: 'border-attenzione bg-[#FFF8E1]',
  ok: 'border-ok bg-[#EEF6F0]',
  neutro: 'border-riga bg-carta-scura/50',
  segnale: 'border-segnale bg-[#FDEEE9]',
};

export default function Callout({ tono = 'neutro', titolo, children }: { tono?: Tono; titolo?: string; children: ComponentChildren }) {
  return (
    <div class={`border-l-4 px-4 py-3 rounded-r ${BORDI[tono]}`} role={tono === 'attenzione' || tono === 'segnale' ? 'note' : undefined}>
      {titolo && <p class="font-semibold mb-1">{titolo}</p>}
      <div class="text-[0.95rem]">{children}</div>
    </div>
  );
}
