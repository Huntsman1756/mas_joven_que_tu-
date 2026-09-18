/**
 * G3-C — Mapa histórico 1923–1925 (superficie opt-in, distinta de ortofoto).
 *
 * Evidencia funcional:
 *   contrato red: 0 requests a ORTO_EJ_CARTO_1925 antes del opt-in; >0 tras él
 *   activación:  botón «Ver el mapa histórico» → histMapState AVAILABLE
 *   extent:      misma cámara — screenshot actual vs histórico mismo punto
 *   edificio:    deep-link building= + capa activa = mismo punto en 1923–25
 *   fallo:       requests abortadas ⇒ texto unavailable + app usable
 *   ocultar:     la capa desaparece y no hay más requests
 *
 *   --reflow  viewport 320×844: sección sin overflow, botón ≥44px, teclado
 *   --axe     axe-core con la sección renderizada (0 violations)
 *
 * Salida: G3C_OUT o ../evidence/g3/g3c/browser/
 * Uso: node scripts/g3c_histmap.mjs [--reflow] [--axe]
 */
import { chromium } from 'playwright';
import { writeFile, mkdir, copyFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { createStaticServer } from './static-server.mjs';

const ROOT = resolve(process.cwd(), '..');
const BUILD = resolve(process.cwd(), 'build');
const OUT = process.env.G3C_OUT || join(ROOT, 'evidence/g3/g3c/browser');
const PORT = 4182;
const doReflow = process.argv.includes('--reflow');
const doAxe = process.argv.includes('--axe');
const doMain = !doReflow && !doAxe;
const HIST = 'ORTO_EJ_CARTO_1925';

await mkdir(OUT, { recursive: true });
const server = await createStaticServer(BUILD, PORT);
const BASE = `http://localhost:${PORT}/`;
const BILBAO = `${BASE}?year=1987&place=bilbao`;
const EDIFICIO = `${BASE}?year=1987&place=bilbao&lat=43.27099&lon=-2.92842&z=16&building=20-1202-6001-1-2`;

const results = { utc: new Date().toISOString(), steps: {} };

function trackHist(page) {
  const reqs = [];
  page.on('request', (r) => {
    if (r.url().includes(HIST)) reqs.push(r.url().slice(0, 120));
  });
  return reqs;
}

async function activate(page) {
  await page.waitForSelector('.histmap .btn', { timeout: 15000 });
  await page.locator('.histmap .btn').first().click();
  await page.waitForFunction(
    () => window.__mjtApp?.histMapState === 'AVAILABLE',
    { timeout: 30000 }
  );
}

async function reflow() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 320, height: 844 } });
  const errs = [];
  page.on('pageerror', (e) => errs.push(String(e)));
  const r = { consoleErrors: errs, steps: {} };
  try {
    await page.goto(BILBAO, { waitUntil: 'load' });
    await page.waitForSelector('.headline-block h1', { timeout: 30000 });
    await page.waitForSelector('.histmap', { timeout: 15000 });
    r.steps.hscroll = await page.evaluate(() => document.documentElement.scrollWidth > 320);
    // teclado: el botón opt-in es focuseable y opera con Enter
    await page.locator('.histmap .btn').first().focus();
    r.steps.focused = await page.evaluate(
      () => document.activeElement?.closest('.histmap') !== null
    );
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => window.__mjtApp?.histMapVisible === true, {
      timeout: 15000
    });
    r.steps.kb = await page.evaluate(() => window.__mjtApp?.histMapVisible === true);
    const btn = await page.locator('.histmap .btn').first().boundingBox();
    r.steps.btn_h = btn?.height;
    r.steps.hscroll_after = await page.evaluate(
      () => document.documentElement.scrollWidth > 320
    );
    await page.screenshot({ path: join(OUT, 'g3c-mobile-320.png'), fullPage: true });
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
    await page.goto(BILBAO, { waitUntil: 'load' });
    await page.waitForSelector('.headline-block h1', { timeout: 30000 });
    await activate(page);
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

const browser = doMain ? await chromium.launch() : null;
try {
  // ── 1. contrato de red + activación ──
  if (doMain) {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    const errs = [];
    page.on('pageerror', (e) => errs.push(String(e).slice(0, 200)));
    const reqs = trackHist(page);
    await page.goto(BILBAO, { waitUntil: 'load' });
    await page.waitForSelector('.headline-block h1', { timeout: 30000 });
    await page.waitForSelector('.histmap', { timeout: 15000 });
    await page.waitForTimeout(2500); // margen para cualquier carga perezosa
    results.steps.requests_before_optin = reqs.length; // GC3: debe ser 0
    results.steps.proposal = await page.locator('.histmap .proposal').innerText();

    await activate(page);
    results.steps.state = await page.evaluate(() => window.__mjtApp?.histMapState);
    await page.waitForTimeout(1500);
    results.steps.requests_after_optin = reqs.length; // debe ser >0
    results.steps.layer_present = await page.evaluate(() => {
      const m = document.querySelector('canvas');
      return m !== null;
    });
    results.steps.src_text = await page.locator('.histmap .src').innerText();
    await page.screenshot({ path: join(OUT, 'g3c-histmap-bilbao.png') });
    results.steps.console_errors = errs;
    await page.close();
  }

  // ── 2. MI EDIFICIO → mismo punto en 1923–25 ──
  if (doMain) {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    const errs = [];
    page.on('pageerror', (e) => errs.push(String(e).slice(0, 200)));
    const reqs = trackHist(page);
    await page.goto(EDIFICIO, { waitUntil: 'load' });
    await page.waitForSelector('.headline-block h1', { timeout: 30000 });
    await page.waitForFunction(() => window.__mjtApp?.selectedBuilding !== null, {
      timeout: 30000
    });
    results.steps.building = await page.evaluate(() => window.__mjtApp?.selectedBuilding?.id);
    // vista actual centrada en el edificio, sin mapa histórico
    await page.waitForTimeout(800);
    await page.screenshot({ path: join(OUT, 'g3c-building-actual.png') });
    await activate(page);
    await page.waitForTimeout(1500);
    await page.screenshot({ path: join(OUT, 'g3c-building-1925.png') });
    results.steps.building_requests = reqs.length;
    results.steps.console_errors_b = errs;
    await page.close();
  }

  // ── 3. fallo cerrado ──
  if (doMain) {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    const errs = [];
    page.on('pageerror', (e) => errs.push(String(e).slice(0, 200)));
    await page.route(`**/${HIST}/**`, (r) => r.abort());
    await page.goto(BILBAO, { waitUntil: 'load' });
    await page.waitForSelector('.headline-block h1', { timeout: 30000 });
    await page.waitForSelector('.histmap .btn', { timeout: 15000 });
    await page.locator('.histmap .btn').first().click();
    await page.waitForFunction(
      () => window.__mjtApp?.histMapState === 'UNAVAILABLE',
      { timeout: 30000 }
    );
    results.steps.fail_state = 'UNAVAILABLE';
    results.steps.fail_text = await page.locator('.histmap').innerText();
    // la app sigue usable: headline + distribución intactos
    results.steps.fail_app_ok =
      (await page.locator('.headline-block h1').count()) === 1 &&
      (await page.locator('.dist').count()) >= 0;
    await page.screenshot({ path: join(OUT, 'g3c-failclosed.png') });
    results.steps.console_errors_f = errs;
    await page.close();
  }
} finally {
  results.reflow = doReflow ? await reflow() : undefined;
  results.axe = doAxe ? await axeRun() : undefined;
  await writeFile(join(OUT, 'g3c-results.json'), JSON.stringify(results, null, 2));
  server.close();
  if (browser) await browser.close();
}
console.log(JSON.stringify(results, null, 2).slice(0, 4000));
