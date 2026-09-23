/**
 * G18-R — Capturas de adjudicación visual (sin asserts, sin cambios).
 *
 * Las 8 pantallas pedidas para revisión antes del deploy:
 *   01-evolution-desktop-initial.png  — Evolución 1440, año inicial
 *   02-evolution-desktop-playing.png  — Evolución 1440, reproduciendo
 *   03-evolution-mobile-390.png       — Evolución 390px
 *   04-photo-desktop-1956.png         — Fotos 1440, campaña 1956
 *   05-photo-desktop-1989.png         — Fotos 1440, campaña intermedia
 *   06-photo-mobile-390.png           — Fotos 390px
 *   07-focus.png                      — foco de teclado (rail + scrubber)
 *   08-reduced-motion.png             — prefers-reduced-motion
 *
 * Uso: node scripts/g18r_adjudication.mjs   (cwd = app/ con build/ presente)
 */
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { createStaticServer } from './static-server.mjs';

const ROOT = resolve(process.cwd(), '..');
const BUILD = resolve(process.cwd(), 'build');
const OUT = join(ROOT, 'evidence/g18r-adjudicacion');
const PORT = 4221;
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
const waitResult = (page) =>
  // G19: en modos visor no hay headline editorial — el estado listo es
  // __mjtApp.headline poblado
  page.waitForFunction(() => window.__mjtApp?.headline != null, null, { timeout: 30000 });

/** Activa una campaña clicando el rail en la posición real de su marca. */
async function activate(page, year) {
  const frac = await page
    .locator(`.photo .epoch[data-year="${year}"]`)
    .evaluate((el) => parseFloat(el.style.left) / 100);
  const box = await page.locator('.photo .tc-scrub').boundingBox();
  await page
    .locator('.photo .tc-scrub')
    .click({ position: { x: Math.min(frac * box.width, box.width - 2), y: box.height / 2 } });
  // G19: campañas adyacentes (1989/1990) están a ~9 px en el rail de
  // escritorio — el click puede caer en la vecina; converge con flechas
  // (cada una avanza a la campaña siguiente/anterior por el snap)
  for (let i = 0; i < 6; i++) {
    const cur = await page.evaluate(() =>
      Number(document.querySelector('.photo .tc-year')?.textContent?.trim())
    );
    if (cur === year) break;
    await page.locator('.photo .tc-scrub').press(cur < year ? 'ArrowRight' : 'ArrowLeft');
    await page.waitForTimeout(150);
  }
  await page.waitForFunction(
    (y) => document.querySelector('.photo .tc-year')?.textContent?.trim() === String(y),
    year,
    { timeout: 15000 }
  );
  // sonda resuelta (imagen o estado honesto) + margen para teselas
  await page.waitForFunction(
    () => window.__mjtApp?.orthoState && window.__mjtApp.orthoState !== 'UNKNOWN',
    { timeout: 30000 }
  );
  await page.waitForTimeout(2000);
}

// ── 1–2. Evolución escritorio: inicial + reproduciendo ──────────────
{
  const { ctx, page } = await newPage();
  await page.goto(U('year=1952&place=bilbao&view=time'));
  await waitResult(page);
  await page.waitForSelector('.timeband .tc-play', { timeout: 15000 });
  await page.waitForTimeout(600);
  await page.screenshot({ path: join(OUT, '01-evolution-desktop-initial.png') });

  await page.locator('.timeband .tc-play').click();
  await page.waitForTimeout(3200);
  await page.screenshot({ path: join(OUT, '02-evolution-desktop-playing.png') });
  await ctx.close();
}

// ── 3. Evolución móvil 390 ───────────────────────────────────────────
{
  const { ctx, page } = await newPage({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true
  });
  await page.goto(U('year=1952&place=bilbao&view=time'));
  await waitResult(page);
  await page.waitForSelector('.timeband .tc-play', { timeout: 15000 });
  await page.locator('.timeband').scrollIntoViewIfNeeded();
  await page.waitForTimeout(400);
  await page.screenshot({ path: join(OUT, '03-evolution-mobile-390.png') });
  await ctx.close();
}

// ── 4–5. Fotos aéreas escritorio: 1956 + campaña intermedia ─────────
{
  const { ctx, page } = await newPage();
  await page.goto(U('year=1952&place=bilbao&view=photo'));
  await waitResult(page);
  await page.waitForSelector('.photo .tc-rail', { timeout: 15000 });
  await activate(page, 1956);
  await page.screenshot({ path: join(OUT, '04-photo-desktop-1956.png') });
  await activate(page, 1989);
  await page.screenshot({ path: join(OUT, '05-photo-desktop-1989.png') });
  await ctx.close();
}

// ── 6. Fotos aéreas móvil 390 ────────────────────────────────────────
{
  const { ctx, page } = await newPage({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true
  });
  await page.goto(U('year=1952&place=bilbao&view=photo'));
  await waitResult(page);
  await page.waitForSelector('.photo .tc-rail', { timeout: 15000 });
  await activate(page, 1956);
  await page.locator('.photo').scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  await page.screenshot({ path: join(OUT, '06-photo-mobile-390.png') });
  await ctx.close();
}

// ── 7. Foco de teclado (rail de campañas + scrubber de Evolución) ────
{
  const { ctx, page } = await newPage();
  await page.goto(U('year=1952&place=bilbao&view=photo'));
  await waitResult(page);
  await page.waitForSelector('.photo .tc-rail', { timeout: 15000 });
  await activate(page, 1956);
  await page.locator('.photo .tc-scrub').focus();
  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(500);
  await page.screenshot({ path: join(OUT, '07a-focus-photo-rail.png') });
  await ctx.close();
}
{
  const { ctx, page } = await newPage();
  await page.goto(U('year=1952&place=bilbao&view=time'));
  await waitResult(page);
  await page.waitForSelector('.timeband .tc-scrub', { timeout: 15000 });
  await page.locator('.timeband .tc-scrub').focus();
  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(400);
  await page.screenshot({ path: join(OUT, '07b-focus-evolution-scrub.png') });
  await ctx.close();
}

// ── 8. prefers-reduced-motion ────────────────────────────────────────
{
  const { ctx, page } = await newPage({ reducedMotion: 'reduce' });
  await page.goto(U('year=1952&place=bilbao&view=time'));
  await waitResult(page);
  await page.waitForSelector('.timeband', { timeout: 15000 });
  await page.waitForTimeout(400);
  await page.screenshot({ path: join(OUT, '08a-rm-evolution.png') });
  await ctx.close();
}
{
  const { ctx, page } = await newPage({ reducedMotion: 'reduce' });
  await page.goto(U('year=1952&place=bilbao&view=photo'));
  await waitResult(page);
  await page.waitForSelector('.photo .tc-rail', { timeout: 15000 });
  await activate(page, 1956);
  await page.screenshot({ path: join(OUT, '08b-rm-photo.png') });
  await ctx.close();
}

await browser.close();
server.close();
console.log('capturas →', OUT);
console.log(errors.length ? `PAGEERRORS: ${JSON.stringify(errors)}` : 'sin pageerrors');
process.exit(errors.length ? 1 : 0);
