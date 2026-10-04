// Sonda: la atribución por campaña del comparador es visible (overlay o en flujo) por motor/perfil.
import { chromium, firefox, webkit, devices } from 'playwright';
import { resolve } from 'node:path';
import { createStaticServer } from './static-server.mjs';
import { installCiFixtures } from './fixtures.mjs';
const OUT = process.argv[2];
const server = await createStaticServer(resolve('build'), 0);
const base = `http://localhost:${server.address().port}`;
const out = [];
for (const [name, engine, opts] of [
  ['galaxy-s9', chromium, devices['Galaxy S9+']],
  ['iphone-se', webkit, devices['iPhone SE']],
  ['desktop-firefox', firefox, { viewport: { width: 1440, height: 900 } }]
]) {
  const browser = await engine.launch();
  const page = await (await browser.newContext(opts)).newPage();
  await installCiFixtures(page);
  await page.goto(`${base}/?year=1987&place=leioa&view=swipe`, { waitUntil: 'load', timeout: 60000 });
  try {
    await page.locator('.swipe .handle').waitFor({ timeout: 60000 });
  } catch (error) {
    await page.screenshot({ path: `${OUT}/${name}-swipe-timeout.png`, timeout: 10000 }).catch(() => {});
    out.push({ name, error: error.name });
    console.log(name, 'TIMEOUT');
    await browser.close();
    continue;
  }
  const r = await page.evaluate(() => {
    const vis = (s) => {
      const e = document.querySelector(s);
      if (!e) return null;
      return getComputedStyle(e).display !== 'none' ? e.textContent.trim() : 'HIDDEN';
    };
    return { flow: vis('.src.flow'), overlay: vis('.src.overlay') };
  });
  if (r.flow && r.flow !== 'HIDDEN') {
    await page.locator('.src.flow').scrollIntoViewIfNeeded();
    await page.screenshot({ path: `${OUT}/${name}-flow-source.png` });
  }
  out.push({ name, ...r });
  console.log(name, JSON.stringify(r));
  await browser.close();
}
console.log(JSON.stringify(out, null, 1));
server.close();
