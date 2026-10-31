/** Colori della scena sul pannello inchiostro: tutti i testi superano 4,5:1 su #15171A. */
export const SCENA = {
  fondo: '#15171A',
  carta: '#F6F3EE',
  tenue: '#A6A29A',
  griglia: 'rgba(246, 243, 238, 0.10)',
  segnale: '#F2825F',
  segnalePieno: '#E4572E',
  attenzione: '#E2B93B',
  freddo: '#8FB3AC',
} as const;

export const MONO = '"JetBrains Mono", ui-monospace, monospace';
export const SANS = '"Instrument Sans", ui-sans-serif, system-ui, sans-serif';

/** Colore di ogni contenitore dell'atto 1: stesso significato in tutta la scena. */
export const COLORE_CONTENITORE: Readonly<Record<string, string>> = {
  capitale: SCENA.carta,
  interessi: SCENA.segnale,
  spese: SCENA.attenzione,
  polizze: SCENA.freddo,
  resto: SCENA.carta,
};
