import { numero } from '../calc/format';
import { LICENZA, type EdizioneIndice, type RigaIndice } from '.';

/**
 * CSV dell'edizione: separatore punto e virgola e decimali con la virgola (si apre così in Excel in italiano), UTF-8 con BOM.
 * Le prime righe, con #, dicono licenza e frase di citazione.
 */
const INTESTAZIONE = [
  'posizione', 'marca', 'modello', 'versione', 'costo_credito_pct_prezzo', 'taeg_dichiarato', 'taeg_ricostruito',
  'anticipo_pct_prezzo', 'maxi_rata_pct_prezzo', 'polizze_servizi_abbinati', 'scadenza', 'fonte',
] as const;

/** Un campo CSV: tra virgolette se contiene separatore, virgolette o a capo; niente formule (= + - @ in testa). */
export function campoCsv(v: string): string {
  const sicuro = /^[=+\-@]/.test(v) ? `'${v}` : v;
  return /[;"\n\r]/.test(sicuro) ? `"${sicuro.replace(/"/g, '""')}"` : sicuro;
}

const pct = (frazione: number) => numero(frazione * 100, 2);
const punti = (v: number | null) => (v == null ? '' : numero(v, 2));

function rigaCsv(r: RigaIndice): string {
  return [
    String(r.posizione), r.marca, r.modello, r.versione ?? '', pct(r.costoCreditoPct), punti(r.taegDichiarato), punti(r.taegRicostruito),
    pct(r.anticipoPct), pct(r.maxiRataPct), r.abbinati ? 'sì' : 'no', r.scadenza, r.urlFonte,
  ].map(campoCsv).join(';');
}

/** null se l'edizione non è pubblicabile: niente dati sotto le 20 promo. */
export function csvEdizione(e: EdizioneIndice): string | null {
  if (!e.pubblicabile) return null;
  const testa = [
    `# Indice Rata Vera, ${e.mese}. Percentuali in punti del prezzo; TAEG in punti percentuali.`,
    `# Licenza ${LICENZA.nome} ${LICENZA.url}. Citazione: «${e.citazione}».`,
  ];
  return `﻿${[...testa, INTESTAZIONE.join(';'), ...e.righe.map(rigaCsv)].join('\r\n')}\r\n`;
}
