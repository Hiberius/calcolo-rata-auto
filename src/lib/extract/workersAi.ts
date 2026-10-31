import { ISTRUZIONE_UTENTE, PROMPT_SISTEMA } from './prompt';
import { JSON_SCHEMA_ESTRAZIONE } from './schema';
import { leggiJson } from './validate';

export const MODELLI_WORKERS_AI = ['@cf/meta/llama-4-scout-17b-16e-instruct', '@cf/zai-org/glm-5.3-flash'] as const;

export interface EsitoModello {
  readonly grezzo: unknown;
  readonly modello: string;
}

export class QuotaEsaurita extends Error {}

type EseguiAi = (modello: string, input: unknown) => Promise<unknown>;

function richiesta(dataUrl: string): unknown {
  return {
    messages: [
      { role: 'system', content: PROMPT_SISTEMA },
      { role: 'user', content: [{ type: 'text', text: ISTRUZIONE_UTENTE }, { type: 'image_url', image_url: { url: dataUrl } }] },
    ],
    response_format: { type: 'json_schema', json_schema: JSON_SCHEMA_ESTRAZIONE },
    max_tokens: 1200,
    temperature: 0,
  };
}

function eQuota(errore: unknown): boolean {
  const testo = errore instanceof Error ? errore.message : String(errore);
  return /429|quota|neurons|capacity|rate limit/i.test(testo);
}

/** Prova i modelli in ordine; il primo che restituisce un JSON leggibile vince. L'immagine resta in memoria. */
export async function estraiConWorkersAi(ai: Ai, dataUrl: string): Promise<EsitoModello> {
  const esegui = (ai as unknown as { run: EseguiAi }).run.bind(ai);
  let ultimoErrore: unknown = null;
  for (const modello of MODELLI_WORKERS_AI) {
    try {
      const risposta = (await esegui(modello, richiesta(dataUrl))) as { response?: unknown };
      const grezzo = leggiJson(risposta?.response ?? risposta);
      if (grezzo && typeof grezzo === 'object') return { grezzo, modello };
    } catch (errore) {
      ultimoErrore = errore;
    }
  }
  if (eQuota(ultimoErrore)) throw new QuotaEsaurita('Quota Workers AI esaurita');
  throw new Error('Nessun modello ha restituito un JSON leggibile');
}
