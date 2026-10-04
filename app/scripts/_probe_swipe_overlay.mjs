// Sonda temporal: ¿qué elemento está encima de la atribución y del zoom en «Antes/ahora»?
import { chromium, devices } from 'playwright';
import { resolve } from 'node:path';
import { createStaticServer } from './static-server.mjs';
import { installCiFixtures } from './fixtures.mjs';

const OUT = process.argv[2];
const server = await createStaticServer(resolve('build'), 0);
const base = `http://localhost:${server.address().port}`;
const browser = await chromium.launch();
const out = {};
for (const [name, opts] of [
  ['galaxy-s9', devices['Galaxy S9+']],
  ['desktop', { viewport: { width: 1440, height: 900 } }]
]) {
  const page = await (await browser.newContext(opts)).newPage();
  await installCiFixtures(page);
  await page.goto(`${base}/?year=1987&place=leioa&view=swipe`, { waitUntil: 'load' });
  await page.locator('.swipe .handle').waitFor({ timeout: 60000 });
  await page.waitForTimeout(1500);
  const probe = async (label) => {
    const r = await page.evaluate(() => {
      const top = (el) => {
        if (!el) return null;
        const b = el.getBoundingClientRect();
        const pts = [[b.left + 4, b.top + b.height / 2], [b.left + b.width / 2, b.top + b.height / 2], [b.right - 4, b.top + b.height / 2]];
        return {
          rect: [Math.round(b.left), Math.round(b.top), Math.round(b.width), Math.round(b.height)],
          hits: pts.map(([x, y]) => {
            const h = document.elementFromPoint(x, y);
            return h ? (el.contains(h) ? 'SELF' : `${h.tagName.toLowerCase()}.${[...h.classList].join('.')}`) : null;
          })
        };
      };
      const rect = (s) => { const e = document.querySelector(s); if (!e) return null; const b = e.getBoundingClientRect(); return [Math.round(b.left), Math.round(b.top), Math.round(b.width), Math.round(b.height)]; };
      return {
        attribution: top(document.querySelector('.maplibregl-ctrl-attrib')),
        zoomIn: top(document.querySelector('.maplibregl-ctrl-zoom-in')),
        scale: top(document.querySelector('.maplibregl-ctrl-scale')),
        hint: rect('.swipe .hint'),
        src: rect('.swipe .src'),
        srcVisible: (() => { const e = document.querySelector('.swipe .src'); return e ? getComputedStyle(e).display !== 'none' : false; })(),
        legend: rect('.legend:not(.legend-m)') ?? rect('.legend')
      };
    });
    out[`${name}:${label}`] = r;
    await page.screenshot({ path: `${OUT}/${name}-${label}.png` });
  };
  await probe('ambas');
  await page.getByRole('button', { name: /^Solo 19/ }).click();
  await page.waitForTimeout(800);
  await probe('solo-antes');
  // modo por antigüedad para la escala frente a la leyenda
  await page.goto(`${base}/?year=1987&place=leioa`, { waitUntil: 'load' });
  await page.locator('.maplibregl-ctrl-scale').waitFor({ state: 'attached', timeout: 60000 });
  await page.waitForTimeout(1500);
  await probe('antiguedad');
}
const { writeFile } = await import("node:fs/promises");
await writeFile(`${OUT}/probe.json`, JSON.stringify(out, null, 1));
await browser.close();
server.close();
