/**
 * LAUNCH QA — smoke funcional cross-browser (Chromium + Firefox + WebKit).
 * Journey: hero → año+lugar → resultado → mapa → ortofoto → cambio de lugar.
 * Compatibilidad funcional, NO presupuestos PERF (preregistrados en Chromium).
 *
 * Extra QA (mismo script):
 *   --reflow   viewport 320×844: sin scroll horizontal, CTA operable
 *   --zoom400  Chromium a 400 % de zoom: contenido y función disponibles
 *
 * Salida: LAUNCH_OUT o ../evidence/launch-qa/
 * Uso: node scripts/launch_browser_smoke.mjs [--reflow] [--zoom400]
 */
import { chromium, firefox, webkit } from 'playwright';
import { writeFile, readFile, mkdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { createStaticServer } from './static-server.mjs';

const ROOT = resolve(process.cwd(), '..');
const BUILD = resolve(process.cwd(), 'build');
const OUT = process.env.LAUNCH_OUT || join(ROOT, 'evidence/launch-qa');
const PORT = 4178;
const doReflow = process.argv.includes('--reflow');
const doZoom400 = process.argv.includes('--zoom400');
const doEngines = !doReflow && !doZoom400;

await mkdir(OUT, { recursive: true });
const server = await createStaticServer(BUILD, PORT);
const results = { engines: {}, reflow: null, zoom400: null, utc: new Date().toISOString() };

async function journey(browserType, name) {
  const browser = await browserType.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errs = [];
  page.on('pageerror', (e) => errs.push(String(e).slice(0, 200)));
  const r = { consoleErrors: errs, steps: {} };
  try {
    await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'load' });
    await page.waitForSelector('.hero h1', { timeout: 20000 });
    r.steps.hero = true;
    await page.fill('#year-input', '1987');
    await page.fill('#place-input', 'Leioa');
    await page.waitForSelector('#place-listbox button', { timeout: 20000 });
    await page.click('#place-listbox button >> nth=0');
    await page.click('.cta');
    await page.waitForSelector('.headline-block h1', { timeout: 25000 });
    r.steps.result = (await page.locator('.headline-block h1').innerText()).slice(0, 80);
    await page.waitForSelector('.mapband canvas', { timeout: 30000 });
    r.steps.map_canvas = true;
    // ortofoto opt-in (G4: vía el modo FOTO del ViewSwitch)
    await page.click('.viewswitch button[data-mode="photo"]');
    await page.waitForTimeout(500);
    const btn = page.locator('.photo .btn').first();
    if (await btn.count()) {
      await btn.click();
      await page.waitForTimeout(5000);
      r.steps.ortho_state = (await page.locator('.photo .state').innerText()).slice(0, 120);
    }
    // cambio de lugar (catálogo local; no depende de NORA)
    // el formulario vive tras el toggle «Cambiar»
    await page.click('.change');
    await page.fill('#place-input', 'Getxo');
    await page.waitForSelector('#place-listbox button', { timeout: 20000 });
    await page.click('#place-listbox button >> nth=0');
    await page.waitForTimeout(3000);
    r.steps.place_change = (await page.locator('.headline-block h1').innerText()).slice(0, 80);
    await page.screenshot({ path: join(OUT, `smoke-${name}.png`) });
    r.pass = errs.length === 0 && !!(r.steps.hero && r.steps.result && r.steps.map_canvas);
  } catch (e) {
    r.pass = false;
    r.error = String(e).slice(0, 300);
    try {
      await page.screenshot({ path: join(OUT, `smoke-${name}-fail.png`) });
    } catch {
      /* noop */
    }
  }
  await browser.close();
  return r;
}

if (doEngines) {
  for (const [name, bt] of [
    ['chromium', chromium],
    ['firefox', firefox],
    ['webkit', webkit]
  ]) {
    results.engines[name] = await journey(bt, name);
    console.log(
      name,
      results.engines[name].pass ? 'PASS' : 'FAIL',
      results.engines[name].error || ''
    );
  }
}

if (doReflow) {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 320, height: 844 } });
  await page.goto(`http://localhost:${PORT}/?year=1987&place=leioa`, { waitUntil: 'load' });
  await page.waitForSelector('.headline-block h1', { timeout: 25000 });
  await page.waitForTimeout(3000);
  results.reflow = {
    hscroll: await page.evaluate(() => document.documentElement.scrollWidth > 320),
    headline: await page.locator('.headline-block h1').isVisible(),
    canvas: (await page.locator('.mapband canvas').count()) > 0
  };
  await page.screenshot({ path: join(OUT, 'reflow-320.png'), fullPage: true });
  await browser.close();
  console.log('reflow-320', JSON.stringify(results.reflow));
}

if (doZoom400) {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(`http://localhost:${PORT}/?year=1987&place=leioa`, { waitUntil: 'load' });
  await page.waitForSelector('.headline-block h1', { timeout: 25000 });
  await page.evaluate(() => {
    document.body.style.zoom = '400%';
  });
  await page.waitForTimeout(800);
  results.zoom400 = {
    headline: await page.locator('.headline-block h1').isVisible(),
    clipped: await page.evaluate(() => {
      const el = document.querySelector('.headline-block');
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return r.height === 0 || r.width === 0;
    })
  };
  await page.screenshot({ path: join(OUT, 'zoom-400.png') });
  await browser.close();
  console.log('zoom400', JSON.stringify(results.zoom400));
}

let prev = {};
try {
  prev = JSON.parse(await readFile(join(OUT, 'launch-smoke.json'), 'utf8'));
} catch {
  /* primera corrida */
}
const merged = {
  engines: { ...(prev.engines || {}), ...results.engines },
  reflow: results.reflow ?? prev.reflow ?? null,
  zoom400: results.zoom400 ?? prev.zoom400 ?? null,
  utc: results.utc
};
await writeFile(join(OUT, 'launch-smoke.json'), JSON.stringify(merged, null, 1));
await server.close();
console.log('→', join(OUT, 'launch-smoke.json'));
