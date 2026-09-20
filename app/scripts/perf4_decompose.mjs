/**
 * Descomposición de t_result_ready (diagnóstico PERF4-R2):
 * t_headline / t_lead2 / t_canvas / t_cells + bytes transferidos.
 * Mismo perfil P2 que perf4_timed.mjs. n=5 por build.
 *
 *   BUILD=<dir> LABEL=x PORT=4200 node scripts/perf4_decompose.mjs
 */
import { chromium } from 'playwright';
import { resolve } from 'node:path';
import { createStaticServer } from './static-server.mjs';
import { installLocalFixtures } from './fixtures.mjs';

const BUILD = resolve(process.cwd(), process.env.BUILD || 'build');
const LABEL = process.env.LABEL || 'x';
const PORT = Number(process.env.PORT || 4200);
const BASE = `http://localhost:${PORT}`;
const REPS = 5;

const server = await createStaticServer(BUILD, PORT);
let browser;
for (const channel of ['chrome', 'msedge']) {
  try {
    browser = await chromium.launch({ channel, args: ['--disable-gpu'] });
    break;
  } catch {
    /* canal no disponible — probar el siguiente */
  }
}
if (!browser) browser = await chromium.launch({ args: ['--disable-gpu'] });

const out = [];
for (let i = 0; i < REPS; i++) {
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true
  });
  const page = await ctx.newPage();
  await installLocalFixtures(page);
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  await cdp.send('Network.enable');
  await cdp.send('Network.emulateNetworkConditions', {
    offline: false,
    latency: 150,
    downloadThroughput: (1.6 * 1024 * 1024) / 8,
    uploadThroughput: (750 * 1024) / 8
  });
  let bytes = 0;
  cdp.on('Network.loadingFinished', (e) => {
    bytes += e.encodedDataLength || 0;
  });
  try {
    await page.goto(`${BASE}/?year=1987&place=leioa`, { waitUntil: 'commit' });
    const t0 = Date.now();
    await page.waitForSelector('.headline-block h1', { timeout: 25000 });
    const tHead = Date.now() - t0;
    await page.waitForSelector('.lead2', { timeout: 25000 });
    const tLead = Date.now() - t0;
    await page.waitForSelector('.mapband canvas', { timeout: 30000 });
    const tCanvas = Date.now() - t0;
    await page.waitForFunction(
      () => {
        const m = window.__mjtMap;
        if (!m || !m.areTilesLoaded?.()) return false;
        return m.queryRenderedFeatures().some((f) => f.source === 'cells');
      },
      { timeout: 30000 }
    );
    const tCells = Date.now() - t0;
    out.push({ tHead, tLead, tCanvas, tCells, kb: Math.round(bytes / 1024) });
  } catch (e) {
    out.push({ error: String(e).slice(0, 120) });
  }
  await ctx.close();
}
console.log(JSON.stringify({ label: LABEL, runs: out }, null, 1));
await browser.close();
server.close();
process.exit(0);
