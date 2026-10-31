import { describe, expect, it, vi } from 'vitest';
import { adattatoreEmail, emailRichiesta } from '~/lib/consegna';
import { CONSENSI } from '~/lib/consent';
import { inviaNotifica } from '~/lib/email';
import { messaggioErrore, rispondi, separaToken } from '~/lib/moduli';
import { EventoSchema, RichiestaNoleggioSchema } from '~/lib/moduli/schemi';
import { costoNetto, residuoPredefinito } from '~/lib/calc/residuo';
import { analizzaLeggero } from '~/lib/calc/leggero';
import { analizza } from '~/lib/calc';

const NOLEGGIO = {
  nome: 'Maria Rossi', email: 'Maria@Esempio.it', telefono: '+39 333 1234567', provincia: 'mi', modello: 'Peugeot 208',
  durataMesi: '36', kmAnnui: '15000', anticipoZero: 'on', consensoContatto: 'on', versioneConsenso: CONSENSI.contatto_noleggio.versione,
};

describe('modulo noleggio (§9)', () => {
  it('accetta i soli campi ammessi e normalizza', () => {
    const r = RichiestaNoleggioSchema.parse(NOLEGGIO);
    expect(r).toMatchObject({ email: 'maria@esempio.it', provincia: 'MI', durataMesi: 36, kmAnnui: 15000, anticipoZero: true, consensoContatto: true });
  });

  it('rifiuta qualunque dato di credito', () => {
    for (const campo of ['reddito', 'rataMassima', 'anticipoDisponibile', 'budget']) {
      expect(RichiestaNoleggioSchema.safeParse({ ...NOLEGGIO, [campo]: '1000' }).success).toBe(false);
    }
  });

  it('senza consenso o con durata non prevista non passa', () => {
    const { consensoContatto: _c, ...senza } = NOLEGGIO;
    expect(RichiestaNoleggioSchema.safeParse(senza).success).toBe(false);
    expect(RichiestaNoleggioSchema.safeParse({ ...NOLEGGIO, durataMesi: '60' }).success).toBe(false);
    expect(RichiestaNoleggioSchema.safeParse({ ...NOLEGGIO, telefono: 'chiamami' }).success).toBe(false);
  });

  it('il consenso nomina chi contatta davvero (Rata Vera) e non promette un partner che non c’è', () => {
    expect(CONSENSI.contatto_noleggio.testo).toContain('Accetto di essere contattato da Rata Vera');
    expect(CONSENSI.contatto_noleggio.testo).toContain('senza un mio nuovo consenso');
    expect(CONSENSI.contatto_noleggio.versione.length).toBeLessThanOrEqual(20);
  });
});

describe('altri moduli', () => {
  it('evento: solo i nomi che il browser può mandare', () => {
    expect(EventoSchema.safeParse({ nome: 'tre_strade_usato' }).success).toBe(true);
    expect(EventoSchema.safeParse({ nome: 'noleggio_inviato' }).success).toBe(false);
    expect(EventoSchema.safeParse({ nome: 'verdetto_click' }).success).toBe(false);
    expect(EventoSchema.safeParse({ nome: 'b2b_click' }).success).toBe(false);
    expect(EventoSchema.safeParse({ nome: 'scheda_condivisa', email: 'x@y.it' }).success).toBe(false);
  });

  it('separa il token anti-robot e scarta i campi vuoti', () => {
    const { token, campi } = separaToken({ 'cf-turnstile-response': 'tok', nome: 'A', nota: '' });
    expect(token).toBe('tok');
    expect(campi).toEqual({ nome: 'A' });
  });

  it('form HTML: risposta 303 verso la pagina con l’esito', () => {
    const form = new Request('https://x.it/api/noleggio', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' } });
    expect(rispondi(form, '/noleggio', { ok: true }).headers.get('location')).toBe('/noleggio?inviato=1#modulo');
    expect(rispondi(form, '/noleggio', { ok: false, codice: 'dati', campi: ['email'] }).headers.get('location')).toContain('errore=dati&campi=email');
    const json = new Request('https://x.it/api/noleggio', { method: 'POST', headers: { 'content-type': 'application/json' } });
    expect(rispondi(json, '/x', { ok: false, codice: 'limite' }).status).toBe(429);
    expect(messaggioErrore('turnstile')).toContain('anti-robot');
    expect(messaggioErrore('<script>')).toBeNull();
  });
});

describe('email e consegna', () => {
  const richiesta = { id: 'N123', nome: 'Maria', email: 'm@e.it', telefono: '333', provincia: 'MI', modello: '208', durataMesi: 36, kmAnnui: 15000, anticipoZero: false };

  it('senza BREVO_API_KEY non invia, non lancia e lo segnala', async () => {
    const avviso = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const finto = vi.fn();
    expect(await inviaNotifica({}, { oggetto: 'x', testo: 'y' }, finto)).toEqual({ ok: false, motivo: 'non_configurata' });
    expect(finto).not.toHaveBeenCalled();
    expect(avviso).toHaveBeenCalled();
    avviso.mockRestore();
  });

  it('con la chiave chiama Brevo e restituisce un riferimento', async () => {
    const finto = vi.fn(async () => new Response(JSON.stringify({ messageId: 'm-1' }), { status: 201 }));
    const esito = await adattatoreEmail({ BREVO_API_KEY: 'k', NOTIFY_EMAIL: 'c@r.it' }, finto as unknown as typeof fetch).consegna(richiesta);
    expect(esito).toEqual({ ok: true, riferimento: 'email:m-1' });
    const corpo = JSON.parse(String((finto.mock.calls[0] as unknown as [string, RequestInit])[1].body)) as { to: { email: string }[] };
    expect(corpo.to[0]?.email).toBe('c@r.it');
  });

  it('l’email della richiesta non contiene dati di credito', () => {
    expect(emailRichiesta(richiesta).testo).not.toMatch(/reddito|rata massima|anticipo disponibile/i);
  });
});

describe('tre strade: valore residuo e calcolo leggero', () => {
  const a = analizza({ prezzoPromo: 14950, anticipo: 4326, nRate: 35, rata: 99, maxiRata: 10434, importoTotaleDovutoDichiarato: 13927.25 }, { canoneNoleggio: 250 });
  if (!a.ok) throw new Error('analisi');

  it('il residuo predefinito è la maxi rata, altrimenti il 45% del prezzo', () => {
    expect(residuoPredefinito(10434, 14950)).toBe(10434);
    expect(residuoPredefinito(undefined, 20000)).toBe(9000);
    expect(residuoPredefinito(undefined, null)).toBeNull();
  });

  it('spesa netta solo dove l’auto resta tua', () => {
    const [sa, sb, sc] = a.analisi.treStrade;
    expect(costoNetto(sb!, 10434, 'finanziamento')).toBeCloseTo(18253.25 - 10434, 2);
    expect(costoNetto(sa!, 10434, 'finanziamento')).not.toBeNull();
    expect(costoNetto(sc!, 10434, 'finanziamento')).toBeNull();
    expect(costoNetto(sb!, 10434, 'noleggio')).toBeNull();
  });

  it('il calcolo leggero dà gli stessi numeri di analizza e rifiuta i negativi', () => {
    const leggero = analizzaLeggero({ prezzoPromo: 14950, anticipo: 4326, nRate: 35, rata: 99, maxiRata: 10434, importoTotaleDovutoDichiarato: 13927.25 });
    expect(leggero?.totali.totalePagatoTenendo).toBe(a.analisi.totali.totalePagatoTenendo);
    expect(analizzaLeggero({ anticipo: -1, nRate: 3, rata: 1 })).toBeNull();
    expect(analizzaLeggero({ anticipo: 1, nRate: 2.5, rata: 1 })).toBeNull();
  });
});
