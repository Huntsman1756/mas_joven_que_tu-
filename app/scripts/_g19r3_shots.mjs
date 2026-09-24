/**
 * G19-R3 — capturas de adjudicación + contrato de geometría compartida.
 *
 *   01-edificios-1440.png        — modo map (referencia de la shell)
 *   02-evolution-1440.png        — Evolución idle
 *   03-photo-1440-1956.png       — Fotos aéreas, campaña 1956
 *   04-photo-1440-1989.png       — Fotos aéreas, campaña 1989
 *   05-hist-1440.png             — Mapa 1923–25
 *   06-swipe-1440.png            — Antes / ahora
 *   07-evolution-390.png         — Evolución 390px
 *   08-photo-390.png             — Fotos aéreas 390px
 *   player-evolution-1974.png    — recorte del player (continuo)
 *   player-photo-1989.png        — recorte del player (discreto)
 *
 * geometry.json:
 *   - canvas: bounding box de .maplibregl-canvas en los 5 modos a
 *     1440×900 (contrato: ±2 px entre modos);
 *   - player: bounding boxes de la barra y cada control en Evolución y
 *     Fotos (contrato: el MISMO componente, mismas cajas);
 *   - intro: alto de la franja .mapintro por modo.
 *
 * Uso: node scripts/_g19r3_shots.mjs   (cwd = app/ con build/ presente)
 */
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { createStaticServer } from './static-server.mjs';

const ROOT = resolve(process.cwd(), '..');
const BUILD = resolve(process.cwd(), 'build');
const OUT = join(ROOT, 'evidence/g19r3');
const PORT = 4234;
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

async function canvasBox() {
  return page.evaluate(() => {
    const c = document.querySelector('.mapcell .maplibregl-canvas');
    if (!c) return null;
    const r = c.getBoundingClientRect();
    return {
      x: Math.round(r.x),
      y: Math.round(r.y),
      w: Math.round(r.width),
      h: Math.round(r.height)
    };
  });
}

/** Cajas del player: la barra y cada control por su data-action/clase. */
async function playerBoxes(scope) {
  return page.evaluate((sc) => {
    const R2 = (el) => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return {
        x: +r.x.toFixed(1),
        y: +r.y.toFixed(1),
        w: +r.width.toFixed(1),
        h: +r.height.toFixed(1)
      };
    };
    const q = (s) => document.querySelector(`${sc} ${s}`);
    return {
      bar: R2(q('.tc-bar')),
      play: R2(q('[data-action="play"]')),
      prev: R2(q('[data-action="prev"]')),
      year: R2(q('.tc-year')),
      next: R2(q('[data-action="next"]')),
      rail: R2(q('.tc-rail')),
      thumb: R2(q('.tc-thumb')),
      info: R2(q('[data-action="info"]'))
    };
  }, scope);
}

const introH = () =>
  page.evaluate(() => document.querySelector('.mapintro')?.getBoundingClientRect().height ?? null);

const geo = { canvas: {}, intro: {}, player: {} };

// ── 1. Edificios (referencia) ───────────────────────────────────────
await page.goto(U('year=1952&place=bilbao'));
await waitResult();
await page.waitForSelector('.maplibregl-canvas', { timeout: 60000 });
await page.waitForTimeout(1200);
geo.canvas.map = await canvasBox();
geo.intro.map = await introH();
await page.screenshot({ path: join(OUT, '01-edificios-1440.png') });

// ── 2. Evolución 1440 (cabezal en 1974 para el diff del player) ─────
await page.locator('.viewswitch [data-mode="time"]').click();
await page.waitForSelector('.timeband .tc-play', { timeout: 15000 });
// fija el cabezal con el slider (valor + input + change)
await page.evaluate(() => {
  const s = document.querySelector('.timeband .tc-scrub');
  s.value = '1974';
  s.dispatchEvent(new Event('input', { bubbles: true }));
  s.dispatchEvent(new Event('change', { bubbles: true }));
});
await page.waitForFunction(() => window.__mjtApp?.playYear === 1974, null, { timeout: 10000 });
await page.waitForTimeout(800);
geo.canvas.time = await canvasBox();
geo.intro.time = await introH();
geo.player.time = await playerBoxes('.timeband');
await page.screenshot({ path: join(OUT, '02-evolution-1440.png') });
{
  const r = geo.player.time.bar;
  await page.screenshot({
    path: join(OUT, 'player-evolution-1974.png'),
    clip: { x: r.x - 6, y: r.y - 6, width: r.w + 12, height: r.h + 12 }
  });
}

// ── 3–4. Fotos aéreas 1440 ──────────────────────────────────────────
await page.locator('.viewswitch [data-mode="photo"]').click();
await page.waitForSelector('.photo .tc-rail', { timeout: 15000 });
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
await activate(1956);
geo.canvas.photo = await canvasBox();
geo.intro.photo = await introH();
await page.screenshot({ path: join(OUT, '03-photo-1440-1956.png') });
await activate(1989);
geo.player.photo = await playerBoxes('.photo');
await page.screenshot({ path: join(OUT, '04-photo-1440-1989.png') });
{
  const r = geo.player.photo.bar;
  await page.screenshot({
    path: join(OUT, 'player-photo-1989.png'),
    clip: { x: r.x - 6, y: r.y - 6, width: r.w + 12, height: r.h + 12 }
  });
}

// ── 5. Mapa 1923–25 1440 ────────────────────────────────────────────
await page.locator('.viewswitch [data-mode="hist"]').click();
await page.waitForSelector('.histmap', { timeout: 15000 });
await page.waitForTimeout(2500);
geo.canvas.hist = await canvasBox();
geo.intro.hist = await introH();
await page.screenshot({ path: join(OUT, '05-hist-1440.png') });

// ── 6. Antes / ahora 1440 ───────────────────────────────────────────
await page.locator('.viewswitch [data-mode="swipe"]').click();
await page.waitForSelector('.swipectl, .swipe', { timeout: 15000 });
await page.waitForTimeout(2500);
geo.canvas.swipe = await canvasBox();
geo.intro.swipe = await introH();
await page.screenshot({ path: join(OUT, '06-swipe-1440.png') });

// ── 7–8. Móvil 390 ──────────────────────────────────────────────────
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
await mp.screenshot({ path: join(OUT, '07-evolution-390.png') });
await mp.goto(U('year=1952&place=bilbao&view=photo&ortho=1956'));
await mp.waitForFunction(() => window.__mjtApp?.headline !== null, { timeout: 30000 });
await mp.waitForSelector('.photo .tc-rail', { timeout: 60000 });
await mp
  .waitForFunction(() => window.__mjtApp?.orthoState && window.__mjtApp.orthoState !== 'UNKNOWN', {
    timeout: 30000
  })
  .catch(() => null);
await mp.waitForTimeout(2000);
await mp.screenshot({ path: join(OUT, '08-photo-390.png') });
await mctx.close();

// ── Contratos ───────────────────────────────────────────────────────
const close = (a, b, tol = 2) =>
  a && b && ['x', 'y', 'w', 'h'].every((k) => Math.abs(a[k] - b[k]) <= tol);
const modes = ['map', 'time', 'photo', 'hist', 'swipe'];
const canvasEq = {};
for (const m of modes) canvasEq[m] = close(geo.canvas[m], geo.canvas.map);
geo.canvasEqual = canvasEq;
const pc = {};
for (const k of ['bar', 'play', 'prev', 'year', 'next', 'rail', 'info'])
  pc[k] = close(geo.player.time?.[k], geo.player.photo?.[k]);
geo.playerEqual = pc;

await writeFile(join(OUT, 'geometry.json'), JSON.stringify(geo, null, 2));
console.log('canvas:', JSON.stringify(geo.canvas));
console.log('intro:', JSON.stringify(geo.intro));
console.log('playerEqual:', JSON.stringify(pc));
console.log('capturas →', OUT);
console.log(errors.length ? `PAGEERRORS: ${JSON.stringify(errors)}` : 'sin pageerrors');
await browser.close();
server.close();
process.exit(errors.length ? 1 : 0);
