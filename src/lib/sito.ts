/** Dati fissi del sito, usati da privacy, chi siamo e contatti. Il titolare sta nelle variabili pubbliche (PUBLIC_TITOLARE). */
/**
 * Indirizzo pubblico del sito, una sola fonte per canonical, og, sitemap, robots, testo condiviso e immagini.
 * Il sito vive sull'indirizzo del Worker: nessun dominio proprio è previsto. Se mai cambiasse: qui e PUBLIC_SITE_URL in
 * wrangler.jsonc (deploy:controlla verifica che risponda 200).
 */
export const URL_SITO = 'https://ratavera.hiberius.workers.dev';

export const EMAIL_CONTATTO = 'hiberius@gmail.com';
/** Il codice è pubblico: il piede del sito e i dati strutturati della home rimandano qui. */
export const REPO_GITHUB = 'https://github.com/Hiberius/calcolo-rata-auto';
export const DATA_AGGIORNAMENTO_TESTI = '2026-10-31';
