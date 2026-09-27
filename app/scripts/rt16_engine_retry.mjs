/**
 * RT-16 — resiliencia del motor: ¿qué pasa cuando el import de MapLibre se
 * rechaza (chunk no descargado) y cómo se recupera?
 *
 * Ensayo (sin tocar producción ni proveedores): se intercepta el chunk JS de
 * MapLibre en LOCAL y se aborta la primera descarga (corte de red simulado);
 * después se levanta el bloqueo y se comprueba el camino de recuperación.
 *
 * Adjudicación verificable:
 *  1. el fallo deja el lienzo sin canvas — eso es el síntoma;
 *  2. desde FASE B hay estado visible + acción (no hay pantalla en blanco
 *     silenciosa ni unhandled rejection);
 *  3. el retry en sesión NO emite una segunda petición: el module map del
 *     navegador cachea el fallo del especificador (mismo hecho verificado en
 *     `Lazy.svelte`), así que la recuperación real es RECARGAR, con el estado
 *     conservado en la URL. No se introducen reintentos infinitos.
 *
 * Uso: node scripts/rt16_engine_retry.mjs   (cwd = app/, build/ presente)
 * Salida: ../evidence/red-team-2026/rt16-engine-retry.json
 */
import { chromium } from 'playwright';
import { readdirSync, readFileSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { createStaticServer } from './static-server.mjs';
import { installCiFixtures } from './fixtures.mjs';

const ROOT = resolve(process.cwd(), '..');
const BUILD = resolve(process.cwd(), 'build');
const OUT = join(ROOT, 'evidence/red-team-2026');
const PORT = 4333;
const BASE = `http://localhost:${PORT}`;

// Localiza el chunk que empaqueta MapLibre (nombre con hash: cambia en cada
// build, no se puede hardcodear).
const chunksDir = join(BUILD, '_app/immutable/chunks');
const target = readdirSync(chunksDir).find((f) => {
  if (!f.endsWith('.js')) return false;
  try {
    return readFileSync(join(chunksDir, f), 'utf8').includes('maplibregl');
  } catch {
    return false;
  }
});
if (!target) {
  console.error('RT16 SKIP: no se encontró el chunk de maplibre-gl en build/');
  process.exit(2);
}

const server = await createStaticServer(BUILD, PORT);
await mkdir(OUT, { recursive: true });

const browser = await chromium.launch();
const out = { utc: new Date().toISOString(), target_chunk: target, steps: {}, checks: {}, notes: [] };
const ok = (k, v, detail = '') => {
  out.checks[k] = !!v;
  console.log(`${v ? 'PASS' : 'FAIL'} ${k}${detail ? ` — ${detail}` : ''}`);
};
const note = (s) => {
  out.notes.push(s);
  console.log(`NOTE ${s}`);
};

const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
if (process.env.CI_STUBS === '1') await installCiFixtures(page);
let blocked = true;
let engineAttempts = 0;
const pageerrors = [];
page.on('pageerror', (e) => pageerrors.push(String(e.message).slice(0, 200)));
page.on('request', (r) => {
  if (r.url().includes(`/${target}`)) engineAttempts++;
});
await page.route(`**/${target}`, (route) => {
  if (blocked) return route.abort('failed');
  return route.continue();
});

// 1 · entrada con el chunk del motor bloqueado
await page.goto(`${BASE}/?year=1987&place=leioa`, { waitUntil: 'load' });
await page.waitForFunction(() => window.__mjtApp?.headline != null, null, { timeout: 30000 });
await page.waitForTimeout(3000);
const canvasBlocked = await page.locator('.mapband canvas').count();
out.steps.after_block = { canvas: canvasBlocked, engine_attempts: engineAttempts };
ok('rt16_blocked_no_canvas', canvasBlocked === 0, `canvas=${canvasBlocked}`);

// 2 · el fallo es VISIBLE y explicado (no una pantalla en blanco muda)
const errVisible = await page
  .locator('.maperror[role="alert"]')
  .first()
  .innerText()
  .catch(() => '');
const hasRetry = await page.locator('.maperror .map-retry').count();
out.steps.error_state = { text: errVisible.slice(0, 140), retry_button: hasRetry };
ok('rt16_error_state_visible', /no se pudo cargar/i.test(errVisible), errVisible.slice(0, 120));
ok('rt16_error_has_reload_action', hasRetry === 1);

// 3 · sin rechazos sin capturar (antes: «Failed to fetch dynamically
//    imported module» llegaba como pageerror)
ok('rt16_no_unhandled_rejection', pageerrors.length === 0, pageerrors.join(' | '));

// 4 · retry en sesión: NO emite una segunda petición (module map) — se
//    registra como límite conocido, no como PASS del producto
blocked = false;
await page.click('.viewswitch button[data-mode="time"]');
await page.waitForTimeout(400);
await page.click('.viewswitch button[data-mode="map"]');
await page.waitForTimeout(1500);
const canvasAfterRetry = await page.locator('.mapband canvas').count();
note(
  `module map: peticiones al chunk tras reintentar en sesión = ${engineAttempts} (se esperan 1: el fallo del especificador queda cacheado)`
);
note(`canvas tras retry en sesión sin recargar = ${canvasAfterRetry}`);

// 5 · recuperación real: recargar con el bloqueo levantado restaura el mapa
await page.locator('.maperror .map-retry').click();
const recovered = await page
  .waitForSelector('.mapband canvas', { timeout: 25000 })
  .then(() => true)
  .catch(() => false);
const mapReady = await page
  .waitForFunction(() => {
    const m = window.__mjtMap;
    return !!m && typeof m.getStyle === 'function' && m.loaded();
  }, null, { timeout: 25000 })
  .then(() => true)
  .catch(() => false);
const tilesLoaded = await page
  .evaluate(() => window.__mjtMap?.areTilesLoaded?.() ?? false)
  .catch(() => false);
const stateKept = await page.evaluate(() => ({
  year: window.__mjtApp?.year,
  place: window.__mjtApp?.place?.slug
}));
out.steps.after_reload = {
  canvas: recovered,
  map_style_loaded: mapReady,
  tiles_loaded: tilesLoaded,
  state: stateKept,
  engine_attempts: engineAttempts
};
ok('rt16_reload_recovers', recovered, `attempts=${engineAttempts}`);
ok('rt16_reload_keeps_state', stateKept.year === 1987 && stateKept.place === 'leioa', JSON.stringify(stateKept));
ok('rt16_map_paints', mapReady === true, `style_loaded=${mapReady} tiles=${tilesLoaded}`);

await page.screenshot({ path: join(OUT, 'rt16-engine-retry.png') });
await ctx.close();
await browser.close();
server.close();

const fails = Object.entries(out.checks).filter(([, v]) => !v).map(([k]) => k);
await writeFile(join(OUT, 'rt16-engine-retry.json'), JSON.stringify(out, null, 2));
console.log(
  fails.length === 0
    ? `RT16 PASS (${Object.keys(out.checks).length} checks)`
    : `RT16 FAIL: ${fails.join(', ')}`
);
process.exit(fails.length === 0 ? 0 : 1);
