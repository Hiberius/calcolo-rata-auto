import type { EsitoModello } from './workersAi';
import { ISTRUZIONE_UTENTE, PROMPT_SISTEMA } from './prompt';
import { JSON_SCHEMA_ESTRAZIONE } from './schema';

export const MODELLO_ANTHROPIC = 'claude-haiku-4-5';

/** Estrazione opzionale con Claude Haiku (solo se ANTHROPIC_API_KEY è impostata). Stesso schema, via tool use. */
export async function estraiConAnthropic(chiave: string, base64: string, mediaType: string): Promise<EsitoModello> {
  const risposta = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    signal: AbortSignal.timeout(12_000),
    headers: { 'x-api-key': chiave, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({
      model: MODELLO_ANTHROPIC,
      max_tokens: 1200,
      system: PROMPT_SISTEMA,
      tools: [{ name: 'registra_preventivo', description: 'Registra i numeri letti dal preventivo.', input_schema: JSON_SCHEMA_ESTRAZIONE }],
      tool_choice: { type: 'tool', name: 'registra_preventivo' },
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 } },
          { type: 'text', text: ISTRUZIONE_UTENTE },
        ],
      }],
    }),
  });
  if (!risposta.ok) throw new Error(`Anthropic ${risposta.status}`);
  const dati = (await risposta.json()) as { content?: { type: string; input?: unknown }[] };
  const uso = dati.content?.find((c) => c.type === 'tool_use');
  if (!uso?.input) throw new Error('Risposta senza dati');
  return { grezzo: uso.input, modello: MODELLO_ANTHROPIC };
}
