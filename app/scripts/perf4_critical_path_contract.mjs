/**
 * PERF4-R2 — contrato de critical path (diagnóstico, NO timing).
 *
 * Navegación P2 a ?year=1987&place=leioa. Desde el inicio hasta el
 * equivalente de `t_result_ready` NO puede haber requests de:
 *
 *   planning-muni · planning/ · planning-geom/ · context/ · context-geom/
 *   ni chunks de features L3/L4 (address, compare, photo, histmap, depth).
 *
 * Solo recursos core pueden competir con el mapa. Exit 1 si violado.
 */
import { chromium } from 'playwright';
import { writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { createStaticServer } from './static-server.mjs';

const ROOT = resolve(process.cwd(), '..');
const BUILD = resolve(process.cwd(), 'build');
const OUT =
  process.env.CONTRACT_OUT ||
  join(ROOT, 'evidence/g3/g3d/perf4-remediation-r2/critical-path-contract.json');
const PORT = 4187;

const FORBIDDEN_DATA = [
  'planning-muni',
  'eustat-population',
  '/data/planning/',
  '/data/planning-geom/',
  '/data/context/',
  '/data/context-geom/'
];
// chunks lazy conocidos por su manifest key, resueltos tras el build
import { readFileSync } from 'node:fs';
const manifest = JSON.parse(
  readFileSync(join(process.cwd(), '.svelte-kit/output/client/.vite/manifest.json'), 'utf8')
);
const LAZY_ENTRIES = [
  'src/lib/lazy/depth.ts',
  'src/lib/components/AddressSearch.svelte',
  'src/lib/components/CompareYear.svelte',
  'src/lib/components/HistMapControls.svelte',
  'src/lib/components/PhotoPanel.svelte',
  'src/lib/components/StoryChapter.svelte'
];
const lazyFiles = new Set();
for (const [key, v] of Object.entries(manifest)) {
  if (LAZY_ENTRIES.some((e) => key.endsWith(e))) lazyFiles.add(v.file);
}

const server = await createStaticServer(BUILD, PORT);
const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 3,
  isMobile: true,
  hasTouch: true
});
const page = await ctx.newPage();
const cdp = await ctx.newCDPSession(page);
await cdp.send('Network.enable');
await cdp.send('Network.emulateNetworkConditions', {
  offline: false,
  latency: 400,
  downloadThroughput: (400 * 1024) / 8,
  uploadThroughput: (400 * 1024) / 8
});
await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });

const reqs = [];
page.on('request', (r) => reqs.push({ url: r.url(), at: Date.now() }));
const t0 = Date.now();
await page.goto(`http://localhost:${PORT}/?year=1987&place=leioa`, { waitUntil: 'commit' });
await page.waitForSelector('.headline-block h1', { timeout: 30000 });
await page.waitForSelector('.mapband canvas', { timeout: 30000 });
await page.waitForFunction(
  () => {
    const m = window.__mjtMap;
    if (!m || !m.areTilesLoaded?.()) return false;
    return m.queryRenderedFeatures().some((f) => f.source === 'cells');
  },
  { timeout: 30000 }
);
const rdy = Date.now();
const inWindow = reqs.filter((r) => r.at <= rdy).map((r) => r.url);
const violations = inWindow.filter(
  (u) =>
    FORBIDDEN_DATA.some((f) => u.includes(f)) || [...lazyFiles].some((f) => u.endsWith(`/${f}`))
);

const report = {
  utc: new Date().toISOString(),
  window_ms: rdy - t0,
  n_requests: inWindow.length,
  lazy_chunk_files: [...lazyFiles],
  violations,
  verdict: violations.length === 0 ? 'PASS' : 'FAIL',
  requests: inWindow
};
writeFileSync(OUT, JSON.stringify(report, null, 2));
console.log(JSON.stringify({ window_ms: report.window_ms, violations, verdict: report.verdict }));
await browser.close();
server.close();
process.exit(violations.length ? 1 : 0);
