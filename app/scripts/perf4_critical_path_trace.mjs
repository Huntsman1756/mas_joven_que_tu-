/**
 * PERF4-R2 — traza del critical path (diagnóstico, NO timing de gate).
 *
 * Una navegación P2 (390×844 DSF3, CPU×4, Slow4G CDP) a
 * ?year=1987&place=leioa capturando:
 *
 *   - waterfall de requests (CDP Network: inicio, fin, encodedDataLength)
 *   - long tasks del hilo principal (PerformanceObserver)
 *   - hitos: headline, lead2, canvas, tiles loaded, equivalente a
 *     t_result_ready (misma condición del harness: celda renderizada)
 *
 * Salida: TRACE_OUT (json) o stdout.
 * Uso: TRACE_OUT=x.json node scripts/perf4_critical_path_trace.mjs
 */
import { chromium } from 'playwright';
import { writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { createStaticServer } from './static-server.mjs';

const ROOT = resolve(process.cwd(), '..');
const BUILD = resolve(process.cwd(), 'build');
const OUT = process.env.TRACE_OUT || join(ROOT, 'evidence/g3/g3d/perf4-remediation-r2/trace.json');
const PORT = 4188;

const server = await createStaticServer(BUILD, PORT);
const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 3,
  isMobile: true,
  hasTouch: true
});
const page = await ctx.newPage();

// long tasks desde el inicio de la navegación
await page.addInitScript(() => {
  window.__lt = [];
  new PerformanceObserver((l) => {
    for (const e of l.getEntries()) {
      window.__lt.push({ start: e.startTime, duration: e.duration, name: e.name });
    }
  }).observe({ type: 'longtask', buffered: true });
});

const cdp = await ctx.newCDPSession(page);
await cdp.send('Network.enable');
await cdp.send('Network.emulateNetworkConditions', {
  offline: false,
  latency: 400,
  downloadThroughput: (400 * 1024) / 8,
  uploadThroughput: (400 * 1024) / 8
});
await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });

const reqs = new Map();
const navStart = { t: 0 };
cdp.on('Network.requestWillBeSent', (e) => {
  reqs.set(e.requestId, {
    url: e.request.url,
    type: e.type,
    t0: e.timestamp,
    tEnd: null,
    bytes: 0
  });
});
cdp.on('Network.responseReceived', (e) => {
  const r = reqs.get(e.requestId);
  if (r) r.tResp = e.timestamp;
});
cdp.on('Network.loadingFinished', (e) => {
  const r = reqs.get(e.requestId);
  if (r) {
    r.tEnd = e.timestamp;
    r.bytes = e.encodedDataLength;
  }
});
cdp.on('Network.loadingFailed', (e) => {
  const r = reqs.get(e.requestId);
  if (r) {
    r.tEnd = e.timestamp;
    r.error = e.errorText;
  }
});
cdp.on('Network.webSocketCreated', () => {});
// referencia temporal: primer request de navegación
cdp.on('Network.requestWillBeSent', (e) => {
  if (e.type === 'Document' && navStart.t === 0) navStart.t = e.timestamp;
});

const milestones = {};
async function mark(name, fn) {
  try {
    await fn();
    milestones[name] = Math.round(Date.now() - tWall0);
  } catch {
    milestones[name] = -1;
  }
}

const tWall0 = Date.now();
await page.goto(`http://localhost:${PORT}/?year=1987&place=leioa`, { waitUntil: 'commit' });
milestones.commit = Math.round(Date.now() - tWall0);

await mark('headline', () => page.waitForSelector('.headline-block h1', { timeout: 30000 }));
await mark('lead2', () => page.waitForSelector('.lead2', { timeout: 30000 }));
await mark('map_canvas', () => page.waitForSelector('.mapband canvas', { timeout: 30000 }));
await mark('t_result_ready_equiv', () =>
  page.waitForFunction(
    () => {
      const m = window.__mjtMap;
      if (!m || !m.areTilesLoaded?.()) return false;
      return m.queryRenderedFeatures().some((f) => f.source === 'cells');
    },
    { timeout: 30000 }
  )
);
await page.waitForTimeout(3000);
milestones.end = Math.round(Date.now() - tWall0);

const longtasks = await page.evaluate(() => window.__lt ?? []);
const requests = [...reqs.values()]
  .map((r) => ({
    url: r.url.replace(`http://localhost:${PORT}`, ''),
    type: r.type,
    start_ms: Math.round((r.t0 - navStart.t) * 1000),
    end_ms: r.tEnd ? Math.round((r.tEnd - navStart.t) * 1000) : null,
    bytes: r.bytes,
    error: r.error
  }))
  .sort((a, b) => a.start_ms - b.start_ms);

const result = {
  utc: new Date().toISOString(),
  url: '/?year=1987&place=leioa',
  profile: 'P2 390x844 DSF3 CPUx4 Slow4G',
  milestones,
  longtasks,
  requests
};
writeFileSync(OUT, JSON.stringify(result, null, 2));
console.log(JSON.stringify({ milestones, n_requests: requests.length, longtasks }, null, 2));

await browser.close();
server.close();
