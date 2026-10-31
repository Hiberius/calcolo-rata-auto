/** Risposta 404 con la pagina 404 statica del sito (da ASSETS), per le rotte rese a richiesta. */
export async function paginaNonTrovata(env: Pick<Env, 'ASSETS'> | undefined, url: URL): Promise<Response> {
  const intestazioni = { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' };
  try {
    const pagina = await env?.ASSETS.fetch(new URL('/404.html', url));
    if (pagina?.ok) return new Response(pagina.body, { status: 404, headers: intestazioni });
  } catch {
    // ASSETS non disponibile (sviluppo): testo semplice qui sotto.
  }
  return new Response('<!doctype html><meta charset="utf-8"><title>Pagina non trovata</title><p>Questa pagina non c\'è. <a href="/">Rata Vera</a></p>', { status: 404, headers: intestazioni });
}
