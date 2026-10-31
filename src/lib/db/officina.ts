import type { AttesaOfficina, RichiestaStampa } from '../moduli/schemi';
import { istruzioneRegistraConsenso, istruzioneRegistraEvento, type NuovoConsenso } from './queries';

export interface NuovaAttesaOfficina extends Omit<AttesaOfficina, 'consensoAvviso' | 'versioneConsenso' | 'email'> {
  readonly id: string;
}

export interface NuovoAvvisoOfficina {
  readonly id: string;
  readonly email: string;
}

/** Oggi a Roma come giorno (2026-10-31): il preventivo e l'email non portano l'orario, così non si collegano tra loro. */
function giornoDi(adesso: Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Rome', year: 'numeric', month: '2-digit', day: '2-digit' }).format(adesso);
}

/**
 * Preventivo dell'officina (anonimo) + email dell'avviso in una tabella a parte, senza un codice che li colleghi
 * + consenso legato solo all'email + evento officina_attesa senza dettagli, in un'unica transazione.
 */
export async function salvaAttesaOfficina(
  db: D1Database, a: NuovaAttesaOfficina, avviso: NuovoAvvisoOfficina | null, consenso: NuovoConsenso | null, ipHash: string, adesso = new Date(),
): Promise<void> {
  const giorno = giornoDi(adesso);
  const conAvviso = avviso && consenso
    ? [
        db.prepare('INSERT INTO avvisi_officina (id, email, created_at) VALUES (?1, ?2, ?3)').bind(avviso.id, avviso.email, giorno),
        istruzioneRegistraConsenso(db, { ...consenso, avvisoId: avviso.id }),
      ]
    : [];
  await db.batch([
    db
      .prepare('INSERT INTO attese_officina (id, modello, intervento, importo, provincia, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6)')
      .bind(a.id, a.modello, a.intervento, a.importo, a.provincia, giorno),
    ...conAvviso,
    istruzioneRegistraEvento(db, { nome: 'officina_attesa', ipHash }),
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
