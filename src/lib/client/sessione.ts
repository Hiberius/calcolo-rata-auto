export const CHIAVE_SESSIONE = 'ratavera:preventivo';

export function salvaPreventivo(preventivo: Readonly<Record<string, unknown>>): void {
  try {
    sessionStorage.setItem(CHIAVE_SESSIONE, JSON.stringify(preventivo));
  } catch {
    // sessionStorage può essere bloccato: il confronto parte comunque con l'inserimento manuale.
  }
}

/** Il preventivo lasciato dalla home, se c'è. Non validato: chi lo usa lo passa da analizza(). */
export function leggiPreventivo(): Record<string, unknown> | null {
  try {
    const grezzo = sessionStorage.getItem(CHIAVE_SESSIONE);
    const dati: unknown = grezzo ? JSON.parse(grezzo) : null;
    return dati && typeof dati === 'object' && !Array.isArray(dati) ? (dati as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}
