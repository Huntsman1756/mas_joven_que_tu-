/**
 * G1 — diagnóstico PERF10 (post-FAIL corregido, §10): descompone la primera
 * tesela orto bajo P2: cuándo se emite la petición, TTFB, transferencia,
 * tamaño, y concurrencia con la sonda WMS. Sin efecto en el gate.
 */
import { chromium } from 'playwright';
import { writeFile, mkdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { createStaticServer } from './static-server.mjs';
import { installLocalFixtures } from './fixtures.mjs';

const BUILD = resolve(process.cwd(), 'build');
const OUT = resolve(process.cwd(), '../out/perf10');
const PORT = 4196;
const BASE = `http://localhost:${PORT}`;

const server = await createStaticServer(BUILD, PORT);
await mkdir(OUT, { recursive: true });

const browser = await chromium.launch({ args: ['--disable-gpu'] });

async function diag(rep) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  await installLocalFixtures(page);
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  await cdp.send('Network.enable');
  await cdp.send('Network.emulateNetworkConditions', {
    offline: false, latency: 150, downloadThroughput: (1.6 * 1024 * 1024) / 8, uploadThroughput: (750 * 1024) / 8,
  });

  // timing por request vía CDP
  const reqs = new Map();
  const order = [];
  cdp.on('Network.requestWillBeSent', (e) => {
    if (/geo\.bizkaia\.eus|geo\.euskadi\.eus/.test(e.request.url)) {
      reqs.set(e.requestId, { url: e.request.url.slice(0, 160), t0: e.timestamp, type: e.type });
      order.push(e.requestId);
    }
  });
  cdp.on('Network.responseReceived', (e) => {
    const r = reqs.get(e.requestId); if (r) { r.ttfb = e.timestamp; r.status = e.response.status; }
  });
  cdp.on('Network.loadingFinished', (e) => {
    const r = reqs.get(e.requestId); if (r) { r.end = e.timestamp; r.bytes = e.encodedDataLength; }
  });
  cdp.on('Network.loadingFailed', (e) => {
    const r = reqs.get(e.requestId); if (r) { r.end = e.timestamp; r.failed = e.errorText; }
  });

  await page.goto(`${BASE}/?year=1987&place=leioa`, { waitUntil: 'commit' });
  await page.waitForSelector('.headline-block h1', { timeout: 25000 });
  await page.waitForSelector('.mapband canvas', { timeout: 30000 });
  await page.waitForFunction(() => window.__mjtMap?.areTilesLoaded?.(), null, { timeout: 30000 }).catch(() => null);
  await page.waitForTimeout(500);

  const tClick = await page.evaluate(() => performance.now());
  await page.locator('.ortho .btn').first().click();
  await page.waitForFunction(() => window.__mjtMap?.areTilesLoaded?.(), null, { timeout: 30000 }).catch(() => null);
  const nav0 = await page.evaluate(() => performance.getEntriesByType('navigation')[0]?.startTime ?? 0);

  await ctx.close();
  const list = order.map((id) => reqs.get(id)).map((r) => ({
    url: r.url,
    kind: r.url.includes('WMS') || r.url.includes('GetMap') || r.url.includes('wms') ? 'probe/other' : (r.url.match(/\.(jpg|jpeg|png|webp)/i) ? 'raster-tile' : 'other'),
    start_ms: r.t0 !== undefined ? Math.round(r.t0 * 1000) : null,
    ttfb_ms: r.ttfb !== undefined && r.t0 !== undefined ? Math.round((r.ttfb - r.t0) * 1000) : null,
    total_ms: r.end !== undefined && r.t0 !== undefined ? Math.round((r.end - r.t0) * 1000) : null,
    bytes: r.bytes ?? null,
    status: r.status ?? null,
    failed: r.failed ?? null,
  }));
  // CDP timestamps are monotonic s — convertir respecto al clic:
  // performance.now() es ms desde timeOrigin; CDP timestamp tb desde epoch similar (monotonic).
  // Referencia: primer request externo tras el clic.
  const first = list.find((r) => r.kind === 'raster-tile');
  return { rep, tClick: Math.round(tClick), nav0: Math.round(nav0), n_external: list.length, requests: list, first_tile: first ?? null };
}

const runs = [];
for (let i = 0; i < 3; i++) runs.push(await diag(i));
await writeFile(join(OUT, 'perf10-request-decomp.json'), JSON.stringify({ meta: { candidate: '53b1e8a', utc: new Date().toISOString() }, runs }, null, 1));
for (const r of runs) {
  console.log(`rep${r.rep}: ${r.n_external} external reqs`);
  for (const q of r.requests.slice(0, 8)) {
    console.log(`   ${q.kind.padEnd(11)} ttfb=${q.ttfb_ms}ms total=${q.total_ms}ms bytes=${q.bytes} ${q.url.slice(0, 110)}`);
  }
}
await browser.close();
server.close();
