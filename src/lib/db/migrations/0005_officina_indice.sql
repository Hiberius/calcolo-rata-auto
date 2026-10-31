-- v2, §3 e §4: attese dell'officina, richieste della stampa per l'Indice, due eventi e due finalità di consenso nuove.
-- SQLite non modifica un CHECK: eventi e consensi si ricreano copiando le righe (stessi campi di prima, più i riferimenti nuovi).

-- Officina: modello, intervento, importo e provincia. L'email c'è solo con il consenso all'avviso, e la pulizia la toglie
-- dopo 6 mesi; i numeri restano anonimi per costruire il confronto dei prezzi.
CREATE TABLE IF NOT EXISTS attese_officina (
  id TEXT PRIMARY KEY,
  modello TEXT NOT NULL CHECK (length(modello) BETWEEN 2 AND 60),
  intervento TEXT NOT NULL CHECK (intervento IN ('tagliando', 'freni', 'frizione', 'distribuzione', 'gomme', 'revisione', 'batteria', 'climatizzatore', 'altro')),
  importo REAL NOT NULL CHECK (importo > 0 AND importo <= 20000),
  provincia TEXT NOT NULL CHECK (length(provincia) = 2),
  email TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX IF NOT EXISTS idx_officina_created ON attese_officina (created_at);

-- Stampa: chi vuole l'Indice appena esce. Solo email e testata, con il consenso.
CREATE TABLE IF NOT EXISTS richieste_stampa (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  testata TEXT NOT NULL CHECK (length(testata) BETWEEN 2 AND 80),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX IF NOT EXISTS idx_stampa_created ON richieste_stampa (created_at);

CREATE TABLE eventi_nuova (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nome TEXT NOT NULL CHECK (nome IN (
    'decodifica_ok', 'decodifica_errore', 'decodifica_manuale', 'scheda_creata', 'scheda_condivisa',
    'archivio_consenso', 'tre_strade_usato', 'noleggio_inviato', 'verdetto_click', 'b2b_click',
    'scena_vista', 'scena_atto2_interagito', 'mostra_venditore', 'officina_attesa', 'indice_csv'
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

CREATE TABLE consensi_nuova (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  finalita TEXT NOT NULL CHECK (finalita IN ('archivio', 'contatto_noleggio', 'newsletter', 'contatto_b2b', 'avviso_officina', 'contatto_stampa')),
  testo TEXT NOT NULL,
  versione TEXT NOT NULL,
  accettato INTEGER NOT NULL CHECK (accettato IN (0, 1)),
  scheda_id TEXT REFERENCES schede (id),
  richiesta_id TEXT REFERENCES richieste_noleggio (id),
  b2b_id TEXT,
  officina_id TEXT REFERENCES attese_officina (id),
  stampa_id TEXT REFERENCES richieste_stampa (id),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
INSERT INTO consensi_nuova (id, finalita, testo, versione, accettato, scheda_id, richiesta_id, b2b_id, created_at)
  SELECT id, finalita, testo, versione, accettato, scheda_id, richiesta_id, b2b_id, created_at FROM consensi;
DROP TABLE consensi;
ALTER TABLE consensi_nuova RENAME TO consensi;
