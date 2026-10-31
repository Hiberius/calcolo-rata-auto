/** Confronto a tempo costante: il tempo di risposta non rivela quanti caratteri del token sono giusti. */
export function tokenValido(dato: string | null | undefined, atteso: string | undefined): boolean {
  if (!atteso || atteso.length < 8 || !dato) return false;
  const a = new TextEncoder().encode(dato);
  const b = new TextEncoder().encode(atteso);
  let diverso = a.length ^ b.length;
  for (let i = 0; i < b.length; i += 1) diverso |= (a[i % (a.length || 1)] ?? 0) ^ (b[i] ?? 0);
  return diverso === 0;
}
