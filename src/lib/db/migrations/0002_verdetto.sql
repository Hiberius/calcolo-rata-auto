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
