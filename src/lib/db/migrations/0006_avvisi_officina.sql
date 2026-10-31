-- Revisione del 31/10: l'email dell'avviso officina non sta più nella riga del preventivo.
-- Il preventivo resta anonimo (modello, intervento, importo, provincia, giorno); l'email sta in avvisi_officina,
-- senza un codice che la colleghi al preventivo. Le date sono salvate solo come giorno, per non collegarle per orario.
CREATE TABLE IF NOT EXISTS avvisi_officina (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL CHECK (length(email) BETWEEN 5 AND 254),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d', 'now'))
);
CREATE INDEX IF NOT EXISTS idx_avvisi_officina_created ON avvisi_officina (created_at);

INSERT INTO avvisi_officina (id, email, created_at)
  SELECT 'V' || lower(hex(randomblob(5))), email, substr(created_at, 1, 10) FROM attese_officina WHERE email IS NOT NULL;

ALTER TABLE consensi ADD COLUMN avviso_id TEXT REFERENCES avvisi_officina (id);
UPDATE consensi SET officina_id = NULL WHERE finalita = 'avviso_officina';

ALTER TABLE attese_officina DROP COLUMN email;
UPDATE attese_officina SET created_at = substr(created_at, 1, 10);
