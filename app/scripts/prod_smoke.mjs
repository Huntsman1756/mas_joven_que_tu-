// Sonda de producción SIN stubs — verifica el deploy real en GitHub Pages:
// base path, imágenes reales, NORA real, swipe 1988→1960 con ortofotos
// reales, /como-lo-sabemos directo, PMTiles Range. Falla ≠0 ante errores.
import { chromium } from 'playwright';

const BASE = 'https://huntsman1756.github.io/mas_joven_que_tu-';
const results = { checks: {}, failed_requests: [], pageerrors: [], pass: true };
const check = (name, ok, detail) => {
  results.checks[name] = { ok, ...(detail ? { detail } : {}) };
  if (!ok) results.pass = false;
};

const browser = await chromium.launch();

// 1) Carga inicial: base path sin duplicar, hero real, cero errores
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const failed = [];
  const errs = [];
  page.on('requestfailed', (r) => failed.push(`${r.failure()?.errorText} ${r.url().slice(0, 140)}`));
  page.on('response', (r) => {
    if (r.status() >= 400) failed.push(`HTTP${r.status()} ${r.url().slice(0, 140)}`);
  });
  page.on('pageerror', (e) => errs.push(String(e)));
  await page.goto(`${BASE}/`, { waitUntil: 'load' });
  await page.waitForTimeout(2500);
  const url = page.url();
  check('no_double_base', !url.includes('mas_joven_que_tu-/mas_joven_que_tu-'), url);
  const heroImgs = await page.locator('img').evaluateAll((els) =>
    els.map((i) => ({ src: i.src.slice(-60), ok: i.complete && i.naturalWidth > 0 }))
  );
  check('hero_images', heroImgs.length > 0 && heroImgs.every((i) => i.ok), heroImgs);

  // 2) Búsqueda real NORA: «getx» → Getxo
  await page.fill('#place-input', 'getx');
  await page.waitForSelector('[role="option"]', { timeout: 15000 });
  const opts = await page.locator('[role="option"]').allTextContents();
  check(
    'nora_search_getxo',
    opts.some((o) => /Getxo/i.test(o)),
    opts
  );
  await page.locator('[role="option"]').filter({ hasText: /Getxo/i }).first().click();

  // 3) Formulario año 1988 → resultado
  await page.fill('#year-input', '1988');
  await page.locator('button[type="submit"]').first().click();
  await page.waitForSelector('.headline-block h1', { timeout: 30000 });
  const h1 = await page.locator('.headline-block h1').textContent();
  check('headline_grammar', /^El .*%/.test(h1.trim()), h1.trim().slice(0, 120));

  // 4) Modo swipe (vista Antes/ahora)
  const reqs = [];
  page.on('request', (r) => reqs.push(r.url()));
  await page.locator('.vtoolbar button', { hasText: /fotograf|antes/i }).first().click();
  await page.waitForSelector('.swipe .handle, .swipe [role="slider"]', { timeout: 30000 });
  await page.waitForTimeout(1500);
  const chips0 = await page.locator('.swipe .chip').allTextContents();
  check('swipe_initial_chip_1989', chips0.some((c) => c.includes('1989')), chips0);

  // 5) Editar año 1988→1960 dentro del comparador: chip y requests reales
  reqs.length = 0;
  await page.locator('button.change').first().click();
  await page.fill('#edit-year', '1960');
  await page.locator('.cf-submit').click();
  await page.waitForFunction(
    () => [...document.querySelectorAll('.swipe .chip')].some((c) => c.textContent.includes('1956')),
    { timeout: 30000 }
  );
  await page.waitForTimeout(2500);
  const chips1 = await page.locator('.swipe .chip').allTextContents();
  const req1956 = reqs.filter((u) => u.includes('ORTO_BFA_1956'));
  const req1989 = reqs.filter((u) => u.includes('ORTO_BFA_1989'));
  check('swipe_chip_1956', chips1.some((c) => c.includes('1956')), chips1);
  check('swipe_real_1956_requests', req1956.length > 0, `${req1956.length} req`);
  check('swipe_no_stale_1989', req1989.length === 0, `${req1989.length} req`);

  // 6) Atribución por lado real (sin stubs): menciona organismo y 1953-55
  const attr = await page.locator('.swipe').textContent();
  check(
    'swipe_attr_1956_honest',
    /1953/.test(attr) && /1955/.test(attr) && /desconocida/i.test(attr),
    attr.slice(0, 240)
  );

  // ERR_ABORTED = MapLibre cancelando teselas al mover la cámara (benigno)
  const realFailed = failed.filter((f) => !f.startsWith('net::ERR_ABORTED'));
  check('no_pageerrors_main', errs.length === 0, errs);
  check('no_failed_requests', realFailed.length === 0, realFailed.slice(0, 8));
  results.failed_requests = failed;
  results.pageerrors = errs;
  await page.screenshot({ path: 'evidence/g11/prod-swipe-1956.png' });
  await page.close();
}

// 7) /como-lo-sabemos directo en producción
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errs = [];
  page.on('pageerror', (e) => errs.push(String(e)));
  await page.goto(`${BASE}/como-lo-sabemos`, { waitUntil: 'load' });
  await page.waitForTimeout(1200);
  const probe = await page.evaluate(() => {
    const cs = getComputedStyle(document.body);
    const root = getComputedStyle(document.documentElement);
    return {
      ink: root.getPropertyValue('--ink').trim(),
      margin: cs.margin,
      bg: cs.backgroundColor,
      h1: document.querySelector('h1')?.textContent?.trim()
    };
  });
  check('methodology_styles', probe.ink !== '' && probe.margin === '0px', probe);
  check('methodology_h1', /Cómo lo sabemos/i.test(probe.h1 || ''), probe.h1);
  check('methodology_no_errors', errs.length === 0, errs);
  await page.close();
}

// 8) PMTiles Range en producción
{
  const r = await fetch(`${BASE}/data/cells.pmtiles`, {
    headers: { Range: 'bytes=0-16383' }
  });
  const cr = r.headers.get('content-range');
  const buf = await r.arrayBuffer();
  check(
    'pmtiles_range',
    r.status === 206 && /^bytes 0-16383\//.test(cr || '') && buf.byteLength === 16384,
    `${r.status} content-range=${cr} bytes=${buf.byteLength}`
  );
}

await browser.close();
console.log(JSON.stringify(results, null, 2));
process.exit(results.pass ? 0 : 1);
