import { expect, test } from '@playwright/test';

const P208 = { anticipo: '4326', nRate: '35', rata: '99', maxiRata: '10434', prezzoPromo: '14950', taegDichiarato: '11,03', tan: '7,49' };

test('la home carica e la decodifica manuale della 208 mostra il totale', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('h1')).toBeVisible();
  await page.getByRole('button', { name: 'Scrivi i numeri' }).click();
  for (const [campo, valore] of Object.entries(P208)) {
    await page.locator(`input[name="${campo}"]`).fill(valore);
  }
  await page.getByRole('button', { name: 'Apri il gruppo Importi dichiarati' }).or(page.getByText('Importi dichiarati')).first().click();
  await page.locator('input[name="importoTotaleDovutoDichiarato"]').fill('13927,25');
  await page.getByRole('button', { name: 'Calcola quanto paghi davvero' }).click();
  await expect(page.locator('[data-totale]')).toHaveText('18.253,25 €');
  await expect(page.locator('[data-avvertenza]').first()).toContainText('non è un mediatore creditizio');
  const testo = (await page.locator('[data-risultato]').innerText()).toLowerCase();
  expect(testo).not.toMatch(/truff|fregatur|trappol/);
  const larghezza = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(larghezza).toBeLessThanOrEqual(0);
});

const TOKEN_TEST = 'XXXX.DUMMY.TOKEN.XXXX';
const PREVENTIVO_208 = { marca: 'Peugeot', modello: '208', versione: 'Style', prezzoPromo: 14950, anticipo: 4326, nRate: 35, rata: 99, maxiRata: 10434, tan: 7.49, taegDichiarato: 11.03, importoTotaleDovutoDichiarato: 13927.25 };

test('scheda creata via API, aperta, con immagine OG png', async ({ page, request }) => {
  const r = await request.post('/api/scheda', { data: { preventivo: PREVENTIVO_208, consensoArchivio: false, turnstileToken: TOKEN_TEST } });
  expect(r.status()).toBe(201);
  const { id } = (await r.json()) as { id: string };
  await page.goto(`/s/${id}`);
  await expect(page.locator('h1')).toContainText('Peugeot 208');
  await expect(page.locator('.totale-grande').first()).toHaveText('18.253,25 €');
  await expect(page.locator('[data-avvertenza]').first()).toBeVisible();
  const og = await request.get(`/s/${id}/og.png`);
  expect(og.status()).toBe(200);
  expect(og.headers()['content-type']).toContain('image/png');
});

test('tre strade e richiesta di noleggio con Turnstile di test', async ({ page }) => {
  await page.goto('/noleggio');
  await expect(page.locator('h1')).toBeVisible();
  for (const [campo, valore] of Object.entries({ prezzoContanti: '14950', anticipo: '4326', nRate: '35', rata: '99', maxiRata: '10434', canoneNoleggio: '299', mesiNoleggio: '36' })) {
    await page.locator(`[data-tre-strade] input[name="${campo}"]`).fill(valore);
  }
  await expect(page.locator('[data-strada="B"]')).toContainText('18.225,00 €');
  await expect(page.locator('[data-strada="C"]')).toContainText('10.764,00 €');

  const modulo = page.locator('[data-modulo-noleggio]');
  await modulo.locator('input[name="nome"]').fill('Prova Automatica');
  await modulo.locator('input[name="email"]').fill('prova@esempio.it');
  await modulo.locator('input[name="telefono"]').fill('3331234567');
  await modulo.locator('input[name="provincia"]').fill('MI');
  await modulo.locator('input[name="modello"]').fill('Peugeot 208');
  await modulo.locator('input[name="consensoContatto"]').check();
  await expect(modulo.locator('input[name="cf-turnstile-response"]')).not.toHaveValue('', { timeout: 20_000 });
  await modulo.getByRole('button', { name: 'Chiedi un preventivo di noleggio' }).click();
  await expect(page.locator('[data-esito-ok]')).toBeVisible();
});

test('promozioni e guida con calcolo vivo', async ({ page }) => {
  await page.goto('/promozioni');
  await expect(page.locator('h1')).toBeVisible();
  await page.goto('/promozioni/seat/arona-black-edition-2026-11');
  await expect(page.locator('[data-totale]').first()).toHaveText(/^\d{1,3}(\.\d{3})*,\d{2} €$/);
  await page.goto('/guide/maxi-rata-finale-come-funziona');
  await expect(page.locator('[data-totale-vivo]')).toHaveText('18.225,00 €');
  const testo = (await page.locator('main').innerText()).toLowerCase();
  expect(testo).not.toMatch(/truff|fregatur|trappol/);
  const larghezza = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(larghezza).toBeLessThanOrEqual(0);
});

test('nessuna violazione della CSP sulle pagine principali', async ({ page }) => {
  const violazioni: string[] = [];
  page.on('console', (m) => { if (m.type() === 'error' && /Content Security Policy|Refused to/i.test(m.text())) violazioni.push(m.text()); });
  for (const p of ['/', '/noleggio', '/promozioni', '/guide/noleggio-lungo-termine-privati-conviene', '/per-concessionari', '/verdetto', '/privacy']) {
    await page.goto(p, { waitUntil: 'load' });
    if (await page.locator('.cf-turnstile').count()) await expect(page.locator('input[name="cf-turnstile-response"]')).not.toHaveValue('', { timeout: 20_000 });
  }
  expect(violazioni).toEqual([]);
});
