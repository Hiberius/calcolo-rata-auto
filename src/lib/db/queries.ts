import type { Analisi } from '../calc';

export const NOMI_EVENTO = [
  'decodifica_ok', 'decodifica_errore', 'decodifica_manuale', 'scheda_creata', 'scheda_condivisa',
  'archivio_consenso', 'tre_strade_usato', 'noleggio_inviato', 'verdetto_click', 'b2b_click',
  'scena_vista', 'scena_atto2_interagito', 'mostra_venditore', 'officina_attesa', 'indice_csv',
] as const;
export type NomeEvento = (typeof NOMI_EVENTO)[number];
export type Finalita = 'archivio' | 'contatto_noleggio' | 'newsletter' | 'contatto_b2b' | 'avviso_officina' | 'contatto_stampa';

export interface RigaScheda {
  readonly id: string;
  readonly marca: string | null;
  readonly modello: string | null;
  readonly versione: string | null;
  readonly provincia: string | null;
  readonly tipo: 'finanziamento' | 'leasing' | 'noleggio';
  readonly prezzo_riferimento: number | null;
  readonly anticipo: number;
  readonly n_rate: number;
  readonly rata: number;
  readonly maxi_rata: number | null;
  readonly taeg_dichiarato: number | null;
  readonly taeg_ricostruito: number | null;
  readonly totale: number;
  readonly costo_credito: number | null;
  readonly costo_credito_pct: number | null;
  readonly input_json: string;
  readonly output_json: string;
  readonly consenso_archivio: 0 | 1;
  readonly versione_consenso: string | null;
  readonly token_cancellazione_hash: string | null;
  readonly created_at: string;
}

export interface NuovaScheda {
  readonly id: string;
  readonly analisi: Analisi;
  readonly consensoArchivio: boolean;
  readonly versioneConsenso: string | null;
  /** Impronta SHA-256 del codice di cancellazione (il codice va solo a chi crea la scheda). */
  readonly improntaCancellazione: string | null;
}

/** Riassunto salvato in output_json: solo numeri calcolati, nessun testo libero dell'utente. */
function riassunto(a: Analisi): string {
  return JSON.stringify({ totali: a.totali, taeg: a.taeg, ricostruzione: a.ricostruzione, verdetto: a.verdetto, scenari: a.scenari });
}

function vuotoANull<T>(v: T | undefined): T | null {
  return v === undefined ? null : v;
}

export function istruzioneInserisciScheda(db: D1Database, s: NuovaScheda): D1PreparedStatement {
  const p = s.analisi.preventivo;
  const t = s.analisi.totali;
  return db
    .prepare(
      `INSERT INTO schede (id, marca, modello, versione, provincia, tipo, prezzo_riferimento, anticipo, n_rate, rata, maxi_rata,
        taeg_dichiarato, taeg_ricostruito, totale, costo_credito, costo_credito_pct, input_json, output_json, consenso_archivio, versione_consenso,
        token_cancellazione_hash)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18, ?19, ?20, ?21)`,
    )
    .bind(
      s.id, vuotoANull(p.marca), vuotoANull(p.modello), vuotoANull(p.versione), vuotoANull(p.provincia), p.tipo,
      t.prezzoRiferimento, p.anticipo, p.nRate, p.rata, vuotoANull(p.maxiRata), vuotoANull(p.taegDichiarato),
      s.analisi.taeg.taegRicostruito, t.totalePagatoTenendo, t.costoCredito, t.costoCreditoPct,
      JSON.stringify(p), riassunto(s.analisi), s.consensoArchivio ? 1 : 0, s.versioneConsenso,
      s.improntaCancellazione,
    );
}

export interface NuovoConsenso {
  readonly finalita: Finalita;
  readonly testo: string;
  readonly versione: string;
  readonly accettato: boolean;
  readonly schedaId?: string;
  readonly richiestaId?: string;
  readonly officinaId?: string;
  readonly stampaId?: string;
  /** Email dell'avviso officina (avvisi_officina), mai il preventivo. */
  readonly avvisoId?: string;
}

export function istruzioneRegistraConsenso(db: D1Database, c: NuovoConsenso): D1PreparedStatement {
  return db
    .prepare('INSERT INTO consensi (finalita, testo, versione, accettato, scheda_id, richiesta_id, officina_id, stampa_id, avviso_id) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)')
    .bind(c.finalita, c.testo, c.versione, c.accettato ? 1 : 0, c.schedaId ?? null, c.richiestaId ?? null, c.officinaId ?? null, c.stampaId ?? null, c.avvisoId ?? null);
}

export interface NuovoEvento {
  readonly nome: NomeEvento;
  readonly schedaId?: string;
  readonly ipHash?: string;
  readonly meta?: Readonly<Record<string, string | number | boolean | null>>;
}

export function istruzioneRegistraEvento(db: D1Database, e: NuovoEvento): D1PreparedStatement {
  return db
    .prepare('INSERT INTO eventi (nome, scheda_id, ip_hash, meta_json) VALUES (?1, ?2, ?3, ?4)')
    .bind(e.nome, e.schedaId ?? null, e.ipHash ?? null, e.meta ? JSON.stringify(e.meta) : null);
}

export async function registraEvento(db: D1Database, e: NuovoEvento): Promise<void> {
  await istruzioneRegistraEvento(db, e).run();
}

/** Scheda + consenso + evento in un'unica transazione D1. */
export async function creaScheda(db: D1Database, s: NuovaScheda, consenso: NuovoConsenso | null, ipHash: string): Promise<void> {
  const istruzioni = [
    istruzioneInserisciScheda(db, s),
    ...(consenso ? [istruzioneRegistraConsenso(db, { ...consenso, schedaId: s.id })] : []),
    istruzioneRegistraEvento(db, { nome: 'scheda_creata', schedaId: s.id, ipHash, meta: { archivio: s.consensoArchivio } }),
    ...(s.consensoArchivio ? [istruzioneRegistraEvento(db, { nome: 'archivio_consenso', schedaId: s.id, ipHash })] : []),
  ];
  await db.batch(istruzioni);
}

export async function leggiScheda(db: D1Database, id: string): Promise<RigaScheda | null> {
  return db.prepare('SELECT * FROM schede WHERE id = ?1').bind(id).first<RigaScheda>();
}
