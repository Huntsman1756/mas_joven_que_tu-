/**
 * COPY-AUDIT — capturas before/after de las superficies afectadas por la
 * revisión editorial. No es una suite de regresión: solo evidencia visual.
 *
 * Uso (cwd = app/ con build/ presente):
 *   $env:CI_STUBS='1'; $env:SHOT_LABEL='after'; node scripts/copy_audit_shots.mjs
 *
 * Superficies: resultado (desktop + móvil), leyenda Por antigüedad,
 * Evolución (play), Fotos aéreas, Antes / ahora y leyenda móvil expandida.
 */
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { createStaticServer } from './static-server.mjs';
import { installCiFixtures } from './fixtures.mjs';

const ROOT = resolve(process.cwd(), '..');
const BUILD = resolve(process.cwd(), 'build');
const LABEL = process.env.SHOT_LABEL ?? 'after';
const OUT = join(ROOT, 'evidence/copy-audit', LABEL);
const PORT = 4221;
const BASE = `http://localhost:${PORT}`;
const U = (q) => `${BASE}/?${q}`;
const Q = 'year=1987&place=leioa&lat=43.326&lon=-2.988&z=11.5';

const server = await createStaticServer(BUILD, PORT);
await mkdir(OUT, { recursive: true });
const errors = [];
const browser = await chromium.launch();

async function newPage(viewport) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(String(e.message).slice(0, 300)));
  if (process.env.CI_STUBS === '1') await installCiFixtures(page);
  return { ctx, page };
}

const waitResult = (page) =>
  page.waitForFunction(() => window.__mjtApp?.headline != null, null, { timeout: 30000 });
const settle = (page, ms = 900) => page.waitForTimeout(ms);

async function shot(page, name) {
  await page.screenshot({ path: join(OUT, name), fullPage: false });
}

// ── Escritorio 1440 ──────────────────────────────────────────────────
{
  const { ctx, page } = await newPage({ width: 1440, height: 900 });

  // 01 · Resultado
  await page.goto(U(Q));
  await waitResult(page);
  await settle(page);
  await shot(page, '01-resultado.png');

  // 02 · Leyenda Por antigüedad (nivel zona)
  await page.goto(U(`${Q}&view=map`));
  await waitResult(page);
  await page.waitForSelector('.legend .legend-title', { timeout: 20000 });
  await settle(page);
  await shot(page, '02-leyenda-antiguedad.png');

  // 03 · Evolución (play)
  await page.goto(U(`${Q}&view=time&play=1965`));
  await waitResult(page);
  await page.waitForSelector('.legend .legend-title', { timeout: 20000 });
  await settle(page);
  await shot(page, '03-evolucion.png');

  // 04 · Fotos aéreas
  await page.goto(U(`${Q}&view=photo`));
  await waitResult(page);
  await page.waitForSelector('.photo', { timeout: 20000 }).catch(() => null);
  await settle(page, 1400);
  await shot(page, '04-fotos.png');

  // 05 · Antes / ahora
  await page.goto(U(`${Q}&view=swipe`));
  await waitResult(page);
  await page.waitForSelector('.swipe', { timeout: 20000 }).catch(() => null);
  await settle(page, 1400);
  await shot(page, '05-antes-ahora.png');

  await ctx.close();
}

// ── Móvil 390 ────────────────────────────────────────────────────────
{
  const { ctx, page } = await newPage({ width: 390, height: 844 });

  // 06 · Resultado
  await page.goto(U(Q));
  await waitResult(page);
  await settle(page);
  await shot(page, '06-resultado-movil.png');

  // 07 · Leyenda móvil expandida
  await page.goto(U(`${Q}&view=map`));
  await waitResult(page);
  await page.evaluate(() => document.getElementById('scene')?.scrollIntoView());
  await page
    .locator('[data-action="legend-expand"]')
    .click({ timeout: 15000 })
    .catch(() => null);
  await settle(page, 1200);
  await shot(page, '07-leyenda-movil.png');

  await ctx.close();
}

await browser.close();
server.close();
console.log(`capturas ${LABEL} →`, OUT);
console.log(errors.length ? `PAGEERRORS: ${JSON.stringify(errors)}` : 'sin pageerrors');
process.exit(0);
