import { MERCATO_IT } from '../../markets/it';

/** Avvertenza fissa §1.9, in ogni risultato. Dice solo ciò che è vero sempre: sul noleggio un compenso dichiarato può esserci (vedi lib/fiducia). */
export const AVVERTENZA = MERCATO_IT.avvertenza;
/** Soglie del verdetto sul costo del credito in rapporto al prezzo, per l'Italia (ogni mercato ha le sue). Da ricalibrare sul dataset promo. */
export const SOGLIE_VERDETTO = MERCATO_IT.soglie;
/** Tolleranza in euro per dire che due importi coincidono. */
export const TOLLERANZA_EURO = 2;
/** Oltre questa distanza in punti il TAEG ricostruito va verificato. */
export const TOLLERANZA_TAEG_PUNTI = 0.5;
/** Quota massima del totale dovuto attribuibile a spese non dettagliate (5%). */
export const QUOTA_MAX_SPESE_IMPLICITE = 0.05;
/** Ipotesi predefinite dichiarate (§4, §9): modificabili dall'utente, sempre mostrate accanto al risultato. */
export const IPOTESI_PREDEFINITE = {
  tanRifinanziamento: 8,
  mesiRifinanziamento: 36,
  tanPrestito: 7.5,
  taegPrestito: 8.5,
  anticipoNoleggio: 0,
  kmAnnui: 15_000,
} as const;
/** Ipotesi di valore residuo quando non c'è la maxi rata: dopo circa 3 anni un'auto vale intorno al 45% del prezzo. */
export const QUOTA_VALORE_RESIDUO = 0.45;
/** Tetto agli importi: nessun preventivo d'auto supera 10 milioni; evita Infinity e notazione esponenziale. */
export const EURO_MAX = 10_000_000;
