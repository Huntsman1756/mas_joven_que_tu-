/**
 * FASE B — verificación de los findings de cara visible (red team 2026-09-27).
 *
 * Cubre lo que los suites de gate no cubren en conjunto:
 *   RT-03  entrada en FOTOS aéreas por TODAS las rutas (tab, deep link con/sin
 *          ortho, CTA del resultado, back/forward, cambio de municipio,
 *          retorno desde swipe, historia) con la regla de opt-in intacta:
 *          0 peticiones de ortofoto hasta una activación explícita.
 *   RT-04  Karrantza/2025: 1 de 3.528 nunca se lee «0 %» ni «exacta»;
 *          y universo SIN año conocido (fixture local c02=0) → estado
 *          explícito sin conclusión temporal (h1, resumen, comparación,
 *          histograma, cálculo), sin NaN/undefined en pantalla.
 *   RT-05  contraste de Mungia con la unidad % visible en ambos valores.
 *   RT-06  el hallazgo (recuento vs huella) es visible en el primer
 *          resultado y su CTA entra en el capítulo; «Volver» restaura.
 *   RT-18  población no duplicada cuando el periodo observado coincide
 *          con el padrón actual (año 2025).
 *
 * Uso:  node scripts/redteam_verify.mjs          (cwd = app/, build/ presente)
 *       CI_STUBS=1 node scripts/redteam_verify.mjs   (como en CI)
 * Salida: ../evidence/red-team-2026/verify.json + capturas rtXX-*.png
 * Exit != 0 si algún check falla.
 */
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { join, resolve } from 'node:path';
import { createStaticServer } from './static-server.mjs';
import { installCiFixtures } from './fixtures.mjs';

const ROOT = resolve(process.cwd(), '..');
const BUILD = resolve(process.cwd(), 'build');
const OUT = resolve(process.env.REDTEAM_OUT || join(ROOT, 'evidence/red-team-2026'));
const PORT = 4331;
const BASE = `http://localhost:${PORT}`;
const STUBS = process.env.CI_STUBS === '1';
const U = (q) => `${BASE}/?${q}`;

/** Procedencia de la corrida: qué build y qué fuentes se probaron. */
function provenance() {
  let stamp = 'unknown';
  try {
    stamp =
      /mjt:build"\s+content="([^"]+)"/.exec(readFileSync(join(BUILD, 'index.html'), 'utf8'))?.[1] ??
      'unknown';
  } catch {
    /* sin build */
  }
  let gitHead = 'unknown';
  try {
    gitHead = execSync('git rev-parse HEAD', { cwd: ROOT, encoding: 'utf8' }).trim();
  } catch {
    /* sin .git */
  }
  return { build_stamp: stamp, git_head: gitHead, node: process.version, stubs: STUBS };
}

const server = await createStaticServer(BUILD, PORT);
await mkdir(OUT, { recursive: true });

const checks = {};
const notes = [];
const ok = (k, v, detail = '') => {
  checks[k] = !!v;
  console.log(`${v ? 'PASS' : 'FAIL'} ${k}${detail ? ` — ${detail}` : ''}`);
};
const note = (s) => notes.push(s);

const browser = await chromium.launch();

/** Cuenta peticiones de ortofoto/cartografía histórica (mismo filtro que CI). */
async function newPage(ctxOpts = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, ...ctxOpts });
  const page = await ctx.newPage();
  page._ortho = [];
  page._hist = [];
  page._errors = [];
  page.on('pageerror', (e) => page._errors.push(String(e.message).slice(0, 200)));
  if (STUBS) await installCiFixtures(page);
  page.on('request', (r) => {
    const u = r.url();
    // Filtro como g2b: «orto» en la URL. La cartografía 1923–25 (ORTO_EJ_CARTO)
    // se cuenta aparte — es el opt-in del MAPA HISTÓRICO, y los previews
    // locales (data/ortho-previews) son estáticos del propio dominio.
    if (!/orto/i.test(u)) return;
    if (/ORTO_EJ_CARTO/i.test(u)) page._hist.push(u);
    else if (!/data\/ortho-previews\//.test(u)) page._ortho.push(u);
  });
  return { ctx, page };
}

const appGet = (page, expr) => page.evaluate((e) => eval(e), expr);
const waitHeadline = (page) =>
  page.waitForFunction(() => window.__mjtApp?.headline != null, null, { timeout: 30000 });

/* ═══════════ RT-03 · ruta 1: cambio de modo (tab) ═══════════ */
{
  const { ctx, page } = await newPage();
  await page.goto(U('year=1987&place=leioa'), { waitUntil: 'load' });
  await waitHeadline(page);
  await page.click('.viewswitch button[data-mode="photo"]');
  await page.waitForSelector('.photo .state.pending', { timeout: 15000 });
  await page.waitForTimeout(1200);
  const hint = await page.locator('.photo .state.pending p').innerText();
  const cta = await page.locator('.photo [data-action="activate"]').innerText();
  ok('rt03_tab_pending_state', /aún no está activada/i.test(hint), hint.slice(0, 80));
  ok('rt03_tab_pending_cta_year', /\d{4}/.test(cta), cta);
  ok('rt03_tab_zero_ortho_requests', page._ortho.length === 0, `${page._ortho.length} req`);
  const urlNoOrtho = !page.url().includes('ortho=');
  ok('rt03_tab_url_without_ortho', urlNoOrtho, page.url());
  await page.screenshot({ path: join(OUT, 'rt03-tab-pending.png') });

  // activación explícita: la única forma de que haya red
  await page.locator('.photo [data-action="activate"]').click();
  await page.waitForFunction(() => window.__mjtApp?.orthoVisible === true, null, {
    timeout: 15000
  });
  await page.waitForTimeout(1500);
  ok('rt03_tab_activate_requests', page._ortho.length > 0, `${page._ortho.length} req`);
  ok('rt03_tab_pending_gone', (await page.locator('.photo .state.pending').count()) === 0);
  ok('rt03_tab_url_has_ortho', page.url().includes('ortho='), page.url());
  await page.waitForSelector('.photo .state:not(.pending)', { timeout: 15000 }).catch(() => null);
  await page.screenshot({ path: join(OUT, 'rt03-tab-active.png') });
  ok('rt03_no_pageerrors', page._errors.length === 0, page._errors.join(' | '));
  await ctx.close();
}

/* ═══════════ RT-03 · ruta 2: deep link SIN ortho ═══════════ */
{
  const { ctx, page } = await newPage();
  await page.goto(U('year=1987&place=leioa&view=photo'), { waitUntil: 'load' });
  await page.waitForSelector('.photo .state.pending', { timeout: 20000 });
  await page.waitForTimeout(1500);
  ok('rt03_deeplink_no_ortho_pending', true);
  ok('rt03_deeplink_no_ortho_zero_requests', page._ortho.length === 0, `${page._ortho.length} req`);
  ok('rt03_deeplink_tab_state_url', (await appGet(page, 'window.__mjtApp.mode')) === 'photo');
  await ctx.close();
}

/* ═══════════ RT-03 · ruta 3: deep link CON ortho ═══════════ */
{
  const { ctx, page } = await newPage();
  await page.goto(U('year=1987&place=leioa&view=photo&ortho=1956'), { waitUntil: 'load' });
  await page.waitForFunction(
    () => window.__mjtApp?.orthoCampaign?.year === 1956 && window.__mjtApp?.orthoVisible === true,
    null,
    { timeout: 20000 }
  );
  await page.waitForTimeout(1500);
  ok('rt03_deeplink_ortho_active', true);
  ok('rt03_deeplink_ortho_requested', page._ortho.length > 0, `${page._ortho.length} req`);
  ok('rt03_deeplink_ortho_no_pending', (await page.locator('.photo .state.pending').count()) === 0);
  const year = (await page.locator('.photo .tc-year').innerText()).trim();
  ok('rt03_deeplink_ortho_label_1956', year.includes('1956'), year);
  await page.screenshot({ path: join(OUT, 'rt03-deeplink-ortho.png') });
  await ctx.close();
}

/* ═══════════ RT-03 · ruta 4: CTA desde el resultado ═══════════ */
{
  const { ctx, page } = await newPage();
  await page.goto(U('year=1987&place=leioa'), { waitUntil: 'load' });
  await waitHeadline(page);
  await page.locator('.sidebar .cta-era').click();
  await page.waitForFunction(() => window.__mjtApp?.orthoVisible === true, null, {
    timeout: 15000
  });
  await page.waitForTimeout(1200);
  ok('rt03_cta_result_activates', true, `mode=${await appGet(page, 'window.__mjtApp.mode')}`);
  ok('rt03_cta_result_requests', page._ortho.length > 0, `${page._ortho.length} req`);
  ok('rt03_cta_result_no_pending', (await page.locator('.photo .state.pending').count()) === 0);

  /* ═══════════ RT-03 · ruta 5: back / forward ═══════════ */
  await page.goBack();
  await page.waitForTimeout(900);
  const modeBack = await appGet(page, 'window.__mjtApp.mode');
  ok('rt03_back_leaves_photo', modeBack !== 'photo', `mode=${modeBack}`);
  ok('rt03_back_no_ortho_in_url', !page.url().includes('ortho='), page.url());
  await page.goForward();
  await page.waitForTimeout(1500);
  const modeFwd = await appGet(page, 'window.__mjtApp.mode');
  const visFwd = await appGet(page, 'window.__mjtApp.orthoVisible');
  ok(
    'rt03_forward_restores_photo',
    modeFwd === 'photo' && visFwd === true,
    `mode=${modeFwd} vis=${visFwd}`
  );
  ok('rt03_forward_no_pending', (await page.locator('.photo .state.pending').count()) === 0);
  await ctx.close();
}

/* ═══════════ RT-03 · ruta 6: cambio de municipio con FOTOS activo ═══════ */
{
  const { ctx, page } = await newPage();
  await page.goto(U('year=1987&place=leioa&view=photo'), { waitUntil: 'load' });
  await page.waitForSelector('.photo .state.pending', { timeout: 20000 });
  const before = page._ortho.length;
  // editor de resultado: «Cambiar» → lugar nuevo → Aplicar
  await page.locator('button.change').click();
  await page.waitForSelector('.changeform', { timeout: 10000 });
  await page.locator('#place-input').fill('Getxo');
  await page.waitForSelector('#place-listbox li button', { timeout: 15000 });
  await page.locator('#place-listbox li button').first().click();
  await page.locator('.cf-submit').click();
  await page.waitForFunction(() => window.__mjtApp?.place?.slug === 'getxo', null, {
    timeout: 30000
  });
  await page.waitForTimeout(1800);
  const vis = await appGet(page, 'window.__mjtApp.orthoVisible');
  const mode = await appGet(page, 'window.__mjtApp.mode');
  ok('rt03_place_change_clears_ortho', vis === false, `mode=${mode} vis=${vis}`);
  ok(
    'rt03_place_change_no_new_requests',
    page._ortho.length === before,
    `${before} → ${page._ortho.length}`
  );
  ok(
    'rt03_place_change_pending_if_photo',
    mode !== 'photo' || (await page.locator('.photo .state.pending').count()) === 1,
    `mode=${mode}`
  );
  ok('rt03_place_change_no_ortho_url', !page.url().includes('ortho='), page.url());
  await ctx.close();
}

/* ═══════════ RT-03 · ruta 7: retorno desde SWIPE ═══════════ */
{
  const { ctx, page } = await newPage();
  await page.goto(U('year=1987&place=leioa&view=photo'), { waitUntil: 'load' });
  await page.waitForSelector('.photo .state.pending', { timeout: 20000 });
  await page.click('.viewswitch button[data-mode="swipe"]');
  await page.waitForFunction(() => window.__mjtApp?.mode === 'swipe', null, { timeout: 10000 });
  await page.waitForTimeout(800);
  const visSwipe = await appGet(page, 'window.__mjtApp.orthoVisible');
  ok('rt03_swipe_shows_image', visSwipe === true);
  await page.click('.viewswitch button[data-mode="photo"]');
  await page.waitForFunction(() => window.__mjtApp?.mode === 'photo', null, { timeout: 10000 });
  await page.waitForTimeout(800);
  const visBack = await appGet(page, 'window.__mjtApp.orthoVisible');
  ok('rt03_photo_after_swipe_active', visBack === true, `vis=${visBack}`);
  ok(
    'rt03_photo_after_swipe_no_pending',
    (await page.locator('.photo .state.pending').count()) === 0
  );
  await ctx.close();
}

/* ═══════════ RT-03 · ruta 8: entrada desde historia ═══════════ */
{
  const { ctx, page } = await newPage();
  await page.goto(U('year=1987&place=leioa&story=f4036'), { waitUntil: 'load' });
  await page.waitForSelector('.chapter', { timeout: 30000 });
  const st = await appGet(
    page,
    '({mode: window.__mjtApp.mode, vis: window.__mjtApp.orthoVisible})'
  );
  ok('rt03_story_entry_coherent', st.mode === 'map' && st.vis === false, JSON.stringify(st));
  ok(
    'rt03_story_entry_no_pending_needed',
    (await page.locator('.photo .state.pending').count()) === 0
  );
  await ctx.close();
}

/* ═══════════ RT-04 · Karrantza 2025 ═══════════ */
{
  const { ctx, page } = await newPage();
  await page.goto(U('year=2025&place=karrantza-harana-valle-de-carranza'), { waitUntil: 'load' });
  await waitHeadline(page);
  await page.waitForTimeout(500);
  const support = await page
    .locator('.headline-block .support')
    .innerText()
    .catch(() => '');
  const h1 = await page.locator('.headline-block h1').innerText();
  const summary = await page
    .locator('.sr-summary')
    .innerText()
    .catch(() => '');
  const coverage = await page
    .locator('.headline-block .coverage')
    .innerText()
    .catch(() => '');
  ok('rt04_support_not_zero', !/0\s?%/.test(support), support.trim());
  ok('rt04_support_edge', /<0,1/.test(support), support.trim());
  ok('rt04_support_no_exacta', !/exacta/i.test(support), support.trim());
  ok('rt04_headline_says_min_one', /menos de 1 de cada 10/i.test(h1), h1.trim().slice(0, 120));
  ok('rt04_summary_singular', /1 se terminó/.test(summary), summary.trim().slice(0, 160));
  ok('rt04_coverage_not_false_100', !/100\s?%/.test(coverage), coverage.trim());
  await page.screenshot({ path: join(OUT, 'rt04-karrantza-after.png') });
  await ctx.close();
}

/* ═══════════ RT-05 · contraste de Mungia con unidad ═══════════ */
{
  const { ctx, page } = await newPage();
  await page.goto(U('year=1979&place=mungia&story=f4036'), { waitUntil: 'load' });
  await page.waitForSelector('.chapter .scontrast', { timeout: 30000 });
  const nums = await page.locator('.chapter .scontrast .num').allInnerTexts();
  ok(
    'rt05_contrast_units',
    nums.length === 2 && nums.every((n) => /\d,\d\s?%/.test(n)),
    JSON.stringify(nums)
  );
  await page.screenshot({ path: join(OUT, 'rt05-mungia-contrast.png') });
  await ctx.close();
}

/* ═══════════ RT-06 · hallazgo visible + recorrido ═══════════ */
{
  const { ctx, page } = await newPage();
  await page.goto(U('year=1987&place=leioa'), { waitUntil: 'load' });
  await waitHeadline(page);
  ok('rt06_other_place_no_finding', (await page.locator('.finding').count()) === 0);
  await page.goto(U('year=1979&place=mungia'), { waitUntil: 'load' });
  await waitHeadline(page);
  await page.waitForSelector('.finding', { timeout: 15000 });
  const lead = await page.locator('.finding .f-lead').innerText();
  ok('rt06_finding_present', true);
  ok('rt06_finding_names_set', /70 edificios/.test(lead), lead.slice(0, 140));
  ok('rt06_finding_units_both', /85,7\s?%/.test(lead) && /1,9\s?%/.test(lead), lead.slice(0, 140));
  ok(
    'rt06_finding_not_municipal',
    !/todo Mungia|todo el municipio/i.test(lead),
    lead.slice(0, 140)
  );
  await page.screenshot({ path: join(OUT, 'rt06-finding.png') });

  await page.locator('.finding .f-cta').click();
  await page.waitForSelector('.chapter', { timeout: 20000 });
  const story = await appGet(page, 'window.__mjtApp.story');
  ok('rt06_cta_enters_story', story === 'f4036', `story=${story}`);
  await page.waitForTimeout(600);
  await page.screenshot({ path: join(OUT, 'rt06-story.png') });

  await page
    .locator('.chapter .act.pri, .chapter button')
    .filter({ hasText: 'Volver' })
    .first()
    .click();
  await page.waitForFunction(() => window.__mjtApp?.story === null, null, { timeout: 15000 });
  ok('rt06_back_restores_result', (await page.locator('.finding').count()) === 1);

  // el índice de capítulos (chunk lazy en below-fold) abre por el hallazgo
  // (orden editorial congelado: STORY_ORDER[0] = f4036 = Mungia)
  for (let i = 0; i < 25 && (await page.locator('.stories .item').count()) === 0; i++) {
    await page.mouse.wheel(0, 900);
    await page.waitForTimeout(150);
  }
  await page.waitForSelector('.stories .item', { timeout: 20000 });
  const first = (await page.locator('.stories .item').first().innerText()).slice(0, 80);
  ok('rt06_index_opens_with_finding', /Mungia/i.test(first), first.replaceAll('\n', ' '));
  ok('rt06_no_pageerrors', page._errors.length === 0, page._errors.join(' | '));
  await ctx.close();
}

/* ═══════════ RT-18 · población no duplicada (año 2025, caso de la auditoría) ═══ */
{
  const { ctx, page } = await newPage();
  await page.goto(U('year=2025&place=karrantza-harana-valle-de-carranza'), { waitUntil: 'load' });
  await waitHeadline(page);
  // el bloque de contexto vive en below-fold (chunk perezoso con
  // IntersectionObserver): se recorre hasta él de forma incremental
  for (let i = 0; i < 25 && (await page.locator('.ctx.plan .fact').count()) === 0; i++) {
    await page.mouse.wheel(0, 900);
    await page.waitForTimeout(200);
  }
  await page.waitForSelector('.ctx.plan .fact', { timeout: 30000 });
  await page.waitForTimeout(600);
  const fact = await page.locator('.ctx.plan .fact').first().innerText();
  const all = await page.locator('.ctx.plan').innerText();
  const num = fact.match(/(\d{1,3}(?:\.\d{3})+)/)?.[1] ?? null;
  const times = num ? all.split(num).length - 1 : -1;
  // Antes (EVIDENCE/karrantza-2025-dom.txt:130): «registró 2.741 … En 2025 …
  // registraba 2.741» — la misma cifra dos veces porque '20250101' nunca
  // igualaba a '2025-01-01'. Ahora la cifra aparece una sola vez.
  ok('rt18_padron_not_duplicated', times === 1, `cifra=${num} veces=${times}`);
  if (times !== 1) note(`ctx.plan: ${all.slice(0, 400)}`);
  await page.screenshot({ path: join(OUT, 'rt18-population.png'), fullPage: false });
  await ctx.close();
}

/* ═══ RT-04b · universo SIN año conocido (fixture local c02=0) ═══════════
   Escenario no observado en los 112 municipios reales: se sirve por
   interceptación local (municipios + métricas) para comprobar el producto
   RENDERIZADO: sin conclusión temporal, sin «0 %» fingido, sin NaN. */
{
  const { ctx, page } = await newPage();
  const munis = JSON.parse(readFileSync(join(ROOT, 'app/static/data/municipalities.json'), 'utf8'));
  const fixture = JSON.parse(
    readFileSync(join(ROOT, 'app/scripts/fixtures/rt04-metrics-zero.json'), 'utf8')
  );
  const synth = {
    slug: 'cero-desconocido',
    cod: 999,
    name: 'Cero Desconocido',
    lat: 43.3,
    lon: -2.9,
    bbox: [-3.0, 43.2, -2.8, 43.4],
    buildings: 5
  };
  await page.route('**/data/municipalities.json', (r) =>
    r.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ municipalities: [...munis.municipalities, synth] })
    })
  );
  await page.route('**/data/metrics/cero-desconocido.json', (r) =>
    r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(fixture) })
  );

  await page.goto(U('year=2025&place=cero-desconocido'));
  await waitHeadline(page);
  await page.waitForTimeout(600);
  const h1 = await page.locator('.headline-block h1').innerText();
  ok(
    'rt04b_titular_sin_conclusion_temporal',
    /no podemos comparar/i.test(h1) &&
      !/se construyó después|ningún edificio actual con año conocido se construyó/i.test(h1),
    h1.slice(0, 140)
  );
  const supportCount = await page.locator('.headline-block .support').count();
  ok('rt04b_sin_cifra_sobre_universo_vacio', supportCount === 0, `support=${supportCount}`);
  const lead2 = await page.locator('.headline-block .lead2').innerText();
  ok(
    'rt04b_recuento_sin_cero_observado',
    /ninguno con año de construcción conocido/i.test(lead2),
    lead2.slice(0, 120)
  );
  const cov = await page
    .locator('.headline-block .coverage')
    .innerText()
    .catch(() => '');
  // total=5>0: «0 % con año conocido» es un cero VERDADERO (0 de 5), no un redondeo
  ok('rt04b_cobertura_cero_verdadero', /conocido en el 0 % de los edificios/i.test(cov), cov);
  const sr = await page
    .locator('.sr-summary')
    .innerText()
    .catch(() => '');
  ok(
    'rt04b_resumen_accesible_explicito',
    /no se puede calcular la comparación/i.test(sr),
    sr.slice(0, 140)
  );
  const bodyTxt = await page.evaluate(() => document.body.innerText);
  ok('rt04b_sin_nan_ni_undefined', !/\bNaN\b|undefined/.test(bodyTxt));
  await page.screenshot({ path: join(OUT, 'rt04b-no-denominator.png'), fullPage: false });

  // comparación de dos años → sin reparto posible (acciones siguen ahí)
  await page.goto(U('year=2000&place=cero-desconocido&compare=2020'));
  await waitHeadline(page);
  await page.waitForTimeout(600);
  const denLoc =
    (await page.locator('.compare .den').count()) > 0
      ? page.locator('.compare .den')
      : page.locator('.den');
  const den = await denLoc
    .first()
    .innerText()
    .catch(() => '');
  const buckets = await page.locator('.buckets').count();
  ok(
    'rt04b_comparacion_sin_reparto',
    /no hay reparto posible/i.test(den) && buckets === 0,
    `den="${den.slice(0, 110)}" buckets=${buckets}`
  );
  const cmpHead = await page.locator('.cmp-head').count();
  ok(
    'rt04b_comparacion_acciones_viven',
    cmpHead >= 1,
    `acciones «Cambiar/Quitar» presentes: ${cmpHead}`
  );

  // histograma (below-fold, chunk perezoso) → aviso explícito, sin «% sobre 0»
  await page.goto(U('year=2025&place=cero-desconocido'));
  await waitHeadline(page);
  for (let i = 0; i < 30 && (await page.locator('.dist').count()) === 0; i++) {
    await page.mouse.wheel(0, 900);
    await page.waitForTimeout(150);
  }
  await page.waitForSelector('.dist', { timeout: 20000 });
  const distTxt = await page.locator('.dist').innerText();
  ok(
    'rt04b_histograma_explicito',
    /no hay distribución por décadas/i.test(distTxt) &&
      !/Porcentaje calculado sobre/i.test(distTxt),
    distTxt.slice(0, 130)
  );
  // cálculo (mismo below-fold)
  const calcSummary = page.locator('.calc summary').first();
  await calcSummary.click();
  const calcTxt = await page
    .locator('.calc p')
    .first()
    .innerText()
    .catch(() => '');
  ok('rt04b_calculo_explicito', /no hay cálculo posible/i.test(calcTxt), calcTxt.slice(0, 130));
  const bodyTxt2 = await page.evaluate(() => document.body.innerText);
  ok('rt04b_sin_nan_en_below_fold', !/\bNaN\b|undefined/.test(bodyTxt2));
  await page.screenshot({ path: join(OUT, 'rt04b-hist.png'), fullPage: false });
  await ctx.close();
}

/* ═══════════ regla transversal: sin peticiones de ortofoto en entradas sin opt-in ═══ */
{
  const { ctx, page } = await newPage();
  await page.goto(U('year=1922&place=bilbao'), { waitUntil: 'load' });
  await waitHeadline(page);
  await page.click('.viewswitch button[data-mode="hist"]');
  await page.waitForTimeout(1200);
  // entrar en 1923–25 ES el opt-in del mapa histórico (cuenta _hist);
  // FOTO no debe pedir ninguna ortofoto
  const histReqs = page._hist.length;
  await page.click('.viewswitch button[data-mode="photo"]');
  await page.waitForTimeout(1200);
  ok('global_hist_optin_requested', histReqs > 0, `${histReqs} req de cartografía 1923–25`);
  ok('global_photo_mode_zero_ortho', page._ortho.length === 0, `${page._ortho.length} req`);
  await ctx.close();
}

await browser.close();
server.close();

const fails = Object.entries(checks)
  .filter(([, v]) => !v)
  .map(([k]) => k);
await writeFile(
  join(OUT, 'verify.json'),
  JSON.stringify(
    {
      utc: new Date().toISOString(),
      provenance: provenance(),
      stubs: STUBS,
      checks,
      notes,
      pageerrors: []
    },
    null,
    2
  )
);
console.log(
  fails.length === 0
    ? `RT VERIFY PASS (${Object.keys(checks).length} checks)`
    : `RT VERIFY FAIL (${fails.length}): ${fails.join(', ')}`
);
process.exit(fails.length === 0 ? 0 : 1);
