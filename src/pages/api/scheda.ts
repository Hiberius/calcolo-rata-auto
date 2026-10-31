import type { APIRoute } from 'astro';
import { z } from 'zod';
import { analizza } from '~/lib/calc';
import { generaTokenCancellazione, impronta } from '~/lib/cancellazione';
import { MESSAGGIO_TOTALE_INCOERENTE } from '~/lib/calc/totale';
import { CONSENSI } from '~/lib/consent';
import { creaScheda } from '~/lib/db/queries';
import { hashIpGiornaliero } from '~/lib/hash';
import { ipDa, jsonErrore, jsonOk, MESSAGGI } from '~/lib/http';
import { idCorto } from '~/lib/ids';
import { controllaLimiti } from '~/lib/ratelimit';
import { turnstileNonConfigurato, verificaTurnstile } from '~/lib/turnstile';

export const prerender = false;

const CorpoSchema = z.object({
  preventivo: z.record(z.string(), z.unknown()),
  consensoArchivio: z.boolean(),
  versioneConsenso: z.string().max(20).optional(),
  turnstileToken: z.string().min(1).max(2048),
});

const MSG = {
  numeri: 'Alcuni numeri non sono validi: controlla i campi evidenziati e riprova.',
  consenso: 'Il testo del consenso è cambiato: ricarica la pagina e riprova.',
} as const;

export const POST: APIRoute = async ({ request, locals }) => {
  const env = locals.runtime.env;
  if (Number(request.headers.get('content-length') ?? '0') > 32 * 1024) return jsonErrore(413, MESSAGGI.corpo);
  const corpo = CorpoSchema.safeParse(await request.json().catch(() => null));
  if (!corpo.success) return jsonErrore(400, MESSAGGI.corpo);

  const ip = ipDa(request);
  const turnstile = await verificaTurnstile(corpo.data.turnstileToken, env.TURNSTILE_SECRET_KEY, ip, request.url);
  if (!turnstile.ok) return turnstileNonConfigurato(turnstile) ? jsonErrore(503, MESSAGGI.nonAttivo) : jsonErrore(403, MESSAGGI.turnstile);

  const ipHash = await hashIpGiornaliero(ip, env.HASH_SALT);
  const limite = await controllaLimiti(env.KV, ipHash, [{ nome: 'scheda-giorno', massimo: 30, finestraSecondi: 86_400 }]);
  if (!limite.consentito) return jsonErrore(429, MESSAGGI.limite);

  // La fonte è testo libero: non entra nella scheda pubblica.
  const { fonte: _fonte, ...preventivo } = corpo.data.preventivo;
  const esito = analizza(preventivo);
  if (!esito.ok) return jsonErrore(422, MSG.numeri, { campi: esito.errori.map((e) => e.campo) });
  if (esito.analisi.totali.messaggi.includes(MESSAGGIO_TOTALE_INCOERENTE)) return jsonErrore(422, MESSAGGIO_TOTALE_INCOERENTE);

  const consenso = CONSENSI.archivio;
  if (corpo.data.consensoArchivio && corpo.data.versioneConsenso !== consenso.versione) return jsonErrore(409, MSG.consenso);

  const id = idCorto();
  // Il codice per eliminare la scheda torna solo a chi la crea; in D1 resta l'impronta.
  const tokenCancellazione = generaTokenCancellazione();
  try {
    await creaScheda(
      env.DB,
      {
        id,
        analisi: esito.analisi,
        consensoArchivio: corpo.data.consensoArchivio,
        versioneConsenso: corpo.data.consensoArchivio ? consenso.versione : null,
        improntaCancellazione: await impronta(tokenCancellazione),
      },
      corpo.data.consensoArchivio ? { finalita: consenso.finalita, testo: consenso.testo, versione: consenso.versione, accettato: true } : null,
      ipHash,
    );
  } catch {
    return jsonErrore(500, MESSAGGI.interno);
  }
  return jsonOk({ id, url: `/s/${id}`, tokenCancellazione }, 201);
};

export const ALL: APIRoute = () => jsonErrore(405, MESSAGGI.metodo);
