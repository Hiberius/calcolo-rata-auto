import type { RichiestaDaConsegnare } from '../consegna';
import { istruzioneRegistraConsenso, istruzioneRegistraEvento, type NuovoConsenso } from './queries';

/** Richiesta noleggio + consenso + evento in un'unica transazione. */
export async function salvaRichiestaNoleggio(db: D1Database, r: RichiestaDaConsegnare, consenso: NuovoConsenso, ipHash: string): Promise<void> {
  await db.batch([
    db
      .prepare('INSERT INTO richieste_noleggio (id, nome, email, telefono, provincia, modello, durata_mesi, km_annui, anticipo_zero) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)')
      .bind(r.id, r.nome, r.email, r.telefono, r.provincia, r.modello, r.durataMesi, r.kmAnnui, r.anticipoZero ? 1 : 0),
    istruzioneRegistraConsenso(db, { ...consenso, richiestaId: r.id }),
    istruzioneRegistraEvento(db, { nome: 'noleggio_inviato', ipHash, meta: { durata: r.durataMesi } }),
  ]);
}

export async function segnaConsegnata(db: D1Database, id: string, riferimento: string): Promise<void> {
  await db.prepare("UPDATE richieste_noleggio SET stato = 'consegnata', riferimento_consegna = ?2 WHERE id = ?1").bind(id, riferimento).run();
}
