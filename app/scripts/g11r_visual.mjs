/**
 * G11-R — Evidencia visual del modelo temporal corregido.
 *
 * Capturas para QA (§20 del encargo):
 *   photo-desktop.png     — Fotos aéreas 1440px con rail activado
 *   photo-mobile.png      — Fotos aéreas 390px
 *   photo-drag.png        — estado tras arrastrar el rail a otra campaña
 *   photo-focus.png       — foco de teclado visible en el scrubber de campañas
 *   photo-rm.png          — reduced-motion (sin autoplay, control manual)
 *   player-playing.png    — Evolución durante reproducción
 *   player-focus.png      — foco de teclado en el scrubber de Evolución
 *   player-rm.png         — Evolución con reduced-motion
 *
 * Uso: node scripts/g11r_visual.mjs   (cwd = app/ con build/ presente)
 */
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { createStaticServer } from './static-server.mjs';
import { installCiFixtures } from './fixtures.mjs';

const ROOT = resolve(process.cwd(), '..');
const BUILD = resolve(process.cwd(), 'build');
const OUT = join(ROOT, 'evidence/g11r');
const PORT = 4219;
const BASE = `http://localhost:${PORT}`;
const U = (q) => `${BASE}/?${q}`;

const server = await createStaticServer(BUILD, PORT);
await mkdir(OUT, { recursive: true });
const errors = [];

const browser = await chromium.launch();
async function newPage(ctxOpts = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, ...ctxOpts });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(String(e.message).slice(0, 300)));
  if (process.env.CI_STUBS === '1') await installCiFixtures(page);
  return { ctx, page };
}
const waitResult = (page) =>
  page.waitForSelector('.headline-block h1.lead', { timeout: 30000 });

/** Punto del rail que corresponde al % de la marca (no al centro de su etiqueta). */
async function railPoint(page, epochSel) {
  const frac = await page.locator(epochSel).evaluate((el) => parseFloat(el.style.left) / 100);
  const box = await page.locator('.photo .pscrub').boundingBox();
  return { x: Math.min(frac * box.width, box.width - 2), y: box.height / 2 };
}

/** Activa una campaña clicando el rail en la posición real de su marca. */
async function activate(page, epochSel, year) {
  const p = await railPoint(page, epochSel);
  await page.locator('.photo .pscrub').click({ position: p });
  await page.waitForFunction(
    (y) => document.querySelector('.photo .p-year')?.textContent?.trim() === y,
    String(year),
    { timeout: 15000 }
  );
}

// ── Fotos aéreas · escritorio ────────────────────────────────────────
{
  const { ctx, page } = await newPage();
  await page.goto(U('year=1952&place=bilbao&view=photo'));
  await waitResult(page);
  await page.waitForSelector('.photo .railwrap', { timeout: 15000 });
  await activate(page, '.photo .epoch.first', 1945);
  await page.waitForTimeout(1800); // sonda + imagen/estado
  await page.screenshot({ path: join(OUT, 'photo-desktop.png') });

  // drag: desde la marca activa hasta otra posición del rail
  const to = await railPoint(page, '.photo .epoch:nth-of-type(3)');
  const box = await page.locator('.photo .pscrub').boundingBox();
  await page.mouse.move(box.x + box.width * 0.15, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + Math.min(to.x, box.width - 2), box.y + box.height / 2, {
    steps: 8
  });
  await page.mouse.up();
  await page.waitForTimeout(900);
  await page.screenshot({ path: join(OUT, 'photo-drag.png') });

  // foco de teclado en el scrubber
  await page.locator('.photo .pscrub').focus();
  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(500);
  await page.screenshot({ path: join(OUT, 'photo-focus.png') });
  await ctx.close();
}

// ── Fotos aéreas · móvil ─────────────────────────────────────────────
{
  const { ctx, page } = await newPage({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true
  });
  await page.goto(U('year=1952&place=bilbao&view=photo'));
  await waitResult(page);
  await page.waitForSelector('.photo .railwrap', { timeout: 15000 });
  await activate(page, '.photo .epoch.first', 1945);
  await page.waitForTimeout(1500);
  await page.locator('.photo').scrollIntoViewIfNeeded();
  await page.screenshot({ path: join(OUT, 'photo-mobile.png') });
  await ctx.close();
}

// ── Fotos aéreas · reduced-motion ────────────────────────────────────
{
  const { ctx, page } = await newPage({ reducedMotion: 'reduce' });
  await page.goto(U('year=1952&place=bilbao&view=photo'));
  await waitResult(page);
  await page.waitForSelector('.photo .railwrap', { timeout: 15000 });
  await activate(page, '.photo .epoch.first', 1945);
  await page.waitForTimeout(1200);
  await page.screenshot({ path: join(OUT, 'photo-rm.png') });
  await ctx.close();
}

// ── Evolución · reproducción, foco y reduced-motion ─────────────────
{
  const { ctx, page } = await newPage();
  await page.goto(U('year=1952&place=bilbao&view=time'));
  await waitResult(page);
  await page.waitForSelector('.timeband .playbtn', { timeout: 15000 });
  await page.locator('.timeband .playbtn').click();
  await page.waitForTimeout(3200);
  await page.screenshot({ path: join(OUT, 'player-playing.png') });
  await page.locator('.timeband .playbtn').click(); // pausa

  await page.locator('.timeband .scrub').focus();
  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(400);
  await page.screenshot({ path: join(OUT, 'player-focus.png') });
  await ctx.close();
}
{
  const { ctx, page } = await newPage({ reducedMotion: 'reduce' });
  await page.goto(U('year=1952&place=bilbao&view=time'));
  await waitResult(page);
  await page.waitForSelector('.timeband', { timeout: 15000 });
  await page.screenshot({ path: join(OUT, 'player-rm.png') });
  await ctx.close();
}

await browser.close();
server.close();
console.log('capturas →', OUT);
console.log(errors.length ? `PAGEERRORS: ${JSON.stringify(errors)}` : 'sin pageerrors');
process.exit(errors.length ? 1 : 0);
