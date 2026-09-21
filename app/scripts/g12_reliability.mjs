import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';
import { createStaticServer } from './static-server.mjs';
import { installExternalStubs } from './fixtures.mjs';

// Prueba determinista: datos locales reales, imágenes externas simuladas.
const server = await createStaticServer('build', 4290);
const browser = await chromium.launch();
const out = '../evidence/g12-reliability';
const checks = [];
const errors = [];
await mkdir(out, { recursive: true });
try {
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true
  });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(e.message));
  await installExternalStubs(page);
  let release;
  const gate = new Promise((r) => {
    release = r;
  });
  let failing = true;
  await page.route('**/data/cells/*.json', async (route) => {
    await gate;
    if (failing) await route.fulfill({ status: 503, body: 'test unavailable' });
    else await route.continue();
  });
  await page.goto('http://localhost:4290/?year=1988&place=getxo');
  await page.waitForFunction(() => {
    const m = window.__mjtMap;
    return (
      m?.getLayer('cells-fill') &&
      m.queryRenderedFeatures({ layers: ['cells-fill'] }).some((f) => f.properties.known > 0)
    );
  });
  const pending = await page.evaluate(() => {
    const m = window.__mjtMap;
    return m
      .queryRenderedFeatures({ layers: ['cells-fill'] })
      .filter((f) => f.properties.known > 0)
      .map((f) =>
        m.getFeatureState({ source: 'cells', sourceLayer: 'cells', id: f.properties.fid ?? f.id })
      );
  });
  assert(pending.length > 0 && pending.every((s) => s.nodata !== true));
  checks.push('loading_not_no_known');
  release();
  await page.waitForSelector('.series-error');
  assert.match(await page.locator('.series-error').innerText(), /No significa/);
  checks.push('failure_explained');
  failing = false;
  await page.getByRole('button', { name: 'Reintentar carga de zonas' }).click();
  await page.waitForFunction(() => {
    const m = window.__mjtMap;
    return m.queryRenderedFeatures({ layers: ['cells-fill'] }).some((f) => {
      const s = m.getFeatureState({
        source: 'cells',
        sourceLayer: 'cells',
        id: f.properties.fid ?? f.id
      });
      return f.properties.known > 0 && typeof s.share === 'number' && s.nodata === false;
    });
  });
  checks.push('retry_recovers_shares');
  const fontSize = await page
    .locator('.mapintro')
    .evaluate((el) => parseFloat(getComputedStyle(el.querySelector('p')).fontSize));
  assert(fontSize >= 15);
  checks.push('explanation_readable');
  await page.locator('.mapcell').scrollIntoViewIfNeeded();
  const point = await page.evaluate(() => {
    const m = window.__mjtMap;
    for (const f of m.queryRenderedFeatures({ layers: ['cells-fill'] })) {
      if (f.properties.known <= 0 || f.geometry.type !== 'Polygon') continue;
      const ring = f.geometry.coordinates[0];
      const x = ring.map((p) => p[0]),
        y = ring.map((p) => p[1]);
      const p = m.project([
        (Math.min(...x) + Math.max(...x)) / 2,
        (Math.min(...y) + Math.max(...y)) / 2
      ]);
      const r = m.getCanvas().getBoundingClientRect();
      // el tap usa coordenadas de viewport: el punto debe caber en pantalla,
      // no solo dentro del rect del canvas (que continúa bajo el pliegue)
      const cy = r.top + p.y;
      if (p.x > 60 && p.x < r.width - 60 && cy > 90 && cy < innerHeight - 40)
        return { x: r.left + p.x, y: cy };
    }
  });
  assert(point, 'visible cell target');
  await page.touchscreen.tap(point.x, point.y);
  await page.waitForSelector('#cell-detail');
  assert.equal(await page.locator('.cell-tip').count(), 0);
  checks.push('touch_single_persistent_card');
  await page.locator('#cell-detail').scrollIntoViewIfNeeded();
  await page.screenshot({ path: `${out}/touch-card-stubbed.png` });
  await page.getByRole('button', { name: 'Acercar para ver los edificios por separado' }).click();
  await page.waitForFunction(() => window.__mjtApp.mapLevel === 'EDIFICIO');
  checks.push('zoom_reaches_building_level');

  // Descarga resuelta pero el fid no existe en la serie: inconsistencia
  // declarada («No se han podido obtener los datos de esta zona»), nunca
  // «cargando» indefinido ni trama de «sin año conocido».
  const ctx2 = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true
  });
  const page2 = await ctx2.newPage();
  page2.on('pageerror', (e) => errors.push(e.message));
  await installExternalStubs(page2);
  await page2.route('**/data/cells/*.json', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: '{}' })
  );
  await page2.goto('http://localhost:4290/?year=1988&place=getxo');
  await page2.waitForFunction(() => {
    const m = window.__mjtMap;
    return (
      m?.getLayer('cells-fill') &&
      m.queryRenderedFeatures({ layers: ['cells-fill'] }).some((f) => f.properties.known > 0)
    );
  });
  // esperar a que la serie «resuelta» (vacía) llegue antes de tocar
  await page2.waitForFunction(() => {
    const m = window.__mjtMap;
    return m
      .queryRenderedFeatures({ layers: ['cells-fill'] })
      .some(
        (f) =>
          f.properties.known > 0 &&
          m.getFeatureState({ source: 'cells', sourceLayer: 'cells', id: f.properties.fid ?? f.id })
            .share === null
      );
  });
  const pt2 = await page2.evaluate(() => {
    const m = window.__mjtMap;
    for (const f of m.queryRenderedFeatures({ layers: ['cells-fill'] })) {
      if (f.properties.known <= 0 || f.geometry.type !== 'Polygon') continue;
      const ring = f.geometry.coordinates[0];
      const x = ring.map((p) => p[0]),
        y = ring.map((p) => p[1]);
      const p = m.project([
        (Math.min(...x) + Math.max(...x)) / 2,
        (Math.min(...y) + Math.max(...y)) / 2
      ]);
      const r = m.getCanvas().getBoundingClientRect();
      const cy = r.top + p.y;
      if (p.x > 60 && p.x < r.width - 60 && cy > 90 && cy < innerHeight - 40)
        return { x: r.left + p.x, y: cy, fid: f.properties.fid ?? f.id };
    }
  });
  assert(pt2, 'visible cell target (missing fid)');
  await page2.touchscreen.tap(pt2.x, pt2.y);
  await page2.waitForSelector('#cell-detail');
  const cardText = await page2.locator('#cell-detail').innerText();
  assert.match(cardText, /No se han podido obtener los datos de esta zona/);
  assert(!/de \d[\d.]* edificios actuales/.test(cardText), 'sin frase N de K');
  assert(!/\d+,\d+\s?%/.test(cardText), 'sin porcentaje');
  const hatch = await page2.evaluate(
    (fid) =>
      window.__mjtMap.getFeatureState({ source: 'cells', sourceLayer: 'cells', id: fid }).nodata ===
      true,
    pt2.fid
  );
  assert.equal(hatch, false, 'fid ausente no lleva trama de «sin año conocido»');
  checks.push('resolved_missing_fid_declared');
  await ctx2.close();
  assert.equal(errors.length, 0, errors.join('\n'));
} finally {
  await writeFile(
    `${out}/checks.json`,
    JSON.stringify({ checks, errors, externalImages: 'stubbed' }, null, 2)
  );
  await browser.close();
  await new Promise((r) => server.close(r));
}
console.log(checks);
