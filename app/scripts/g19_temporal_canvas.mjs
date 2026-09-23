/**
 * G19 — Capturas de adjudicación del lienzo temporal (map-first).
 *
 * Las 6 pantallas pedidas para validar la dirección estructural antes
 * de cualquier deploy:
 *   01-evolution-1440-idle.png    — Evolución 1440, año inicial
 *   02-evolution-1440-playing.png — Evolución 1440, reproduciendo
 *   03-photo-1440-1956.png        — Fotos aéreas 1440, campaña 1956
 *   04-photo-1440-1989.png        — Fotos aéreas 1440, campaña 1989
 *   05-evolution-390.png          — Evolución 390px
 *   06-photo-390.png              — Fotos aéreas 390px
 *
 * Uso: node scripts/g19_temporal_canvas.mjs   (cwd = app/ con build/ presente)
 */
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { createStaticServer } from './static-server.mjs';

const ROOT = resolve(process.cwd(), '..');
const BUILD = resolve(process.cwd(), 'build');
const OUT = join(ROOT, 'evidence/g19');
const PORT = 4223;
const BASE = `http://localhost:${PORT}`;
const U = (q) => `${BASE}/?${q}`;

const server = await createStaticServer(BUILD, PORT);
await mkdir(OUT, { recursive: true });
const errors = [];

const browser = await chromium.launch();
async function newPage(ctxOpts = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, ...ctxOpts });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(String(e.message).slice(0, 200)));
  return { ctx, page };
}
// G19: en modos de visor no hay .headline-block — el resultado resuelto
// se detecta por el estado, no por el panel editorial.
const waitResult = (page) =>
  page.waitForFunction(() => window.__mjtApp?.headline !== null, { timeout: 30000 });

/** Activa una campaña clicando el rail en la posición real de su marca. */
async function activate(page, year) {
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

// ── 1–2. Evolución 1440: idle + reproduciendo ───────────────────────
{
  const { ctx, page } = await newPage();
  await page.goto(U('year=1952&place=bilbao&view=time'));
  await waitResult(page);
  await page.waitForSelector('.timeband .tc-play', { timeout: 60000 });
  await page.waitForTimeout(800);
  await page.screenshot({ path: join(OUT, '01-evolution-1440-idle.png') });

  await page.locator('.timeband .tc-play').click();
  await page.waitForTimeout(3200);
  await page.screenshot({ path: join(OUT, '02-evolution-1440-playing.png') });
  await ctx.close();
}

// ── 3–4. Fotos aéreas 1440: campañas 1956 + 1989 ────────────────────
{
  const { ctx, page } = await newPage();
  await page.goto(U('year=1952&place=bilbao&view=photo'));
  await waitResult(page);
  await page.waitForSelector('.photo .tc-rail', { timeout: 60000 });
  await activate(page, 1956);
  await page.screenshot({ path: join(OUT, '03-photo-1440-1956.png') });
  await activate(page, 1989);
  await page.screenshot({ path: join(OUT, '04-photo-1440-1989.png') });
  await ctx.close();
}

// ── 5. Evolución 390 ─────────────────────────────────────────────────
{
  const { ctx, page } = await newPage({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true
  });
  await page.goto(U('year=1952&place=bilbao&view=time'));
  await waitResult(page);
  await page.waitForSelector('.timeband .tc-play', { timeout: 60000 });
  await page.waitForTimeout(800);
  await page.screenshot({ path: join(OUT, '05-evolution-390.png') });
  await ctx.close();
}

// ── 6. Fotos aéreas 390 ──────────────────────────────────────────────
{
  const { ctx, page } = await newPage({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true
  });
  await page.goto(U('year=1952&place=bilbao&view=photo'));
  await waitResult(page);
  await page.waitForSelector('.photo .tc-rail', { timeout: 60000 });
  await activate(page, 1956);
  await page.screenshot({ path: join(OUT, '06-photo-390.png') });
  await ctx.close();
}

await browser.close();
server.close();
console.log('capturas →', OUT);
console.log(errors.length ? `PAGEERRORS: ${JSON.stringify(errors)}` : 'sin pageerrors');
process.exit(errors.length ? 1 : 0);
