import type { ContattoB2b, RichiestaVerdetto } from '../moduli/schemi';
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

export async function salvaContattoB2b(db: D1Database, id: string, c: ContattoB2b, consenso: NuovoConsenso): Promise<void> {
  await db.batch([
    db.prepare('INSERT INTO b2b_contatti (id, nome, azienda, email, sito, messaggio) VALUES (?1, ?2, ?3, ?4, ?5, ?6)')
      .bind(id, c.nome, c.azienda, c.email, c.sito || null, c.messaggio ?? null),
    db.prepare('INSERT INTO consensi (finalita, testo, versione, accettato, b2b_id) VALUES (?1, ?2, ?3, 1, ?4)')
      .bind(consenso.finalita, consenso.testo, consenso.versione, id),
  ]);
}

export async function salvaRichiestaVerdetto(db: D1Database, id: string, r: RichiestaVerdetto, ipHash: string): Promise<void> {
  await db.batch([
    db.prepare('INSERT INTO richieste_verdetto (id, scheda_id, email, riferimento_pagamento, nota) VALUES (?1, ?2, ?3, ?4, ?5)')
      .bind(id, r.schedaId, r.email, r.riferimentoPagamento ?? null, r.nota ?? null),
    istruzioneRegistraEvento(db, { nome: 'verdetto_click', schedaId: r.schedaId, ipHash, meta: { modulo: true } }),
  ]);
}
