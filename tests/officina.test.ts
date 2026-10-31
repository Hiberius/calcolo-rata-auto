import { describe, expect, it } from 'vitest';
import { CONSENSI } from '~/lib/consent';
import { CONSERVAZIONE, istruzioniPulizia } from '~/lib/db/pulizia';
import { AttesaOfficinaSchema, RichiestaStampaSchema } from '~/lib/moduli/schemi';
import { ALTRO_MODELLO, MODELLI_OFFICINA, SOGLIA_CONTATORE, TESTO_ATTESA, testoContatore } from '~/lib/officina';
import { SIGLE_PROVINCE } from '~/lib/province';

const BASE = { modello: 'Fiat Panda', intervento: 'tagliando', importo: '1.234,50', provincia: 'mi' };

describe('officina (specifica v2, §4)', () => {
  it('accetta i soli campi indicati e normalizza importo e provincia', () => {
    const r = AttesaOfficinaSchema.parse(BASE);
    expect(r).toEqual({ modello: 'Fiat Panda', intervento: 'tagliando', importo: 1234.5, provincia: 'MI', consensoAvviso: false });
  });

  it('rifiuta campi in più: niente nome, targa, officina, telefono', () => {
    for (const campo of ['nome', 'targa', 'officina', 'telefono', 'giudizio']) {
      expect(AttesaOfficinaSchema.safeParse({ ...BASE, [campo]: 'x' }).success).toBe(false);
    }
  });

  it('modello e intervento da lista chiusa, provincia tra le 107 sigle, importo positivo e plausibile', () => {
    expect(AttesaOfficinaSchema.safeParse({ ...BASE, modello: 'Ferrari Testarossa' }).success).toBe(false);
    expect(AttesaOfficinaSchema.safeParse({ ...BASE, modello: ALTRO_MODELLO }).success).toBe(true);
    expect(AttesaOfficinaSchema.safeParse({ ...BASE, intervento: 'motore' }).success).toBe(false);
    expect(AttesaOfficinaSchema.safeParse({ ...BASE, provincia: 'XX' }).success).toBe(false);
    expect(AttesaOfficinaSchema.safeParse({ ...BASE, importo: '0' }).success).toBe(false);
    expect(AttesaOfficinaSchema.safeParse({ ...BASE, importo: '-40' }).success).toBe(false);
    expect(AttesaOfficinaSchema.safeParse({ ...BASE, importo: '250000' }).success).toBe(false);
    expect(AttesaOfficinaSchema.safeParse({ ...BASE, importo: 'tanto' }).success).toBe(false);
    expect(SIGLE_PROVINCE).toHaveLength(107);
    expect(new Set(MODELLI_OFFICINA).size).toBe(MODELLI_OFFICINA.length);
  });

  it('email e consenso all’avviso vanno insieme, mai una senza l’altro', () => {
    const consenso = { consensoAvviso: 'on', versioneConsenso: CONSENSI.avviso_officina.versione };
    expect(AttesaOfficinaSchema.safeParse({ ...BASE, email: 'a@b.it' }).success).toBe(false);
    expect(AttesaOfficinaSchema.safeParse({ ...BASE, ...consenso }).success).toBe(false);
    const ok = AttesaOfficinaSchema.parse({ ...BASE, email: 'A@B.it', ...consenso });
    expect(ok).toMatchObject({ email: 'a@b.it', consensoAvviso: true });
  });

  it('contatore pubblico solo da 25 preventivi in su', () => {
    expect(SOGLIA_CONTATORE).toBe(25);
    expect(testoContatore(0)).toBeNull();
    expect(testoContatore(24)).toBeNull();
    expect(testoContatore(null)).toBeNull();
    expect(testoContatore(25)).toBe('25 preventivi raccolti');
    expect(testoContatore(1312)).toBe('1.312 preventivi raccolti');
  });

  it('testo onesto: il confronto arriva a dicembre, nessun giudizio sul prezzo', () => {
    expect(TESTO_ATTESA).toContain('arriva a dicembre');
    expect(TESTO_ATTESA).toContain('anonimo');
    expect(TESTO_ATTESA.toLowerCase()).not.toMatch(/caro|conveniente|truff|fregatur|trappol/);
  });

  it('il consenso all’avviso dice a cosa serve l’email e per quanto la teniamo', () => {
    expect(CONSENSI.avviso_officina.finalita).toBe('avviso_officina');
    expect(CONSENSI.avviso_officina.testo).toContain('una sola email');
    expect(CONSENSI.avviso_officina.testo).toContain('6 mesi');
    expect(CONSERVAZIONE.emailOfficinaMesi).toBe(6);
  });

  it('la pulizia notturna toglie le email dell’officina e le righe vecchie con i loro consensi', () => {
    const sql: string[] = [];
    const finto = { prepare: (q: string) => ({ bind: () => { sql.push(q); return {}; } }) } as unknown as D1Database;
    istruzioniPulizia(finto);
    expect(sql.some((q) => q.startsWith('UPDATE attese_officina SET email = NULL'))).toBe(true);
    expect(sql.findIndex((q) => q.includes('consensi WHERE officina_id'))).toBeLessThan(sql.findIndex((q) => q.startsWith('DELETE FROM attese_officina')));
    expect(sql.findIndex((q) => q.includes('consensi WHERE stampa_id'))).toBeLessThan(sql.findIndex((q) => q.startsWith('DELETE FROM richieste_stampa')));
  });
});

describe('modulo stampa dell’Indice (§3)', () => {
  const STAMPA = { email: 'Redazione@Giornale.it', testata: 'Il Giornale di Prova', consensoStampa: 'on', versioneConsenso: CONSENSI.contatto_stampa.versione };

  it('email, testata e consenso; nient’altro', () => {
    expect(RichiestaStampaSchema.parse(STAMPA)).toMatchObject({ email: 'redazione@giornale.it', testata: 'Il Giornale di Prova', consensoStampa: true });
    expect(RichiestaStampaSchema.safeParse({ ...STAMPA, telefono: '333' }).success).toBe(false);
    const { consensoStampa: _c, ...senza } = STAMPA;
    expect(RichiestaStampaSchema.safeParse(senza).success).toBe(false);
    expect(RichiestaStampaSchema.safeParse({ ...STAMPA, testata: 'x' }).success).toBe(false);
  });

  it('il consenso della stampa ha la sua finalità', () => {
    expect(CONSENSI.contatto_stampa.finalita).toBe('contatto_stampa');
    expect(CONSENSI.contatto_stampa.testo).toContain('Indice');
  });
});
