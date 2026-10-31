import { TOKEN_CANCELLAZIONE_RE } from '../cancellazione';

/** Il codice per eliminare una scheda resta nel browser di chi l'ha creata (sessionStorage), mai in un cookie. */
const chiave = (id: string) => `ratavera:cancella:${id}`;

export function salvaTokenCancellazione(id: string, token: string): void {
  try {
    sessionStorage.setItem(chiave(id), token);
  } catch {
    // Memoria bloccata: resta il link di cancellazione, che la pagina della scheda mostra subito dopo la creazione.
  }
}

export function leggiTokenCancellazione(id: string): string | null {
  try {
    const t = sessionStorage.getItem(chiave(id));
    return t && TOKEN_CANCELLAZIONE_RE.test(t) ? t : null;
  } catch {
    return null;
  }
}

export function dimenticaTokenCancellazione(id: string): void {
  try {
    sessionStorage.removeItem(chiave(id));
  } catch {
    // niente da fare
  }
}

/** Il link di cancellazione porta il codice dopo il #: il frammento non arriva mai al server né nei registri. */
export function linkCancellazione(origine: string, id: string, token: string): string {
  return `${origine}/s/${id}#elimina=${token}`;
}

export function tokenDalFrammento(frammento: string): string | null {
  const t = new URLSearchParams(frammento.replace(/^#/, '')).get('elimina');
  return t && TOKEN_CANCELLAZIONE_RE.test(t) ? t : null;
}
