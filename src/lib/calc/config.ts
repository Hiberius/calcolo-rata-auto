/** Avvertenza fissa §1.9, in ogni risultato. */
export const AVVERTENZA =
  'Rata Vera non è un mediatore creditizio né un intermediario: fa i conti sui numeri che inserisci. Prima di firmare chiedi il SECCI (modulo Informazioni europee di base).';
/** Soglie del verdetto sul costo del credito in rapporto al prezzo. Da ricalibrare sul dataset promo. */
export const SOGLIE_VERDETTO = { basso: 0.05, alto: 0.12 } as const;
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
