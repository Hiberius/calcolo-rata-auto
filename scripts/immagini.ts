/**
 * Immagini del sito dagli originali di Christian (06_Lancio/immagini, la fonte: qui non si modificano mai).
 * Uso: npm run immagini. Rilanciabile e idempotente: stesse fonti, stessi file; un file uguale al byte non si riscrive.
 *
 * - hero-poster-chatgpt.png → public/img/scena-poster-{1200,800}.{avif,webp}: poster dell'anteprima della scena in home
 *   quando il canvas non può disegnare (senza JavaScript) e illustrazione di «Come facciamo i conti».
 * - public/og-default.png (1200×630, immagine di condivisione predefinita) NON è più qui: la produce scripts/og-marchio.ts.
 * - icona-chatgpt.png → public/icone/: apple-touch 180, manifest 192 e 512, favicon PNG 32 e 16 accanto a favicon.svg.
 * - grana: public/img/grana.webp, tile 256 px di granuli grigi con l'intensità nell'alfa (specifica di movimento, d),
 *   generato da un generatore pseudo-casuale con seme fisso: sempre lo stesso file, senza giunture (ogni pixel è indipendente).
 */
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import sharp from 'sharp';

const SITO = join(import.meta.dirname, '..');
const FONTI = join(SITO, '..', '06_Lancio', 'immagini');
const PUBBLICO = join(SITO, 'public');
/** Nessuna immagine sopra questo peso nel repo (regola del progetto). */
const PESO_MAX = 300 * 1024;

const fonte = (nome: string): string => {
  const percorso = join(FONTI, nome);
  if (!existsSync(percorso)) throw new Error(`Manca l'originale ${percorso}`);
  return percorso;
};

/** Scrive solo se il contenuto è cambiato, e controlla il peso. Restituisce una riga per il riepilogo. */
function scrivi(destinazione: string, dati: Buffer): string {
  if (dati.length > PESO_MAX) throw new Error(`${relative(SITO, destinazione)} pesa ${dati.length} byte, oltre ${PESO_MAX}`);
  mkdirSync(dirname(destinazione), { recursive: true });
  const uguale = existsSync(destinazione) && statSync(destinazione).size === dati.length && readFileSync(destinazione).equals(dati);
  if (!uguale) writeFileSync(destinazione, dati);
  return `${uguale ? 'uguale ' : 'scritto'}  ${(dati.length / 1024).toFixed(1).padStart(6)} kB  ${relative(SITO, destinazione)}`;
}

async function poster(): Promise<string[]> {
  const righe: string[] = [];
  for (const larghezza of [1200, 800]) {
    const base = sharp(fonte('hero-poster-chatgpt.png')).resize({ width: larghezza });
    righe.push(scrivi(join(PUBBLICO, 'img', `scena-poster-${larghezza}.avif`), await base.clone().avif({ quality: 50, effort: 6 }).toBuffer()));
    righe.push(scrivi(join(PUBBLICO, 'img', `scena-poster-${larghezza}.webp`), await base.clone().webp({ quality: 72, effort: 6 }).toBuffer()));
  }
  return righe;
}

async function icone(): Promise<string[]> {
  const misure: readonly (readonly [string, number])[] = [
    ['apple-touch-icon.png', 180], ['icon-192.png', 192], ['icon-512.png', 512], ['favicon-32.png', 32], ['favicon-16.png', 16],
  ];
  const righe: string[] = [];
  for (const [nome, lato] of misure) {
    const png = await sharp(fonte('icona-chatgpt.png')).resize({ width: lato, height: lato, kernel: 'lanczos3' }).png({ compressionLevel: 9, palette: lato <= 32 }).toBuffer();
    righe.push(scrivi(join(PUBBLICO, 'icone', nome), png));
  }
  return righe;
}

/** mulberry32: generatore con seme, così la grana è sempre la stessa. */
function generatore(seme: number): () => number {
  let a = seme >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

async function grana(): Promise<string[]> {
  const lato = 256;
  const caso = generatore(20261031);
  const pixel = Buffer.alloc(lato * lato * 4);
  for (let i = 0; i < lato * lato; i += 1) {
    // Granuli radi: 1 pixel su 10, grigio medio (si legge su carta e su inchiostro), quattro intensità basse nell’alfa
    // (7-19%): il tile si usa così com'è come sfondo, senza veli; poche intensità tengono il file sotto i 12 kB.
    const acceso = caso() < 0.1;
    pixel[i * 4] = 128;
    pixel[i * 4 + 1] = 126;
    pixel[i * 4 + 2] = 120;
    pixel[i * 4 + 3] = acceso ? 18 + 10 * Math.floor(caso() * 4) : 0;
  }
  const webp = await sharp(pixel, { raw: { width: lato, height: lato, channels: 4 } }).webp({ lossless: true, effort: 6 }).toBuffer();
  return [scrivi(join(PUBBLICO, 'img', 'grana.webp'), webp)];
}

const righe = [...(await poster()), ...(await icone()), ...(await grana())];
console.log(righe.join('\n'));
