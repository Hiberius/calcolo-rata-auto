/** Soglie del verdetto sul costo del credito in rapporto al prezzo. Da ricalibrare sul dataset promo. */
export const SOGLIE_VERDETTO = { basso: 0.05, alto: 0.12 } as const;
/** Tolleranza in euro per dire che due importi coincidono. */
export const TOLLERANZA_EURO = 2;
/** Oltre questa distanza in punti il TAEG ricostruito va verificato. */
export const TOLLERANZA_TAEG_PUNTI = 0.5;
/** Quota massima del totale dovuto attribuibile a spese non dettagliate (5%). */
export const QUOTA_MAX_SPESE_IMPLICITE = 0.05;
