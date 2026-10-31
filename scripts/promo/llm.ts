/** Estrazione dei numeri della promo con Workers AI (API REST), stesso modello del sito. */
const MODELLO = '@cf/meta/llama-4-scout-17b-16e-instruct';

const CAMPI_NUMERICI = [
  'prezzoListino', 'prezzoPromo', 'prezzoContanti', 'anticipo', 'nRate', 'rata', 'maxiRata', 'tan', 'taeg', 'importoCredito',
  'importoTotaleDovuto', 'speseIstruttoria', 'speseIncassoRata', 'impostaBollo', 'kmInclusi', 'costoKmEccedente',
] as const;

const SCHEMA = {
  type: 'object',
  properties: {
    versione: { type: ['string', 'null'] },
    tipo: { type: 'string', enum: ['finanziamento', 'leasing', 'noleggio'] },
    ...Object.fromEntries(CAMPI_NUMERICI.map((c) => [c, { type: ['number', 'null'] }])),
    requisiti: { type: 'array', items: { type: 'string', enum: ['permuta', 'rottamazione', 'finanziamento obbligatorio', 'pronta consegna'] } },
    validoDal: { type: ['string', 'null'], description: 'AAAA-MM-GG' },
    validoAl: { type: ['string', 'null'], description: 'AAAA-MM-GG' },
  },
  required: ['tipo', 'anticipo', 'nRate', 'rata', 'validoAl'],
} as const;

const ISTRUZIONI = [
  'Sei un estrattore di dati. Dal testo della pagina ufficiale di una casa auto estrai SOLO i numeri della promozione indicata.',
  'Usa solo cifre presenti nel testo, mai inventare: null se un valore non c’è.',
  'Importi in euro come numeri (4326.5), percentuali in punti (7.49), date AAAA-MM-GG.',
  'nRate è il numero di rate mensili senza la maxi rata finale (detta anche valore futuro garantito o rata finale).',
  'Non riportare nomi di banche o finanziarie.',
].join(' ');

export type DatiLetti = Record<string, unknown>;

export async function estraiConLlm(testo: string, marca: string, modello: string, env: { accountId: string; token: string }): Promise<DatiLetti> {
  const url = `https://api.cloudflare.com/client/v4/accounts/${env.accountId}/ai/run/${MODELLO}`;
  const risposta = await fetch(url, {
    method: 'POST',
    headers: { authorization: `Bearer ${env.token}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      messages: [
        { role: 'system', content: ISTRUZIONI },
        { role: 'user', content: `Promozione: ${marca} ${modello}.\n\nTesto della pagina:\n${testo}` },
      ],
      response_format: { type: 'json_schema', json_schema: SCHEMA },
      max_tokens: 800,
      temperature: 0,
    }),
  });
  if (!risposta.ok) throw new Error(`Workers AI ha risposto ${risposta.status}`);
  const corpo = (await risposta.json()) as { result?: { response?: unknown } };
  const r = corpo.result?.response;
  const dati: unknown = typeof r === 'string' ? JSON.parse(r) : r;
  if (!dati || typeof dati !== 'object') throw new Error('Risposta del modello vuota');
  return Object.fromEntries(Object.entries(dati as Record<string, unknown>).filter(([, v]) => v !== null));
}
