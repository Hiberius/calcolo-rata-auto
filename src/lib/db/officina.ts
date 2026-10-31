import type { AttesaOfficina, RichiestaStampa } from '../moduli/schemi';
import { istruzioneRegistraConsenso, istruzioneRegistraEvento, type NuovoConsenso } from './queries';

export interface NuovaAttesaOfficina extends Omit<AttesaOfficina, 'consensoAvviso' | 'versioneConsenso'> {
  readonly id: string;
}

/** Preventivo dell'officina + consenso all'avviso (se c'è l'email) + evento officina_attesa, in un'unica transazione. */
export async function salvaAttesaOfficina(db: D1Database, a: NuovaAttesaOfficina, consenso: NuovoConsenso | null, ipHash: string): Promise<void> {
  await db.batch([
    db
      .prepare('INSERT INTO attese_officina (id, modello, intervento, importo, provincia, email) VALUES (?1, ?2, ?3, ?4, ?5, ?6)')
      .bind(a.id, a.modello, a.intervento, a.importo, a.provincia, a.email ?? null),
    ...(consenso ? [istruzioneRegistraConsenso(db, { ...consenso, officinaId: a.id })] : []),
    istruzioneRegistraEvento(db, { nome: 'officina_attesa', ipHash, meta: { intervento: a.intervento, avviso: Boolean(a.email) } }),
  ]);
}

/** Quanti preventivi dell'officina abbiamo: il contatore pubblico lo mostra solo da 25 in su. null se il database non risponde. */
export async function contaAtteseOfficina(db: D1Database): Promise<number | null> {
  try {
    const riga = await db.prepare('SELECT COUNT(*) AS n FROM attese_officina').first<{ n: number }>();
    return riga?.n ?? 0;
  } catch (e) {
    console.error('[officina] conteggio non riuscito', e instanceof Error ? e.message : e);
    return null;
  }
}

export interface NuovaRichiestaStampa extends Omit<RichiestaStampa, 'consensoStampa' | 'versioneConsenso'> {
  readonly id: string;
}

/** Richiesta della stampa + consenso, in un'unica transazione. */
export async function salvaRichiestaStampa(db: D1Database, r: NuovaRichiestaStampa, consenso: NuovoConsenso): Promise<void> {
  await db.batch([
    db.prepare('INSERT INTO richieste_stampa (id, email, testata) VALUES (?1, ?2, ?3)').bind(r.id, r.email, r.testata),
    istruzioneRegistraConsenso(db, { ...consenso, stampaId: r.id }),
  ]);
}
