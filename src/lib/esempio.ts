import type { StatoForm } from './client/campi';
import { dataBreve, oggiItalia } from './date';

/** Ultimo giorno di validità dell'offerta Peugeot 208 di ottobre 2026 usata come esempio. */
export const SCADENZA_ESEMPIO = '2026-10-31';

/**
 * Una sola formula, uguale in home e sopra la scena (revisione del 31/10, problema 6), vera in ogni giorno:
 * fino al 31/10 «valida fino al», dal giorno dopo (ora di Roma, come le promo) «scaduta il».
 */
export function etichettaEsempio(adesso: Date = new Date()): string {
  const stato = oggiItalia(adesso) > SCADENZA_ESEMPIO ? 'scaduta il' : 'valida fino al';
  return `esempio reale, offerta ufficiale ${stato} ${dataBreve(SCADENZA_ESEMPIO)}`;
}

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
