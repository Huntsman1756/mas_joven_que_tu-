/**
 * G1 — evidencia de integración en navegador.
 * Journey: INTRO → búsqueda → RESULT → zoom a edificios → ortofoto opt-in.
 * Comprueba contrato HTTP Range en PMTiles, estados de ortofoto y errores de consola.
 * Uso: node scripts/g1_browser_evidence.mjs
 */
import { chromium } from 'playwright';
import { writeFile, mkdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { createStaticServer } from './static-server.mjs';

const ROOT = resolve(process.cwd(), '..');
const BUILD = resolve(process.cwd(), 'build');
const OUT = join(ROOT, 'evidence/g1/06-frontend');
const PORT = 4175;

const server = await createStaticServer(BUILD, PORT);
await mkdir(OUT, { recursive: true });

async function pickBrowser() {
  for (const channel of ['chrome', 'msedge']) {
    try {
      return await chromium.launch({ channel, args: ['--disable-gpu'] });
    } catch {
      /* canal no disponible */
    }
  }
  return await chromium.launch({ args: ['--disable-gpu'] });
}

const results = { checks: {}, net: { pmtiles: [], ortho: [], data: [] }, consoleErrors: [] };

const browser = await pickBrowser();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();

page.on('response', (r) => {
  const url = r.url();
  const rec = { url: url.slice(0, 150), status: r.status() };
  if (url.includes('.pmtiles')) results.net.pmtiles.push(rec);
  else if (url.includes('ORTO_BFA_') || url.includes('WMS_ORTOARGAZKIAK')) results.net.ortho.push(rec);
  else if (url.includes('/data/')) results.net.data.push(rec);
});
page.on('console', (m) => {
  if (m.type() === 'error') results.consoleErrors.push(m.text().slice(0, 200));
});
page.on('pageerror', (e) => results.consoleErrors.push(String(e).slice(0, 200)));

// ── 1. INTRO ──────────────────────────────────────────────────────────────
await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'load' });
await page.waitForSelector('.hero h1', { timeout: 20000 });
results.checks.intro_h1 = await page.locator('.hero h1').textContent();
await page.screenshot({ path: join(OUT, '01-intro-desktop.png'), fullPage: false });

// ── 2. búsqueda + CTA ─────────────────────────────────────────────────────
await page.fill('#year-input', '1987');
await page.fill('#place-input', 'Leioa');
await page.waitForSelector('#place-listbox button', { timeout: 15000 });
await page.click('#place-listbox button >> nth=0');
await page.click('.cta');
await page.waitForSelector('.headline-block h1', { timeout: 20000 });
await page.waitForSelector('.mapband canvas', { timeout: 30000 });
await page.waitForTimeout(5000); // dejar cargar tiles
results.checks.headline = await page.locator('.headline-block h1').textContent();
results.checks.coverage = await page.locator('.coverage').textContent();
results.checks.lead = await page.locator('.lead2').textContent();
results.checks.url_after_cta = page.url();
results.checks.canvases = await page.locator('.mapband canvas').count();
await page.screenshot({ path: join(OUT, '02-result-desktop.png') });

// ── 3. deep link con zoom edificio ────────────────────────────────────────
await page.goto(`http://localhost:${PORT}/?year=1987&place=leioa&lat=43.326&lon=-2.988&z=14.6`, {
  waitUntil: 'load',
});
await page.waitForSelector('.mapband canvas', { timeout: 30000 });
await page.waitForTimeout(7000);
results.checks.deep_link_headline = await page.locator('.headline-block h1').textContent();
await page.screenshot({ path: join(OUT, '03-buildings-desktop.png') });

// clic en un edificio real: busca un píxel con feature de la capa b-*-fill
const pt = await page.evaluate(() => {
  const m = window.__mjtMap;
  if (!m) return null;
  const c = m.getCanvas();
  for (let x = 30; x < c.clientWidth; x += 25)
    for (let y = 30; y < c.clientHeight; y += 25) {
      const f = m
        .queryRenderedFeatures([x, y])
        .find((f) => f.source?.startsWith('b-') && f.layer.id.endsWith('-fill'));
      if (f) return { x, y };
    }
  return null;
});
results.checks.building_feature_found = pt !== null;
const box = await page.locator('.mapband').boundingBox();
if (box && pt) await page.mouse.click(box.x + pt.x, box.y + pt.y);
await page.waitForTimeout(800);
results.checks.building_card = await page.locator('.card .main').textContent().catch(() => null);

// ── 4. ortofoto opt-in ────────────────────────────────────────────────────
const btn = page.locator('.ortho .btn').first();
if (await btn.count()) {
  await btn.click();
  await page.waitForTimeout(6000);
  results.checks.ortho_state_text = await page
    .locator('.ortho-state')
    .textContent()
    .catch(() => null);
  await page.screenshot({ path: join(OUT, '04-ortho-desktop.png') });
}

// ── 5. móvil ──────────────────────────────────────────────────────────────
const ctxM = await browser.newContext({
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
});
const pm = await ctxM.newPage();
pm.on('pageerror', (e) => results.consoleErrors.push('MOBILE ' + String(e).slice(0, 200)));
await pm.goto(`http://localhost:${PORT}/?year=1987&place=leioa`, { waitUntil: 'load' });
await pm.waitForSelector('.headline-block h1', { timeout: 20000 });
await pm.waitForSelector('.mapband canvas', { timeout: 30000 });
await pm.waitForTimeout(4000);
results.checks.mobile_headline = await pm.locator('.headline-block h1').textContent();
await pm.screenshot({ path: join(OUT, '05-result-mobile.png') });
await ctxM.close();

// ── 6. contrato Range directo ─────────────────────────────────────────────
const r = await page.request.get(`http://localhost:${PORT}/data/cells.pmtiles`, {
  headers: { Range: 'bytes=0-99' },
});
results.checks.range = {
  status: r.status(),
  contentRange: r.headers()['content-range'] ?? null,
  acceptRanges: r.headers()['accept-ranges'] ?? null,
};

await browser.close();
server.close();

await writeFile(join(OUT, 'browser-evidence.json'), JSON.stringify(results, null, 2));
console.log(JSON.stringify(results, null, 2));
