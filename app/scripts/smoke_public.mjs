/**
 * Smoke público mínimo post-deploy. Sin stubs: servicios reales.
 * Uso: [QA_BASE_URL=https://…] node scripts/smoke_public.mjs
 */
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { createHash, randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { rasterContent } from './raster-content.mjs';
import { publicBaseSlash } from './qa-target.mjs';

const BASE = process.env.SMOKE_BASE ?? publicBaseSlash();
const runId = randomUUID();
const OUT = fileURLToPath(new URL(`../../evidence/public-smoke/${runId}/`, import.meta.url));
await mkdir(OUT, { recursive: true });
const report = {
  run_id: runId,
  utc: new Date().toISOString(),
  base: BASE,
  checks: [],
  rasters: []
};
const results = [];
const ok = (name, pass, note = '') => {
  results.push({ name, pass: !!pass, note });
  console.log(`${pass ? 'PASS' : 'FAIL'} ${name}${note ? ` — ${note}` : ''}`);
};

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
try {
  // 1) resultado (deep link edificio, Bilbao)
  await page.goto(`${BASE}?year=1952&place=bilbao&lat=43.263&lon=-2.935&z=14`, {
    waitUntil: 'load'
  });
  await page.waitForSelector('.headline-block h1', { timeout: 40000 });
  ok('result_headline', await page.locator('.headline-block h1').isVisible());
  report.build_stamp = await page.locator('meta[name="mjt:build"]').getAttribute('content');
  ok(
    'build_identity',
    process.env.EXPECTED_BUILD
      ? report.build_stamp === process.env.EXPECTED_BUILD
      : /^[a-f0-9]{40}$/.test(report.build_stamp ?? ''),
    report.build_stamp
  );

  // 2) view=time → timeline montado
  await page.goto(`${BASE}?year=1952&place=bilbao&lat=43.263&lon=-2.935&z=12&view=time`, {
    waitUntil: 'load'
  });
  await page.waitForSelector('.timeband', { timeout: 40000 }).catch(() => null);
  ok('time_timeline', await page.locator('.timeband').isVisible());

  // 3) foto aérea + comparación: swipe con ortofoto real (sin stubs)
  let orthoBytes = 0;
  let orthoUrls = 0;
  const rasterJobs = [];
  page.on('response', (r) => {
    const host = new URL(r.url()).hostname;
    if (
      ![
        'geo.bizkaia.eus',
        'opengis.bizkaia.eus',
        'www.geo.euskadi.eus',
        'geo.euskadi.eus'
      ].includes(host)
    )
      return;
    const ct = r.headers()['content-type'] ?? '';
    if (r.status() !== 200 || !ct.startsWith('image/')) return;
    orthoUrls++;
    if (rasterJobs.length >= 12) return;
    rasterJobs.push(
      (async () => {
        const body = await r.body().catch(() => Buffer.alloc(0));
        orthoBytes += body.length;
        return { body, type: ct, url: r.url() };
      })()
    );
  });
  await page.goto(`${BASE}?year=1987&place=leioa&view=swipe`, { waitUntil: 'load' });
  await page.waitForSelector('.headline-block h1', { timeout: 40000 });
  await page.waitForSelector('.swipe .handle', { timeout: 40000 }).catch(() => null);
  ok('swipe_handle', (await page.locator('.swipe .handle[role="slider"]').count()) === 1);
  ok(
    'swipe_chips',
    (await page.locator('.swipe .chip').count()) >= 2,
    (await page.locator('.swipe .chip').allTextContents()).join('|')
  );
  await page.waitForTimeout(8000); // teselas reales de ortofoto
  ok(
    'ortho_real_tiles',
    orthoBytes > 10000,
    `${orthoUrls} respuestas · ${Math.round(orthoBytes / 1024)} KB de imagen aérea`
  );
  for (const [i, raster] of (await Promise.all(rasterJobs)).entries()) {
    const decoded = await page.evaluate(
      async ({ base64, type }) => {
        try {
          const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
          const img = await createImageBitmap(new Blob([bytes], { type }));
          const canvas = new OffscreenCanvas(64, 64);
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, 64, 64);
          const value = {
            width: img.width,
            height: img.height,
            rgba: Array.from(ctx.getImageData(0, 0, 64, 64).data)
          };
          img.close();
          return value;
        } catch {
          return {};
        }
      },
      { base64: raster.body.toString('base64'), type: raster.type }
    );
    const verdict = rasterContent(decoded);
    const filename = `raster-${i}.${raster.type.includes('png') ? 'png' : 'jpg'}`;
    await writeFile(OUT + filename, raster.body);
    report.rasters.push({
      file: filename,
      url: raster.url,
      bytes: raster.body.length,
      sha256: createHash('sha256').update(raster.body).digest('hex'),
      ...verdict
    });
  }
  ok(
    'ortho_decoded_nonblank',
    report.rasters.some((r) => r.pass),
    `${report.rasters.filter((r) => r.pass).length}/${report.rasters.length} muestras no uniformes; no certifica geografía`
  );
  await page.screenshot({ path: OUT + 'swipe.png' });

  // 4) deep link tras recarga → mismo estado
  await page.reload({ waitUntil: 'load' });
  await page.waitForSelector('.headline-block h1', { timeout: 40000 });
  await page.waitForSelector('.swipe .handle', { timeout: 40000 }).catch(() => null);
  const state = await page.evaluate(() => ({
    mode: window.__mjtApp?.mode,
    year: window.__mjtApp?.year,
    swipe: document.querySelectorAll('.swipe .handle[role="slider"]').length
  }));
  ok(
    'reload_deeplink',
    state.mode === 'swipe' && state.year === 1987 && state.swipe === 1,
    JSON.stringify(state)
  );

  ok('no_pageerrors', errors.length === 0, errors.slice(0, 2).join(' | '));
} catch (error) {
  ok('completed', false, String(error));
  await page.screenshot({ path: OUT + 'failure.png' }).catch(() => {});
} finally {
  report.checks = results;
  report.errors = errors;
  report.pass = results.length > 0 && results.every((r) => r.pass);
  await writeFile(OUT + 'report.json', JSON.stringify(report, null, 2));
  await browser.close();
}
const fails = results.filter((r) => !r.pass);
console.log(`\nsmoke: ${results.length - fails.length}/${results.length} PASS`);
process.exit(fails.length ? 1 : 0);
