/**
 * PERF4-R2 §10 — equivalencia de producto del planeamiento municipal.
 *
 * Para cada municipio: navega, hace scroll al centinela (dispara la carga
 * below-fold) y compara el texto del `.plan` con el esperado derivado de
 * planning-muni.json usando el mismo formato del frontend (es-ES, ha).
 * Casos: Bilbao, Leioa, Amoroto (rural), campo null (interceptado),
 * municipio sin fila (interceptado → sección ausente).
 */
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createStaticServer } from './static-server.mjs';

const BUILD = resolve(process.cwd(), 'build');
const PORT = 4186;
const table = JSON.parse(readFileSync('static/data/planning-muni.json', 'utf8'));

const num = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 0 });
const pct = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 1 });
const fmt = (n) => num.format(n);
const fmtHa = (m2) => pct.format(m2 / 10_000);

const server = await createStaticServer(BUILD, PORT);
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
const results = [];

async function check(slug, cod, mutate, expectAbsent = false) {
  const page = await ctx.newPage();
  if (mutate) {
    await page.route('**/data/planning-muni.json', async (route) => {
      const j = JSON.parse(JSON.stringify(table));
      mutate(j);
      await route.fulfill({ json: j });
    });
  }
  await page.goto(`http://localhost:${PORT}/?year=1987&place=${slug}`);
  await page.waitForSelector('.plan-sent', { state: 'attached', timeout: 30000 });
  await page.evaluate(() => document.querySelector('.plan-sent').scrollIntoView());
  const expectedTable = mutate ? JSON.parse(JSON.stringify(table)) : table;
  if (mutate) mutate(expectedTable);
  const m = expectedTable.muni[String(cod)];
  let ok;
  let detail;
  try {
    await page.waitForSelector('.plan .figs', { timeout: 15000 });
    const text = (await page.textContent('.plan')).replace(/\s+/g, ' ').trim();
    const expected = [];
    expected.push(`A fecha de ${m.ext.slice(0, 10)}`);
    if (m.viv_ej !== null) expected.push(fmt(m.viv_ej));
    if (m.res_v !== null) expected.push(fmtHa(m.res_v));
    if (m.ae_v !== null) expected.push(fmtHa(m.ae_v));
    expected.push(`Ejercicio ${m.ej}`);
    const missing = expected.filter((e) => !text.includes(e));
    if (mutate) {
      // el campo anulado NO debe aparecer
      const real = table.muni[String(cod)];
      if (real.res_v !== null && m.res_v === null && text.includes(fmtHa(real.res_v))) {
        missing.push('res_v anulado sigue visible');
      }
    }
    ok = missing.length === 0;
    detail = missing.length ? `faltan: ${missing.join(' | ')}` : `ok (${text.length} ch)`;
  } catch {
    // sin .figs → solo válido si se esperaba ausencia
    ok = expectAbsent;
    detail = ok ? 'sección ausente como se esperaba' : 'timeout esperando .plan .figs';
  }
  results.push({ slug, cod, ok, detail });
  await page.close();
}

await check('bilbao', 20);
await check('leioa', 54);
await check('amoroto', 4);

// campo null: res_v → null, el <li> correspondiente debe desaparecer
await check('leioa', 54, (j) => {
  j.muni['54'].res_v = null;
  return 'keep';
});

// sin fila: sección no debe aparecer
{
  const page = await ctx.newPage();
  await page.route('**/data/planning-muni.json', async (route) => {
    const j = JSON.parse(JSON.stringify(table));
    delete j.muni['54'];
    await route.fulfill({ json: j });
  });
  await page.goto(`http://localhost:${PORT}/?year=1987&place=leioa`);
  await page.waitForSelector('.plan-sent', { state: 'attached', timeout: 30000 });
  await page.evaluate(() => document.querySelector('.plan-sent').scrollIntoView());
  await page.waitForTimeout(3000);
  const n = await page.locator('.plan').count();
  results.push({ slug: 'leioa-sin-fila', cod: 54, ok: n === 0, detail: `secciones .plan: ${n}` });
  await page.close();
}

console.log(JSON.stringify(results, null, 2));
await browser.close();
server.close();
process.exit(results.every((r) => r.ok) ? 0 : 1);
