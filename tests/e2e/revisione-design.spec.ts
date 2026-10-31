import { expect, test } from '@playwright/test';

/** Le misure della revisione dei tre art director del 31/10, rifatte come test. */
const PAGINE = ['/', '/?esempio=1', '/privacy', '/cookie', '/indice', '/officina', '/promozioni', '/promozioni/seat/arona-black-edition-2026-11', '/guide/taeg-finanziamento-auto', '/noleggio'];

for (const larghezza of [320, 375]) {
  test(`nessuno scorrimento orizzontale a ${larghezza} px`, async ({ browser }) => {
    const contesto = await browser.newContext({ viewport: { width: larghezza, height: 800 }, locale: 'it-IT' });
    const page = await contesto.newPage();
    for (const p of PAGINE) {
      await page.goto(p);
      if (p.includes('esempio')) await expect(page.locator('[data-scena]')).toBeVisible();
      const fuori = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(fuori, p).toBeLessThanOrEqual(0);
    }
    await contesto.close();
  });
}

test('testata su una riga (≤ 64 px) e le due azioni della home entro 640 px a 375', async ({ browser }) => {
  const contesto = await browser.newContext({ viewport: { width: 375, height: 812 }, locale: 'it-IT' });
  const page = await contesto.newPage();
  await page.goto('/');
  const testata = await page.locator('header.testata').boundingBox();
  expect(testata!.height).toBeLessThanOrEqual(64);
  for (const azione of ['[data-fotografa]', '[data-prova-esempio]']) {
    const b = await page.locator(azione).boundingBox();
    expect(b!.y + b!.height, azione).toBeLessThanOrEqual(640);
  }
  await contesto.close();
});

test('scena a 375: la strada del preventivo e il debito a fine piano pesano più degli altri numeri', async ({ browser }) => {
  const contesto = await browser.newContext({ viewport: { width: 375, height: 812 }, locale: 'it-IT', reducedMotion: 'reduce' });
  const page = await contesto.newPage();
  await page.goto('/?esempio=1');
  await expect(page.locator('[data-scena]')).toBeVisible();
  const misura = (s: string) => page.locator(s).first().evaluate((e) => Number.parseFloat(getComputedStyle(e).fontSize));
  expect(await misura('[data-strada-scena="B"] [data-totale-strada]')).toBeGreaterThanOrEqual(32);
  expect(await misura('[data-strada-scena="A"] [data-totale-strada]')).toBeLessThan(28);
  expect(await misura('[data-debito-finale]')).toBeGreaterThanOrEqual(28);
  // Il totale dello scontrino non va mai a capo.
  const totale = page.locator('[data-risultato] .numero-scontrino');
  expect(await totale.evaluate((e) => e.getBoundingClientRect().height / Number.parseFloat(getComputedStyle(e).lineHeight))).toBeLessThan(1.5);
  await contesto.close();
});

test('pagina promo: la scena che arriva non sposta nulla di visibile (CLS < 0,1)', async ({ page }) => {
  await page.addInitScript(() => {
    (window as unknown as { __cls: number }).__cls = 0;
    new PerformanceObserver((l) => {
      for (const e of l.getEntries() as unknown as { value: number; hadRecentInput: boolean }[]) if (!e.hadRecentInput) (window as unknown as { __cls: number }).__cls += e.value;
    }).observe({ type: 'layout-shift', buffered: true });
  });
  await page.goto('/promozioni/seat/arona-black-edition-2026-11');
  await expect(page.locator('[data-scena]')).toBeVisible();
  await page.waitForTimeout(800);
  expect(await page.evaluate(() => (window as unknown as { __cls: number }).__cls)).toBeLessThan(0.1);
});

test('nessuna curva di easing fuori dalla specifica sui pulsanti e sui campi', async ({ page }) => {
  await page.goto('/');
  const curve = await page.evaluate(() => [...document.querySelectorAll('.btn, .campo, [aria-pressed], .link-azione > span')]
    .map((e) => getComputedStyle(e)).filter((c) => c.transitionDuration.split(', ').some((d) => d !== '0s')).map((c) => c.transitionTimingFunction));
  expect(curve.length).toBeGreaterThan(0);
  for (const c of curve) expect(c.split(/,\s*(?![^(]*\))/).every((x) => x === 'cubic-bezier(0.16, 1, 0.3, 1)' || x === 'cubic-bezier(0.65, 0, 0.35, 1)'), c).toBe(true);
});
