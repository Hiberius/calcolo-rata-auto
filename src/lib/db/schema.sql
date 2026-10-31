-- Copia di riferimento dello schema corrente. La fonte che si applica è migrations/ (wrangler d1 migrations apply).
-- Rata Vera: schema iniziale. Nessun nome, targa, concessionario o dato di contatto nelle schede.

CREATE TABLE IF NOT EXISTS schede (
  id TEXT PRIMARY KEY CHECK (length(id) = 8),
  marca TEXT,
  modello TEXT,
  versione TEXT,
  provincia TEXT CHECK (provincia IS NULL OR length(provincia) = 2),
  tipo TEXT NOT NULL CHECK (tipo IN ('finanziamento', 'leasing', 'noleggio')),
  prezzo_riferimento REAL,
  anticipo REAL NOT NULL,
  n_rate INTEGER NOT NULL,
  rata REAL NOT NULL,
  maxi_rata REAL,
  taeg_dichiarato REAL,
  taeg_ricostruito REAL,
  totale REAL NOT NULL,
  costo_credito REAL,
  costo_credito_pct REAL,
  input_json TEXT NOT NULL,
  output_json TEXT NOT NULL,
  consenso_archivio INTEGER NOT NULL DEFAULT 0 CHECK (consenso_archivio IN (0, 1)),
  versione_consenso TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX IF NOT EXISTS idx_schede_archivio ON schede (marca, modello) WHERE consenso_archivio = 1;
CREATE INDEX IF NOT EXISTS idx_schede_created ON schede (created_at);

CREATE TABLE IF NOT EXISTS richieste_noleggio (
  id TEXT PRIMARY KEY,
  nome TEXT NOT NULL,
  email TEXT NOT NULL,
  telefono TEXT NOT NULL,
  provincia TEXT NOT NULL CHECK (length(provincia) = 2),
  modello TEXT NOT NULL,
  durata_mesi INTEGER NOT NULL CHECK (durata_mesi IN (24, 36, 48)),
  km_annui INTEGER NOT NULL,
  anticipo_zero INTEGER NOT NULL DEFAULT 0 CHECK (anticipo_zero IN (0, 1)),
  stato TEXT NOT NULL DEFAULT 'nuova' CHECK (stato IN ('nuova', 'consegnata', 'scartata', 'chiusa')),
  riferimento_consegna TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX IF NOT EXISTS idx_noleggio_stato ON richieste_noleggio (stato, created_at);

-- Registro dei consensi: una riga per finalità, con il testo esatto mostrato e la sua versione.
CREATE TABLE IF NOT EXISTS consensi (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  finalita TEXT NOT NULL CHECK (finalita IN ('archivio', 'contatto_noleggio', 'newsletter', 'contatto_b2b')),
  testo TEXT NOT NULL,
  versione TEXT NOT NULL,
  accettato INTEGER NOT NULL CHECK (accettato IN (0, 1)),
  scheda_id TEXT REFERENCES schede (id),
  richiesta_id TEXT REFERENCES richieste_noleggio (id),
  b2b_id TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- Eventi server-side: nessun IP in chiaro (hash giornaliero), nessun dato personale.
CREATE TABLE IF NOT EXISTS eventi (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nome TEXT NOT NULL CHECK (nome IN (
    'decodifica_ok', 'decodifica_errore', 'decodifica_manuale', 'scheda_creata', 'scheda_condivisa',
    'archivio_consenso', 'tre_strade_usato', 'noleggio_inviato', 'verdetto_click', 'b2b_click'
  )),
  scheda_id TEXT,
  ip_hash TEXT,
  meta_json TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX IF NOT EXISTS idx_eventi_nome_data ON eventi (nome, created_at);

CREATE TABLE IF NOT EXISTS b2b_contatti (
  id TEXT PRIMARY KEY,
  nome TEXT NOT NULL,
  azienda TEXT NOT NULL,
  email TEXT NOT NULL,
  sito TEXT,
  messaggio TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
-- Richieste di verdetto esperto (19 €): id della scheda e email a cui mandare il PDF. Nessun dato di credito.
CREATE TABLE IF NOT EXISTS richieste_verdetto (
  id TEXT PRIMARY KEY,
  scheda_id TEXT NOT NULL CHECK (length(scheda_id) = 8),
  email TEXT NOT NULL,
  riferimento_pagamento TEXT,
  nota TEXT,
  stato TEXT NOT NULL DEFAULT 'nuova' CHECK (stato IN ('nuova', 'consegnata', 'chiusa')),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX IF NOT EXISTS idx_verdetto_created ON richieste_verdetto (created_at);
