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
