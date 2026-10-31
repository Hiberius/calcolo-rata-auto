import type { APIRoute } from 'astro';
import { registraEvento } from '~/lib/db/queries';
import { hashIpGiornaliero } from '~/lib/hash';
import { ipDa, jsonErrore, MESSAGGI } from '~/lib/http';
import { leggiCorpo } from '~/lib/moduli';
import { EventoSchema } from '~/lib/moduli/schemi';
import { controllaLimiti } from '~/lib/ratelimit';

export const prerender = false;

/** Stessa origine o nessuna origine dichiarata (sendBeacon la manda sempre dai browser recenti). */
function stessaOrigine(request: Request): boolean {
  const origine = request.headers.get('origin');
  return !origine || origine === new URL(request.url).origin;
}

/** §11: eventi server-side, nessun dato personale, IP solo come hash giornaliero. */
export const POST: APIRoute = async ({ request, locals }) => {
  const env = locals.runtime.env;
  if (!stessaOrigine(request)) return jsonErrore(403, MESSAGGI.corpo);
  const corpo = await leggiCorpo(request);
  const esito = EventoSchema.safeParse(corpo);
  if (!esito.success) return jsonErrore(400, MESSAGGI.corpo);
  const ipHash = await hashIpGiornaliero(ipDa(request), env.HASH_SALT);
  const limite = await controllaLimiti(env.KV, ipHash, [{ nome: 'eventi-giorno', massimo: 200, finestraSecondi: 86_400 }]);
  if (!limite.consentito) return new Response(null, { status: 204 });
  try {
    await registraEvento(env.DB, { nome: esito.data.nome, ipHash, ...(esito.data.schedaId ? { schedaId: esito.data.schedaId } : {}) });
  } catch (e) {
    console.error('[evento] non registrato', e instanceof Error ? e.message : e);
  }
  return new Response(null, { status: 204 });
};

export const ALL: APIRoute = () => jsonErrore(405, MESSAGGI.metodo);
