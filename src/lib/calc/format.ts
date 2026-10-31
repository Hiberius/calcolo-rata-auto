/** Formattazione italiana senza dipendere dai dati locali di Intl (in it-IT 1234 non avrebbe il punto). */
function raggruppa(intero: string): string {
  return intero.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

export function numero(valore: number, decimali = 2): string {
  if (!Number.isFinite(valore)) return '—';
  const segno = valore < 0 ? '−' : '';
  const [intero = '0', frazione] = Math.abs(valore).toFixed(decimali).split('.');
  return `${segno}${raggruppa(intero)}${frazione ? `,${frazione}` : ''}`;
}

/** 1.234,56 € */
export function euro(valore: number | null | undefined, decimali = 2): string {
  return valore == null ? '—' : `${numero(valore, decimali)} €`;
}

/** 18.253 € (arrotondato all'euro) */
export function euroIntero(valore: number | null | undefined): string {
  return euro(valore, 0);
}

/** Da frazione: 0,1103 -> 11,03% */
export function percentuale(frazione: number | null | undefined, decimali = 2): string {
  return frazione == null ? '—' : `${numero(frazione * 100, decimali)}%`;
}

/** Da punti percentuali: 11.03 -> 11,03% */
export function punti(valore: number | null | undefined, decimali = 2): string {
  return valore == null ? '—' : `${numero(valore, decimali)}%`;
}

export function arrotonda(valore: number, decimali = 2): number {
  const f = 10 ** decimali;
  return Math.round((valore + Number.EPSILON) * f) / f;
}
