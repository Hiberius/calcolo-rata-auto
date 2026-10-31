import type { APIRoute } from 'astro';
import { adattatoreEmail } from '~/lib/consegna';
import { CONSENSI } from '~/lib/consent';
import { salvaRichiestaNoleggio, segnaConsegnata } from '~/lib/db/richieste';
import { jsonErrore, MESSAGGI } from '~/lib/http';
import { idCorto } from '~/lib/ids';
import { controllaModulo, rispondi } from '~/lib/moduli';
import { RichiestaNoleggioSchema } from '~/lib/moduli/schemi';

export const prerender = false;
const PAGINA = '/noleggio';

export const POST: APIRoute = async ({ request, locals }) => {
  const env = locals.runtime.env;
  const esito = await controllaModulo(request, env, RichiestaNoleggioSchema, { nome: 'noleggio-giorno', massimo: 5, finestraSecondi: 86_400 });
  if (!esito.ok) return rispondi(request, PAGINA, esito);

  const consenso = CONSENSI.contatto_noleggio;
  const { consensoContatto: _c, versioneConsenso, ...dati } = esito.dati;
  if (versioneConsenso !== consenso.versione) return rispondi(request, PAGINA, { ok: false, codice: 'consenso' });

  const richiesta = { ...dati, id: `N${idCorto(9)}` };
  try {
    await salvaRichiestaNoleggio(env.DB, richiesta, { finalita: consenso.finalita, testo: consenso.testo, versione: consenso.versione, accettato: true }, esito.ipHash);
  } catch (e) {
    console.error('[noleggio] salvataggio non riuscito', e instanceof Error ? e.message : e);
    return rispondi(request, PAGINA, { ok: false, codice: 'interno' });
  }
  // La consegna non deve far perdere la richiesta: se l'email non parte resta "nuova" e si vede in /admin.
  const consegna = await adattatoreEmail(env).consegna(richiesta);
  if (consegna.ok && consegna.riferimento) {
    locals.runtime.ctx.waitUntil(segnaConsegnata(env.DB, richiesta.id, consegna.riferimento).catch(() => undefined));
  }
  return rispondi(request, PAGINA, { ok: true, dati: { id: richiesta.id } });
};

export const ALL: APIRoute = () => jsonErrore(405, MESSAGGI.metodo);
