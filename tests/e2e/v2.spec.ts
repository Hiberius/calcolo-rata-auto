import { expect, test, type Page } from '@playwright/test';
import { fileURLToPath } from 'node:url';

const CARTELLA_SCREENSHOT = fileURLToPath(new URL('../../../06_Lancio/qa-screenshots/v2/', import.meta.url));
const VIETATE = /truff|fregatur|trappol/;
const TOKEN_TEST = 'XXXX.DUMMY.TOKEN.XXXX';

async function senzaOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
}

async function chiudiBanner(page: Page) {
  const chiudi = page.locator('[data-chiudi-banner]');
  if (await chiudi.isVisible()) await chiudi.click();
}

test('home (v2 §1): la promessa, due azioni sopra la piega, chi c’è dietro, anteprima, menu', async ({ page }) => {
  const errori: string[] = [];
  page.on('pageerror', (e) => errori.push(e.message));
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1, name: 'Quanto paghi davvero per l’auto a rate?' })).toBeVisible();
  const altezza = page.viewportSize()?.height ?? 0;
  for (const azione of ['[data-fotografa]', '[data-prova-esempio]']) {
    const box = await page.locator(azione).boundingBox();
    expect(box && box.y + box.height <= altezza).toBe(true);
  }
  await expect(page.locator('[data-fotografa]')).toHaveText('Fotografa il preventivo');
  await expect(page.locator('[data-prova-esempio]')).toContainText('Guarda l’esempio: Peugeot 208 a 99');
  await expect(page.locator('[data-fiducia]')).toContainText('Per te è gratis e non ti proponiamo offerte');
  await expect(page.locator('a[href="/officina"]').first()).toBeAttached();
  const primoSchermo = (await page.locator('main section').first().innerText()).toLowerCase();
  expect(primoSchermo).not.toMatch(/maxi rata|debito residuo|taeg|anteprima della scena/);
  await expect(page.locator('[data-anteprima] canvas')).toHaveCount(1);
  await expect(page.locator('[data-anteprima]')).toHaveAttribute('data-livello', /pieno|ridotto/);
  await page.locator('[data-menu] summary').click();
  const menu = page.locator('[data-menu]').getByRole('navigation', { name: 'Navigazione principale' }).getByRole('link');
  await expect(menu).toHaveText(['Leggi il preventivo', 'Promozioni', 'Indice', 'Confronta', 'Guide', 'Metodologia']);
  expect((await page.locator('main').innerText()).toLowerCase()).not.toMatch(VIETATE);
  await senzaOverflow(page);
  expect(errori).toEqual([]);
});

test('home: con prefers-reduced-motion l’anteprima è ferma; «Fotografa il preventivo» porta al modulo', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await expect(page.locator('[data-anteprima]')).toHaveAttribute('data-livello', 'ridotto');
  await page.locator('[data-fotografa]').click();
  await expect(page).toHaveURL(/#decodifica$/);
  await expect(page.getByRole('button', { name: 'Carica una foto' })).toBeInViewport();
});

test('esempio senza JavaScript dell’hero: /?esempio=1 apre il risultato e la scena è ancora lì', async ({ page }) => {
  await page.goto('/?esempio=1');
  await expect(page.locator('[data-totale]')).toHaveText('18.253,25 €');
  await expect(page.locator('[data-scena]')).toBeVisible();
  await expect(page).not.toHaveURL(/esempio=1/);
});

test('officina: il modulo si salva in locale con consenso registrato e compare in admin', async ({ page }) => {
  await page.goto('/officina');
  await expect(page.locator('h1')).toHaveText('Il preventivo dell’officina.');
  await expect(page.locator('main')).toContainText('Il confronto con il prezzo giusto arriva a dicembre');
  await expect(page.locator('[data-contatore-officina]')).toHaveCount(0);
  const modulo = page.locator('[data-modulo-officina]');
  await modulo.locator('select[name="modello"]').selectOption('Fiat Panda');
  await modulo.getByText('Freni (pastiglie, dischi)').click();
  await modulo.locator('input[name="importo"]').fill('312,50');
  await modulo.locator('select[name="provincia"]').selectOption('TO');
  await modulo.locator('input[name="email"]').fill('prova-officina@esempio.it');
  await modulo.locator('input[name="consensoAvviso"]').check();
  await expect(modulo.locator('input[name="cf-turnstile-response"]')).not.toHaveValue('', { timeout: 20_000 });
  await modulo.getByRole('button', { name: 'Lascia il preventivo' }).click();
  await expect(page.locator('[data-esito-ok]')).toContainText('anonimo');
  await page.goto('/admin?token=admin-test');
  await expect(page.locator('main')).toContainText('Preventivi officina');
  await expect(page.locator('main')).toContainText('prova-officina@esempio.it');
});

test('officina via API: campi in più rifiutati, email senza consenso rifiutata', async ({ request }) => {
  const base = { modello: 'Peugeot 208', intervento: 'tagliando', importo: '189', provincia: 'MI', turnstileToken: TOKEN_TEST };
  expect((await request.post('/api/officina', { data: base })).status()).toBe(201);
  expect((await request.post('/api/officina', { data: { ...base, targa: 'AB123CD' } })).status()).toBe(422);
  const r = await request.post('/api/officina', { data: { ...base, email: 'a@b.it' } });
  expect(r.status()).toBe(422);
  expect(((await r.json()) as { campi: string[] }).campi).toContain('consensoAvviso');
});

test('/indice in attesa: metodologia, prima edizione, nessuna classifica, CSV non ancora disponibile', async ({ page, request }) => {
  await page.goto('/indice');
  await expect(page.locator('h1')).toHaveText('Quanto costa il credito delle promozioni auto.');
  await expect(page.locator('[data-prima-edizione]')).toContainText(/Prima edizione/);
  await expect(page.locator('[data-metodologia-indice]')).toContainText('Costo del credito');
  await expect(page.locator('[data-tabella-indice]')).toHaveCount(0);
  await expect(page.locator('[data-grafico-indice]')).toHaveCount(0);
  await expect(page.locator('[data-modulo-stampa]')).toBeVisible();
  await senzaOverflow(page);
  expect((await request.get('/indice/dati.csv')).status()).toBe(404);
  await page.goto('/indice/metodologia');
  await expect(page.locator('h1')).toHaveText('Come costruiamo l’Indice');
  await expect(page.locator('main')).toContainText('CC BY 4.0');
});

test('modulo stampa dell’Indice salvato con Turnstile di test', async ({ page }) => {
  await page.goto('/indice');
  const modulo = page.locator('[data-modulo-stampa]');
  await modulo.locator('input[name="email"]').fill('redazione@esempio.it');
  await modulo.locator('input[name="testata"]').fill('Testata di prova');
  await modulo.locator('input[name="consensoStampa"]').check();
  await expect(modulo.locator('input[name="cf-turnstile-response"]')).not.toHaveValue('', { timeout: 20_000 });
  await modulo.getByRole('button', { name: 'Avvisami all’uscita' }).click();
  await expect(page.locator('[data-esito-ok]')).toBeVisible();
});

test('sitemap con le pagine nuove', async ({ request }) => {
  const xml = await (await request.get('/sitemap.xml')).text();
  for (const p of ['/indice<', '/indice/metodologia<', '/officina<']) expect(xml).toContain(p);
});

for (const larghezza of [375, 768, 1024, 1440]) {
  test(`screenshot di home, indice e officina a ${larghezza}`, async ({ browser }) => {
    const contesto = await browser.newContext({ viewport: { width: larghezza, height: 900 }, deviceScaleFactor: 2, locale: 'it-IT', reducedMotion: 'reduce' });
    const page = await contesto.newPage();
    for (const [percorso, nome] of [['/', 'home'], ['/indice', 'indice'], ['/officina', 'officina']] as const) {
      await page.goto(percorso);
      await chiudiBanner(page);
      if (await page.locator('.cf-turnstile').count()) await expect(page.locator('input[name="cf-turnstile-response"]').first()).not.toHaveValue('', { timeout: 20_000 });
      await senzaOverflow(page);
      await page.screenshot({ path: `${CARTELLA_SCREENSHOT}${nome}-${larghezza}.png`, fullPage: true });
    }
    await contesto.close();
  });
}
