/**
 * Diagnóstico 4: replica EXACTA del flujo de sesión caliente del harness
 * (tResultReady → tYearChange → tPlaceChange con su recuperación goto →
 * tOrthoVisible) con timing CDP de todas las requests tras el clic.
 * Objetivo: ver si la request del preview queda encolada detrás de tráfico
 * same-origin (pool HTTP/1.1 de localhost) en el momento del clic.
 * Uso: node scripts/readj_perf10_flow.mjs [reps]
 */
import { chromium } from 'playwright';
import { resolve } from 'node:path';
import { createStaticServer } from './static-server.mjs';
import { installLocalFixtures } from './fixtures.mjs';

const BUILD = resolve(process.cwd(), 'build');
const PORT = 4195;
const BASE = `http://localhost:${PORT}`;
const REPS = Number(process.argv[2] ?? 4);

const server = await createStaticServer(BUILD, PORT);
let browser;
for (const channel of ['chrome', 'msedge']) {
  try { browser = await chromium.launch({ channel, args: ['--disable-gpu'] }); break; } catch { /* next */ }
}
browser ??= await chromium.launch({ args: ['--disable-gpu'] });

async function tResultReady(page, buildings) {
  const url = `${BASE}/?year=1987&place=leioa` + (buildings ? '&lat=43.326&lon=-2.988&z=14.6' : '');
  await page.goto(url, { waitUntil: 'commit' });
  await page.waitForSelector('.headline-block h1', { timeout: 25000 });
  await page.waitForSelector('.lead2', { timeout: 25000 });
  await page.waitForSelector('.mapband canvas', { timeout: 30000 });
  await page.waitForFunction((bld) => {
    const m = window.__mjtMap;
    if (!m || !m.areTilesLoaded?.()) return false;
    const rf = m.queryRenderedFeatures();
    return bld ? rf.some((f) => f.source?.startsWith('b-')) : rf.some((f) => f.source === 'cells');
  }, buildings, { timeout: 30000 });
}
async function ensureChangeOpen(page) {
  if (!(await page.$('.changeform'))) await page.click('.topbar .change');
  await page.waitForSelector('.changeform', { timeout: 10000 });
}
async function tYearChange(page) {
  await ensureChangeOpen(page);
  await page.fill('.changeform input', '1990');
  await page.click('.changeform button[type=submit]');
  await page.waitForFunction(() => document.querySelector('.legend-title')?.textContent.includes('1990'), null, { timeout: 15000 });
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
}
async function tPlaceChange(page) {
  await ensureChangeOpen(page);
  await page.fill('.changeform #place-input', 'Bilbao');
  await page.waitForSelector('.changeform #place-listbox button', { timeout: 20000 });
  await page.click('.changeform #place-listbox button >> nth=0');
  const completed = await page
    .waitForSelector('.changeform button[type=submit]', { timeout: 4000 })
    .then(async () => {
      await page.click('.changeform button[type=submit]');
      await page.waitForFunction(
        () => document.querySelector('.headline-block h1')?.textContent.includes('Bilbao'),
        null, { timeout: 25000 });
      return true;
    })
    .catch(() => false);
  if (!completed) {
    await page.goto(`${BASE}/?year=1987&place=leioa`, { waitUntil: 'load' });
    await page.waitForSelector('.mapband canvas', { timeout: 30000 });
  }
}

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

  const reqs = new Map();
  cdp.on('Network.requestWillBeSent', (e) => reqs.set(e.requestId, { url: e.request.url, sent: performance.now() }));
  cdp.on('Network.responseReceived', (e) => { const r = reqs.get(e.requestId); if (r) r.firstByte = performance.now(); });
  cdp.on('Network.loadingFinished', (e) => { const r = reqs.get(e.requestId); if (r) r.done = performance.now(); });

  await tResultReady(page, false);
  await tYearChange(page);
  await page.waitForTimeout(300);
  await tPlaceChange(page);
  await page.waitForTimeout(300);

  // tOrthoVisible con instrumentación extra
  await page.evaluate(() => {
    const m = window.__mjtMap;
    window.__pv = { previewContent: null, tileEvent: null, t1: null, winner: null, t0: null };
    m.on('sourcedata', (e) => {
      if (e.sourceId === 'ortho-preview' && e.sourceDataType === 'content' && window.__pv.previewContent === null)
        window.__pv.previewContent = performance.now() - window.__pv.t0;
      if (e.sourceId === 'ortho' && e.coord && window.__pv.tileEvent === null)
        window.__pv.tileEvent = performance.now() - window.__pv.t0;
      if (window.__pv.t1 !== null) return;
      const isTile = e.sourceId === 'ortho' && !!e.coord;
      const isPrev = e.sourceId === 'ortho-preview' && e.sourceDataType === 'content';
      if (!isTile && !isPrev) return;
      window.__pv.winner = isPrev ? 'preview' : 'tile';
      m.once('render', () => { window.__pv.t1 = performance.now() - window.__pv.t0; });
    });
  });
  reqs.clear();
  const t0 = performance.now();
  await page.evaluate(() => { window.__pv.t0 = performance.now(); });
  await page.locator('.ortho .btn').first().click();
  await page.waitForTimeout(12000);

  const pv = await page.evaluate(() => window.__pv);
  const prevReq = [...reqs.values()].find((r) => r.url.includes('ortho-previews'));
  const inFlightAtClick = [...reqs.values()].filter((r) => r.sent - t0 >= -50 && !r.done).length;
  const localPending = [...reqs.values()].filter(
    (r) => r.url.includes(`localhost:${PORT}`) && r.sent - t0 < 3000
  ).map((r) => ({ u: r.url.replace(/^https?:\/\/[^/]+/, '').slice(0, 60), sent: Math.round(r.sent - t0), done: r.done ? Math.round(r.done - t0) : null }));
  console.log(JSON.stringify({
    rep: i,
    winner: pv.winner, t1_ms: pv.t1 !== null ? Math.round(pv.t1) : null,
    preview_content_ms: pv.previewContent !== null ? Math.round(pv.previewContent) : null,
    tile_event_ms: pv.tileEvent !== null ? Math.round(pv.tileEvent) : null,
    preview_req: prevReq ? { sent: Math.round(prevReq.sent - t0), ttfb: prevReq.firstByte ? Math.round(prevReq.firstByte - t0) : null, done: prevReq.done ? Math.round(prevReq.done - t0) : null } : null,
    local_first3s: localPending.slice(0, 12),
  }));
  await ctx.close();
}
await browser.close();
server.close();
