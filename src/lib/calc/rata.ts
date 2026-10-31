/** Rata costante di un prestito (ammortamento alla francese). tanAnnuo in punti percentuali. */
export function rataCostante(capitale: number, tanAnnuo: number, mesi: number): number {
  if (capitale <= 0 || mesi <= 0) return 0;
  const i = tanAnnuo / 100 / 12;
  if (i === 0) return capitale / mesi;
  return (capitale * i) / (1 - (1 + i) ** -mesi);
}

/** Converte un TAEG annuo nel TAN nominale equivalente (capitalizzazione mensile), per calcolare una rata "tutto compreso". */
export function tanNominaleDaTaeg(taegAnnuo: number): number {
  return ((1 + taegAnnuo / 100) ** (1 / 12) - 1) * 12 * 100;
}
