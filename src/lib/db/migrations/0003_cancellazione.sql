-- Cancellazione della scheda da parte di chi l'ha creata: si salva solo l'impronta SHA-256 del codice, mai il codice.
-- Le schede create prima di questa migrazione non hanno impronta: si cancellano su richiesta via email (vedi /privacy).
ALTER TABLE schede ADD COLUMN token_cancellazione_hash TEXT;
