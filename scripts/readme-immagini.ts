/**
 * Immagini del README dal sito pubblicato → docs/img: schermate (WebP) a 1440 e 390, scena in tre atti, vista «Mostralo al
 * venditore», Indice, promozioni, scheda condivisa, anteprima social per GitHub (1280×640) e GIF della scena.
 * Uso: npm run readme:immagini [indirizzo]. Idempotente: stessi nomi di file a ogni esecuzione. Nessuna immagine
 * sopra PESO_MAX_IMMAGINE, GIF sotto PESO_MAX_GIF: il comando fallisce se sfora. La GIF richiede ffmpeg nel PATH
 * (brew install ffmpeg); senza ffmpeg si salta con un avviso e le schermate si fanno comunque.
 */
import { chromium, type Browser, type BrowserContext, type Page } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';
import sharp from 'sharp';

const SITO = join(import.meta.dirname, '..');
const CARTELLA = join(SITO, 'docs', 'img');
const INDIRIZZO = (process.argv[2] ?? 'https://ratavera.hiberius.workers.dev').replace(/\/$/, '');
const PESO_MAX_IMMAGINE = 600 * 1024;
const PESO_MAX_GIF = 8 * 1024 * 1024;
/** Le schermate a 1440 sono catturate a 2× e ridotte a questa larghezza. */
const LARGHEZZA_FINALE = 1600;
const ESEMPIO = '/?esempio=1#risultato';
const SCHEDA_ESEMPIO = '/s/7nsVuojw';

type Dispositivo = { readonly larghezza: number; readonly altezza: number };
const DESKTOP: Dispositivo = { larghezza: 1440, altezza: 900 };
const TELEFONO: Dispositivo = { larghezza: 390, altezza: 844 };

const righe: string[] = [];
const peso = (p: string): string => `${Math.round(statSync(p).size / 1024)} kB`;

async function salvaImmagine(nome: string, dati: Buffer, larghezzaMax = LARGHEZZA_FINALE): Promise<void> {
  const destinazione = join(CARTELLA, nome);
  const immagine = sharp(dati);
  const meta = await immagine.metadata();
  const ridotta = (meta.width ?? 0) > larghezzaMax ? immagine.resize({ width: larghezzaMax }) : immagine;
  // WebP per le schermate (GitHub le mostra, pesano la metà del PNG); PNG solo per l'anteprima social, che GitHub vuole PNG o JPG sotto 1 MB.
  const codificata = nome.endsWith('.png')
    ? await ridotta.png({ compressionLevel: 9, palette: true, quality: 90, effort: 10 }).toBuffer()
    : await ridotta.webp({ quality: 90, effort: 6, smartSubsample: true }).toBuffer();
  if (codificata.length > PESO_MAX_IMMAGINE) throw new Error(`${nome} pesa ${codificata.length} byte, oltre ${PESO_MAX_IMMAGINE}`);
  writeFileSync(destinazione, codificata);
  righe.push(`${relative(SITO, destinazione)}  ${peso(destinazione)}`);
}

async function apri(browser: Browser, d: Dispositivo, movimento: 'reduce' | 'no-preference', extra: Record<string, unknown> = {}): Promise<BrowserContext> {
  return browser.newContext({ viewport: { width: d.larghezza, height: d.altezza }, deviceScaleFactor: 2, locale: 'it-IT', reducedMotion: movimento, colorScheme: 'light', ...extra });
}

async function vai(page: Page, percorso: string): Promise<void> {
  await page.goto(`${INDIRIZZO}${percorso}`, { waitUntil: 'networkidle' });
  const chiudi = page.locator('[data-chiudi-banner]');
  if (await chiudi.isVisible().catch(() => false)) await chiudi.click();
  await page.evaluate(() => document.fonts.ready);
}

/** Porta i tre atti della scena a fine corsa (con prefers-reduced-motion sono già fermi al valore finale). */
async function attendiScena(page: Page): Promise<void> {
  await page.locator('[data-scena]').waitFor({ state: 'visible' });
  for (const n of [1, 2, 3]) {
    const atto = page.locator(`[data-atto="${n}"]`);
    await atto.scrollIntoViewIfNeeded();
    await page.waitForFunction((i) => document.querySelector(`[data-atto="${i}"]`)?.getAttribute('data-avanzamento') === '1', n, { timeout: 15_000 });
  }
}

async function schermate(browser: Browser): Promise<void> {
  // Desktop, primo schermo.
  const desktop = await apri(browser, DESKTOP, 'reduce');
  const page = await desktop.newPage();
  await vai(page, '/');
  await salvaImmagine('home-desktop.webp', await page.screenshot());
  await vai(page, ESEMPIO);
  await attendiScena(page);
  await page.locator('[data-risultato]').scrollIntoViewIfNeeded();
  await salvaImmagine('risultato-desktop.webp', await page.locator('[data-risultato]').screenshot());
  for (const n of [1, 2, 3]) await salvaImmagine(`scena-atto-${n}.webp`, await page.locator(`[data-atto="${n}"]`).screenshot());
  await salvaImmagine('scena-desktop.webp', await page.locator('[data-scena]').screenshot(), 1100);
  await page.getByRole('button', { name: 'Mostralo al venditore' }).click();
  await page.locator('[data-vista-venditore]').waitFor({ state: 'visible' });
  await page.waitForTimeout(400);
  await salvaImmagine('venditore-desktop.webp', await page.screenshot());
  await page.getByRole('button', { name: 'Esci' }).click();
  await vai(page, '/indice');
  await salvaImmagine('indice-desktop.webp', await page.screenshot());
  await vai(page, '/promozioni');
  await salvaImmagine('promozioni-desktop.webp', await page.screenshot());
  await vai(page, '/guide');
  await salvaImmagine('guide-desktop.webp', await page.screenshot());
  await desktop.close();

  // Telefono, primo schermo e scena.
  const telefono = await apri(browser, TELEFONO, 'reduce', { isMobile: true, hasTouch: true });
  const tel = await telefono.newPage();
  await vai(tel, '/');
  await salvaImmagine('home-telefono.webp', await tel.screenshot(), 780);
  await vai(tel, ESEMPIO);
  await attendiScena(tel);
  await tel.locator('[data-atto="2"]').scrollIntoViewIfNeeded();
  await tel.waitForTimeout(300);
  await salvaImmagine('scena-telefono.webp', await tel.screenshot(), 780);
  await telefono.close();

  // Scheda condivisa: l'immagine og della scheda d'esempio, se la scheda esiste ancora.
  const og = await fetch(`${INDIRIZZO}${SCHEDA_ESEMPIO}/og.png`);
  if (og.ok) await salvaImmagine('scheda-condivisa.webp', Buffer.from(await og.arrayBuffer()), 1200);
  else righe.push(`scheda condivisa saltata: ${SCHEDA_ESEMPIO}/og.png risponde ${og.status}`);
}

/** Anteprima social per GitHub (Settings → Social preview): 1280×640, tipografia del sito, la scena a destra. */
async function anteprimaSocial(browser: Browser, cartellaTemporanea: string): Promise<void> {
  const carattere = (nome: string) => `file://${join(SITO, 'public', 'fonts', nome)}`;
  const scena = `file://${join(CARTELLA, 'scena-atto-2.webp')}`;
  const html = `<!doctype html><html lang="it"><head><meta charset="utf-8"><style>
    @font-face{font-family:'Instrument Sans';src:url('${carattere('instrument-sans-latin-wght.woff2')}') format('woff2');font-weight:100 900}
    @font-face{font-family:'JetBrains Mono';src:url('${carattere('jetbrains-mono-latin-wght.woff2')}') format('woff2');font-weight:100 800}
    html,body{margin:0;width:1280px;height:640px;overflow:hidden;background:#F6F3EE;color:#15171A;font-family:'Instrument Sans',sans-serif}
    .tela{position:relative;width:1280px;height:640px;display:grid;grid-template-columns:600px 1fr;gap:32px;padding:64px 64px 64px 72px;box-sizing:border-box}
    .marchio{display:flex;align-items:center;gap:14px;font-family:'JetBrains Mono',monospace;font-size:18px;letter-spacing:.08em;text-transform:uppercase;color:#5B5F66}
    .r{width:36px;height:36px;background:#E4572E;color:#F6F3EE;display:grid;place-items:center;font-family:'Instrument Sans';font-weight:700;font-size:22px;border-radius:2px}
    h1{margin:34px 0 0;font-size:66px;line-height:1.02;letter-spacing:-.025em;font-weight:600;max-width:580px}
    h1 em{font-style:normal;color:#E4572E}
    p{margin:28px 0 0;font-size:22px;line-height:1.4;color:#5B5F66;max-width:540px}
    .colonna{display:flex;flex-direction:column;justify-content:center}
    .cornice{align-self:center;justify-self:end;width:512px;height:500px;overflow:hidden;border:2px solid #15171A;border-radius:2px;background:#fff;box-shadow:14px 14px 0 #E4572E}
    .cornice img{display:block;width:512px}
    .piede{position:absolute;left:72px;bottom:36px;font-family:'JetBrains Mono',monospace;font-size:15px;color:#5B5F66;letter-spacing:.04em}
  </style></head><body><div class="tela">
    <div class="colonna"><div class="marchio"><span class="r">R</span>Rata Vera · open source</div>
    <h1>Quanto paghi <em>davvero</em> per l’auto a rate?</h1>
    <p>Foto del preventivo del concessionario → totale che esce dalla tua tasca, costo del credito, TAEG ricalcolato, cosa succede con la maxi rata.</p></div>
    <div class="cornice"><img src="${scena}" alt=""></div>
    <div class="piede">Astro · Cloudflare Workers · D1 · Workers AI · MIT</div>
  </div></body></html>`;
  const file = join(cartellaTemporanea, 'social.html');
  writeFileSync(file, html);
  const contesto = await browser.newContext({ viewport: { width: 1280, height: 640 }, deviceScaleFactor: 1 });
  const page = await contesto.newPage();
  await page.goto(`file://${file}`);
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(200);
  await salvaImmagine('social-preview.png', await page.screenshot(), 1280);
  await contesto.close();
}

/** GIF della scena: video registrato con il movimento acceso, poi ffmpeg (12 fps, 800 px, tavolozza a 128 colori). */
async function gifScena(browser: Browser, cartellaTemporanea: string): Promise<void> {
  const ffmpeg = (() => { try { return execFileSync('which', ['ffmpeg'], { encoding: 'utf8' }).trim(); } catch { return ''; } })();
  if (!ffmpeg) { righe.push('GIF saltata: ffmpeg non trovato nel PATH'); return; }
  const misura = { width: 1200, height: 760 };
  const contesto = await browser.newContext({ viewport: misura, deviceScaleFactor: 1, locale: 'it-IT', reducedMotion: 'no-preference', colorScheme: 'light', recordVideo: { dir: cartellaTemporanea, size: misura } });
  const page = await contesto.newPage();
  await vai(page, ESEMPIO);
  await page.locator('[data-scena]').waitFor({ state: 'visible' });
  await page.locator('[data-atto="1"]').scrollIntoViewIfNeeded();
  await page.waitForTimeout(2600);
  // Scorrimento a passi fino al terzo atto, il tempo che ogni atto si disegni.
  for (const n of [2, 3]) {
    const atto = page.locator(`[data-atto="${n}"]`);
    const y = await atto.evaluate((el) => el.getBoundingClientRect().top);
    const passi = 14;
    for (let i = 0; i < passi; i++) { await page.mouse.wheel(0, (y - 24) / passi); await page.waitForTimeout(55); }
    await page.waitForTimeout(2600);
  }
  await page.waitForTimeout(600);
  const video = page.video();
  await contesto.close();
  const sorgente = video ? await video.path() : null;
  if (!sorgente || !existsSync(sorgente)) { righe.push('GIF saltata: nessun video registrato'); return; }
  const gif = join(CARTELLA, 'scena.gif');
  const mp4 = join(CARTELLA, 'scena.mp4');
  const filtri = 'fps=12,scale=800:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=128:stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=4:diff_mode=rectangle';
  execFileSync(ffmpeg, ['-y', '-loglevel', 'error', '-ss', '0.6', '-i', sorgente, '-vf', filtri, '-loop', '0', gif]);
  execFileSync(ffmpeg, ['-y', '-loglevel', 'error', '-ss', '0.6', '-i', sorgente, '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '24', '-movflags', '+faststart', '-an', mp4]);
  if (statSync(gif).size > PESO_MAX_GIF) throw new Error(`scena.gif pesa ${statSync(gif).size} byte, oltre ${PESO_MAX_GIF}`);
  righe.push(`${relative(SITO, gif)}  ${peso(gif)}`, `${relative(SITO, mp4)}  ${peso(mp4)}`);
}

mkdirSync(CARTELLA, { recursive: true });
const temporanea = mkdtempSync(join(tmpdir(), 'ratavera-readme-'));
const browser = await chromium.launch();
try {
  await schermate(browser);
  await anteprimaSocial(browser, temporanea);
  await gifScena(browser, temporanea);
} finally {
  await browser.close();
  rmSync(temporanea, { recursive: true, force: true });
}
console.log(`Immagini del README da ${INDIRIZZO}:\n${righe.map((r) => `  ${r}`).join('\n')}`);
