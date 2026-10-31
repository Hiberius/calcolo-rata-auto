import { expect, test, type Page } from '@playwright/test';
import { fileURLToPath } from 'node:url';

const CARTELLA_SCREENSHOT = fileURLToPath(new URL('../../../06_Lancio/qa-screenshots/v2/', import.meta.url));
const ESEMPIO = /Guarda l’esempio/;
const VIETATE = /truff|fregatur|trappol/;

async function apriEsempio(page: Page) {
  await page.goto('/');
  await page.getByRole('link', { name: ESEMPIO }).click();
  await expect(page.locator('[data-scena]')).toBeVisible();
}

async function chiudiBanner(page: Page) {
  const chiudi = page.locator('[data-chiudi-banner]');
  if (await chiudi.isVisible()) await chiudi.click();
}

async function scorriAtti(page: Page) {
  for (const n of [1, 2, 3]) {
    const atto = page.locator(`[data-atto="${n}"]`);
    await atto.scrollIntoViewIfNeeded();
    await expect(atto).toHaveAttribute('data-avanzamento', '1', { timeout: 5_000 });
  }
}

test('dopo l’esempio la scena è il primo schermo del risultato, con tre atti e la tabella sotto', async ({ page }) => {
  const errori: string[] = [];
  page.on('console', (m) => { if (m.type() === 'error') errori.push(m.text()); });
  page.on('pageerror', (e) => errori.push(e.message));
  await apriEsempio(page);
  for (const n of [1, 2, 3]) await expect(page.locator(`[data-atto="${n}"]`)).toHaveCount(1);
  const scena = await page.locator('[data-scena]').boundingBox();
  const tabella = await page.locator('[data-risultato]').boundingBox();
  expect(scena && tabella && scena.y < tabella.y).toBe(true);
  await scorriAtti(page);
  await expect(page.locator('[data-totale-scena]')).toHaveText('18.253,25 €');
  await expect(page.locator('[data-frase-quota]')).toContainText('La rata pubblicizzata copre il 19% di quello che paghi');
  await expect(page.locator('[data-contenitore="capitale"]')).toHaveAttribute('data-importo', '14950');
  await expect(page.locator('[data-etichetta-stima]')).toHaveText('stima, non quotazione');
  await expect(page.locator('[data-strada-scena]')).toHaveCount(3);
  await expect(page.locator('[data-riepilogo="2"]')).toContainText('A fine piano devi 10.434,00 €');
  expect((await page.locator('[data-scena]').innerText()).toLowerCase()).not.toMatch(VIETATE);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
  expect(errori).toEqual([]);
});

test('i cursori di anticipo, durata e km cambiano i numeri dal vivo', async ({ page }) => {
  await apriEsempio(page);
  await page.locator('[data-atto="2"]').scrollIntoViewIfNeeded();
  const valore = page.locator('[data-valore-finale]');
  const rata = page.locator('[data-rata-scena]');
  await expect(valore).toHaveText('9.262 €');
  await expect(rata).toHaveText('99,00 €');
  await page.locator('#scena-km').fill('35000');
  await expect(valore).not.toHaveText('9.262 €');
  await expect(page.locator('[data-lettura="scena-km"]')).toHaveText('35.000 km');
  await expect(page.locator('#scena-anticipo')).toHaveAttribute('max', '4605');
  await page.locator('#scena-anticipo').fill('4600');
  await expect(rata).not.toHaveText('99,00 €');
  await page.locator('#scena-durata').fill('48');
  await expect(page.locator('#atto2-titolo')).toHaveText('I quattro anni');
  await expect(page.locator('[data-lettura="scena-durata"]')).toHaveText('48 mesi');
});

test('mostralo al venditore: schermo intero, si apre e si chiude', async ({ page }) => {
  await apriEsempio(page);
  const vista = page.locator('[data-vista-venditore]');
  await expect(vista).toBeHidden();
  await page.getByRole('button', { name: 'Mostralo al venditore' }).click();
  await expect(vista).toBeVisible();
  await expect(vista).toContainText('18.253,25 €');
  await expect(vista).toContainText('Qual è il prezzo in contanti?');
  // innerText: le definizioni del glossario (nascoste finché non le apri) non entrano nel testo letto.
  await expect(vista).toContainText('Il TAEG include le spese di incasso delle rate?', { useInnerText: true });
  await expect(vista.locator('[data-termine]').first()).toBeVisible();
  await vista.getByRole('button', { name: 'Esci' }).click();
  await expect(vista).toBeHidden();
  await page.getByRole('button', { name: 'Mostralo al venditore' }).click();
  await page.keyboard.press('Escape');
  await expect(vista).toBeHidden();
});

test('con prefers-reduced-motion i grafici sono statici e già completi', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await apriEsempio(page);
  await expect(page.locator('[data-scena]')).toHaveAttribute('data-scena-statica', 'true');
  for (const n of [1, 2, 3]) await expect(page.locator(`[data-atto="${n}"]`)).toHaveAttribute('data-avanzamento', '1');
  await expect(page.locator('[data-totale-scena]')).toHaveText('18.253,25 €');
});

test('pagina promo: scena con il valore garantito dalla casa', async ({ page }) => {
  await page.goto('/promozioni/seat/arona-black-edition-2026-11');
  await expect(page.locator('[data-scena]')).toBeVisible();
  await expect(page.locator('[data-vfg]')).toContainText('Valore garantito dalla casa');
  await expect(page.locator('[data-frase-incrocio]')).toContainText('devi all’auto più di quanto vale');
});

test('scheda: immagine della scena accanto allo scontrino', async ({ page, request }) => {
  const preventivo = { marca: 'Peugeot', modello: '208', prezzoPromo: 14950, anticipo: 4326, nRate: 35, rata: 99, maxiRata: 10434, tan: 7.49, taegDichiarato: 11.03, importoTotaleDovutoDichiarato: 13927.25 };
  const r = await request.post('/api/scheda', { data: { preventivo, consensoArchivio: false, turnstileToken: 'XXXX.DUMMY.TOKEN.XXXX' } });
  expect(r.status()).toBe(201);
  const { id } = (await r.json()) as { id: string };
  const png = await request.get(`/s/${id}/scena.png`);
  expect(png.status()).toBe(200);
  expect(png.headers()['content-type']).toContain('image/png');
  await page.goto(`/s/${id}`);
  await expect(page.locator('[data-immagine-scena] img')).toBeVisible();
  await expect(page.locator('#testo-condivisione')).toContainText('Dal mese 25 devi all’auto più di quanto vale (stima, non quotazione).');
});

for (const larghezza of [375, 768, 1024, 1440]) {
  test(`screenshot della scena a ${larghezza}`, async ({ browser }) => {
    const contesto = await browser.newContext({ viewport: { width: larghezza, height: 900 }, deviceScaleFactor: 2, locale: 'it-IT' });
    const page = await contesto.newPage();
    await apriEsempio(page);
    await chiudiBanner(page);
    await scorriAtti(page);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
    await page.locator('[data-scena]').screenshot({ path: `${CARTELLA_SCREENSHOT}scena-${larghezza}.png` });
    await page.getByRole('button', { name: 'Mostralo al venditore' }).click();
    const vista = page.locator('[data-vista-venditore]');
    await expect(vista).toBeVisible();
    // Lo screenshot aspetta la fine dell'animazione d'ingresso (opacità e spostamento).
    await vista.evaluate((d) => Promise.all(d.getAnimations().map((a) => a.finished)));
    await page.screenshot({ path: `${CARTELLA_SCREENSHOT}venditore-${larghezza}.png` });
    await contesto.close();
  });
}
