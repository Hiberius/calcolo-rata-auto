import type { APIRoute } from 'astro';
import { z } from 'zod';
import { eliminaScheda, TOKEN_CANCELLAZIONE_RE, type EsitoCancellazione } from '~/lib/cancellazione';
import { hashIpGiornaliero } from '~/lib/hash';
import { ipDa, jsonErrore, jsonOk, MESSAGGI } from '~/lib/http';
import { controllaLimiti } from '~/lib/ratelimit';

export const prerender = false;

const CorpoSchema = z.object({ token: z.string().regex(TOKEN_CANCELLAZIONE_RE) }).strict();

const RISPOSTE: Record<Exclude<EsitoCancellazione, 'eliminata'>, readonly [number, string]> = {
  non_valida: [400, 'Codice di cancellazione non valido: usa il link completo che hai ricevuto quando hai creato la scheda.'],
  non_trovata: [404, 'Questa scheda non esiste o è già stata eliminata.'],
  non_autorizzata: [403, 'Il codice non corrisponde a questa scheda: solo chi l’ha creata può eliminarla.'],
};

/** DELETE (o POST, per chi non può mandare DELETE) /api/scheda/:id con { token }: elimina la scheda. */
const elimina: APIRoute = async ({ params, request, locals }) => {
  const env = locals.runtime.env;
  if (Number(request.headers.get('content-length') ?? '0') > 1024) return jsonErrore(413, MESSAGGI.corpo);
  const corpo = CorpoSchema.safeParse(await request.json().catch(() => null));
  if (!corpo.success) return jsonErrore(...RISPOSTE.non_valida);

  const ipHash = await hashIpGiornaliero(ipDa(request), env.HASH_SALT);
  const limite = await controllaLimiti(env.KV, ipHash, [{ nome: 'elimina-ora', massimo: 20, finestraSecondi: 3600 }]);
  if (!limite.consentito) return jsonErrore(429, MESSAGGI.limite);

  try {
    const esito = await eliminaScheda(env, params.id ?? '', corpo.data.token);
    return esito === 'eliminata' ? jsonOk({ eliminata: true }) : jsonErrore(...RISPOSTE[esito]);
  } catch (e) {
    console.error('[scheda] cancellazione non riuscita', e instanceof Error ? e.message : e);
    return jsonErrore(500, MESSAGGI.interno);
  }
};

export const DELETE = elimina;
export const POST = elimina;
export const ALL: APIRoute = () => jsonErrore(405, MESSAGGI.metodo);
