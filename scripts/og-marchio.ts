/**
 * Immagine di condivisione predefinita con il marchio (revisione del 31/10): lo scontrino dell'originale di Christian
 * (06_Lancio/immagini/og-default-chatgpt.png, mai modificato) e, nella metà sinistra vuota, la R con la barra,
 * «Rata Vera» e la promessa in una riga, nei font del sito. Il testo lo disegna Chromium (Playwright, già nel progetto),
 * sharp riduce la tavolozza sotto i 200 kB. Uso: npx vite-node --config vitest.config.ts scripts/og-marchio.ts
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { chromium } from '@playwright/test';
import sharp from 'sharp';

const SITO = join(import.meta.dirname, '..');
const fondo = await sharp(join(SITO, '..', '06_Lancio', 'immagini', 'og-default-chatgpt.png'))
  .resize({ width: 1200, height: 630, fit: 'cover', position: 'centre' }).blur(0.8).png().toBuffer();
const font = (f: string) => `data:font/woff2;base64,${readFileSync(join(SITO, 'public', 'fonts', f)).toString('base64')}`;
const marchio = readFileSync(join(SITO, 'public', 'favicon.svg'), 'utf8');

const html = `<!doctype html><html lang="it"><head><meta charset="utf-8"><style>
@font-face { font-family: S; src: url(${font('instrument-sans-latin-wght.woff2')}); font-weight: 400 700; }
@font-face { font-family: M; src: url(${font('jetbrains-mono-latin-wght.woff2')}); font-weight: 400 600; }
html, body { margin: 0; width: 1200px; height: 630px; }
body { background: url(data:image/png;base64,${fondo.toString('base64')}) 0 0 / 1200px 630px; color: #15171A; font-family: S; position: relative; }
.marchio { position: absolute; left: 72px; top: 72px; display: flex; align-items: center; gap: 20px; }
.marchio svg { width: 72px; height: 72px; border-radius: 2px; }
.nome { font-size: 44px; font-weight: 600; letter-spacing: -0.03em; }
.promessa { position: absolute; left: 72px; top: 250px; width: 500px; font-size: 64px; font-weight: 600; line-height: 0.98; letter-spacing: -0.045em; }
.promessa b { color: #E4572E; font-weight: 600; }
.piede { position: absolute; left: 72px; bottom: 64px; font-family: M; font-size: 22px; color: #5C5A55; letter-spacing: 0.02em; }
</style></head><body>
<div class="marchio">${marchio}<span class="nome">Rata Vera</span></div>
<div class="promessa">Quanto paghi <b>davvero</b> per l’auto a rate?</div>
<div class="piede">Foto del preventivo, totale vero, gratis</div>
</body></html>`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
await page.setContent(html);
await page.evaluate(() => document.fonts.ready);
const grezzo = await page.screenshot({ type: 'png' });
await browser.close();
const png = await sharp(grezzo).png({ palette: true, colours: 128, dither: 0, effort: 10, compressionLevel: 9 }).toBuffer();
writeFileSync(join(SITO, 'public', 'og-default.png'), png);
console.log(`public/og-default.png ${(png.length / 1024).toFixed(1)} kB`);
