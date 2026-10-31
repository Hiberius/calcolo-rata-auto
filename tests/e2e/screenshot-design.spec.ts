import { expect, test, type Page } from '@playwright/test';
import { fileURLToPath } from 'node:url';

/**
 * Screenshot per la revisione del design (elevazione del 31/10): sei pagine a 375, 768, 1024 e 1440.
 * Solo su richiesta, perché scrive fuori dal repo: SCREENSHOT_DESIGN=1 npx playwright test screenshot-design
 * Con meno movimento: ogni pagina è nel suo stato finale (titoli saliti, numeri contati, scena completa).
 */
const CARTELLA = fileURLToPath(new URL('../../../06_Lancio/screenshot/2026-10-31-design/', import.meta.url));
const PAGINE = [
  ['home', '/'],
  ['home-esempio', '/?esempio=1'],
  ['officina', '/officina'],
  ['indice', '/indice'],
  ['promozioni', '/promozioni'],
  ['testo', '/metodologia'],
] as const;

test.skip(!process.env.SCREENSHOT_DESIGN, 'solo con SCREENSHOT_DESIGN=1');

async function pronta(page: Page, nome: string) {
  await page.evaluate(() => document.fonts.ready);
  if (await page.locator('.cf-turnstile').count()) await expect(page.locator('input[name="cf-turnstile-response"]').first()).not.toHaveValue('', { timeout: 20_000 });
  if (nome === 'home-esempio') {
    await expect(page.locator('[data-scena]')).toBeVisible();
    for (const n of [1, 2, 3]) {
      const atto = page.locator(`[data-atto="${n}"]`);
      await atto.scrollIntoViewIfNeeded();
      await expect(atto).toHaveAttribute('data-avanzamento', '1');
    }
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
}

for (const larghezza of [375, 768, 1024, 1440]) {
  test(`design a ${larghezza}`, async ({ browser }) => {
    test.setTimeout(120_000);
    const contesto = await browser.newContext({ viewport: { width: larghezza, height: 900 }, deviceScaleFactor: larghezza <= 768 ? 2 : 1, locale: 'it-IT', reducedMotion: 'reduce' });
    const page = await contesto.newPage();
    for (const [nome, percorso] of PAGINE) {
      await page.goto(percorso);
      await pronta(page, nome);
      if (nome === 'home-esempio') {
        await page.locator('[data-scena]').screenshot({ path: `${CARTELLA}scena-${larghezza}.png` });
      }
      await page.screenshot({ path: `${CARTELLA}${nome}-${larghezza}.png`, fullPage: true });
    }
    await contesto.close();
  });
}
