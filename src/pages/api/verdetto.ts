import type { APIRoute } from 'astro';
import { salvaRichiestaVerdetto } from '~/lib/db/richieste';
import { leggiScheda } from '~/lib/db/queries';
import { inviaNotifica } from '~/lib/email';
import { jsonErrore, MESSAGGI } from '~/lib/http';
import { idCorto } from '~/lib/ids';
import { controllaModulo, rispondi } from '~/lib/moduli';
import { RichiestaVerdettoSchema } from '~/lib/moduli/schemi';

export const prerender = false;
const PAGINA = '/verdetto';

export const POST: APIRoute = async ({ request, locals }) => {
  const env = locals.runtime.env;
  const esito = await controllaModulo(request, env, RichiestaVerdettoSchema, { nome: 'verdetto-giorno', massimo: 5, finestraSecondi: 86_400 });
  if (!esito.ok) return rispondi(request, PAGINA, esito);

  const r = esito.dati;
  const id = `V${idCorto(9)}`;
  try {
    const scheda = await leggiScheda(env.DB, r.schedaId);
    if (!scheda) return rispondi(request, PAGINA, { ok: false, codice: 'dati', campi: ['schedaId'] });
    await salvaRichiestaVerdetto(env.DB, id, r, esito.ipHash);
  } catch (e) {
    console.error('[verdetto] salvataggio non riuscito', e instanceof Error ? e.message : e);
    return rispondi(request, PAGINA, { ok: false, codice: 'interno' });
  }
  locals.runtime.ctx.waitUntil(
    inviaNotifica(env, {
      oggetto: `Verdetto ${id}: scheda ${r.schedaId}`,
      testo: [`Scheda: /s/${r.schedaId}`, `Email: ${r.email}`, `Pagamento: ${r.riferimentoPagamento ?? '-'}`, '', r.nota ?? '', '', 'Consegna del PDF entro 24 ore.'].join('\n'),
    }),
  );
  return rispondi(request, PAGINA, { ok: true, dati: { id } });
};

export const ALL: APIRoute = () => jsonErrore(405, MESSAGGI.metodo);
