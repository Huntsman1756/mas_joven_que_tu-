// Run against a fresh build, or LAYOUT_URL=http://127.0.0.1:4399 for development.
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { createStaticServer } from './static-server.mjs';
import { installLocalFixtures, installExternalStubs } from './fixtures.mjs';

const server = process.env.LAYOUT_URL ? null : await createStaticServer('build', 4396);
const base = process.env.LAYOUT_URL || 'http://localhost:4396';
const browser = await chromium.launch();
const errors = [];
try {
  for (const width of [1440, 390]) {
    const context = await browser.newContext({
      viewport: { width, height: 900 },
      hasTouch: width === 390,
      isMobile: width === 390
    });
    const page = await context.newPage();
    page.on('pageerror', (error) => errors.push(error.message));
    await installLocalFixtures(page);
    await installExternalStubs(page);
    await page.goto(`${base}/?year=1990&place=getxo&view=photo&ortho=1956`);
    await page.waitForSelector('.photo .tc-year');
    for (const lang of ['ES', 'EU']) {
      await page.locator('.langs button', { hasText: lang }).click();
      const heights = [];
      for (const year of [1945, 1956, 1989, 2025]) {
        // G19: en el rail móvil (~121 px / 80 años) campañas adyacentes
        // son indistinguibles por pixel — el contrato es el snap a
        // campaña real; se fija el valor del slider (vía del rail)
        await page.evaluate((y) => {
          const s = document.querySelector('.photo .tc-scrub');
          s.value = String(y);
          s.dispatchEvent(new Event('input', { bubbles: true }));
          s.dispatchEvent(new Event('change', { bubbles: true }));
        }, year);
        await page.waitForFunction((y) =>
          document.querySelector('.photo .tc-year')?.textContent === String(y) &&
          window.__mjtApp?.orthoState === 'AVAILABLE', year);
        heights.push(await page.locator('.photo').evaluate((el) => el.getBoundingClientRect().height));
      }
      assert.ok(Math.max(...heights) - Math.min(...heights) <= 1,
        `${width}/${lang}: photo heights ${heights}`);
      console.log(`PASS photo stability ${width}/${lang}: ${heights}`);
    }
    await page.goto(`${base}/?year=1990&place=getxo&z=13`);
    await page.waitForFunction(() => window.__mjtMap?.loaded());
    await page.locator('.cell-inspect').click();
    await page.waitForSelector('#cell-detail');
    const visibility = await page.locator('.selection-panel').evaluate((el) => {
      const r = el.getBoundingClientRect();
      return r.top >= 0 && r.bottom <= innerHeight && r.left >= 0 && r.right <= innerWidth;
    });
    assert.ok(visibility, `selection is visible at ${width}`);
    await page.locator('#cell-detail .x').click();
    await page.waitForSelector('#cell-detail', { state: 'detached' });
    console.log(`PASS visible, closable selection ${width}`);
    await context.close();
  }
  assert.deepEqual(errors, []);
} finally {
  await browser.close();
  if (server) await new Promise((resolve) => server.close(resolve));
}
