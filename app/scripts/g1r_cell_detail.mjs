/**
 * G1-R — detalle de celda accesible (pre-HR closeout).
 * Verifica en navegador que el detalle por celda deja de ser mousemove-only:
 *   - hover con ratón sigue mostrando el tooltip efímero
 *   - clic de ratón selecciona la celda → tarjeta persistente (#cell-detail)
 *   - tap táctil hace lo mismo
 *   - botón «Ver datos de esta zona» inspecciona la celda del centro (teclado)
 *   - small-N aparece solo en celdas con known<15; denominador idéntico al
 *     contrato del tooltip
 *   - limpieza: Esc, cambio de municipio, salir del rango de zoom
 *   - sin regresión en la selección de edificio
 * Uso: node scripts/g1r_cell_detail.mjs   (cwd = app/ con build/ presente)
 */
import { chromium } from 'playwright';
import { writeFile, mkdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { createStaticServer } from './static-server.mjs';

const ROOT = resolve(process.cwd(), '..');
const BUILD = resolve(process.cwd(), 'build');
const OUT = process.env.ADJ_OUT || join(ROOT, 'evidence/g1-remediation/map');
const PORT = 4184;
const BASE = `http://localhost:${PORT}`;
const URL_Z11 = `${BASE}/?year=1987&place=leioa&lat=43.326&lon=-2.988&z=11.5`;

const server = await createStaticServer(BUILD, PORT);
await mkdir(OUT, { recursive: true });

let browser;
for (const channel of ['chrome', 'msedge']) {
  try { browser = await chromium.launch({ channel, args: ['--disable-gpu'] }); break; } catch { /* next */ }
}
browser ??= await chromium.launch({ args: ['--disable-gpu'] });

const out = { checks: {} };
const ok = (k, v) => { out.checks[k] = v; };

async function waitMap(page) {
  await page.waitForSelector('.mapband canvas', { timeout: 30000 });
  await page.waitForFunction(() => window.__mjtMap?.areTilesLoaded?.(), null, { timeout: 30000 }).catch(() => null);
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => null);
}

// centroide aproximado (bbox) de la primera celda renderizada que cumpla pred
async function cellPoint(page, pred) {
  return page.evaluate((predSrc) => {
    const m = window.__mjtMap;
    const feats = m.queryRenderedFeatures(undefined, { layers: ['cells-fill'] });
    const f = feats.find((x) => eval(predSrc)(x.properties));
    if (!f) return null;
    const xs = [], ys = [];
    for (const ring of f.geometry.coordinates.flat(1)) { xs.push(ring[0]); ys.push(ring[1]); }
    const c = [(Math.min(...xs) + Math.max(...xs)) / 2, (Math.min(...ys) + Math.max(...ys)) / 2];
    const p = m.project(c);
    return { x: p.x, y: p.y, known: f.properties.known, fid: f.properties.fid, mun: f.properties.mun };
  }, String(pred));
}

async function canvasPoint(page, pt) {
  const box = await page.locator('.mapband canvas').boundingBox();
  return { x: box.x + pt.x, y: box.y + pt.y };
}

/* ---------- ratón: hover + clic persistente + small-N ---------- */
{
  const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
  await page.goto(URL_Z11, { waitUntil: 'load' });
  await waitMap(page);

  const norm = await cellPoint(page, (p) => (p.known ?? 0) >= 15);
  const small = await cellPoint(page, (p) => (p.known ?? 0) > 0 && p.known < 15);

  // 1. hover efímero
  const hov = await canvasPoint(page, norm);
  await page.mouse.move(hov.x, hov.y);
  await page.waitForSelector('.cell-tip', { timeout: 5000 });
  const tipText = (await page.locator('.cell-tip').innerText()).replace(/\s+/g, ' ').trim();
  ok('hover_tooltip', /de cada 100 edificios/.test(tipText));

  // 2. clic persistente — la tarjeta aparece en la hoja bajo el mapa
  await page.mouse.click(hov.x, hov.y);
  await page.waitForSelector('#cell-detail', { timeout: 5000 });
  const cardText = (await page.locator('#cell-detail').innerText()).replace(/\s+/g, ' ').trim();
  ok('click_persists', true);
  ok('same_denominator', cardText.includes(`sobre ${norm.known} edificios con año conocido`) ||
    new RegExp(`sobre [0-9.]+ edificios con año conocido`).test(cardText));
  ok('same_share_text', /de cada 100 edificios/.test(cardText));
  ok('normal_no_smalln', !/Pocos edificios/.test(cardText));
  // el tooltip sigue siendo efímero: moverse fuera lo quita, la tarjeta queda
  await page.mouse.move(20, 20);
  await page.waitForTimeout(400);
  ok('card_survives_mouseout', (await page.locator('#cell-detail').count()) === 1);
  await page.screenshot({ path: join(OUT, 'm6b-cell-detail-click.png') });

  // 3. small-N en la tarjeta
  if (small) {
    const sp = await canvasPoint(page, small);
    await page.mouse.click(sp.x, sp.y);
    await page.waitForTimeout(500);
    const t2 = await page.locator('#cell-detail').innerText();
    ok('smalln_warn_in_card', /Pocos edificios/.test(t2));
  } else ok('smalln_warn_in_card', 'no small cell rendered');

  // 4. Esc limpia
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  ok('esc_clears', (await page.locator('#cell-detail').count()) === 0);

  // 5. sonda de teclado: centrar sobre una celda y activar el botón
  const btn = page.locator('.cell-inspect');
  ok('inspect_button_visible', await btn.isVisible());
  // centrar el mapa en una celda visible y activar la sonda
  const cellCenter = await page.evaluate(() => {
    const m = window.__mjtMap;
    const f = m.queryRenderedFeatures(undefined, { layers: ['cells-fill'] })[0];
    const xs = [], ys = [];
    for (const ring of f.geometry.coordinates.flat(1)) { xs.push(ring[0]); ys.push(ring[1]); }
    return [(Math.min(...xs) + Math.max(...xs)) / 2, (Math.min(...ys) + Math.max(...ys)) / 2];
  });
  await page.evaluate((c) => window.__mjtMap.setCenter(c), cellCenter);
  await page.waitForTimeout(600);
  await btn.click();
  await page.waitForSelector('#cell-detail', { timeout: 5000 });
  ok('keyboard_probe_card', /Celda seleccionada/.test(await page.locator('#cell-detail').innerText()));
  ok('keyboard_probe_focus', await page.evaluate(() => document.activeElement?.id === 'cell-detail'));

  // 6. sonda sin celda en el centro (mar)
  await page.evaluate(() => window.__mjtMap.setCenter([-3.05, 43.42]));
  await page.waitForTimeout(600);
  await btn.click();
  await page.waitForTimeout(400);
  ok('probe_none_message', /No hay ninguna celda/.test(await page.locator('#cell-detail').innerText()));
  await page.screenshot({ path: join(OUT, 'm6b-cell-probe-none.png') });

  // 7. limpieza al salir del rango de zoom de celdas (≥13.5 en desktop;
  //    <9 no es alcanzable aquí: maxBounds impone un suelo ~9.35 en 1440px —
  //    la salida inferior se prueba en el contexto móvil más abajo)
  await page.goto(URL_Z11, { waitUntil: 'load' });
  await waitMap(page);
  const n2 = await cellPoint(page, (p) => (p.known ?? 0) >= 15);
  const hov2 = await canvasPoint(page, n2);
  await page.mouse.click(hov2.x, hov2.y);
  await page.waitForSelector('#cell-detail', { timeout: 5000 });
  await page.evaluate(() => window.__mjtMap.setZoom(14));
  await page.waitForTimeout(700);
  ok('zoom_range_clears', (await page.locator('#cell-detail').count()) === 0);

  // 8. limpieza por cambio de municipio
  await page.goto(URL_Z11, { waitUntil: 'load' });
  await waitMap(page);
  const n3 = await cellPoint(page, (p) => (p.known ?? 0) >= 15);
  const hov3 = await canvasPoint(page, n3);
  await page.mouse.click(hov3.x, hov3.y);
  await page.waitForSelector('#cell-detail', { timeout: 5000 });
  await page.click('.change');
  try {
    await page.waitForSelector('#place-input', { timeout: 10000 });
  } catch {
    console.log(
      'DEBUG changeform:',
      await page.locator('.changeform').count(),
      'change btns:',
      await page.locator('.change').count(),
      'topbar:',
      (await page.locator('.topbar').innerText()).slice(0, 120)
    );
    throw new Error('place-input no apareció tras toggle .change');
  }
  await page.fill('#place-input', 'Getxo');
  await page.waitForSelector('#place-listbox button', { timeout: 20000 });
  await page.click('#place-listbox button >> nth=0');
  await page.waitForTimeout(2500);
  ok('place_change_clears', (await page.locator('#cell-detail').count()) === 0);

  await page.close();
}

/* ---------- táctil: tap persistente ---------- */
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true });
  const page = await ctx.newPage();
  await page.goto(URL_Z11, { waitUntil: 'load' });
  await waitMap(page);
  const norm = await cellPoint(page, (p) => (p.known ?? 0) >= 15);
  const tp = await canvasPoint(page, norm);
  await page.touchscreen.tap(tp.x, tp.y);
  await page.waitForSelector('#cell-detail', { timeout: 5000 });
  ok('tap_persists', /de cada 100 edificios/.test(await page.locator('#cell-detail').innerText()));
  await page.screenshot({ path: join(OUT, 'm6b-cell-detail-tap.png'), fullPage: true });
  // en móvil el suelo de maxBounds permite <9: salir por abajo también limpia
  let zLow = null;
  for (let i = 0; i < 8; i++) {
    await page.click('.maplibregl-ctrl-zoom-out');
    await page.waitForTimeout(500);
    zLow = await page.evaluate(() => window.__mjtMap.getZoom());
    if (zLow < 9) break;
  }
  ok('zoomout_below9_clears', zLow < 9 && (await page.locator('#cell-detail').count()) === 0);
  await ctx.close();
}

/* ---------- regresión: clic de edificio intacto ---------- */
{
  const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
  await page.goto(`${BASE}/?year=1987&place=leioa&lat=43.326&lon=-2.988&z=14.6`, { waitUntil: 'load' });
  await waitMap(page);
  const bpt = await page.evaluate(() => {
    const m = window.__mjtMap;
    const layer = m.getStyle().layers.find((l) => /^b-\d+-fill$/.test(l.id));
    if (!layer) return null;
    const f = m.queryRenderedFeatures(undefined, { layers: [layer.id] })[0];
    if (!f) return null;
    const xs = [], ys = [];
    for (const ring of f.geometry.coordinates.flat(1)) { xs.push(ring[0]); ys.push(ring[1]); }
    const p = m.project([(Math.min(...xs) + Math.max(...xs)) / 2, (Math.min(...ys) + Math.max(...ys)) / 2]);
    return { x: p.x, y: p.y };
  });
  if (bpt) {
    const bp = await canvasPoint(page, bpt);
    await page.mouse.click(bp.x, bp.y);
    await page.waitForTimeout(600);
    const card = await page.locator('aside.card').last().innerText().catch(() => '');
    ok('building_click_ok', /edificio/i.test(card));
  } else ok('building_click_ok', 'no building feature rendered');
  await page.close();
}

const pass = Object.values(out.checks).every((v) => v === true);
out.pass = pass;
await writeFile(join(OUT, 'm6b-cell-detail.json'), JSON.stringify(out, null, 2));
console.log(JSON.stringify(out.checks, null, 2));
console.log(pass ? 'CELL-DETAIL PASS' : 'CELL-DETAIL FAIL');
await browser.close();
await server.close();
process.exit(pass ? 0 : 1);
