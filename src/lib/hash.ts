const SALE_PREDEFINITO = 'ratavera-sale-di-sviluppo';

async function sha256Hex(testo: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(testo));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Hash dell'IP che cambia ogni giorno: serve al rate limit e a contare, non a riconoscere le persone. */
export async function hashIpGiornaliero(ip: string, sale: string | undefined, oggi = new Date()): Promise<string> {
  const giorno = oggi.toISOString().slice(0, 10);
  return (await sha256Hex(`${giorno}|${sale ?? SALE_PREDEFINITO}|${ip}`)).slice(0, 24);
}
