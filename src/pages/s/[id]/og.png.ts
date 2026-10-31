import type { APIRoute } from 'astro';
import { DIMENSIONI_OG, nodoScheda, testoUsato, type FormatoOg } from '~/lib/og/card';
import { datiScheda } from '~/lib/og/template';
import { caricaScheda, TTL_CACHE_SCHEDA } from '~/lib/scheda';

export const prerender = false;

const VERSIONE_OG = 'v5';

async function generaPng(id: string, formato: FormatoOg, env: Env): Promise<ArrayBuffer | null> {
  const scheda = await caricaScheda(env, id);
  if (!scheda) return null;
  const dati = datiScheda(scheda.analisi, id, env.PUBLIC_SITE_URL);
  const { ImageResponse, loadGoogleFont } = await import('workers-og');
  // workers-og non codifica il parametro text: lo codifichiamo qui (€, ×, · e + altrimenti si perdono).
  const testo = encodeURIComponent([...new Set(testoUsato(dati))].join(''));
  const [sans, mono] = await Promise.all([
    loadGoogleFont({ family: 'Instrument Sans', weight: 600, text: testo }),
    loadGoogleFont({ family: 'JetBrains Mono', weight: 500, text: testo }),
  ]);
  const risposta = new ImageResponse(nodoScheda(dati, formato) as unknown as string, {
    ...DIMENSIONI_OG[formato],
    fonts: [
      { name: 'Instrument Sans', data: sans, weight: 600, style: 'normal' },
      { name: 'JetBrains Mono', data: mono, weight: 500, style: 'normal' },
    ],
  });
  return risposta.arrayBuffer();
}

export const GET: APIRoute = async ({ params, url, locals }) => {
  const env = locals.runtime.env;
  const id = params.id ?? '';
  const formato: FormatoOg = url.searchParams.get('formato') === 'quadrato' ? 'quadrato' : 'orizzontale';
  const chiave = `og:${VERSIONE_OG}:${id}:${formato}`;
  const intestazioni: Record<string, string> = { 'content-type': 'image/png', 'cache-control': 'public, max-age=86400' };
  if (url.searchParams.has('scarica')) intestazioni['content-disposition'] = `attachment; filename="ratavera-${id}-${formato}.png"`;

  try {
    const inCache = await env.KV.get(chiave, 'arrayBuffer');
    if (inCache) return new Response(inCache, { headers: intestazioni });
    const png = await generaPng(id, formato, env);
    if (!png) return new Response('Scheda non trovata', { status: 404 });
    locals.runtime.ctx.waitUntil(env.KV.put(chiave, png, { expirationTtl: TTL_CACHE_SCHEDA }));
    return new Response(png, { headers: intestazioni });
  } catch {
    return new Response("Non siamo riusciti a generare l'immagine: riprova tra poco.", { status: 500 });
  }
};
