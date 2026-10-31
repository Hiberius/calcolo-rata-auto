const ALFABETO_BASE58 = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
const LIMITE = 256 - (256 % ALFABETO_BASE58.length); // scarta i byte che renderebbero la distribuzione non uniforme

/** Id corto base58 (8 caratteri di default), uniforme, da crypto.getRandomValues. */
export function idCorto(lunghezza = 8): string {
  const caratteri: string[] = [];
  while (caratteri.length < lunghezza) {
    const byte = crypto.getRandomValues(new Uint8Array(lunghezza * 2));
    for (const b of byte) {
      if (b < LIMITE && caratteri.length < lunghezza) caratteri.push(ALFABETO_BASE58[b % ALFABETO_BASE58.length] as string);
    }
  }
  return caratteri.join('');
}

export const ID_SCHEDA_RE = /^[1-9A-HJ-NP-Za-km-z]{8}$/;
