/** Glossario in linea (test del 31/10: il gergo frenava). Una riga per voce, parole di tutti i giorni. */
export const GLOSSARIO = {
  tan: { termine: 'TAN', definizione: 'Tasso annuo nominale: il tasso degli interessi sul debito, senza contare le spese.' },
  taeg: { termine: 'TAEG', definizione: 'Tasso annuo effettivo globale: quanto costa il credito in un anno, con interessi e spese obbligatorie insieme.' },
  maxi: { termine: 'maxi rata', definizione: "L'ultima rata, molto più alta delle altre: tiene bassa la rata mensile, ma alla fine va pagata, rifinanziata o coperta restituendo l'auto." },
  vfg: { termine: 'valore futuro garantito', definizione: "Il valore dell'auto a fine contratto fissato alla firma: è l'importo della maxi rata finale." },
  secci: { termine: 'SECCI', definizione: 'Il modulo «Informazioni europee di base sul credito ai consumatori»: il venditore deve dartelo prima della firma, con tutti i costi.' },
  totaleDovuto: { termine: 'importo totale dovuto', definizione: "Quanto restituisci al finanziatore: rate, maxi rata e spese del credito, senza l'anticipo." },
} as const;

export type VoceGlossario = keyof typeof GLOSSARIO;

/** Id stabile e unico nella pagina: ambito (es. "form", id della promo) + voce. */
export function idTermine(ambito: string, voce: VoceGlossario): string {
  return `gl-${ambito}-${voce}`.replace(/[^A-Za-z0-9_-]/g, '-');
}

/** Come le voci compaiono nei testi delle guide (prima occorrenza di ciascuna, senza badare alle maiuscole). */
export const FORME_NEL_TESTO: readonly (readonly [VoceGlossario, RegExp])[] = [
  ['vfg', /\bvalore futuro garantito\b/i],
  ['totaleDovuto', /\bimporto totale dovuto\b/i],
  ['maxi', /\bmaxi rata\b/i],
  ['taeg', /\bTAEG\b/],
  ['tan', /\bTAN\b/],
  ['secci', /\bSECCI\b/],
];
