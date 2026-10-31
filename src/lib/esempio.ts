import type { StatoForm } from './client/campi';

/** Etichetta fissa accanto al risultato dell'esempio: è un'offerta vera, ma non più in vigore. */
export const ETICHETTA_ESEMPIO = 'esempio reale, offerta scaduta il 31/10/2026';

/**
 * Preventivo d'esempio della home (test del 31/10: mancava un esempio pronto). Offerta ufficiale Peugeot 208 Style
 * di ottobre 2026, la stessa dei test del modulo calcolo (§4): paghi davvero 18.253,25 €.
 */
export const ESEMPIO_208: StatoForm = {
  tipo: 'finanziamento',
  marca: 'Peugeot',
  modello: '208',
  versione: 'Style',
  prezzoPromo: '14.950',
  anticipo: '4.326',
  nRate: '35',
  rata: '99',
  maxiRata: '10.434',
  tan: '7,49',
  taegDichiarato: '11,03',
  importoTotaleDovutoDichiarato: '13.927,25',
};
