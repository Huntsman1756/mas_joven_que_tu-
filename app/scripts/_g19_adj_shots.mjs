/**
 * G19-adj — recaptura de adjudicación: solo las pantallas afectadas por
 * la mini-adjudicación post-revisión (ancla birth eliminada del rail de
 * Fotos; chip ctx duplicado oculto en desktop):
 *   01-evolution-1440-idle.png — general (header tocado)
 *   03-photo-1440-1956.png     — rectángulo nodata + rail sin 1956 activo
 *   04-photo-1440-1989.png     — regresión: 1956 ya NO va en acento
 *
 * Uso: node scripts/_g19_adj_shots.mjs   (cwd = app/ con build/ presente)
 */
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { createStaticServer } from './static-server.mjs';

const ROOT = resolve(process.cwd(), '..');
const BUILD = resolve(process.cwd(), 'build');
const OUT = join(ROOT, 'evidence/g19');
const PORT = 4231;
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

await page.goto(U('year=1952&place=bilbao&view=time'));
await waitResult();
await page.waitForSelector('.timeband .tc-play', { timeout: 60000 });
await page.waitForTimeout(800);
await page.screenshot({ path: join(OUT, '01-evolution-1440-idle.png') });

await page.goto(U('year=1952&place=bilbao&view=photo'));
await waitResult();
await page.waitForSelector('.photo .tc-rail', { timeout: 60000 });
await activate(1956);
await page.screenshot({ path: join(OUT, '03-photo-1440-1956.png') });
await activate(1989);
await page.screenshot({ path: join(OUT, '04-photo-1440-1989.png') });

// regresión: ninguna marca .epoch lleva ya la clase birth
const birthCount = await page.locator('.photo .epoch.birth').count();
// y el chip ctx duplicado no se pinta en desktop
const ctxVisible = await page.locator('.topbar .ctx').isVisible();
console.log(`epoch.birth=${birthCount} (esperado 0) | topbar.ctx visible=${ctxVisible} (esperado false)`);

await browser.close();
server.close();
console.log('capturas →', OUT);
console.log(errors.length ? `PAGEERRORS: ${JSON.stringify(errors)}` : 'sin pageerrors');
process.exit(errors.length || birthCount !== 0 || ctxVisible ? 1 : 0);
