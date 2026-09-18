/**
 * G1 READJUDICATION — DEP1..DEP6 smoke contra el host candidato desplegado.
 * Herramienta de medición del gate (no forma parte del candidato).
 * Host: GitHub Pages (gh-pages ed0ef58 = build de 53b1e8a).
 */
import { chromium } from 'playwright';
import { writeFile, mkdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';

const OUT = resolve(process.cwd(), '../out/deploy');
const HOST = 'https://huntsman1756.github.io/mas_joven_que_tu-';

const R = { meta: { candidate: '53b1e8a', utc: new Date().toISOString(), host: HOST }, http: {}, p3: [], csp: {} };

const range = await fetch(`${HOST}/data/cells.pmtiles`, { headers: { Range: 'bytes=0-99' } });
R.http.range = {
  url: '/data/cells.pmtiles',
  status: range.status,
  content_range: range.headers.get('content-range'),
  accept_ranges: range.headers.get('accept-ranges'),
  mime: range.headers.get('content-type'),
  bytes: (await range.arrayBuffer()).byteLength,
};

const idx = await fetch(`${HOST}/`);
R.http.index = { status: idx.status, strict_transport: idx.headers.get('strict-transport-security') };

const idxText = await idx.text();
const jsPath = idxText.match(/src="([^"]*entry\/start[^"]*\.js)"/)?.[1]
  ?? idxText.match(/(?:src|href)="([^"]*\.js)"/)?.[1];
const cssPath = idxText.match(/href="([^"]*\.css)"/)?.[1];
for (const [key, p] of [['js', jsPath], ['css', cssPath]]) {
  if (!p) { R.http[key] = { error: 'not-found-in-html' }; continue; }
  const r = await fetch(`${HOST}${p.startsWith('/') ? p : '/' + p}`);
  R.http[key] = { url: `${HOST}${p.startsWith('/') ? p : '/' + p}`, status: r.status, content_encoding: r.headers.get('content-encoding') };
}
// engine-preload compression
const ep = await fetch(`${HOST}/engine-preload.js`).catch(() => null);
if (ep) R.http.engine_preload = { status: ep.status, content_encoding: ep.headers.get('content-encoding') };

const browser = await chromium.launch({ args: ['--disable-gpu'] });
for (let i = 0; i < 3; i++) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  const cspViol = [], consoleErr = [], fpFail = [];
  page.on('console', (m) => {
    const t = m.text();
    if (m.type() === 'error') {
      if (/Content Security Policy|csp|Refused to/i.test(t)) cspViol.push(t.slice(0, 200));
      else consoleErr.push(t.slice(0, 200));
    }
  });
  page.on('response', (r) => {
    try { if (new URL(r.url()).host === new URL(HOST).host && r.status() >= 400) fpFail.push({ status: r.status(), url: r.url().slice(0, 140) }); } catch {}
  });
  await page.goto(`${HOST}/?year=1987&place=leioa&lat=43.326&lon=-2.988&z=14.6`, { waitUntil: 'load', timeout: 60000 });
  await page.waitForSelector('.headline-block h1', { timeout: 30000 }).catch(() => null);
  await page.waitForFunction(() => window.__mjtMap?.areTilesLoaded?.(), null, { timeout: 40000 }).catch(() => null);
  await page.waitForTimeout(1500);
  const rendered = await page.evaluate(() => window.__mjtMap?.queryRenderedFeatures()?.length ?? 0);
  const headline = await page.evaluate(() => document.querySelector('.headline-block h1')?.textContent ?? null);
  const heap = await page.evaluate(() => Math.round((performance.memory?.usedJSHeapSize ?? 0) / 1048576));
  const fpKb = await page.evaluate(() => {
    const host = location.host; let s = 0;
    for (const r of performance.getEntriesByType('resource')) { try { if (new URL(r.name).host === host) s += r.encodedBodySize || 0; } catch {} }
    return Math.round(s / 1024);
  });
  R.p3.push({ rep: i, transfer_first_party_kb: fpKb, heap_mb: heap, headline, rendered, headline_rendered: !!headline, csp_violations: cspViol.length, csp_detail: cspViol, console_errors: consoleErr.length, console_detail: consoleErr, first_party_failures: fpFail.length, fp_fail_detail: fpFail });
  if (i === 0) await page.screenshot({ path: join(OUT, 'dep-live-render.png') });
  await ctx.close();
}
await browser.close();

const html = idxText;
const cspMeta = html.match(/<meta[^>]*Content-Security-Policy[^>]*content="([^"]+)"/i)?.[1] ?? null;
R.csp = {
  meta_present: !!cspMeta,
  geo_domains: ['geo.bizkaia.eus', 'www.geo.euskadi.eus', 'opengis.bizkaia.eus'].map((d) => ({ d, present: cspMeta ? cspMeta.includes(d) : false })),
};

await mkdir(OUT, { recursive: true });
await writeFile(join(OUT, 'dep-smoke-pages.json'), JSON.stringify(R, null, 1));
console.log(JSON.stringify({ range: R.http.range.status, accept_ranges: R.http.range.accept_ranges, mime: R.http.range.mime, js_enc: R.http.js?.content_encoding, css_enc: R.http.css?.content_encoding, p3_rendered: R.p3.map((r) => r.rendered), csp_viol: R.p3.map((r) => r.csp_violations), csp_meta: R.csp.meta_present, geo: R.csp.geo_domains.map((g) => g.present) }, null, 1));
