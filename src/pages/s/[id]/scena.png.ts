import type { APIRoute } from 'astro';
import { rendiPng } from '~/lib/og/render';
import { datiScena, DIMENSIONI_SCENA, nodoScena, testoScena } from '~/lib/og/scena';
import { datiScheda } from '~/lib/og/template';
import { caricaScheda, TTL_CACHE_SCHEDA, VERSIONE_OG } from '~/lib/scheda';

export const prerender = false;

/** Immagine statica dell'atto 2 (valore stimato contro debito), accanto allo scontrino della scheda. */
async function generaPng(id: string, env: Env): Promise<ArrayBuffer | null> {
  const scheda = await caricaScheda(env, id);
  if (!scheda) return null;
  const dati = datiScena(scheda.analisi, datiScheda(scheda.analisi, id, env.PUBLIC_SITE_URL).urlBreve);
  if (!dati) return null;
  return rendiPng(nodoScena(dati), DIMENSIONI_SCENA, testoScena(dati));
}

export const GET: APIRoute = async ({ params, url, locals }) => {
  const env = locals.runtime.env;
  const id = params.id ?? '';
  const chiave = `og:${VERSIONE_OG}:${id}:scena`;
  const intestazioni: Record<string, string> = { 'content-type': 'image/png', 'cache-control': 'public, max-age=86400' };
  if (url.searchParams.has('scarica')) intestazioni['content-disposition'] = `attachment; filename="ratavera-${id}-scena.png"`;

  try {
    const inCache = await env.KV.get(chiave, 'arrayBuffer');
    if (inCache) return new Response(inCache, { headers: intestazioni });
    const png = await generaPng(id, env);
    if (!png) return new Response('Immagine non disponibile per questa scheda', { status: 404 });
    locals.runtime.ctx.waitUntil(env.KV.put(chiave, png, { expirationTtl: TTL_CACHE_SCHEDA }));
    return new Response(png, { headers: intestazioni });
  } catch {
    return new Response("Non siamo riusciti a generare l'immagine: riprova tra poco.", { status: 500 });
  }
};
