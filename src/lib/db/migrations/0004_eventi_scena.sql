-- v2, la scena del risultato: tre eventi nuovi. SQLite non modifica un CHECK: si ricrea la tabella copiando le righe.
-- Nessun dato personale: stessi campi di prima (nome, scheda, impronta giornaliera dell'IP, meta).
CREATE TABLE eventi_nuova (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nome TEXT NOT NULL CHECK (nome IN (
    'decodifica_ok', 'decodifica_errore', 'decodifica_manuale', 'scheda_creata', 'scheda_condivisa',
    'archivio_consenso', 'tre_strade_usato', 'noleggio_inviato', 'verdetto_click', 'b2b_click',
    'scena_vista', 'scena_atto2_interagito', 'mostra_venditore'
  )),
  scheda_id TEXT,
  ip_hash TEXT,
  meta_json TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
INSERT INTO eventi_nuova (id, nome, scheda_id, ip_hash, meta_json, created_at)
  SELECT id, nome, scheda_id, ip_hash, meta_json, created_at FROM eventi;
DROP TABLE eventi;
ALTER TABLE eventi_nuova RENAME TO eventi;
CREATE INDEX IF NOT EXISTS idx_eventi_nome_data ON eventi (nome, created_at);
