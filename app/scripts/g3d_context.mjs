/**
 * G3-D — Contexto actual condicional (RUIDO · MOVILIDAD · MONTE PÚBLICO).
 *
 * Evidencia funcional (gate docs/gates/G3-D.md):
 *   contrato red: 0 requests a data/context* sin edificio; 1 a context/<cod>
 *                 al seleccionar; 0 a context-geom antes del opt-in; 1 por
 *                 overlay activada (lazy, gate §15/§16)
 *   estados:      NOT_MAPPED ruido / lista ≤5 paradas / sin parada /
 *                 INSIDE monte / OUTSIDE monte (corpus V1,V5,V8,V9)
 *   exclusividad: una overlay contextual a la vez; cambiar de módulo
 *                 sustituye; la cámara no se mueve
 *   fail-closed:  context/*.json abortado ⇒ sin sección, app usable
 *   periodo:      selector D/T/N solo con overlay de ruido activa
 *
 *   --reflow  viewport 320×844: sin overflow, botón ≥42px, teclado
 *   --axe     axe-core con la sección renderizada (0 violations)
 *   --engines smoke V1 en chromium/firefox/webkit
 *
 * Salida: G3D_OUT o ../evidence/g3/g3d/browser/
 * Uso: node scripts/g3d_context.mjs [--reflow] [--axe] [--engines]
 */
import { chromium, firefox, webkit } from 'playwright';
import { writeFile, mkdir, copyFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { createStaticServer } from './static-server.mjs';

const ROOT = resolve(process.cwd(), '..');
const BUILD = resolve(process.cwd(), 'build');
const OUT = process.env.G3D_OUT || join(ROOT, 'evidence/g3/g3d/browser');
const PORT = 4183;
const doReflow = process.argv.includes('--reflow');
const doAxe = process.argv.includes('--axe');
const doEngines = process.argv.includes('--engines');
const doMain = !doReflow && !doAxe && !doEngines;

await mkdir(OUT, { recursive: true });
const server = await createStaticServer(BUILD, PORT);
const BASE = `http://localhost:${PORT}/`;

// Corpus congelado evidence/g3/g3d/corpus.json (pt = rep_point 4326)
const B = (place, lon, lat, bid) =>
  `${BASE}?year=2024&place=${place}&lat=${lat}&lon=${lon}&z=17&building=${bid}`;
const V1 = B('bilbao', -2.959642, 43.275131, '20-1116-2001-1-2'); // NOT_MAPPED + 5 paradas
const V5 = B('abadino', -2.616646, 43.168724, '1-1017-2001-1-1'); // MAPPED D/T + 2 paradas
const V8 = B('orozko', -2.945176, 43.120186, '75-49-90-1-1'); // 0 paradas
const V9 = B('abadino', -2.6519, 43.0997, '1-13-10-2-1'); // INSIDE monte
const LAND_BILBAO = `${BASE}?year=2024&place=bilbao`;

const results = { utc: new Date().toISOString(), steps: {} };

function trackCtx(page) {
  const ctx = [];
  const geom = [];
  page.on('request', (r) => {
    const u = r.url();
    if (u.includes('/data/context-geom/')) geom.push(u.split('/').pop());
    else if (u.includes('/data/context/')) ctx.push(u.split('/').pop());
  });
  return { ctx, geom };
}

async function openBuilding(page, url) {
  await page.goto(url, { waitUntil: 'load' });
  await page.waitForSelector('.headline-block h1', { timeout: 30000 });
  await page.waitForFunction(() => window.__mjtApp?.selectedBuilding !== null, {
    timeout: 30000
  });
  await page.waitForSelector('.ctx', { timeout: 15000 });
}

/** Módulo por su pregunta visible (h4) — los módulos se omiten si no hay
 *  cobertura, así que el índice no es estable. */
function modByQ(page, fragment) {
  return page.locator('.ctx .mod', { has: page.locator('h4', { hasText: fragment }) });
}

async function reflow() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 320, height: 844 } });
  const errs = [];
  page.on('pageerror', (e) => errs.push(String(e)));
  const r = { consoleErrors: errs, steps: {} };
  try {
    await openBuilding(page, V5);
    r.steps.hscroll = await page.evaluate(() => document.documentElement.scrollWidth > 320);
    const btn = page.locator('.ctx .geom').first();
    await btn.focus();
    r.steps.focused = await page.evaluate(() => document.activeElement?.closest('.ctx') !== null);
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => window.__mjtApp?.contextOverlay?.mod === 'ruido', {
      timeout: 15000
    });
    r.steps.kb = true;
    const bb = await btn.boundingBox();
    r.steps.btn_h = bb?.height;
    r.steps.hscroll_after = await page.evaluate(() => document.documentElement.scrollWidth > 320);
    await page.screenshot({ path: join(OUT, 'g3d-mobile-320.png'), fullPage: true });
    r.pass =
      errs.length === 0 &&
      r.steps.hscroll === false &&
      r.steps.hscroll_after === false &&
      r.steps.focused &&
      r.steps.kb &&
      (r.steps.btn_h ?? 0) >= 42;
  } catch (e) {
    r.pass = false;
    r.error = String(e).slice(0, 400);
  }
  await browser.close();
  return r;
}

async function axeRun() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const r = { steps: {} };
  try {
    await openBuilding(page, V1);
    await copyFile(
      join(process.cwd(), 'node_modules/axe-core/axe.min.js'),
      join(BUILD, '_axe.min.js')
    );
    await page.addScriptTag({ url: '/_axe.min.js' });
    r.violations = await page.evaluate(async () => {
      const res = await window.axe.run(document, { resultTypes: ['violations'] });
      return res.violations.map((v) => ({
        id: v.id,
        impact: v.impact,
        nodes: v.nodes.length,
        desc: v.help.slice(0, 90)
      }));
    });
    r.pass = r.violations.length === 0;
  } catch (e) {
    r.pass = false;
    r.error = String(e).slice(0, 400);
  }
  await browser.close();
  return r;
}

async function engines() {
  const out = {};
  for (const [name, kind] of [
    ['chromium', chromium],
    ['firefox', firefox],
    ['webkit', webkit]
  ]) {
    const browser = await kind.launch();
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    const errs = [];
    page.on('pageerror', (e) => errs.push(String(e).slice(0, 160)));
    try {
      await openBuilding(page, V1);
      const mods = await page.locator('.ctx .mod').count();
      const stops = await modByQ(page, 'transporte').locator('.facts li').count();
      out[name] = {
        mods,
        stops,
        ctx: await page
          .locator('.ctx')
          .innerText()
          .then((x) => x.slice(0, 400)),
        consoleErrors: errs,
        pass: errs.length === 0 && mods >= 1 && stops <= 5
      };
    } catch (e) {
      out[name] = { pass: false, error: String(e).slice(0, 300), consoleErrors: errs };
    }
    await browser.close();
  }
  return out;
}

const browser = doMain ? await chromium.launch() : null;
try {
  // ── 0. sin edificio: cero carga de contexto (GD10) ──
  if (doMain) {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    const { ctx, geom } = trackCtx(page);
    await page.goto(LAND_BILBAO, { waitUntil: 'load' });
    await page.waitForSelector('.headline-block h1', { timeout: 30000 });
    await page.waitForTimeout(3000);
    results.steps.no_building_ctx_requests = ctx.length; // debe ser 0
    results.steps.no_building_geom_requests = geom.length; // debe ser 0
    results.steps.no_building_section = await page.locator('.ctx').count(); // 0
    await page.close();
  }

  // ── 1. V1 Bilbao: 1 fetch context/<cod>, 0 geom antes de opt-in ──
  if (doMain) {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    const errs = [];
    page.on('pageerror', (e) => errs.push(String(e).slice(0, 200)));
    const { ctx, geom } = trackCtx(page);
    await openBuilding(page, V1);
    results.steps.v1_ctx_requests = ctx; // ['020.json']
    results.steps.v1_geom_before_optin = geom.length; // 0
    results.steps.v1_states = await page.evaluate(() => {
      const c = window.__mjtApp?.contextLocal;
      return c?.kind === 'resolved'
        ? { noise: c.noise.state, mobility: c.mobility.state, mountain: c.mountain.state }
        : c?.kind;
    });
    const mods = page.locator('.ctx .mod');
    results.steps.v1_modules = await mods.count();
    results.steps.v1_noise_text = await modByQ(page, 'banda de ruido').innerText();
    results.steps.v1_stops = await modByQ(page, 'transporte').locator('.facts li').count();
    const monteMod = modByQ(page, 'monte');
    results.steps.v1_monte = (await monteMod.count())
      ? await monteMod.locator('.fact').innerText()
      : 'omitted(no_coverage)';
    await page.screenshot({ path: join(OUT, 'g3d-v1-bilbao.png') });
    results.steps.v1_console_errors = errs;
    await page.close();
  }

  // ── 2. V5 Abadiño: ruido MAPPED + overlay opt-in + exclusividad ──
  if (doMain) {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    const errs = [];
    page.on('pageerror', (e) => errs.push(String(e).slice(0, 200)));
    const { geom } = trackCtx(page);
    await openBuilding(page, V5);
    results.steps.v5_states = await page.evaluate(() => {
      const c = window.__mjtApp?.contextLocal;
      return c?.kind === 'resolved'
        ? { noise: c.noise.state, mobility: c.mobility.state, mountain: c.mountain.state }
        : c?.kind;
    });
    results.steps.v5_noise_facts = await modByQ(page, 'banda de ruido')
      .locator('.facts')
      .innerText();
    const viewBefore = await page.evaluate(() => ({
      lat: window.__mjtApp?.view?.lat,
      lon: window.__mjtApp?.view?.lon,
      zoom: window.__mjtApp?.view?.zoom
    }));
    // overlay ruido (opt-in): 1 request lazy
    await modByQ(page, 'banda de ruido').locator('.geom').click();
    await page.waitForFunction(() => window.__mjtApp?.contextOverlay?.mod === 'ruido', {
      timeout: 15000
    });
    results.steps.v5_geom_after_ruido = [...geom]; // ['001-ruido.json']
    results.steps.v5_period_buttons = await page.locator('.ctx .per').count(); // 3
    // cambio de periodo filtra la overlay, sin nueva descarga
    await page.locator('.ctx .per').nth(1).click();
    await page.waitForTimeout(400);
    results.steps.v5_geom_after_period = geom.length; // sigue en 1
    // overlay paradas: sustituye a ruido (una a la vez)
    await modByQ(page, 'transporte').locator('.geom').click();
    await page.waitForFunction(() => window.__mjtApp?.contextOverlay?.mod === 'paradas', {
      timeout: 15000
    });
    results.steps.v5_geom_all = [...geom]; // ['001-ruido.json','001-paradas.json']
    results.steps.v5_overlay_exclusive = await page.evaluate(
      () => window.__mjtApp?.contextOverlay?.mod === 'paradas'
    );
    // paradas overlay solo pinta las paradas referenciadas (≤5)
    results.steps.v5_overlay_features = await page.evaluate(
      () => window.__mjtApp?.contextOverlay?.fc?.features?.length
    );
    const viewAfter = await page.evaluate(() => ({
      lat: window.__mjtApp?.view?.lat,
      lon: window.__mjtApp?.view?.lon,
      zoom: window.__mjtApp?.view?.zoom
    }));
    results.steps.v5_camera_unchanged =
      viewBefore.lat === viewAfter.lat &&
      viewBefore.lon === viewAfter.lon &&
      viewBefore.zoom === viewAfter.zoom;
    await page.screenshot({ path: join(OUT, 'g3d-v5-abadino-overlay.png') });
    results.steps.v5_console_errors = errs;
    await page.close();
  }

  // ── 3. V8 Orozko: negativo explícito de movilidad ──
  if (doMain) {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    await openBuilding(page, V8);
    results.steps.v8_mobility = await page.evaluate(() => {
      const c = window.__mjtApp?.contextLocal;
      return c?.kind === 'resolved' ? c.mobility.state : c?.kind;
    });
    results.steps.v8_text = await modByQ(page, 'transporte').locator('.fact').innerText();
    await page.screenshot({ path: join(OUT, 'g3d-v8-sin-parada.png') });
    await page.close();
  }

  // ── 4. V9 Abadiño: INSIDE monte público ──
  if (doMain) {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    await openBuilding(page, V9);
    results.steps.v9_monte = await page.evaluate(() => {
      const c = window.__mjtApp?.contextLocal;
      return c?.kind === 'resolved'
        ? { state: c.mountain.state, nombres: c.mountain.montes.map((m) => m.ref.n) }
        : c?.kind;
    });
    results.steps.v9_text = await modByQ(page, 'monte').innerText();
    await page.screenshot({ path: join(OUT, 'g3d-v9-monte.png') });
    await page.close();
  }

  // ── 5. fail-closed: context/<cod>.json abortado ⇒ sin sección ──
  if (doMain) {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    const errs = [];
    page.on('pageerror', (e) => errs.push(String(e).slice(0, 200)));
    await page.route('**/data/context/*.json', (r) => r.abort());
    await page.goto(V1, { waitUntil: 'load' });
    await page.waitForSelector('.headline-block h1', { timeout: 30000 });
    await page.waitForFunction(() => window.__mjtApp?.selectedBuilding !== null, {
      timeout: 30000
    });
    await page.waitForTimeout(1500);
    results.steps.fail_ctx_section = await page.locator('.ctx').count(); // 0
    results.steps.fail_app_ok = (await page.locator('.headline-block h1').count()) === 1;
    await page.screenshot({ path: join(OUT, 'g3d-failclosed.png') });
    results.steps.fail_console_errors = errs;
    await page.close();
  }
} finally {
  results.reflow = doReflow ? await reflow() : undefined;
  results.axe = doAxe ? await axeRun() : undefined;
  results.engines = doEngines ? await engines() : undefined;
  await writeFile(join(OUT, 'g3d-results.json'), JSON.stringify(results, null, 2));
  server.close();
  if (browser) await browser.close();
}
// G11.3: veredicto bloqueante — invariantes «debe ser» de cada paso y
// pageerror inesperado hacen fallar la ejecución (antes siempre salía 0).
results.pass =
  (!doMain ||
    (results.steps.no_building_ctx_requests === 0 &&
      results.steps.no_building_geom_requests === 0 &&
      results.steps.no_building_section === 0 &&
      (results.steps.v1_ctx_requests?.length ?? 0) === 1 &&
      results.steps.v1_geom_before_optin === 0 &&
      (results.steps.v1_modules ?? 0) >= 1 &&
      (results.steps.v5_geom_after_ruido?.length ?? 0) === 1 &&
      results.steps.v5_geom_after_period === 1 &&
      (results.steps.v5_geom_all?.length ?? 0) === 2 &&
      results.steps.v5_overlay_exclusive === true &&
      results.steps.v5_camera_unchanged === true &&
      results.steps.fail_ctx_section === 0 &&
      results.steps.fail_app_ok === true &&
      ['v1_console_errors', 'v5_console_errors', 'fail_console_errors'].every(
        (k) => (results.steps[k]?.length ?? 0) === 0
      ))) &&
  (results.reflow?.pass ?? true) &&
  (results.axe?.pass ?? true) &&
  Object.values(results.engines ?? {}).every((e) => e.pass === true);
console.log(JSON.stringify(results, null, 2).slice(0, 6000));
process.exit(results.pass ? 0 : 1);
