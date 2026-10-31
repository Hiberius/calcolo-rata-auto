/**
 * Offerta alle concessionarie e verdetto esperto: tolti il 31/10/2026 (offerta bocciata).
 * Le pagine e gli endpoint rispondono 410 «non c'è più»; le tabelle D1 (b2b_contatti, richieste_verdetto) restano.
 */
export const PAGINE_RIMOSSE = ['/per-concessionari', '/verdetto'] as const;
export const ENDPOINT_RIMOSSI = ['/api/b2b', '/api/verdetto'] as const;

export const MESSAGGIO_RIMOSSO = 'Questo servizio non è più attivo.';

const INTESTAZIONI = { 'cache-control': 'public, max-age=3600', 'x-robots-tag': 'noindex' } as const;

const PAGINA = `<!doctype html>
<html lang="it"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex"><title>Pagina rimossa | Rata Vera</title>
<style>body{margin:0;background:#F6F3EE;color:#15171A;font:1.0625rem/1.55 system-ui,sans-serif}main{max-width:40rem;margin:0 auto;padding:4rem 1rem}a{color:inherit}</style></head>
<body><main><p>410</p><h1>Questa pagina non c'è più.</h1>
<p>${MESSAGGIO_RIMOSSO} I conti dei preventivi si fanno, gratis, dalla pagina iniziale.</p>
<p><a href="/">Leggi un preventivo</a> · <a href="/promozioni">Promozioni</a></p></main></body></html>`;

export function paginaRimossa(): Response {
  return new Response(PAGINA, { status: 410, headers: { ...INTESTAZIONI, 'content-type': 'text/html; charset=utf-8' } });
}

export function endpointRimosso(): Response {
  return new Response(JSON.stringify({ ok: false, errore: MESSAGGIO_RIMOSSO }), {
    status: 410,
    headers: { ...INTESTAZIONI, 'content-type': 'application/json; charset=utf-8' },
  });
}
