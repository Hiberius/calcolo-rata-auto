/** Fonti delle promozioni: validazione delle voci di fonti.json, domini ufficiali, percorsi sicuri, conferma cifre. */
import { resolve, sep } from 'node:path';
import { z } from 'zod';

export const DOMINI_UFFICIALI = [
  'fiat.it', 'lancia.it', 'jeep-official.it', 'alfaromeo.it', 'peugeot.it', 'citroen.it', 'opel.it', 'dsautomobiles.it',
  'toyota.it', 'dacia.it', 'renault.it', 'volkswagen.it', 'skoda-auto.it', 'seat-italia.it', 'cupraofficial.it', 'ford.it',
  'kia.com', 'hyundai.com', 'nissan.it', 'auto.suzuki.it', 'mazda.it', 'byd.com', 'tesla.com', 'omodajaecooitalia.com',
  'mgmotor.eu', 'leapmotor.it', 'honda.it', 'mini.it', 'bmw.it', 'mercedes-benz.it', 'audi.it', 'volvocars.com', 'lexus.it',
  'mitsubishi-motors.it', 'subaru.it', 'jaguar.it', 'landrover.it', 'smart.com', 'lynkco.com',
] as const;

/** Vero se l'host è un dominio ufficiale o un suo sottodominio (non un dominio che lo contiene). */
export function dominioUfficiale(host: string): boolean {
  const h = host.toLowerCase();
  return DOMINI_UFFICIALI.some((d) => h === d || h.endsWith(`.${d}`));
}

function urlUfficialeHttps(u: string): boolean {
  try {
    const x = new URL(u);
    return x.protocol === 'https:' && dominioUfficiale(x.hostname) && x.pathname.length > 1;
  } catch {
    return false;
  }
}

export const FonteSchema = z
  .object({
    id: z.string().regex(/^[a-z0-9-]{3,80}$/, 'id: solo minuscole, cifre e trattini'),
    marca: z.string().min(2).max(40),
    modello: z.string().min(1).max(60),
    url: z.string().refine(urlUfficialeHttps, 'url: solo https, dominio ufficiale della casa, pagina della promozione (non la home)'),
  })
  .strict();
export type Fonte = z.infer<typeof FonteSchema>;

/** Percorso di un file dentro la cartella: rifiuta tutto ciò che esce (es. "../"). */
export function percorsoDentro(cartella: string, nomeFile: string): string {
  const base = resolve(cartella);
  const p = resolve(cartella, nomeFile);
  if (!p.startsWith(base + sep)) throw new Error(`percorso fuori da ${cartella}: ${nomeFile}`);
  return p;
}

function conMigliaia(intero: string): string {
  return intero.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

/** Forme in cui la cifra può comparire nel testo: 4.326 / 4326 / 11,03 / 11.03 / 128,99. */
function rappresentazioni(v: number): readonly string[] {
  const [intero, decimali] = v.toFixed(2).split('.');
  const parteIntera = intero ?? '0';
  const senzaDecimali = decimali === '00';
  const forme = senzaDecimali
    ? [conMigliaia(parteIntera), parteIntera]
    : [`${conMigliaia(parteIntera)},${decimali}`, `${parteIntera},${decimali}`, `${parteIntera}.${decimali}`];
  return [...new Set(forme)];
}

/** Vero se almeno una delle cifre estratte dal modello compare nel testo grezzo della pagina. */
export function cifraConfermata(testo: string, valori: ReadonlyArray<number | undefined>): boolean {
  const t = testo.replace(/\s+/g, ' ');
  return valori.some((v) => typeof v === 'number' && Number.isFinite(v) && rappresentazioni(v).some((r) => t.includes(r)));
}
