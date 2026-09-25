/**
 * Fotos deep-link — triple coincidencia sobre PRODUCCION (gh-pages 5474c5a).
 * Para la URL exacta ortho=1965, 3 reps en contextos nuevos, exigir a la vez:
 *   A) URL          searchParams ortho = 1965
 *   B) player       .tc-year (ano grande) = 1965  y orthoCampaign.year = 1965
 *   C) raster       getSource('ortho').tiles[0] contiene el ano de campana
 * Ademas: rep sin ortho= (hipotesis del 1945: cur = nearest(1922) = 1945).
 * Uso: node scripts/_g19r5_fotos_probe.mjs  (cwd = app/)
 */
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const BASE = 'https://huntsman1756.github.io/mas_joven_que_tu-/';
const CAM = 'lat=43.2625&lon=-2.9280&z=14.3';
const COMMON = `year=1922&place=bilbao&${CAM}`;
const OUT = join(process.cwd(), '..', '.scratch', 'g19r5');
await mkdir(OUT, { recursive: true });
const errors = [];

const browser = await chromium.launch();

async function fotosRun(qs, tag) {
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    reducedMotion: 'no-preference',
  });
  const p = await ctx.newPage();
  p.on('pageerror', (e) => errors.push(`${tag}: ${String(e.message).slice(0, 160)}`));
  const tileReqs = [];
  p.on('request', (r) => {
    const u = r.url();
    if (/ORTO|orto|WMS_ORTO/i.test(u)) tileReqs.push(u.slice(0, 160));
  });
  await p.goto(`${BASE}/?${qs}`, { waitUntil: 'domcontentloaded' });
  await p.waitForFunction(() => window.__mjtApp?.headline !== null, null, { timeout: 45000 });
  await p.waitForFunction(() => !!window.__mjtMap?.loaded?.(), null, { timeout: 45000 });
  await p
    .waitForFunction(
      () => {
        const a = window.__mjtApp;
        if (a.mode !== 'photo') return false;
        if (!a.orthoVisible) return true; // sin activacion: no hay raster que esperar
        if (a.orthoState === 'UNKNOWN') return false;
        return a.orthoRender !== 'LOADING' && a.orthoRender !== 'IDLE';
      },
      null,
      { timeout: 60000 }
    )
    .catch(() => errors.push(`${tag}: espera de estado raster agotada`));
  await p.waitForTimeout(1500);
  const st = await p.evaluate(() => {
    const a = window.__mjtApp;
    const m = window.__mjtMap;
    return {
      urlOrtho: new URL(location.href).searchParams.get('ortho'),
      playerYearText: document.querySelector('.tc-year')?.textContent?.trim() ?? null,
      orthoCampaign: a.orthoCampaign?.year ?? null,
      nearestCampaign: a.nearest?.year ?? null,
      orthoState: a.orthoState,
      orthoRender: a.orthoRender,
      orthoVisible: a.orthoVisible,
      rasterTiles: m?.getSource('ortho')?.tiles?.[0] ?? null,
      campaigns: a.allCampaigns.map((c) => c.year),
      attribution: (document.querySelector('.maplibregl-ctrl-attrib')?.textContent ?? '')
        .replace(/\s+/g, ' ')
        .slice(0, 120),
    };
  });
  await p.screenshot({ path: join(OUT, `fotos-${tag}.png`) });
  await ctx.close();
  return { ...st, tileRequests: tileReqs.slice(0, 4) };
}

const reps = [];
for (let i = 1; i <= 3; i++) {
  const r = await fotosRun(`${COMMON}&view=photo&ortho=1965`, `ortho1965-rep${i}`);
  const rasterYear = r.rasterTiles?.match(/(19\d\d|20\d\d)/)?.[1] ?? null;
  const match =
    r.urlOrtho === '1965' &&
    r.playerYearText === '1965' &&
    r.orthoCampaign === 1965 &&
    rasterYear === '1965' &&
    r.orthoRender === 'CONTENT';
  reps.push({ rep: i, rasterYear, tripleMatch: match, ...r });
  if (!match) errors.push(`rep${i} NO coincide: ${JSON.stringify({ ...r, rasterYear })}`);
}

// hipotesis del 1945: misma URL sin ortho=
const noOrtho = await fotosRun(`${COMMON}&view=photo`, 'sin-ortho');

const out = {
  url: `${BASE}/?${COMMON}&view=photo&ortho=1965`,
  reps,
  hypothesis_sin_ortho: noOrtho,
  errors,
  verdict: errors.length === 0 ? 'TRIPLE_COINCIDENCIA_3DE3' : 'DIVERGENCIA',
};
await writeFile(join(OUT, 'fotos-probe.json'), JSON.stringify(out, null, 2) + '\n');
console.log(JSON.stringify(out, null, 1));
await browser.close();
