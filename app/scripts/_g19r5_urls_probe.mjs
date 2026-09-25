/**
 * Test 5 s humano — verificación previa sobre PRODUCCION (gh-pages 5474c5a).
 * Escenario: Bilbao, 1922, misma camara que c-*.png (43.2625,-2.9280 z14.3).
 * Comprueba, sin stubs y con servicios reales:
 *   1. identidad del bundle servido
 *   2. Evolucion: play desde play=1922 y playYear AVANZA durante 5 s reales
 *   3. Fotos: ortho=1965 → orthoRender=CONTENT (ortofoto cargada, no rail)
 *   4. Por antiguedad: mapa estatico, sin player
 * Uso: node scripts/_g19r5_urls_probe.mjs  (cwd = app/)
 */
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const BASE = 'https://huntsman1756.github.io/mas_joven_que_tu-/';
const CAM = 'lat=43.2625&lon=-2.9280&z=14.3';
const COMMON = `year=1922&place=bilbao&${CAM}`;
const OUT = join(process.cwd(), '..', '.scratch', 'g19r5');

const out = { base: BASE, checkedAt: new Date().toISOString(), checks: {} };
const errors = [];

await mkdir(OUT, { recursive: true });

// 1. identidad del bundle
const res = await fetch(BASE);
const html = await res.text();
const entry = html.match(/_app\/immutable\/entries\/client\.[A-Za-z0-9_-]+\.js/)?.[0] ?? null;
out.checks.identity = { httpStatus: res.status, entry };

const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  reducedMotion: 'no-preference',
});
const state = () =>
  ctx.newPage().then(async (p) => {
    p.on('pageerror', (e) => errors.push(String(e.message).slice(0, 200)));
    return p;
  });

const ready = async (p) => {
  await p.waitForFunction(() => window.__mjtApp?.headline !== null, null, { timeout: 45000 });
  await p.waitForFunction(() => !!window.__mjtMap?.loaded?.(), null, { timeout: 45000 });
  await p.waitForTimeout(1500);
};

// 2. Evolucion con reproduccion real de 5 s
{
  const p = await state();
  await p.goto(`${BASE}/?${COMMON}&view=time&play=1922`, { waitUntil: 'domcontentloaded' });
  await ready(p);
  const before = await p.evaluate(() => ({
    mode: window.__mjtApp.mode,
    playYear: window.__mjtApp.playYear,
    playing: window.__mjtApp.playing,
    playerMode: document.querySelector('.tc-bar')?.dataset.playerMode ?? null,
    hasPlayBtn: !!document.querySelector('[data-action="play"]'),
  }));
  await p.screenshot({ path: join(OUT, 'e0-time-start.png') });
  const t0 = Date.now();
  await p.click('[data-action="play"]');
  const samples = [];
  for (const ms of [1500, 3000, 5000]) {
    while (Date.now() - t0 < ms) await new Promise((r) => setTimeout(r, 100));
    samples.push({ atMs: Date.now() - t0, ...(await p.evaluate(() => ({ playYear: window.__mjtApp.playYear, playing: window.__mjtApp.playing }))) });
    if (ms === 3000) await p.screenshot({ path: join(OUT, 'e1-time-mid.png') });
  }
  await p.screenshot({ path: join(OUT, 'e2-time-5s.png') });
  const moved = samples.at(-1).playYear - before.playYear;
  out.checks.evolucion = { before, samples, movedYearsIn5s: moved, screenshotT5: '.scratch/g19r5/e2-time-5s.png' };
  if (!(before.playYear === 1922 && before.playerMode === 'continuous' && moved >= 15))
    errors.push(`evolucion: playYear inicial ${before.playYear}, avance 5 s = ${moved} anios`);
  await p.close();
}

// 3. Fotos aereas con ortofoto cargada
{
  const p = await state();
  await p.goto(`${BASE}/?${COMMON}&view=photo&ortho=1965`, { waitUntil: 'domcontentloaded' });
  await ready(p);
  await p
    .waitForFunction(() => window.__mjtApp?.orthoRender === 'CONTENT', null, { timeout: 60000 })
    .catch(() => errors.push('fotos: orthoRender no llego a CONTENT'));
  const st = await p.evaluate(() => ({
    mode: window.__mjtApp.mode,
    orthoState: window.__mjtApp.orthoState,
    orthoRender: window.__mjtApp.orthoRender,
    campaign: window.__mjtApp.orthoCampaign?.year ?? null,
    cellsVisible:
      !!window.__mjtMap?.getLayer('cells-fill') &&
      window.__mjtMap.getLayoutProperty('cells-fill', 'visibility') !== 'none',
  }));
  await p.screenshot({ path: join(OUT, 'f0-photo-1965.png') });
  out.checks.fotos = { ...st, screenshot: '.scratch/g19r5/f0-photo-1965.png' };
  if (!(st.orthoRender === 'CONTENT' && st.campaign === 1965 && !st.cellsVisible))
    errors.push(`fotos: ${JSON.stringify(st)}`);
  await p.close();
}

// 4. Por antiguedad estatico
{
  const p = await state();
  await p.goto(`${BASE}/?${COMMON}`, { waitUntil: 'domcontentloaded' });
  await ready(p);
  const st = await p.evaluate(() => ({
    mode: window.__mjtApp.mode,
    hasPlayer: !!document.querySelector('.tc-bar'),
    cellsVisible:
      !!window.__mjtMap?.getLayer('cells-fill') &&
      window.__mjtMap.getLayoutProperty('cells-fill', 'visibility') !== 'none',
    legend: (document.querySelector('.legend')?.textContent ?? '').replace(/\s+/g, ' ').slice(0, 120),
  }));
  const y1 = await p.evaluate(() => window.__mjtApp.playYear);
  await p.waitForTimeout(5000);
  const y2 = await p.evaluate(() => window.__mjtApp.playYear);
  await p.screenshot({ path: join(OUT, 'g0-antiguedad.png') });
  out.checks.antiguedad = { ...st, staticOver5s: y1 === y2, screenshot: '.scratch/g19r5/g0-antiguedad.png' };
  if (!(st.mode === 'map' && !st.hasPlayer && st.cellsVisible))
    errors.push(`antiguedad: ${JSON.stringify(st)}`);
  await p.close();
}

out.errors = errors;
out.verdict = errors.length === 0 ? 'LISTO' : 'REVISAR';
await writeFile(join(OUT, 'urls-probe.json'), JSON.stringify(out, null, 2) + '\n');
console.log(JSON.stringify(out, null, 1));
await browser.close();
