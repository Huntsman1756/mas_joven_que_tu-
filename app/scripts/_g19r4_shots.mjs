/**
 * G19-R4 — matriz visual + comparación map-vs-time a nivel edificio.
 *
 * Dos cámaras FIJAS por URL (misma cámara entre modos comparados):
 *   Z (zonas):     lat=43.2630 lon=-2.9350 z=12.2   → nivel CELDA
 *   B (edificios): lat=43.2625 lon=-2.9280 z=14.3   → nivel EDIFICIO
 *
 * Por cámara: map, time@1952, time@1974, photo@1956, photo@1989,
 * hist, swipe. Además:
 *   buildings-map-vs-time.json — tabla de ids (visible/class por modo)
 *   matrix.json — contrato observable por modo (tab/mode/url/player/capas)
 *   player-*.png — recortes del player continuo/discreto
 *   topbar.png — recorte del cromo superior
 *
 * Sin stubs: las ortofotos/1923 son servicios reales (la evidencia debe
 * mostrar contenido verdadero, no el PNG de fixture).
 *
 * Uso: node scripts/_g19r4_shots.mjs   (cwd = app/ con build/ presente)
 */
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { createStaticServer } from './static-server.mjs';

const ROOT = resolve(process.cwd(), '..');
const BUILD = resolve(process.cwd(), 'build');
const OUT = join(ROOT, 'evidence/g19r4');
const PORT = 4236;
const BASE = `http://localhost:${PORT}`;

const server = await createStaticServer(BUILD, PORT);
await mkdir(OUT, { recursive: true });
const errors = [];

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
page.on('pageerror', (e) => errors.push(String(e.message).slice(0, 200)));
const waitResult = () =>
  page.waitForFunction(() => window.__mjtApp?.headline !== null, { timeout: 30000 });
const waitMap = () =>
  page.waitForFunction(() => !!window.__mjtMap?.loaded?.(), null, { timeout: 30000 });

const shot = (n) => page.screenshot({ path: join(OUT, `${n}.png`) });
const _cam = () => page.evaluate(() => JSON.stringify(window.__mjtApp?.view));

async function setMode(m) {
  await page.locator(`.viewswitch [data-mode="${m}"]`).click();
  await page.waitForFunction((mm) => window.__mjtApp?.mode === mm, m, { timeout: 15000 });
  await page.waitForTimeout(400);
}

async function scrubTo(year) {
  await page.evaluate((y) => {
    const s = document.querySelector('.timeband .tc-scrub');
    s.value = String(y);
    s.dispatchEvent(new Event('input', { bubbles: true }));
    s.dispatchEvent(new Event('change', { bubbles: true }));
  }, year);
  await page.waitForFunction((y) => window.__mjtApp?.playYear === y, year, { timeout: 10000 });
  await page.waitForTimeout(800);
}

async function activatePhoto(year) {
  const frac = await page
    .locator(`.photo .epoch[data-year="${year}"]`)
    .evaluate((el) => parseFloat(el.style.left) / 100);
  const box = await page.locator('.photo .tc-scrub').boundingBox();
  await page
    .locator('.photo .tc-scrub')
    .click({ position: { x: Math.min(frac * box.width, box.width - 2), y: box.height / 2 } });
  await page.waitForFunction(
    () =>
      window.__mjtApp?.orthoCampaign?.year &&
      ['AVAILABLE', 'NOT_COVERED', 'SERVICE_ERROR'].includes(window.__mjtApp.orthoState),
    null,
    { timeout: 30000 }
  );
  // G19-R4 cierre: la captura solo es válida cuando el raster llega a un
  // estado TERMINAL (no «montado + espera fija»). AVAILABLE sin capa no
  // puede ocurrir; NOT_COVERED/SERVICE_ERROR retiran la capa → IDLE.
  await page
    .waitForFunction(
      () => {
        const a = window.__mjtApp;
        if (!a) return false;
        if (a.orthoState === 'AVAILABLE') return a.orthoRender !== 'LOADING' && a.orthoRender !== 'IDLE';
        return a.orthoRender === 'IDLE';
      },
      null,
      { timeout: 30000 }
    )
    .catch(() => errors.push(`orthoRender no resolvió para ${year}`));
  await page.waitForTimeout(500); // settle visual del estado declarado
}

/** Contrato observable del modo actual (espejo de mode_isolation). */
const contract = () =>
  page.evaluate(() => {
    const a = window.__mjtApp;
    const m = window.__mjtMap;
    const bar = document.querySelector('.tc-bar');
    const vis = (id) => (m.getLayer(id) ? m.getLayoutProperty(id, 'visibility') !== 'none' : null);
    const c = document.querySelector('.mapcell .maplibregl-canvas');
    const r = c?.getBoundingClientRect();
    return {
      mode: a.mode,
      view: a.view,
      canvas: r
        ? {
            x: Math.round(r.x),
            y: Math.round(r.y),
            w: Math.round(r.width),
            h: Math.round(r.height)
          }
        : null,
      player: bar?.dataset.playerMode ?? null,
      ortho: !!m.getLayer('ortho'),
      orthoState: a.orthoState,
      orthoRender: a.orthoRender,
      histmap: !!m.getLayer('histmap'),
      cellsVisible: vis('cells-fill'),
      munisVisible: vis('munis-fill')
    };
  });

/** Ids/clase de edificios renderizados (respeta filtros activos). */
const buildings = () =>
  page.evaluate(() => {
    const m = window.__mjtMap;
    const layers = (m.getStyle()?.layers ?? [])
      .map((l) => l.id)
      .filter((id) => /^b-\d+-fill$/.test(id));
    return m.queryRenderedFeatures(undefined, { layers }).map((f) => ({
      id: f.properties.id,
      year: f.properties.year,
      state: f.properties.state
    }));
  });

const matrix = {};
const table = {};

for (const [tag, camUrl] of [
  ['z', 'lat=43.2630&lon=-2.9350&z=12.2'],
  ['b', 'lat=43.2625&lon=-2.9280&z=14.3']
]) {
  console.log(`── camera ${tag}`);
  // ── Por antigüedad ──────────────────────────────────────────────────
  await page.goto(`${BASE}/?year=1952&place=bilbao&${camUrl}`);
  await waitResult();
  await waitMap();
  await page.waitForTimeout(1600);
  matrix[`${tag}-map`] = await contract();
  if (tag === 'b') {
    table.birthYear = 1952;
    table.map = await buildings();
    table.mapCamera = matrix[`${tag}-map`].view;
  }
  await shot(`${tag}-map-1952`);

  // ── Evolución (cabezal anclado al año personal = 1952) ─────────────
  await setMode('time');
  console.log(`   ${tag}: mode=time`);
  await page.waitForSelector('.timeband .tc-bar', { timeout: 15000 });
  await page.waitForTimeout(600);
  matrix[`${tag}-time1952`] = await contract();
  if (tag === 'b') {
    table.time1952 = await buildings();
    table.timeCamera = matrix[`${tag}-time1952`].view;
  }
  await shot(`${tag}-time-1952`);

  await scrubTo(1974);
  matrix[`${tag}-time1974`] = await contract();
  if (tag === 'b') table.time1974 = await buildings();
  await shot(`${tag}-time-1974`);
  if (tag === 'b') {
    const r = await page.locator('.timeband .tc-bar').boundingBox();
    await page.screenshot({
      path: join(OUT, 'player-evolution-1974.png'),
      clip: { x: r.x - 6, y: r.y - 6, width: r.width + 12, height: r.height + 12 }
    });
  }

  // ── Fotos aéreas ────────────────────────────────────────────────────
  await setMode('photo');
  await page.waitForSelector('.photo .tc-bar', { timeout: 15000 });
  matrix[`${tag}-photo-idle`] = await contract();
  await shot(`${tag}-photo-idle`); // sin campaña: base limpia, no heatmap
  await activatePhoto(1956);
  matrix[`${tag}-photo1956`] = await contract();
  await shot(`${tag}-photo-1956`);
  await activatePhoto(1965); // la captura del blank-canvas: estado resuelto
  matrix[`${tag}-photo1965`] = await contract();
  await shot(`${tag}-photo-1965`);
  await activatePhoto(1989);
  matrix[`${tag}-photo1989`] = await contract();
  await shot(`${tag}-photo-1989`);
  if (tag === 'b') {
    const r = await page.locator('.photo .tc-bar').boundingBox();
    await page.screenshot({
      path: join(OUT, 'player-photo-1989.png'),
      clip: { x: r.x - 6, y: r.y - 6, width: r.width + 12, height: r.height + 12 }
    });
  }

  // ── 1923–25 ─────────────────────────────────────────────────────────
  await setMode('hist');
  await page.waitForSelector('.histmap', { timeout: 15000 });
  await page.waitForTimeout(2500);
  matrix[`${tag}-hist`] = await contract();
  await shot(`${tag}-hist`);

  // ── Antes / ahora ───────────────────────────────────────────────────
  await setMode('swipe');
  await page.waitForSelector('.swipe', { timeout: 15000 });
  await page.waitForTimeout(2500);
  matrix[`${tag}-swipe`] = await contract();
  await shot(`${tag}-swipe`);
}

// topbar (chrome ligero tras el polish)
{
  const r = await page.locator('.topbar').boundingBox();
  await page.screenshot({
    path: join(OUT, 'topbar.png'),
    clip: { x: 0, y: 0, width: 1440, height: r.height }
  });
}

// ── tabla de diferencia map-vs-time (Phase 1) ────────────────────────
{
  const t52 = new Set(table.time1952.map((f) => f.id));
  const t74 = new Set(table.time1974.map((f) => f.id));
  table.rows = table.map.map((f) => ({
    building_id: f.id,
    ano_constr: f.year,
    state: f.state,
    visible_map: true,
    class_map:
      f.state !== 'VALID' ? 'unknown' : f.year > table.birthYear ? 'posterior' : 'anterior',
    visible_time1952: t52.has(f.id),
    visible_time1974: t74.has(f.id)
  }));
  table.summary = {
    map_total: table.map.length,
    map_post: table.rows.filter((r) => r.class_map === 'posterior').length,
    map_unknown: table.rows.filter((r) => r.class_map === 'unknown').length,
    time1952_total: table.time1952.length,
    time1952_post_visible: table.rows.filter(
      (r) => r.class_map === 'posterior' && r.visible_time1952
    ).length,
    time1974_total: table.time1974.length,
    same_camera: JSON.stringify(table.mapCamera) === JSON.stringify(table.timeCamera)
  };
  await writeFile(join(OUT, 'buildings-map-vs-time.json'), JSON.stringify(table, null, 2));
}
await writeFile(join(OUT, 'matrix.json'), JSON.stringify(matrix, null, 2));

console.log('matrix:', JSON.stringify(matrix, null, 0).slice(0, 2000));
console.log('summary:', JSON.stringify(table.summary));
console.log('errors:', errors.length ? errors : 'none');
await browser.close();
server.close();
