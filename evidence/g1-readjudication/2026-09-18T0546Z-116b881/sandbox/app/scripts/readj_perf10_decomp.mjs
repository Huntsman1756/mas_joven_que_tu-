/**
 * G1-R2 — descomposición PERF10 bajo perfil P2 exacto (390x844 DSF3 CPUx4 Slow4G).
 * Mide por request: DNS, TCP, TLS, send→headers (TTFB server), transferencia.
 * Experimentos: (1) cold ×20 · (2) preconnect ×20 · (3) concurrencia 1/2/4/8 ·
 * (4) ArcGIS /tile/256 vs MapServer /export 256/512.
 * Sin cambios de producto. Solo lectura de red via CDP.
 */
import { chromium } from 'playwright';
import { writeFile, mkdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { createStaticServer } from './static-server.mjs';

const BUILD = resolve(process.cwd(), 'build');
const OUT = resolve(process.cwd(), '../out/perf10');
const PORT = 4197;
const BASE = `http://localhost:${PORT}`;

const TILE_HOST = 'https://geo.bizkaia.eus';
const SVC = `${TILE_HOST}/arcgisserverinspire/rest/services/Kartografia_Cartografia/ORTO_BFA_1990/MapServer`;
const Z = 12, X = 2014, Y = 1501; // viewport Bilbao observado en el run formal

const tileUrl = (x, y, z = Z) => `${SVC}/tile/${z}/${y}/${x}`;

function tileBBox3857(x, y, z) {
  const n = 2 ** z;
  const lonW = (x / n) * 360 - 180;
  const lonE = ((x + 1) / n) * 360 - 180;
  const latN = Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / n))) * 180 / Math.PI;
  const latS = Math.atan(Math.sinh(Math.PI * (1 - (2 * (y + 1)) / n))) * 180 / Math.PI;
  const mx = (lon) => (lon * 20037508.34) / 180;
  const my = (lat) => Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360)) * 6378137;
  return [mx(lonW), my(latS), mx(lonE), my(latN)]; // xmin,ymin,xmax,ymax
}
const exportUrl = (size) => {
  const [x0, y0, x1, y1] = tileBBox3857(X, Y, Z);
  return `${SVC}/export?bbox=${x0},${y0},${x1},${y1}&bboxSR=3857&imageSR=3857&size=${size},${size}&format=jpg&transparent=false&f=image`;
};

const server = await createStaticServer(BUILD, PORT);
await mkdir(OUT, { recursive: true });
const browser = await chromium.launch({ args: ['--disable-gpu'] });

function netRecorder(cdp) {
  const reqs = new Map();
  cdp.on('Network.requestWillBeSent', (e) => {
    if (e.request.url.startsWith(TILE_HOST)) reqs.set(e.requestId, { url: e.request.url, t0: e.timestamp });
  });
  cdp.on('Network.responseReceived', (e) => {
    const r = reqs.get(e.requestId);
    if (r) { r.timing = e.response.timing; r.status = e.response.status; r.protocol = e.response.protocol; }
  });
  cdp.on('Network.loadingFinished', (e) => {
    const r = reqs.get(e.requestId);
    if (r) { r.end = e.timestamp; r.bytes = e.encodedDataLength; }
  });
  cdp.on('Network.loadingFailed', (e) => {
    const r = reqs.get(e.requestId); if (r) { r.end = e.timestamp; r.failed = e.errorText; }
  });
  return reqs;
}

function summarize(r) {
  if (!r) return null;
  const t = r.timing;
  const rel = t ? (v) => (v === undefined || v < 0 ? null : Math.round(v)) : () => null;
  return {
    url: r.url.slice(SVC.length, SVC.length + 60) || r.url.slice(0, 110),
    status: r.status ?? null, protocol: r.protocol ?? null,
    dns_ms: t ? rel(t.dnsEnd - t.dnsStart >= 0 ? t.dnsEnd - t.dnsStart : -1) : null,
    tcp_ms: t ? rel(t.connectEnd - Math.max(t.connectStart, t.sslEnd >= 0 ? t.connectStart : t.connectStart)) : null,
    connect_ms: t ? rel(t.connectEnd - t.connectStart) : null,
    tls_ms: t && t.sslStart >= 0 ? Math.round(t.sslEnd - t.sslStart) : null,
    send_ms: t ? rel(t.sendEnd - t.sendStart) : null,
    ttfb_ms: t ? rel(t.receiveHeadersEnd - t.sendEnd) : null,
    transfer_ms: r.end !== undefined && t ? Math.round((r.end - (t.requestTime + t.receiveHeadersEnd / 1000)) * 1000) : null,
    total_ms: r.end !== undefined ? Math.round((r.end - r.t0) * 1000) : null,
    bytes: r.bytes ?? null, failed: r.failed ?? null,
    reused: t ? t.dnsStart < 0 && t.connectStart < 0 : null,
  };
}

async function newP2() {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Network.enable');
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  await cdp.send('Network.emulateNetworkConditions', {
    offline: false, latency: 150, downloadThroughput: (1.6 * 1024 * 1024) / 8, uploadThroughput: (750 * 1024) / 8,
  });
  await page.goto(`${BASE}/`, { waitUntil: 'commit' });
  await page.waitForSelector('body', { timeout: 25000 });
  return { ctx, page, cdp, reqs: netRecorder(cdp) };
}
const fetchNoCors = (page, url) => page.evaluate((u) => fetch(u, { mode: 'no-cors', cache: 'no-store' }).then(() => true).catch((e) => String(e)), url);
const drain = async (reqs, n) => {
  for (let i = 0; i < 60; i++) {
    const done = [...reqs.values()].filter((r) => r.end !== undefined || r.failed).length;
    if (done >= n) break;
    await new Promise((r) => setTimeout(r, 500));
  }
};

const results = { meta: { candidate: '53b1e8a+fix1956', utc: new Date().toISOString(), profile: 'P2' }, cold: [], preconnect: [], concurrency: {}, tile_vs_export: [] };

// ---- B1: tesela única, conexión fría ×20 --------------------------------- //
for (let i = 0; i < 20; i++) {
  const { ctx, page, reqs } = await newP2();
  await fetchNoCors(page, tileUrl(X + (i % 3), Y + Math.floor(i / 7)));
  await drain(reqs, 1);
  const r = summarize([...reqs.values()][0]);
  results.cold.push(r);
  console.log(`cold${i}: ttfb=${r?.ttfb_ms}ms total=${r?.total_ms}ms proto=${r?.protocol} conn=${r?.connect_ms} tls=${r?.tls_ms} dns=${r?.dns_ms}`);
  await ctx.close();
}

// ---- B2: preconnect ×20 -------------------------------------------------- //
for (let i = 0; i < 20; i++) {
  const { ctx, page, reqs } = await newP2();
  await page.evaluate((h) => {
    const l = document.createElement('link'); l.rel = 'preconnect'; l.href = h; l.crossOrigin = '';
    document.head.appendChild(l);
  }, TILE_HOST);
  await page.waitForTimeout(1500); // dejar completar handshake bajo Slow4G
  await fetchNoCors(page, tileUrl(X + (i % 3), Y + Math.floor(i / 7)));
  await drain(reqs, 1);
  const r = summarize([...reqs.values()][0]);
  results.preconnect.push(r);
  console.log(`pre${i}: ttfb=${r?.ttfb_ms}ms total=${r?.total_ms}ms reused=${r?.reused} conn=${r?.connect_ms}`);
  await ctx.close();
}

// ---- B3: concurrencia 1/2/4/8 -------------------------------------------- //
for (const n of [1, 2, 4, 8]) {
  const batch = [];
  for (let i = 0; i < 6; i++) {
    const { ctx, page, reqs } = await newP2();
    await page.evaluate((urls) => Promise.all(urls.map((u) => fetch(u, { mode: 'no-cors', cache: 'no-store' }).catch(() => null))),
      Array.from({ length: n }, (_, k) => tileUrl(X + k, Y)));
    await drain(reqs, n);
    batch.push([...reqs.values()].map(summarize));
    await ctx.close();
  }
  results.concurrency[`n${n}`] = batch;
  const ttfbs = batch.flat().map((r) => r?.ttfb_ms).filter((v) => v != null).sort((a, b) => a - b);
  const firsts = batch.map((b) => Math.min(...b.map((r) => r?.total_ms ?? 9e9)));
  console.log(`conc n=${n}: ttfb med=${ttfbs[Math.floor(ttfbs.length / 2)]}ms | min-total por rep: ${firsts.join(',')}`);
}

// ---- B4: tile256 vs export256 vs export512 -------------------------------- //
for (let i = 0; i < 12; i++) {
  const { ctx, page, reqs } = await newP2();
  const variants = [tileUrl(X, Y), exportUrl(256), exportUrl(512)];
  await page.evaluate((urls) => Promise.all(urls.map((u) => fetch(u, { mode: 'no-cors', cache: 'no-store' }).catch(() => null))), variants);
  await drain(reqs, 3);
  const rs = [...reqs.values()].map(summarize);
  results.tile_vs_export.push(rs);
  console.log(`tve${i}: ` + rs.map((r) => `${r?.url.includes('export') ? (r.url.includes('512') ? 'exp512' : 'exp256') : 'tile'}:ttfb=${r?.ttfb_ms} tot=${r?.total_ms} B=${r?.bytes}`).join(' | '));
  await ctx.close();
}

await writeFile(join(OUT, 'perf10-decomp.json'), JSON.stringify(results, null, 1));
await browser.close();
server.close();
console.log('DONE', join(OUT, 'perf10-decomp.json'));
