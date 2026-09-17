/**
 * Diagnóstico: ¿por qué el preview local tarda ~5 s en P2 cuando el upstream
 * está degradado? Registra timing CDP de TODAS las requests tras el clic:
 * cuándo se emiten, cuándo llega el primer byte, cuándo terminan.
 * Uso: node scripts/readj_perf10_queue.mjs
 */
import { chromium } from 'playwright';
import { resolve } from 'node:path';
import { createStaticServer } from './static-server.mjs';
import { installLocalFixtures } from './fixtures.mjs';

const BUILD = resolve(process.cwd(), 'build');
const PORT = 4191;
const BASE = `http://localhost:${PORT}`;

const server = await createStaticServer(BUILD, PORT);
let browser;
for (const channel of ['chrome', 'msedge']) {
  try { browser = await chromium.launch({ channel, args: ['--disable-gpu'] }); break; } catch { /* next */ }
}
browser ??= await chromium.launch({ args: ['--disable-gpu'] });

const ctx = await browser.newContext({
  viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true,
});
const page = await ctx.newPage();
await installLocalFixtures(page);
const cdp = await ctx.newCDPSession(page);
await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
await cdp.send('Network.enable');
await cdp.send('Network.emulateNetworkConditions', {
  offline: false, latency: 150,
  downloadThroughput: (1.6 * 1024 * 1024) / 8, uploadThroughput: (750 * 1024) / 8,
});

const reqs = new Map();
cdp.on('Network.requestWillBeSent', (e) => {
  reqs.set(e.requestId, { url: e.request.url, sent: performance.now() });
});
cdp.on('Network.responseReceived', (e) => {
  const r = reqs.get(e.requestId);
  if (r) r.firstByte = performance.now();
});
cdp.on('Network.loadingFinished', (e) => {
  const r = reqs.get(e.requestId);
  if (r) r.done = performance.now();
});

// sesión caliente idéntica al harness: result listo → cambio de año → clic orto
await page.goto(`${BASE}/?year=1987&place=leioa`, { waitUntil: 'commit' });
await page.waitForSelector('.mapband canvas', { timeout: 30000 });
await page.waitForFunction(() => {
  const m = window.__mjtMap;
  return m?.areTilesLoaded?.() && m.queryRenderedFeatures().some((f) => f.source === 'cells');
}, null, { timeout: 30000 });

reqs.clear();
const t0 = performance.now();
await page.locator('.ortho .btn').first().click();
await page.waitForTimeout(12000);

const rows = [...reqs.values()]
  .filter((r) => /orto|ORTO|preview/i.test(r.url))
  .map((r) => ({
    url: r.url.replace(/^https?:\/\/[^/]+/, '').slice(0, 90),
    sent_ms: Math.round(r.sent - t0),
    ttfb_ms: r.firstByte ? Math.round(r.firstByte - t0) : null,
    done_ms: r.done ? Math.round(r.done - t0) : null,
  }))
  .sort((a, b) => a.sent_ms - b.sent_ms);
console.log(JSON.stringify(rows, null, 1));

await browser.close();
server.close();
