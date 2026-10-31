import type { APIRoute } from 'astro';
import { registraEvento } from '~/lib/db/queries';
import { DIMENSIONE_MAX, estraiNumeri, TIPI_IMMAGINE } from '~/lib/extract';
import { QuotaEsaurita } from '~/lib/extract/workersAi';
import { hashIpGiornaliero } from '~/lib/hash';
import { ipDa, jsonErrore, jsonOk, MESSAGGI } from '~/lib/http';
import { controllaLimiti } from '~/lib/ratelimit';
import { verificaTurnstile } from '~/lib/turnstile';

export const prerender = false;

const MSG = {
  troppoGrande: 'Il file supera 2 MB anche dopo la riduzione: ritaglia la parte con i numeri e riprova.',
  formato: 'Formato non supportato: usa una foto JPEG, PNG o WebP, oppure un PDF.',
  lettura: 'Non siamo riusciti a leggere i numeri: inseriscili a mano qui sotto, bastano un paio di minuti.',
  quota: "Le letture automatiche di oggi sono finite: riprova tra un'ora o inserisci i numeri a mano.",
} as const;

export const POST: APIRoute = async ({ request, locals }) => {
  const env = locals.runtime.env;
  const lunghezza = Number(request.headers.get('content-length') ?? '0');
  if (lunghezza > DIMENSIONE_MAX + 64 * 1024) return jsonErrore(413, MSG.troppoGrande);

  const form = await request.formData().catch(() => null);
  const immagine = form?.get('immagine');
  if (!form || !(immagine instanceof File)) return jsonErrore(400, MESSAGGI.corpo);

  const ip = ipDa(request);
  const turnstile = await verificaTurnstile(String(form.get('cf-turnstile-response') ?? ''), env.TURNSTILE_SECRET_KEY, ip, request.url);
  if (!turnstile.ok) return jsonErrore(403, MESSAGGI.turnstile);

  const ipHash = await hashIpGiornaliero(ip, env.HASH_SALT);
  const limite = await controllaLimiti(env.KV, ipHash, [
    { nome: 'estrai-min', massimo: Number(env.ESTRAZIONE_LIMITE_MINUTO) || 3, finestraSecondi: 60 },
    { nome: 'estrai-giorno', massimo: Number(env.ESTRAZIONE_LIMITE_GIORNO) || 20, finestraSecondi: 86_400 },
  ]);
  if (!limite.consentito) return jsonErrore(429, MESSAGGI.limite);

  if (immagine.size > DIMENSIONE_MAX) return jsonErrore(413, MSG.troppoGrande);
  if (!(TIPI_IMMAGINE as readonly string[]).includes(immagine.type)) return jsonErrore(415, MSG.formato);

  const inizio = Date.now();
  const traccia = (ok: boolean, campiTrovati: number, modello: string | null) =>
    locals.runtime.ctx.waitUntil(
      registraEvento(env.DB, { nome: ok ? 'decodifica_ok' : 'decodifica_errore', ipHash, meta: { ok, campiTrovati, modello, ms: Date.now() - inizio } })
        .catch(() => undefined),
    );

  try {
    const esito = await estraiNumeri(env, immagine);
    if (!esito) {
      traccia(false, 0, null);
      return jsonErrore(422, MSG.lettura);
    }
    traccia(true, esito.risposta.campiTrovati, esito.modello);
    return jsonOk({ ...esito.risposta, modello: esito.modello });
  } catch (errore) {
    traccia(false, 0, null);
    if (errore instanceof QuotaEsaurita) return jsonErrore(503, MSG.quota);
    return jsonErrore(502, MSG.lettura);
  }
};

export const ALL: APIRoute = () => jsonErrore(405, MESSAGGI.metodo);
