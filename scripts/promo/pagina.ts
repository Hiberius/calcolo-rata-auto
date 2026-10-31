import { mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { chromium } from '@playwright/test';

const MAX_TESTO = 24_000;
const RIFIUTA = /rifiuta|solo necessari|solo i necessari|continua senza accettare|nega/i;

export interface PaginaLetta {
  readonly testo: string;
  readonly screenshot: string;
}

/** Apre la pagina ufficiale in italiano, rifiuta i cookie non necessari, legge il testo visibile e fa lo screenshot. */
export async function leggiPagina(url: string, percorsoScreenshot: string): Promise<PaginaLetta> {
  const browser = await chromium.launch();
  try {
    const contesto = await browser.newContext({ locale: 'it-IT', viewport: { width: 1366, height: 900 } });
    const pagina = await contesto.newPage();
    await pagina.goto(url, { waitUntil: 'domcontentloaded', timeout: 45_000 });
    await pagina.getByRole('button', { name: RIFIUTA }).first().click({ timeout: 4_000 }).catch(() => undefined);
    await pagina.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => undefined);
    const testo = (await pagina.evaluate(() => document.body.innerText)).replace(/\n{3,}/g, '\n\n').slice(0, MAX_TESTO);
    await mkdir(dirname(percorsoScreenshot), { recursive: true });
    await pagina.screenshot({ path: percorsoScreenshot, fullPage: true });
    return { testo, screenshot: percorsoScreenshot };
  } finally {
    await browser.close();
  }
}
