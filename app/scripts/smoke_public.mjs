/**
 * Smoke público mínimo post-deploy (gh-pages). Sin stubs: servicios reales.
 * Uso: node scripts/_smoke_public.mjs
 */
import { chromium } from 'playwright';

const BASE = 'https://huntsman1756.github.io/mas_joven_que_tu-/';
const results = [];
const ok = (name, pass, note = '') => {
  results.push({ name, pass: !!pass, note });
  console.log(`${pass ? 'PASS' : 'FAIL'} ${name}${note ? ` — ${note}` : ''}`);
};

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));

// 1) resultado (deep link edificio, Bilbao)
await page.goto(`${BASE}?year=1952&place=bilbao&lat=43.263&lon=-2.935&z=14`, {
  waitUntil: 'load'
});
await page.waitForSelector('.headline-block h1', { timeout: 40000 });
ok('result_headline', await page.locator('.headline-block h1').isVisible());

// 2) view=time → timeline montado
await page.goto(`${BASE}?year=1952&place=bilbao&lat=43.263&lon=-2.935&z=12&view=time`, {
  waitUntil: 'load'
});
await page.waitForSelector('.timeband', { timeout: 40000 }).catch(() => null);
ok('time_timeline', await page.locator('.timeband').isVisible());

// 3) foto aérea + comparación: swipe con ortofoto real (sin stubs)
let orthoBytes = 0;
let orthoUrls = 0;
page.on('response', async (r) => {
  if (!/geo\.bizkaia|geo\.euskadi/.test(r.url())) return;
  const ct = r.headers()['content-type'] ?? '';
  if (!ct.startsWith('image/')) return;
  orthoUrls++;
  orthoBytes += (await r.body().catch(() => Buffer.alloc(0))).length;
});
await page.goto(`${BASE}?year=1987&place=leioa&view=swipe`, { waitUntil: 'load' });
await page.waitForSelector('.headline-block h1', { timeout: 40000 });
await page.waitForSelector('.swipe .handle', { timeout: 40000 }).catch(() => null);
ok('swipe_handle', (await page.locator('.swipe .handle[role="slider"]').count()) === 1);
ok('swipe_chips', (await page.locator('.swipe .chip').count()) >= 2,
  (await page.locator('.swipe .chip').allTextContents()).join('|'));
await page.waitForTimeout(8000); // teselas reales de ortofoto
ok(
  'ortho_real_tiles',
  orthoBytes > 10000,
  `${orthoUrls} respuestas · ${Math.round(orthoBytes / 1024)} KB de imagen aérea`
);

// 4) deep link tras recarga → mismo estado
await page.reload({ waitUntil: 'load' });
await page.waitForSelector('.headline-block h1', { timeout: 40000 });
await page.waitForSelector('.swipe .handle', { timeout: 40000 }).catch(() => null);
const state = await page.evaluate(() => ({
  mode: window.__mjtApp?.mode,
  year: window.__mjtApp?.year,
  swipe: document.querySelectorAll('.swipe .handle[role="slider"]').length
}));
ok('reload_deeplink', state.mode === 'swipe' && state.swipe === 1, JSON.stringify(state));

ok('no_pageerrors', errors.length === 0, errors.slice(0, 2).join(' | '));
await browser.close();
const fails = results.filter((r) => !r.pass);
console.log(`\nsmoke: ${results.length - fails.length}/${results.length} PASS`);
process.exit(fails.length ? 1 : 0);
