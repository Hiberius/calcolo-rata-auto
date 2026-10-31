import { expect, test } from '@playwright/test';

/**
 * Aree di tocco (revisione del 31/10, problema 7): a 375 px ogni link e pulsante fuori dal testo corrente misura almeno
 * 44×44. Sono esclusi i link dentro un paragrafo di testo (WCAG 2.5.8, eccezione «in linea») e quelli nascosti.
 */
for (const percorso of ['/', '/officina', '/indice', '/promozioni', '/metodologia']) {
  test(`tocchi da 44 px a 375 su ${percorso}`, async ({ browser }) => {
    const contesto = await browser.newContext({ viewport: { width: 375, height: 812 }, locale: 'it-IT' });
    const page = await contesto.newPage();
    await page.goto(percorso);
    const piccoli = await page.evaluate(() => {
      const fuori: string[] = [];
      for (const el of document.querySelectorAll<HTMLElement>('a[href], button, [role="button"], summary')) {
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.height === 0 || getComputedStyle(el).visibility === 'hidden') continue;
        if (el.closest('.sr-only, .prosa, .termine, [data-fiducia] p:not(:last-child)')) continue;
        // Link in linea: dentro un paragrafo con altro testo intorno.
        const p = el.parentElement;
        const inLinea = getComputedStyle(el).display === 'inline' && p != null && (p.textContent ?? '').trim().length > (el.textContent ?? '').trim().length + 2;
        if (inLinea) continue;
        if (r.width < 44 || r.height < 44) fuori.push(`${(el.textContent ?? '').trim().slice(0, 30)} ${Math.round(r.width)}×${Math.round(r.height)}`);
      }
      return fuori;
    });
    expect(piccoli).toEqual([]);
    await contesto.close();
  });
}
