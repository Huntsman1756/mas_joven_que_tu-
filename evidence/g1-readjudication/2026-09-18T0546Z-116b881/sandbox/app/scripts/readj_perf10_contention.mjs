/**
 * Diagnóstico 2: ¿el preview local se retrasa cuando las teselas oficiales
 * quedan en vuelo (upstream degradado)? Reproduce degradación determinista:
 * las responses de ORTO_BFA_ se retrasan 6 s por ruta; se mide el timeline
 * CDP del preview y el evento 'content' del ImageSource.
 * Uso: node scripts/readj_perf10_contention.mjs [reps]
 */
import { chromium } from 'playwright';
import { resolve } from 'node:path';
import { createStaticServer } from './static-server.mjs';
import { installLocalFixtures } from './fixtures.mjs';

const BUILD = resolve(process.cwd(), 'build');
const PORT = 4192;
const BASE = `http://localhost:${PORT}`;
const REPS = Number(process.argv[2] ?? 4);

const server = await createStaticServer(BUILD, PORT);
let browser;
for (const channel of ['chrome', 'msedge']) {
  try { browser = await chromium.launch({ channel, args: ['--disable-gpu'] }); break; } catch { /* next */ }
}
browser ??= await chromium.launch({ args: ['--disable-gpu'] });

const out = [];
for (let i = 0; i < REPS; i++) {
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
  // upstream degradado determinista: teselas retrasadas 6 s
  await page.route(/ORTO_BFA_/, async (route) => {
    await new Promise((r) => setTimeout(r, 6000));
    await route.continue();
  });

  const reqs = new Map();
  cdp.on('Network.requestWillBeSent', (e) => reqs.set(e.requestId, { url: e.request.url, sent: performance.now() }));
  cdp.on('Network.responseReceived', (e) => { const r = reqs.get(e.requestId); if (r) r.firstByte = performance.now(); });
  cdp.on('Network.loadingFinished', (e) => { const r = reqs.get(e.requestId); if (r) r.done = performance.now(); });

  await page.goto(`${BASE}/?year=1987&place=leioa`, { waitUntil: 'commit' });
  await page.waitForSelector('.mapband canvas', { timeout: 30000 });
  await page.waitForFunction(() => {
    const m = window.__mjtMap;
    return m?.areTilesLoaded?.() && m.queryRenderedFeatures().some((f) => f.source === 'cells');
  }, null, { timeout: 30000 });

  await page.evaluate(() => {
    const m = window.__mjtMap;
    window.__pv = { previewContent: null, tileEvent: null, t0: null };
    m.on('sourcedata', (e) => {
      if (e.sourceId === 'ortho-preview' && e.sourceDataType === 'content' && window.__pv.previewContent === null)
        window.__pv.previewContent = performance.now() - window.__pv.t0;
      if (e.sourceId === 'ortho' && e.coord && window.__pv.tileEvent === null)
        window.__pv.tileEvent = performance.now() - window.__pv.t0;
    });
  });
  reqs.clear();
  const t0 = performance.now();
  await page.evaluate(() => { window.__pv.t0 = performance.now(); });
  await page.locator('.ortho .btn').first().click();
  await page.waitForTimeout(9000);

  const pv = await page.evaluate(() => window.__pv);
  const prevReq = [...reqs.values()].find((r) => r.url.includes('ortho-previews'));
  const tileReqs = [...reqs.values()].filter((r) => r.url.includes('ORTO_BFA_'));
  out.push({
    rep: i,
    preview_req: prevReq ? {
      sent_ms: Math.round(prevReq.sent - t0),
      ttfb_ms: prevReq.firstByte ? Math.round(prevReq.firstByte - t0) : null,
      done_ms: prevReq.done ? Math.round(prevReq.done - t0) : null,
    } : null,
    preview_content_ms: pv.previewContent !== null ? Math.round(pv.previewContent) : null,
    first_tile_event_ms: pv.tileEvent !== null ? Math.round(pv.tileEvent) : null,
    tiles_sent: tileReqs.length,
    tiles_done: tileReqs.filter((r) => r.done).length,
  });
  console.log(JSON.stringify(out[i]));
  await ctx.close();
}
await browser.close();
server.close();
