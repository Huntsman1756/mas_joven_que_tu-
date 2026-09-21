/**
 * G1-R — A9/U6: medición de objetivos táctiles en 390×844 (mismo método que el
 * adjudicador: todo button/a[href]/input/[role=option] visible ≥44×44 px).
 * Uso: node scripts/g1r_touch_targets.mjs
 */
import { chromium } from 'playwright';
import { writeFile, mkdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { createStaticServer } from './static-server.mjs';

const ROOT = resolve(process.cwd(), '..');
const BUILD = resolve(process.cwd(), 'build');
const OUT = join(ROOT, 'evidence/g1-remediation/a11y');
const PORT = 4183;
const BASE = `http://localhost:${PORT}`;

const server = await createStaticServer(BUILD, PORT);
await mkdir(OUT, { recursive: true });

let browser;
for (const channel of ['chrome', 'msedge']) {
  try {
    browser = await chromium.launch({ channel, args: ['--disable-gpu'] });
    break;
  } catch {
    /* next */
  }
}
browser ??= await chromium.launch({ args: ['--disable-gpu'] });

const ctx = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 3,
  isMobile: true,
  hasTouch: true
});
const page = await ctx.newPage();

const measure = () =>
  page.evaluate(() => {
    const bad = [];
    for (const el of document.querySelectorAll('button, a[href], input, [role=option]')) {
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      if (r.width < 44 || r.height < 44)
        bad.push({
          text: (el.textContent || el.getAttribute('aria-label') || el.id || '')
            .trim()
            .slice(0, 40),
          cls: el.className?.toString().slice(0, 40),
          w: Math.round(r.width),
          h: Math.round(r.height)
        });
    }
    return {
      under44: bad,
      checked: document.querySelectorAll('button, a[href], input, [role=option]').length
    };
  });

const results = {};

// intro móvil
await page.goto(`${BASE}/`, { waitUntil: 'load' });
await page.waitForSelector('.hero h1', { timeout: 20000 });
results.intro = await measure();

// result móvil + detalle de edificio (mismo recorrido que el adjudicador)
await page.goto(`${BASE}/?year=1987&place=leioa`, { waitUntil: 'load' });
await page.waitForSelector('.mapband canvas', { timeout: 30000 });
await page
  .waitForFunction(() => window.__mjtMap?.areTilesLoaded?.(), null, { timeout: 30000 })
  .catch(() => null);
await page.waitForTimeout(1500);
results.result = await measure();

await page.evaluate(() => window.__mjtMap?.jumpTo({ zoom: 15, center: [-2.986, 43.326] }));
await page.waitForTimeout(2500);
const pt = await page.evaluate(() => {
  const m = window.__mjtMap;
  const c = m.getCanvas();
  for (let x = 20; x < c.clientWidth; x += 15)
    for (let y = 20; y < c.clientHeight; y += 15) {
      const f = m
        .queryRenderedFeatures([x, y])
        .find((f) => f.source?.startsWith('b-') && f.layer.id.endsWith('-fill'));
      if (f) return { x, y };
    }
  return null;
});
if (pt) {
  const bb = await page.locator('.mapband').boundingBox();
  await page.touchscreen.tap(bb.x + pt.x, bb.y + pt.y);
  await page.waitForTimeout(800);
}
results.detail = await measure();
await page.screenshot({ path: join(OUT, 'mobile-detail.png'), fullPage: true });

// formulario de cambio desplegado (controles compactos)
await page.tap('.topbar .change');
await page.waitForSelector('.changeform', { timeout: 8000 });
results.changeform = await measure();

// ortofoto desplegada
const orthoBtn = page.locator('.ortho .btn', { hasText: 'Ver la foto' });
if (await orthoBtn.count()) {
  await orthoBtn.tap();
  await page.waitForTimeout(2500);
  results.ortho = await measure();
}

await writeFile(join(OUT, 'touch-targets.json'), JSON.stringify(results, null, 2));
console.log(JSON.stringify(results, null, 2));
await browser.close();
server.close();
