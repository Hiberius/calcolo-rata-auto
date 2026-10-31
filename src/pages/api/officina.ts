import type { APIRoute } from 'astro';
import { CONSENSI } from '~/lib/consent';
import { salvaAttesaOfficina } from '~/lib/db/officina';
import { jsonErrore, MESSAGGI } from '~/lib/http';
import { idCorto } from '~/lib/ids';
import { controllaModulo, rispondi } from '~/lib/moduli';
import { AttesaOfficinaSchema } from '~/lib/moduli/schemi';

export const prerender = false;
const PAGINA = '/officina';

/** §4: salva il preventivo dell'officina (anonimo) e, se c'è, l'email con il suo consenso all'avviso. */
export const POST: APIRoute = async ({ request, locals }) => {
  const env = locals.runtime.env;
  const esito = await controllaModulo(request, env, AttesaOfficinaSchema, { nome: 'officina-giorno', massimo: 20, finestraSecondi: 86_400 });
  if (!esito.ok) return rispondi(request, PAGINA, esito);

  const consenso = CONSENSI.avviso_officina;
  const { consensoAvviso, versioneConsenso, ...dati } = esito.dati;
  if (consensoAvviso && versioneConsenso !== consenso.versione) return rispondi(request, PAGINA, { ok: false, codice: 'consenso' });

  const attesa = { ...dati, id: `O${idCorto(9)}` };
  const registro = consensoAvviso ? { finalita: consenso.finalita, testo: consenso.testo, versione: consenso.versione, accettato: true } : null;
  try {
    await salvaAttesaOfficina(env.DB, attesa, registro, esito.ipHash);
  } catch (e) {
    console.error('[officina] salvataggio non riuscito', e instanceof Error ? e.message : e);
    return rispondi(request, PAGINA, { ok: false, codice: 'interno' });
  }
  return rispondi(request, PAGINA, { ok: true, dati: { id: attesa.id } });
};

export const ALL: APIRoute = () => jsonErrore(405, MESSAGGI.metodo);
