import type { APIRoute } from 'astro';
import { CONSENSI } from '~/lib/consent';
import { salvaContattoB2b } from '~/lib/db/richieste';
import { inviaNotifica } from '~/lib/email';
import { jsonErrore, MESSAGGI } from '~/lib/http';
import { idCorto } from '~/lib/ids';
import { controllaModulo, rispondi } from '~/lib/moduli';
import { ContattoB2bSchema } from '~/lib/moduli/schemi';

export const prerender = false;
const PAGINA = '/per-concessionari';

export const POST: APIRoute = async ({ request, locals }) => {
  const env = locals.runtime.env;
  const esito = await controllaModulo(request, env, ContattoB2bSchema, { nome: 'b2b-giorno', massimo: 5, finestraSecondi: 86_400 });
  if (!esito.ok) return rispondi(request, PAGINA, esito);

  const consenso = CONSENSI.contatto_b2b;
  if (esito.dati.versioneConsenso !== consenso.versione) return rispondi(request, PAGINA, { ok: false, codice: 'consenso' });
  const id = `B${idCorto(9)}`;
  try {
    await salvaContattoB2b(env.DB, id, esito.dati, { finalita: consenso.finalita, testo: consenso.testo, versione: consenso.versione, accettato: true });
  } catch (e) {
    console.error('[b2b] salvataggio non riuscito', e instanceof Error ? e.message : e);
    return rispondi(request, PAGINA, { ok: false, codice: 'interno' });
  }
  const c = esito.dati;
  locals.runtime.ctx.waitUntil(
    inviaNotifica(env, {
      oggetto: `Contatto concessionaria ${id}: ${c.azienda}`,
      testo: [`Nome: ${c.nome}`, `Azienda: ${c.azienda}`, `Email: ${c.email}`, `Sito: ${c.sito || '-'}`, '', c.messaggio ?? ''].join('\n'),
    }),
  );
  return rispondi(request, PAGINA, { ok: true, dati: { id } });
};

export const ALL: APIRoute = () => jsonErrore(405, MESSAGGI.metodo);
