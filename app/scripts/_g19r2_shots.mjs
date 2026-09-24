/**
 * G19-R2 — capturas de adjudicación + geometría compartida del visor.
 *
 *   01-edificios-1440.png       — modo map (referencia de la shell)
 *   02-evolution-1440.png       — Evolución idle
 *   03-photo-1440-1956.png      — Fotos aéreas, campaña 1956
 *   04-photo-1440-1989.png      — Fotos aéreas, campaña 1989
 *   05-evolution-390.png        — Evolución 390px
 *   06-photo-390.png            — Fotos aéreas 390px
 *
 * Además mide el bounding box del lienzo (.maplibregl-canvas) en los
 * cinco modos a 1440×900 — el contrato R2 es que la geometría del
 * visor no salte entre modos.
 *
 * Uso: node scripts/_g19r2_shots.mjs   (cwd = app/ con build/ presente)
 */
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { createStaticServer } from './static-server.mjs';

const ROOT = resolve(process.cwd(), '..');
const BUILD = resolve(process.cwd(), 'build');
const OUT = join(ROOT, 'evidence/g19r2');
const PORT = 4233;
const BASE = `http://localhost:${PORT}`;
const U = (q) => `${BASE}/?${q}`;

const server = await createStaticServer(BUILD, PORT);
await mkdir(OUT, { recursive: true });
const errors = [];

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
page.on('pageerror', (e) => errors.push(String(e.message).slice(0, 200)));
const waitResult = () =>
  page.waitForFunction(() => window.__mjtApp?.headline !== null, { timeout: 30000 });

async function activate(year) {
  const frac = await page
    .locator(`.photo .epoch[data-year="${year}"]`)
    .evaluate((el) => parseFloat(el.style.left) / 100);
  const box = await page.locator('.photo .tc-scrub').boundingBox();
  await page
    .locator('.photo .tc-scrub')
    .click({ position: { x: Math.min(frac * box.width, box.width - 2), y: box.height / 2 } });
  await page.waitForFunction(
    (y) => document.querySelector('.photo .tc-year')?.textContent?.trim() === String(y),
    year,
    { timeout: 15000 }
  );
  await page.waitForFunction(
    () => window.__mjtApp?.orthoState && window.__mjtApp.orthoState !== 'UNKNOWN',
    { timeout: 30000 }
  );
  await page.waitForTimeout(2000);
}

async function canvasBox() {
  return page.evaluate(() => {
    const c = document.querySelector('.maplibregl-canvas');
    if (!c) return null;
    const r = c.getBoundingClientRect();
    return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) };
  });
}
async function chromeBox() {
  return page.evaluate(() => {
    const el = document.querySelector('.tcpanel');
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { y: Math.round(r.y), h: Math.round(r.height) };
  });
}

const geo = {};

// ── 1. Edificios (referencia) ───────────────────────────────────────
await page.goto(U('year=1952&place=bilbao'));
await waitResult();
await page.waitForSelector('.maplibregl-canvas', { timeout: 60000 });
await page.waitForTimeout(1200);
geo.map = await canvasBox();
await page.screenshot({ path: join(OUT, '01-edificios-1440.png') });

// ── 2. Evolución 1440 ───────────────────────────────────────────────
await page.locator('.viewswitch [data-mode="time"]').click();
await page.waitForSelector('.timeband .tc-play', { timeout: 15000 });
await page.waitForTimeout(800);
geo.time = { canvas: await canvasBox(), chrome: await chromeBox() };
await page.screenshot({ path: join(OUT, '02-evolution-1440.png') });

// ── 3–4. Fotos aéreas 1440 ──────────────────────────────────────────
await page.locator('.viewswitch [data-mode="photo"]').click();
await page.waitForSelector('.photo .tc-rail', { timeout: 15000 });
await activate(1956);
geo.photo = { canvas: await canvasBox(), chrome: await chromeBox() };
await page.screenshot({ path: join(OUT, '03-photo-1440-1956.png') });
await activate(1989);
await page.screenshot({ path: join(OUT, '04-photo-1440-1989.png') });

// ── 5–6. Móvil 390 ──────────────────────────────────────────────────
await ctx.close();
const mctx = await browser.newContext({
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true
});
const mp = await mctx.newPage();
mp.on('pageerror', (e) => errors.push(String(e.message).slice(0, 200)));
await mp.goto(U('year=1952&place=bilbao&view=time'));
await mp.waitForFunction(() => window.__mjtApp?.headline !== null, { timeout: 30000 });
await mp.waitForSelector('.timeband .tc-play', { timeout: 60000 });
await mp.waitForTimeout(800);
await mp.screenshot({ path: join(OUT, '05-evolution-390.png') });
await mp.goto(U('year=1952&place=bilbao&view=photo'));
await mp.waitForFunction(() => window.__mjtApp?.headline !== null, { timeout: 30000 });
await mp.waitForSelector('.photo .tc-rail', { timeout: 60000 });
{
  const frac = await mp
    .locator('.photo .epoch[data-year="1956"]')
    .evaluate((el) => parseFloat(el.style.left) / 100);
  const box = await mp.locator('.photo .tc-scrub').boundingBox();
  await mp
    .locator('.photo .tc-scrub')
    .click({ position: { x: Math.min(frac * box.width, box.width - 2), y: box.height / 2 } });
  await mp.waitForFunction(
    () => window.__mjtApp?.orthoState && window.__mjtApp.orthoState !== 'UNKNOWN',
    { timeout: 30000 }
  );
  await mp.waitForTimeout(2000);
}
await mp.screenshot({ path: join(OUT, '06-photo-390.png') });
await mctx.close();

await writeFile(join(OUT, 'geometry.json'), JSON.stringify(geo, null, 2));
console.log('geometría:', JSON.stringify(geo));
await browser.close();
server.close();
console.log('capturas →', OUT);
console.log(errors.length ? `PAGEERRORS: ${JSON.stringify(errors)}` : 'sin pageerrors');
process.exit(errors.length ? 1 : 0);
