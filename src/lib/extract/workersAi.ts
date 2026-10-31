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

/** Tempo massimo totale della lettura lato server: il browser smette di aspettare a 15 secondi. */
export const SCADENZA_MS = 12_000;
const MINIMO_PER_TENTATIVO_MS = 1_500;

export function conScadenza<T>(promessa: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const scadenza = new Promise<never>((_, rifiuta) => { timer = setTimeout(() => rifiuta(new Error('Tempo scaduto')), ms); });
  return Promise.race([promessa, scadenza]).finally(() => clearTimeout(timer));
}

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
  const inizio = Date.now();
  for (const modello of MODELLI_WORKERS_AI) {
    const restante = SCADENZA_MS - (Date.now() - inizio);
    if (restante < MINIMO_PER_TENTATIVO_MS) break;
    try {
      const risposta = (await conScadenza(esegui(modello, richiesta(dataUrl)), restante)) as { response?: unknown };
      const grezzo = leggiJson(risposta?.response ?? risposta);
      if (grezzo && typeof grezzo === 'object') return { grezzo, modello };
    } catch (errore) {
      ultimoErrore = errore;
    }
  }
  if (eQuota(ultimoErrore)) throw new QuotaEsaurita('Quota Workers AI esaurita');
  throw new Error('Nessun modello ha restituito un JSON leggibile');
}
