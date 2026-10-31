import { estraiConAnthropic } from './anthropic';
import type { RispostaEstrazione } from './schema';
import { validaEstrazione } from './validate';
import { estraiConWorkersAi } from './workersAi';

export const DIMENSIONE_MAX = 2 * 1024 * 1024;
export const TIPI_IMMAGINE = ['image/jpeg', 'image/png', 'image/webp'] as const;

export function base64Da(buffer: ArrayBuffer): string {
  const byte = new Uint8Array(buffer);
  const blocchi: string[] = [];
  for (let i = 0; i < byte.length; i += 0x8000) {
    blocchi.push(String.fromCharCode(...byte.subarray(i, i + 0x8000)));
  }
  return btoa(blocchi.join(''));
}

export interface EsitoEstrazione {
  readonly risposta: RispostaEstrazione;
  readonly modello: string;
}

/** Legge i numeri dall'immagine. Nulla viene scritto: buffer e base64 vivono solo in questa chiamata. */
export async function estraiNumeri(env: Pick<Env, 'AI' | 'ANTHROPIC_API_KEY'>, immagine: File): Promise<EsitoEstrazione | null> {
  const base64 = base64Da(await immagine.arrayBuffer());
  const esito = env.ANTHROPIC_API_KEY
    ? await estraiConAnthropic(env.ANTHROPIC_API_KEY, base64, immagine.type)
    : await estraiConWorkersAi(env.AI, `data:${immagine.type};base64,${base64}`);
  const validato = validaEstrazione(esito.grezzo);
  return validato.ok ? { risposta: validato.risposta, modello: esito.modello } : null;
}
