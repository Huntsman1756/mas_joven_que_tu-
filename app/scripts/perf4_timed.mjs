/**
 * PERF4 cronometrado — adjudicación G5 (protocolo congelado en
 * docs/gates/G5.md): `t_result_ready` en perfil P2, n=20,
 * umbrales p75 ≤ 3500 ms y p95 ≤ 5000 ms.
 *
 * Mismo instrumento que g1_gate_perf.mjs (waitForSelector +
 * areTilesLoaded + cells renderizadas), acotado a la métrica del gate.
 *
 * Uso:
 *   node scripts/perf4_timed.mjs
 *   BUILD=<dir> LABEL=baseline-0563d60 PORT=4195 node scripts/perf4_timed.mjs
 *
 * Salida: PERF4_OUT o ../evidence/g5/perf4/<label>.json
 */
import { chromium } from 'playwright';
import { writeFile, mkdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { createStaticServer } from './static-server.mjs';
import { installLocalFixtures } from './fixtures.mjs';

const ROOT = resolve(process.cwd(), '..');
const BUILD = resolve(process.cwd(), process.env.BUILD || 'build');
const LABEL = process.env.LABEL || 'candidate';
const OUT = process.env.PERF4_OUT || join(ROOT, 'evidence/g5/perf4');
const PORT = Number(process.env.PORT || 4196);
const BASE = `http://localhost:${PORT}`;
const REPS = 20;

const server = await createStaticServer(BUILD, PORT);
await mkdir(OUT, { recursive: true });

async function pickBrowser() {
  for (const channel of ['chrome', 'msedge']) {
    try {
      return await chromium.launch({ channel, args: ['--disable-gpu'] });
    } catch {
      /* next */
    }
  }
  return await chromium.launch({ args: ['--disable-gpu'] });
}
const browser = await pickBrowser();

const pct = (arr, p) => {
  const s = [...arr].sort((a, b) => a - b);
  const i = Math.ceil((p / 100) * s.length) - 1;
  return s[Math.max(0, i)];
};
const stats = (arr) =>
  arr.length
    ? {
        n: arr.length,
        p75: Math.round(pct(arr, 75)),
        p95: Math.round(pct(arr, 95)),
        max: Math.round(Math.max(...arr)),
        raw: arr.map((v) => Math.round(v))
      }
    : null;

/* P2 = 390×844 DSF3, CPU×4, Slow4G — idéntico a g1_gate_perf.mjs */
async function newP2Page() {
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true
  });
  const page = await ctx.newPage();
  await installLocalFixtures(page); // NORA → fixture local (VR4)
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  await cdp.send('Network.enable');
  await cdp.send('Network.emulateNetworkConditions', {
    offline: false,
    latency: 150,
    downloadThroughput: (1.6 * 1024 * 1024) / 8,
    uploadThroughput: (750 * 1024) / 8
  });
  return { ctx, page };
}

/* t_result_ready — hito congelado: titular + lead + canvas + celdas */
async function tResultReady(page) {
  await page.goto(`${BASE}/?year=1987&place=leioa`, { waitUntil: 'commit' });
  const t0 = Date.now();
  await page.waitForSelector('.headline-block h1', { timeout: 25000 });
  await page.waitForSelector('.lead2', { timeout: 25000 });
  await page.waitForSelector('.mapband canvas', { timeout: 30000 });
  await page.waitForFunction(
    () => {
      const m = window.__mjtMap;
      if (!m || !m.areTilesLoaded?.()) return false;
      return m.queryRenderedFeatures().some((f) => f.source === 'cells');
    },
    { timeout: 30000 }
  );
  return Date.now() - t0;
}

const samples = [];
const errors = [];
for (let i = 0; i < REPS; i++) {
  const { ctx, page } = await newP2Page();
  try {
    samples.push(await tResultReady(page));
  } catch (e) {
    errors.push(String(e).slice(0, 200));
  }
  await ctx.close();
  process.stdout.write(`\rrep ${i + 1}/${REPS}`);
}
console.log('');

const s = stats(samples);
const report = {
  utc: new Date().toISOString(),
  label: LABEL,
  build: BUILD,
  metric: 't_result_ready',
  profile: 'P2 (390x844 dsf3, CPUx4, Slow4G 150ms/1.6Mbps/750kbps)',
  budget: { p75: 3500, p95: 5000 },
  stats: s,
  errors,
  verdict:
    s && s.p75 <= 3500 && s.p95 <= 5000 && errors.length === 0 ? 'PASS' : 'FAIL'
};
await writeFile(join(OUT, `${LABEL}.json`), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ label: LABEL, ...s, errors: errors.length, verdict: report.verdict }));
await browser.close();
server.close();
process.exit(report.verdict === 'PASS' ? 0 : 1);
