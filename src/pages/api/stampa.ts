import type { APIRoute } from 'astro';
import { CONSENSI } from '~/lib/consent';
import { salvaRichiestaStampa } from '~/lib/db/officina';
import { jsonErrore, MESSAGGI } from '~/lib/http';
import { idCorto } from '~/lib/ids';
import { controllaModulo, rispondi } from '~/lib/moduli';
import { RichiestaStampaSchema } from '~/lib/moduli/schemi';

export const prerender = false;
const PAGINA = '/indice';

/** §3: la stampa lascia email e testata per ricevere l'Indice appena esce. */
export const POST: APIRoute = async ({ request, locals }) => {
  const env = locals.runtime.env;
  const esito = await controllaModulo(request, env, RichiestaStampaSchema, { nome: 'stampa-giorno', massimo: 5, finestraSecondi: 86_400 });
  if (!esito.ok) return rispondi(request, PAGINA, esito);

  const consenso = CONSENSI.contatto_stampa;
  const { consensoStampa: _c, versioneConsenso, ...dati } = esito.dati;
  if (versioneConsenso !== consenso.versione) return rispondi(request, PAGINA, { ok: false, codice: 'consenso' });

  const richiesta = { ...dati, id: `S${idCorto(9)}` };
  try {
    await salvaRichiestaStampa(env.DB, richiesta, { finalita: consenso.finalita, testo: consenso.testo, versione: consenso.versione, accettato: true });
  } catch (e) {
    console.error('[stampa] salvataggio non riuscito', e instanceof Error ? e.message : e);
    return rispondi(request, PAGINA, { ok: false, codice: 'interno' });
  }
  return rispondi(request, PAGINA, { ok: true, dati: { id: richiesta.id } });
};

export const ALL: APIRoute = () => jsonErrore(405, MESSAGGI.metodo);
