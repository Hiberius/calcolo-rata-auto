/**
 * Codice di cancellazione: 32 byte casuali in base64url, 43 caratteri. Sta in un modulo a sé perché lo usa anche il
 * browser (lib/client/cancellazione): importarlo da lib/cancellazione portava nella home il motore di calcolo e zod.
 */
export const TOKEN_CANCELLAZIONE_RE = /^[A-Za-z0-9_-]{43}$/;
