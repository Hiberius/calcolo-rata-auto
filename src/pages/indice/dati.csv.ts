import type { APIRoute } from 'astro';
import { registraEvento } from '~/lib/db/queries';
import { hashIpGiornaliero } from '~/lib/hash';
import { ipDa } from '~/lib/http';
import { edizioneIndice } from '~/lib/indice';
import { csvEdizione } from '~/lib/indice/csv';
import { tutteLePromo } from '~/lib/promo';

export const prerender = false;

/** §3: i dati dell'edizione in CSV, licenza CC BY 4.0. Prima delle 20 promo valide non c'è un'edizione: 404 con il motivo. */
export const GET: APIRoute = async ({ request, locals }) => {
  const adesso = new Date();
  const e = edizioneIndice(tutteLePromo(adesso), adesso);
  const csv = csvEdizione(e);
  if (!csv) {
    return new Response(`L'Indice non è ancora uscito: ${e.attesa ?? ''}\n`, { status: 404, headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' } });
  }
  const env = locals.runtime?.env;
  if (env?.DB) {
    const evento = hashIpGiornaliero(ipDa(request), env.HASH_SALT)
      .then((ipHash) => registraEvento(env.DB, { nome: 'indice_csv', ipHash, meta: { edizione: e.chiave } }))
      .catch((err: unknown) => console.error('[indice] evento non registrato', err instanceof Error ? err.message : err));
    locals.runtime.ctx.waitUntil(evento);
  }
  return new Response(csv, {
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': `attachment; filename="indice-rata-vera-${e.chiave}.csv"`,
      'cache-control': 'public, max-age=900',
    },
  });
};
