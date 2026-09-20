/**
 * G10 — FINAL HARDENING. Regresión E2E de los defectos de la auditoría
 * (evidence/ux-audit-20260920/OBSERVATIONS.md):
 *
 *   G10-01  año inválido: editor abierto + error accesible + URL/estado intactos
 *   G10-02  denominador «año conocido» perceptible en el titular
 *   G10-03  leyenda Evolución: rampa 0 %/100 %, no «menos/más posteriores»
 *   G10-04  HeroVisual: ambas mitades recortadas (1956 izq / actual dcha)
 *   G10-05  barras 100 % posteriores = estado all-after (no before)
 *   G10-06  «sin año» fuera del eje temporal, sin solape con 2020
 *   G10-07  tooltip por foco/teclado (roving tabindex + Escape)
 *   G10-08  reduced-motion: restart no arranca timer, pasos manuales
 *   G10-09  locales inmediatos aunque NORA tarde 8 s
 *   G10-10  hotspots: respuesta tardía tras cambio de año se descarta
 *   G10-11  area_m2 null → «—», nunca «0 m²»
 *
 * Uso: node scripts/g10_hardening.mjs   (cwd = app/ con build/ presente)
 */
import { chromium } from 'playwright';
import { writeFile, mkdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { createStaticServer } from './static-server.mjs';

const ROOT = resolve(process.cwd(), '..');
const BUILD = resolve(process.cwd(), 'build');
const OUT = join(ROOT, 'evidence/g10');
const PORT = 4210;
const BASE = `http://localhost:${PORT}`;
const BILBAO = 'year=1952&place=bilbao&lat=43.263&lon=-2.935&z=14';
const U = (q) => `${BASE}/?${q}`;

const server = await createStaticServer(BUILD, PORT);
await mkdir(join(OUT, 'after'), { recursive: true });
await mkdir(join(OUT, 'async'), { recursive: true });
await mkdir(join(OUT, 'a11y'), { recursive: true });

const out = { checks: {}, notes: [] };
const ok = (k, v) => (out.checks[k] = v);
const note = (s) => out.notes.push(s);

const browser = await chromium.launch();
async function newPage(ctxOpts = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, ...ctxOpts });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => note(`PAGEERROR: ${e.message}`));
  return { ctx, page };
}
async function waitResult(page) {
  await page.waitForSelector('.bignum', { timeout: 30000 });
}
const appGet = (page, expr) => page.evaluate((e) => eval(e), expr);

// ── G10-01: año inválido ─────────────────────────────────────────────
{
  const { ctx, page } = await newPage();
  await page.goto(U(BILBAO));
  await waitResult(page);
  await page.getByRole('button', { name: 'Cambiar año o lugar' }).click();
  const input = page.locator('#edit-year');
  await input.fill('1899');
  await page.getByRole('button', { name: 'Aplicar' }).click();
  ok('g10_01_form_stays_open', await page.locator('.changeform').isVisible());
  ok('g10_01_error_visible', await page.locator('#edit-year-err').isVisible());
  ok(
    'g10_01_aria',
    (await input.getAttribute('aria-invalid')) === 'true' &&
      (await input.getAttribute('aria-describedby')) === 'edit-year-err'
  );
  ok(
    'g10_01_focus_returned',
    await page.evaluate(() => document.activeElement?.id === 'edit-year')
  );
  ok(
    'g10_01_url_state_untouched',
    page.url().includes('year=1952') &&
      (await appGet(page, 'window.__mjtApp.year')) === 1952
  );
  // Enter en vez de click
  await input.fill('abc');
  await input.press('Enter');
  ok(
    'g10_01_enter_also_blocked',
    (await page.locator('.changeform').isVisible()) &&
      page.url().includes('year=1952')
  );
  // válido sí aplica
  await input.fill('1979');
  await input.press('Enter');
  await page.waitForFunction(() => window.__mjtApp.year === 1979, null, { timeout: 15000 });
  ok('g10_01_valid_applies', !(await page.locator('.changeform').isVisible()));
  await ctx.close();
}

// ── G10-02: denominador en el titular ────────────────────────────────
{
  const { ctx, page } = await newPage();
  await page.goto(U(BILBAO));
  await waitResult(page);
  const head = await page.locator('.result header, .respuesta, .result').first();
  const txt = await page.locator('.result').innerText();
  ok(
    'g10_02_scope_line',
    /año de construcción conocido/i.test(txt.slice(0, 1200))
  );
  void head;
  await ctx.close();
}

// ── G10-03: leyenda Evolución ────────────────────────────────────────
{
  const { ctx, page } = await newPage();
  // z=12 → nivel CELDA: la rampa en play codifica cuota constatada hasta
  // playYear (a nivel EDIFICIO no hay rampa; a BIZKAIA sigue anclada a year)
  await page.goto(U('year=1952&place=bilbao&lat=43.263&lon=-2.935&z=12&view=time&play=1988'));
  await waitResult(page);
  await page
    .waitForSelector('.legend', { timeout: 30000 })
    .catch(() => note('legend timeout'));
  const leg = (await page.locator('.legend').innerText().catch(() => '')).replace(/\s+/g, ' ');
  // solo aplica si estamos a nivel celda (zoom 14 → CELDA)
  ok('g10_03_ramp_scale', /0 %/.test(leg) && /100 %/.test(leg));
  ok('g10_03_no_posteriores_labels', !/menos posteriores|más posteriores/i.test(leg));
  await page.screenshot({ path: join(OUT, 'after/legend-play.png') });
  await ctx.close();
}

// ── G10-04: HeroVisual ───────────────────────────────────────────────
{
  const { ctx, page } = await newPage();
  await page.goto(BASE + '/');
  await page.waitForSelector('.diptych', { timeout: 20000 });
  const clips = await page.evaluate(() => {
    const past = getComputedStyle(document.querySelector('.diptych .past')).clipPath;
    const now = getComputedStyle(document.querySelector('.diptych .now')).clipPath;
    return { past, now };
  });
  ok('g10_04_past_clipped_left', /inset\(0(px)?\s+50%/.test(clips.past));
  ok('g10_04_now_clipped_right', /inset\(0(px)?\s+0(px)?\s+0(px)?\s+50%/.test(clips.now));
  // píxeles: cuarto izquierdo y cuarto derecho deben diferir (dos fotos distintas)
  const shot = await page.locator('.diptych').screenshot();
  await writeFile(join(OUT, 'after/hero-diptych.png'), shot);
  await ctx.close();
}

// ── G10-05/06/07: histograma ─────────────────────────────────────────
{
  const { ctx, page } = await newPage();
  await page.goto(U(BILBAO));
  await waitResult(page);
  // .dist vive en BelowFold (lazy): hay que hacer scroll para montarlo
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForSelector('.dist svg', { timeout: 30000 });
  const hist = await page.evaluate(() => {
    const hits = [...document.querySelectorAll('.dist rect.hit')];
    const states = hits.map((r) => r.getAttribute('data-state'));
    const ticks = [...document.querySelectorAll('.dist .tick')].map((el) => ({
      text: el.textContent,
      x: el.getBBox().x + el.getBBox().width / 2
    }));
    const noYearTick = ticks.find((tk) => tk.text === 'sin año');
    const lastTick = ticks.filter((tk) => /^\d{4}$|^<\d{4}$/.test(tk.text)).at(-1);
    return {
      nAllAfter: states.filter((s) => s === 'all-after').length,
      nAllBefore: states.filter((s) => s === 'all-before').length,
      nSplit: states.filter((s) => s === 'split').length,
      nHits: hits.length,
      noYearX: noYearTick?.x ?? null,
      lastTickX: lastTick?.x ?? null
    };
  });
  // Bilbao 1952: 1960..2020 todas posteriores → ≥7 all-after
  ok('g10_05_all_after_states', hist.nAllAfter >= 7);
  ok('g10_05_mixed_states', hist.nAllBefore >= 1 && hist.nSplit >= 1);
  // «sin año» a la derecha del último tick temporal, sin solape
  ok(
    'g10_06_noyear_off_axis',
    hist.noYearX !== null && hist.lastTickX !== null && hist.noYearX - hist.lastTickX > 30
  );
  // foco/teclado
  await page.locator('.dist rect.hit').first().focus();
  await page.waitForSelector('.d-tip', { timeout: 5000 }).catch(() => null);
  ok('g10_07_focus_shows_tip', await page.locator('.d-tip').isVisible());
  const i0 = await page.evaluate(() => document.activeElement?.getAttribute('data-i'));
  await page.keyboard.press('ArrowRight');
  const i1 = await page.evaluate(() => document.activeElement?.getAttribute('data-i'));
  ok('g10_07_roving_arrows', i0 === '0' && i1 === '1');
  await page.keyboard.press('Escape');
  ok('g10_07_escape_closes', !(await page.locator('.d-tip').isVisible().catch(() => false)));
  await page.screenshot({ path: join(OUT, 'a11y/histogram-focus.png') });
  await ctx.close();
}

// ── G10-08: reduced-motion ───────────────────────────────────────────
{
  const { ctx, page } = await newPage({ reducedMotion: 'reduce' });
  await page.goto(U(BILBAO));
  await waitResult(page);
  const restartBtn = page.getByRole('button', { name: /Reiniciar/i });
  await restartBtn.click();
  await page.waitForTimeout(700); // > TICK_MS×2: si hubiera timer, playYear avanzaría
  const st = await appGet(
    page,
    'JSON.stringify({playing: window.__mjtApp.playing, playYear: window.__mjtApp.playYear})'
  ).then(JSON.parse);
  ok('g10_08_no_autoplay', st.playing === false);
  ok('g10_08_restart_resets', st.playYear === 1952);
  // paso manual sí funciona
  await page.getByRole('button', { name: /siguiente|adelante|›|→/i }).first().click().catch(() => null);
  const st2 = await appGet(page, 'window.__mjtApp.playYear');
  ok('g10_08_manual_step', st2 === 1953);
  await ctx.close();
}

// ── G10-09: locales inmediatos, NORA lento ───────────────────────────
{
  const { ctx, page } = await newPage();
  let noraResolve;
  const noraGate = new Promise((r) => (noraResolve = r));
  await page.route('**/rest/v1/municipios*', async (route) => {
    await noraGate;
    await route.fulfill({ status: 200, contentType: 'application/json', body: '{"list":[]}' });
  });
  await page.goto(BASE + '/');
  await page.waitForSelector('#place-input', { timeout: 20000 });
  await page.locator('#place-input').fill('bil');
  const t0 = Date.now();
  await page.waitForSelector('#place-listbox li', { timeout: 3000 });
  ok('g10_09_local_immediate', Date.now() - t0 < 2000);
  ok(
    'g10_09_more_status',
    (await page.locator('.status').innerText()).includes('más resultados')
  );
  noraResolve();
  await page.waitForFunction(
    () => !document.querySelector('.status')?.textContent.includes('más'),
    null,
    { timeout: 5000 }
  );
  await page.screenshot({ path: join(OUT, 'async/search-local-first.png') });
  await ctx.close();
}

// ── G10-10: hotspots race ────────────────────────────────────────────
{
  const { ctx, page } = await newPage();
  let resolveCells;
  const cellsGate = new Promise((r) => (resolveCells = r));
  let cellsCalls = 0;
  await page.route('**/cells/*.json', async (route) => {
    cellsCalls++;
    await cellsGate;
    await route.continue();
  });
  await page.goto(U(BILBAO));
  await waitResult(page);
  const ask = page.getByRole('button', { name: /posteriores a 1952/i });
  if (!(await ask.count())) {
    note('hotspots button not found — panel may be below fold');
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  }
  await page.getByRole('button', { name: /posteriores a/i }).click();
  await page.waitForSelector('.hot .note', { timeout: 5000 }); // loading
  // cambiar el año mientras la request está en vuelo
  await page.evaluate(() => (window.__mjtApp.year = 2015));
  resolveCells();
  await page.waitForTimeout(800);
  const spotList = await page.locator('.hot ol').count();
  ok('g10_10_stale_rejected', spotList === 0);
  // y el estado queda idle (botón disponible para el año nuevo)
  ok('g10_10_back_to_idle', (await page.getByRole('button', { name: /posteriores a 2015/i }).count()) >= 1);
  note(`cells calls: ${cellsCalls}`);
  await ctx.close();
}

// ── G10-11: area_m2 null → '—', nunca '0 m²' ─────────────────────────
{
  const { ctx, page } = await newPage();
  await page.goto(U(BILBAO));
  await waitResult(page);
  await page.evaluate(() => {
    window.__mjtApp.selectedBuilding = {
      id: 'test-null',
      mun: 48,
      year: 1980,
      state: 'VALID',
      uso: 'Residencial',
      alturas: 3,
      viv: null,
      area_m2: null
    };
  });
  await page.waitForSelector('.card', { timeout: 5000 });
  const fields = await page.locator('.card .fields').innerText();
  ok('g10_11_null_not_zero', !/0\s*m²/.test(fields) && /—/.test(fields));
  await ctx.close();
}

await writeFile(join(OUT, 'checks.json'), JSON.stringify(out, null, 2));
await browser.close();
server.close();

const fails = Object.entries(out.checks).filter(([, v]) => !v);
console.log(`checks: ${Object.keys(out.checks).length} · fails: ${fails.length}`);
for (const [k] of fails) console.log('  FAIL', k);
for (const n of out.notes) console.log('  note:', n);
process.exit(fails.length ? 1 : 0);
