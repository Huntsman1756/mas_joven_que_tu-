/**
 * G3-B — «¿Y qué está previsto?» + contexto local (planeamiento + AE).
 *
 * Evidencia funcional:
 *   municipal: sección .plan con cifras viv/res_v/ae_v + fecha de extracción
 *   local:     tras MI EDIFICIO (Gran Vía 1, Bilbao) facets .plan .local
 *   fallo:     planning-muni.json abortado ⇒ texto unavailable + app usable
 *   ausente:   edificio no seleccionado ⇒ sin .local
 *
 *   --reflow  viewport 320×844: sección .plan sin overflow, toggle ≥44px
 *   --axe     axe-core con la sección renderizada (0 violations)
 *
 * Salida: G3B_OUT o ../evidence/g3/g3b/browser/
 * Uso: node scripts/g3b_planning.mjs [--reflow] [--axe]
 */
import { chromium } from 'playwright';
import { writeFile, mkdir, copyFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { createStaticServer } from './static-server.mjs';

const ROOT = resolve(process.cwd(), '..');
const BUILD = resolve(process.cwd(), 'build');
const OUT = process.env.G3B_OUT || join(ROOT, 'evidence/g3/g3b/browser');
const PORT = 4181;
const doReflow = process.argv.includes('--reflow');
const doAxe = process.argv.includes('--axe');
const doMain = !doReflow && !doAxe;

await mkdir(OUT, { recursive: true });
const server = await createStaticServer(BUILD, PORT);
const BASE = `http://localhost:${PORT}/`;

const results = { utc: new Date().toISOString(), steps: {} };
const AMBITO_URL = `${BASE}?year=1987&place=bilbao&lat=43.27099&lon=-2.92842&z=16&building=20-1202-6001-1-2`;

async function pickGranVia1(page) {
  await page.click('.invite .start');
  await page.waitForSelector('#addr-street', { timeout: 10000 });
  await page.fill('#addr-street', 'Gran Via');
  await page.waitForFunction(
    () =>
      (document.querySelector('#addr-street')?.value ?? '').toLowerCase().includes('don diego') ||
      document.querySelector('#addr-street-list li button'),
    { timeout: 25000 }
  );
  if (await page.locator('#addr-street-list li button').count()) {
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(300);
  }
  await page.fill('#addr-num', '1');
  await page.waitForFunction(
    () => document.querySelector('.res') || document.querySelector('.variants'),
    { timeout: 40000 }
  );
  if (await page.locator('.variants li button').count()) {
    await page.locator('.variants li button').first().click();
    await page.waitForSelector('.res', { timeout: 40000 });
  }
  await page.waitForSelector('.res .prov', { timeout: 20000 });
}

async function reflow() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 320, height: 844 } });
  const errs = [];
  page.on('pageerror', (e) => errs.push(String(e)));
  const r = { consoleErrors: errs, steps: {} };
  try {
    await page.goto(AMBITO_URL, { waitUntil: 'load' });
    await page.waitForSelector('.headline-block h1', { timeout: 30000 });
    await page.waitForSelector('.plan', { timeout: 15000 });
    r.steps.hscroll = await page.evaluate(
      () => document.documentElement.scrollWidth > 320
    );
    const over = await page.evaluate(() =>
      [...document.querySelectorAll('.plan *, .local *')]
        .filter((el) => {
          const b = el.getBoundingClientRect();
          const cs = getComputedStyle(el);
          return b.right > 321 && cs.overflowX === 'visible' && b.width > 0;
        })
        .map((el) => `${el.tagName}.${el.className}`.slice(0, 60))
    );
    r.steps.overflow_els = over.slice(0, 8);
    const btn = await page.locator('.local .geom').boundingBox();
    r.steps.geom_btn_h = btn?.height;
    // keyboard: el toggle es focuseable y opera con Enter
    await page.locator('.local .geom').focus();
    r.steps.geom_focused = await page.evaluate(
      () => document.activeElement?.classList.contains('geom') ?? false
    );
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => window.__mjtApp?.planningHighlight !== null, {
      timeout: 15000
    });
    r.steps.geom_kb = await page.evaluate(() => window.__mjtApp?.planningHighlight !== null);
    r.steps.hscroll_after = await page.evaluate(
      () => document.documentElement.scrollWidth > 320
    );
    await page.screenshot({ path: join(OUT, 'g3b-mobile-320.png'), fullPage: true });
    r.pass =
      errs.length === 0 &&
      r.steps.hscroll === false &&
      r.steps.hscroll_after === false &&
      over.length === 0 &&
      (r.steps.geom_btn_h ?? 0) >= 42 &&
      r.steps.geom_focused &&
      r.steps.geom_kb;
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
    await page.goto(AMBITO_URL, { waitUntil: 'load' });
    await page.waitForSelector('.headline-block h1', { timeout: 30000 });
    await page.waitForFunction(() => window.__mjtApp?.planningLocal !== null, {
      timeout: 30000
    });
    // disclosure «Qué significa» abierta para que axe vea su contenido
    await page.locator('.plan .meaning summary').click();
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
  // ── 1. municipal + local ──
  if (doMain) {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    const errs = [];
    page.on('pageerror', (e) => errs.push(String(e).slice(0, 200)));
    await page.goto(`${BASE}?year=1987&place=bilbao`, { waitUntil: 'load' });
    await page.waitForSelector('.headline-block h1', { timeout: 30000 });

    // PERF4-R2: la sección es below-fold — la demanda la abre el scroll
    await page.evaluate(() => document.querySelector('.plan-sent')?.scrollIntoView());
    await page.waitForSelector('.plan', { timeout: 15000 });
    results.steps.muni_visible = true;
    results.steps.muni_figs = await page.locator('.plan .figs li').allInnerTexts();
    results.steps.muni_intro = await page.locator('.plan .intro').innerText();
    results.steps.muni_src = await page.locator('.plan .src').innerText();
    // ningún dato ausente se muestra como cero
    results.steps.no_fake_zero = !results.steps.muni_figs.some((f) => /^\s*0\s/.test(f));

    // sin edificio: no hay contexto local
    results.steps.local_absent_pre = (await page.locator('.local').count()) === 0;

    await pickGranVia1(page);
    await page.waitForSelector('.local', { timeout: 20000 });
    results.steps.local_kind = await page.evaluate(() => window.__mjtApp?.planningLocal?.kind);
    results.steps.local_facts = await page.locator('.local .facts li').allInnerTexts();
    await page.screenshot({ path: join(OUT, 'g3b-planning-chromium.png'), fullPage: true });
    results.steps.console_errors = errs;
    await page.close();
  }

  // ── 2. edificio dentro de ámbito + visual opt-in ──
  if (doMain) {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    const errs = [];
    page.on('pageerror', (e) => errs.push(String(e).slice(0, 200)));
    // 20-1202-6001-1-2: dentro del ámbito oficial UE-05 (Urazurrutia 38), Bilbao
    await page.goto(
      `${BASE}?year=1987&place=bilbao&lat=43.27099&lon=-2.92842&z=16&building=20-1202-6001-1-2`,
      { waitUntil: 'load' }
    );
    await page.waitForSelector('.headline-block h1', { timeout: 30000 });
    await page.waitForFunction(() => window.__mjtApp?.planningLocal !== null, {
      timeout: 30000
    });
    results.steps.amb_kind = await page.evaluate(() => window.__mjtApp?.planningLocal?.kind);
    results.steps.amb_facts = await page.locator('.local .facts li').allInnerTexts();
    // toggle opt-in: solo si hay ámbitos/AE
    const btn = page.locator('.local .geom');
    results.steps.geom_btn = await btn.count();
    if (await btn.count()) {
      await btn.click();
      await page.waitForFunction(() => window.__mjtApp?.planningHighlight !== null, {
        timeout: 15000
      });
      results.steps.geom_layer = await page.evaluate(
        () => window.__mjtMap?.getLayer('planning-ctx-fill') !== undefined
      );
      results.steps.geom_feats = await page.evaluate(
        () => window.__mjtApp?.planningHighlight?.features?.length
      );
      await btn.click();
      results.steps.geom_off = await page.evaluate(
        () => window.__mjtApp?.planningHighlight === null
      );
    }
    await page.screenshot({ path: join(OUT, 'g3b-ambito-chromium.png'), fullPage: true });
    results.steps.console_errors_2 = errs;
    await page.close();
  }

  // ── 3. fallo de planning-muni.json ⇒ fail-closed ──
  if (doMain) {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    await page.route('**/data/planning-muni.json', (r) => r.abort());
    await page.route('**/data/planning/**', (r) => r.abort());
    await page.goto(`${BASE}?year=1987&place=bilbao`, { waitUntil: 'load' });
    await page.waitForSelector('.headline-block h1', { timeout: 30000 });
    await page.evaluate(() => document.querySelector('.plan-sent')?.scrollIntoView());
    await page.waitForSelector('.plan .note', { timeout: 15000 });
    results.steps.fail_note = await page.locator('.plan .note').innerText();
    // la app sigue operativa: el mapa y el headline existen
    results.steps.fail_usable = await page.locator('.mapband canvas').count();
    await page.close();
  }
  if (doReflow) results.reflow = await reflow();
  if (doAxe) results.axe = await axeRun();
} finally {
  await browser?.close();
  await new Promise((res) => server.close(res));
}

const s = results.steps;
results.pass = doMain
  ? s.muni_visible &&
  s.muni_figs?.length >= 1 &&
  s.no_fake_zero &&
  s.local_absent_pre &&
  (s.local_kind === 'inside' || s.local_kind === 'multiple_ambito') &&
  s.local_facts?.length >= 1 &&
  (s.amb_kind === 'inside' || s.amb_kind === 'multiple_ambito') &&
  s.amb_facts?.length >= 1 &&
  s.geom_btn === 1 &&
  s.geom_layer === true &&
  (s.geom_feats ?? 0) >= 1 &&
  s.geom_off === true &&
  (s.console_errors?.length ?? 1) === 0 &&
    (s.console_errors_2?.length ?? 1) === 0 &&
    !!s.fail_note &&
    s.fail_usable === 1
  : true;
if (doReflow) results.pass = results.reflow?.pass === true;
if (doAxe) results.pass = results.axe?.pass === true;

await writeFile(join(OUT, 'g3b-planning-results.json'), JSON.stringify(results, null, 2));
console.log(JSON.stringify(results, null, 2));
process.exit(results.pass ? 0 : 1);
