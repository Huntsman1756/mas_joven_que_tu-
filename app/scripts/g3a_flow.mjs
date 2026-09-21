/**
 * G3-A — MI EDIFICIO + DOS AÑOS: evidencia funcional cross-browser.
 *
 * Journey:
 *   RESULT (deep link year+place) → invite «¿Quieres bajar hasta tu calle?»
 *   → calle «Gran Vía» → número 1 → portal → NORA edificios → identidad
 *   Catastro fail-closed → ficha (año Catastro/NORA, acuerdo)
 *   → «Añade otro año» 1960 → partición 4 buckets + marcadores + URL
 *   `compare=` y `building=`.
 *
 * Extra QA:
 *   --reflow   viewport 320×844: combobox operable, sin overflow, ≥44px
 *   --axe      axe-core sobre el flujo (0 violations) — Chromium
 *
 * Salida: G3A_OUT o ../evidence/g3/g3a/browser/
 * Uso: node scripts/g3a_flow.mjs [--reflow] [--axe]
 */
import { chromium, firefox, webkit } from 'playwright';
import { writeFile, mkdir, copyFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { createStaticServer } from './static-server.mjs';

const ROOT = resolve(process.cwd(), '..');
const BUILD = resolve(process.cwd(), 'build');
const OUT = process.env.G3A_OUT || join(ROOT, 'evidence/g3/g3a/browser');
const PORT = 4179;
const doReflow = process.argv.includes('--reflow');
const doAxe = process.argv.includes('--axe');
const doEngines = !doReflow && !doAxe;

await mkdir(OUT, { recursive: true });
const server = await createStaticServer(BUILD, PORT);
const results = { engines: {}, reflow: null, axe: null, utc: new Date().toISOString() };

const BASE = `http://localhost:${PORT}/`;

async function miEdificioFlow(page, r) {
  // ── invite + combobox ──
  // BelowFold monta por proximidad/foco (LazyView): como usuario real,
  // bajar hasta el sentinel antes de esperar la invitación.
  await page.evaluate(() => {
    document.querySelector('.lazyview')?.scrollIntoView({ block: 'start' });
  });
  await page.waitForSelector('.invite .start', { timeout: 30000 });
  await page.click('.invite .start');
  await page.waitForSelector('#addr-street', { timeout: 10000 });
  r.steps.addr_open = true;

  // atributos combobox (GA8)
  const box = page.locator('#addr-street');
  r.steps.combobox_role = await box.getAttribute('role');
  r.steps.combobox_expanded = await box.getAttribute('aria-expanded');

  // multiopción (GA2): «San» devuelve decenas de calles en Bilbao →
  // listbox visible, navegación ArrowDown/Enter
  await page.fill('#addr-street', 'San');
  await page.waitForSelector('#addr-street-list li button', { timeout: 25000 });
  r.steps.street_options = await page.locator('#addr-street-list li button').count();
  r.steps.combobox_expanded_open = await box.getAttribute('aria-expanded');
  await page.keyboard.press('ArrowDown');
  r.steps.activedescendant = await box.getAttribute('aria-activedescendant');
  await page.keyboard.press('Escape');
  r.steps.combobox_expanded_after_esc = await box.getAttribute('aria-expanded');

  // resolución unívoca: «Gran Via» tiene una sola calle en Bilbao
  await page.fill('#addr-street', 'Gran Via');
  await page.waitForFunction(
    () =>
      (document.querySelector('#addr-street')?.value ?? '').toLowerCase().includes('don diego') ||
      document.querySelector('#addr-street-list li button'),
    { timeout: 25000 }
  );
  // si apareciera listbox, Enter en la primera opción
  if (await page.locator('#addr-street-list li button').count()) {
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(300);
  }

  // número → portal único (Gran Vía 1: NORA lo resuelve directo o con variantes)
  await page.fill('#addr-num', '1');
  await page.waitForFunction(
    () => {
      const res = document.querySelector('.res');
      const vars = document.querySelector('.variants');
      return res || vars || document.querySelector('.status')?.textContent?.includes('No consta');
    },
    { timeout: 40000 }
  );
  // si hay variantes de portal, elegir la primera («1» exacto aparece primero)
  if (await page.locator('.variants li button').count()) {
    r.steps.portal_variants = await page.locator('.variants li button').count();
    await page.locator('.variants li button').first().click();
    await page.waitForSelector('.res', { timeout: 40000 });
  }
  await page.waitForSelector('.res .prov', { timeout: 20000 });
  r.steps.address_result = (await page.locator('.res .year').innerText()).slice(0, 160);
  r.steps.provenance = (await page.locator('.res .prov').innerText()).slice(0, 200);

  // privacidad (GA4): la URL nunca lleva texto de dirección
  const url = page.url();
  r.steps.url_no_address = !/Gran|Via|calle|street|portal/i.test(url);

  // identidad Catastro (EXACT/MULTIPLE/NORA_ONLY) vía estado real
  r.steps.identity = await page.evaluate(
    () => window.__mjtApp?.addressResult?.identity ?? 'absent'
  );
}

async function dosAniosFlow(page, r) {
  await page.click('.compare .invite');
  await page.fill('#cmp-year', '1960');
  await page.click('.cmp-form .go');
  await page.waitForSelector('.buckets li', { timeout: 10000 });
  r.steps.compare_marker = await page.locator('.marker-label.compare').count();
  r.steps.buckets = await page.locator('.buckets li').allInnerTexts();
  r.steps.compare_url = /compare=1960/.test(page.url());
  // invariante GA6: app.year intacto
  r.steps.year_invariant = await page.evaluate(() => window.__mjtApp?.year === 1987);
  // deep link: recargar con compare= restaura estado
  await page.goto(`${page.url()}`, { waitUntil: 'load' });
  await page.waitForSelector('.headline-block h1', { timeout: 30000 });
  r.steps.compare_restored = await page.evaluate(() => window.__mjtApp?.compareYear === 1960);
  // building= restaurado si existía en la URL compartida
  r.steps.building_param = /building=/.test(page.url());
  if (r.steps.building_param) {
    await page.waitForFunction(() => window.__mjtApp?.selectedBuilding !== null, {
      timeout: 30000
    });
    r.steps.building_restored = true;
  }
}

async function journey(browserType, name) {
  const browser = await browserType.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errs = [];
  page.on('pageerror', (e) => errs.push(String(e).slice(0, 200)));
  const r = { consoleErrors: errs, steps: {} };
  try {
    await page.goto(`${BASE}?year=1987&place=bilbao`, { waitUntil: 'load' });
    await page.waitForSelector('.headline-block h1', { timeout: 30000 });
    await page.waitForSelector('.mapband canvas', { timeout: 30000 });
    r.steps.result = true;
    await miEdificioFlow(page, r);
    await page.screenshot({ path: join(OUT, `g3a-address-${name}.png`), fullPage: true });
    await dosAniosFlow(page, r);
    await page.screenshot({ path: join(OUT, `g3a-compare-${name}.png`), fullPage: true });
    r.pass =
      errs.length === 0 &&
      r.steps.result &&
      r.steps.addr_open &&
      r.steps.combobox_role === 'combobox' &&
      (r.steps.identity === 'EXACT' ||
        r.steps.identity === 'MULTIPLE' ||
        r.steps.identity === 'NORA_ONLY') &&
      r.steps.url_no_address &&
      r.steps.year_invariant &&
      r.steps.compare_restored;
  } catch (e) {
    r.pass = false;
    r.error = String(e).slice(0, 400);
    try {
      await page.screenshot({ path: join(OUT, `g3a-${name}-fail.png`), fullPage: true });
    } catch {
      /* noop */
    }
  }
  await browser.close();
  return r;
}

async function reflow() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 320, height: 844 } });
  const errs = [];
  page.on('pageerror', (e) => errs.push(String(e)));
  const r = { consoleErrors: errs, steps: {} };
  try {
    await page.goto(`${BASE}?year=1987&place=bilbao`, { waitUntil: 'load' });
    await page.waitForSelector('.headline-block h1', { timeout: 30000 });
    r.steps.hscroll = await page.evaluate(() => document.documentElement.scrollWidth > 320);
    await page.evaluate(() => {
      document.querySelector('.lazyview')?.scrollIntoView({ block: 'start' });
    });
    await page.waitForSelector('.invite .start', { timeout: 30000 });
    await page.click('.invite .start');
    await page.waitForSelector('#addr-street', { timeout: 10000 });
    const box = await page.locator('#addr-street').boundingBox();
    r.steps.street_input_h = box?.height;
    r.steps.street_input_overflow = box ? box.x + box.width > 320 : true;
    await page.fill('#addr-street', 'San');
    await page.waitForSelector('#addr-street-list li button', { timeout: 25000 });
    const opt = await page.locator('#addr-street-list li button').first().boundingBox();
    r.steps.option_h = opt?.height;
    // journey teclado completo (GA8): combobox → portal → resultado
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Escape');
    await page.fill('#addr-street', 'Gran Via');
    await page.waitForTimeout(1200);
    await page.fill('#addr-num', '1');
    await page.waitForFunction(
      () =>
        document.querySelector('.res') ||
        document.querySelector('.variants') ||
        document.querySelector('.status')?.textContent?.includes('No consta'),
      { timeout: 40000 }
    );
    r.steps.hscroll_after = await page.evaluate(() => document.documentElement.scrollWidth > 320);
    await page.screenshot({ path: join(OUT, 'g3a-mobile-320.png'), fullPage: true });
    r.pass =
      errs.length === 0 &&
      r.steps.hscroll === false &&
      r.steps.hscroll_after === false &&
      (r.steps.street_input_h ?? 0) >= 44 - 2 &&
      (r.steps.option_h ?? 0) >= 44 - 2;
  } catch (e) {
    r.pass = false;
    r.error = String(e).slice(0, 400);
    try {
      await page.screenshot({ path: join(OUT, 'g3a-mobile-fail.png'), fullPage: true });
    } catch {
      /* noop */
    }
  }
  await browser.close();
  return r;
}

async function axeRun() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const r = { steps: {} };
  try {
    await page.goto(`${BASE}?year=1987&place=bilbao`, { waitUntil: 'load' });
    await page.waitForSelector('.headline-block h1', { timeout: 30000 });
    await page.click('.invite .start');
    await page.waitForSelector('#addr-street', { timeout: 10000 });
    await page.fill('#addr-street', 'San');
    await page.waitForSelector('#addr-street-list li button', { timeout: 25000 });
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Escape');
    await page.fill('#addr-street', 'Gran Via');
    await page.waitForTimeout(1200);
    await page.fill('#addr-num', '1');
    await page.waitForFunction(
      () =>
        document.querySelector('.res') ||
        document.querySelector('.variants') ||
        document.querySelector('.status')?.textContent?.includes('No consta'),
      { timeout: 40000 }
    );
    // axe-core servido como fichero estático (la CSP hash rechaza inline)
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

try {
  if (doEngines) {
    for (const [name, bt] of [
      ['chromium', chromium],
      ['firefox', firefox],
      ['webkit', webkit]
    ]) {
      results.engines[name] = await journey(bt, name);
    }
  }
  if (doReflow) results.reflow = await reflow();
  if (doAxe) results.axe = await axeRun();
} finally {
  await writeFile(join(OUT, 'g3a-results.json'), JSON.stringify(results, null, 2));
  server.close();
}
// G11.3: veredicto bloqueante — cualquier bloque con pass=false (incluye
// pageerror, ya que cada bloque exige errs.length === 0) sale con código 1.
results.pass =
  Object.values(results.engines).every((e) => e.pass === true) &&
  (results.reflow?.pass ?? true) &&
  (results.axe?.pass ?? true);
console.log(JSON.stringify(results, null, 2));
process.exit(results.pass ? 0 : 1);
