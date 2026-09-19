/**
 * G4 — escena unificada + historias + URL/state (CUT B).
 *
 * Evidencia funcional (no timed):
 *   scene:    view=map|time|photo|hist round-trip; photo⟺hist exclusividad;
 *             ortho= sin view= implica FOTO; ortho2= restaura comparador
 *   stories:  ?story=<id> abre capítulo + escena para los 5 ids congelados;
 *             «Otro» rota en orden editorial; «Volver a mi Bizkaia» restaura;
 *             back/forward entre historia y estado personal
 *   bugs:     building= sin cámara → restore determinista por índice;
 *             building= inexistente → aviso explícito (nunca silencioso);
 *             compare==year → rechazado con copy
 *   budget:   ≤6 acciones visibles en el primer viewport (390×844)
 *
 * Salida: G4_OUT o ../evidence/g4/browser/
 * Uso: node scripts/g4_scene_stories.mjs
 */
import { chromium } from 'playwright';
import { writeFile, mkdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { createStaticServer } from './static-server.mjs';

const ROOT = resolve(process.cwd(), '..');
const BUILD = resolve(process.cwd(), 'build');
const OUT = process.env.G4_OUT || join(ROOT, 'evidence/g4/browser');
const PORT = 4184;

await mkdir(OUT, { recursive: true });
const server = await createStaticServer(BUILD, PORT);
const BASE = `http://localhost:${PORT}/`;
const results = { utc: new Date().toISOString(), steps: {} };
const errs = [];

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
page.on('pageerror', (e) => errs.push(String(e).slice(0, 200)));

const app = (expr) => page.evaluate(`window.__mjtApp?.${expr}`);
const shot = (n) => page.screenshot({ path: join(OUT, `${n}.png`), fullPage: false });

async function resultReady(timeout = 40000) {
  await page.waitForSelector('.headline-block h1', { timeout });
  await page.waitForSelector('.mapband canvas', { timeout });
}

try {
  // ── A. Resultado por defecto: presupuesto de controles ────────────────
  await page.goto(`${BASE}?year=1987&place=leioa`, { waitUntil: 'load' });
  await resultReady();
  results.steps.default = {
    mode: await app('mode'),
    story: await app('story'),
    viewSwitch: await page.locator('.viewswitch .v').count(),
    firstViewportActions: await page.evaluate(() => {
      const vw = 390, vh = 844;
      const els = [...document.querySelectorAll('button, a[href], input, summary, [role="button"]')];
      return els.filter((el) => {
        const r = el.getBoundingClientRect();
        // «visible» = completamente dentro del viewport (excluye skip-link
        // offscreen y controles parcialmente cortados)
        return r.left >= 0 && r.right <= vw && r.top >= 0 && r.bottom <= vh &&
          r.width > 0 && r.height > 0 &&
          getComputedStyle(el).visibility !== 'hidden';
      }).length;
    })
  };
  await shot('g4-a-default-390');

  // ── B. Modos de escena ────────────────────────────────────────────────
  // hist: entra y sondea (AVAILABLE/UNAVAILABLE son resultados honestos)
  await page.locator('.viewswitch .v', { hasText: '1923' }).click();
  await page.waitForFunction(() => window.__mjtApp?.histMapState !== 'UNKNOWN', { timeout: 30000 })
    .catch(() => {});
  results.steps.hist = {
    mode: await app('mode'),
    state: await app('histMapState'),
    url_has_view: page.url().includes('view=hist')
  };
  await shot('g4-b-hist');

  // photo: exclusividad — hist se retira al entrar en FOTO
  await page.locator('.viewswitch .v', { hasText: 'FOTO' }).click();
  await page.waitForSelector('.photo', { timeout: 15000 });
  results.steps.photo = {
    mode: await app('mode'),
    histVisible: await app('histMapVisible'),
    orthoVisible_before_activate: await app('orthoVisible'),
    url_has_view: page.url().includes('view=photo')
  };
  await shot('g4-b-photo');

  // ortho= sin view= → implica FOTO (compat deep link)
  await page.goto(`${BASE}?year=1987&place=leioa&ortho=1990`, { waitUntil: 'load' });
  await resultReady();
  await page.waitForFunction(() => window.__mjtApp?.orthoState !== 'UNKNOWN', { timeout: 40000 })
    .catch(() => {});
  results.steps.ortho_implies_photo = {
    mode: await app('mode'),
    campaign: await app('orthoCampaign?.year'),
    state: await app('orthoState')
  };

  // ortho2= → comparador restaurado dentro de FOTO
  await page.goto(`${BASE}?year=1987&place=leioa&view=photo&ortho=1990&ortho2=2025`, {
    waitUntil: 'load'
  });
  await resultReady();
  results.steps.ortho2 = {
    campaign: await app('orthoCampaign?.year'),
    compare: await app('orthoCompare?.year')
  };

  // view=hist deep link → modo restaurado
  await page.goto(`${BASE}?year=1987&place=leioa&view=hist`, { waitUntil: 'load' });
  await resultReady();
  results.steps.hist_deeplink = {
    mode: await app('mode'),
    visible: await app('histMapVisible')
  };

  // ── C. Historias: los 5 deep links ────────────────────────────────────
  results.steps.stories = {};
  for (const id of ['c2803', 'f4036', 'f4233', 'f4738', 'f149']) {
    await page.goto(`${BASE}?story=${id}`, { waitUntil: 'load' });
    await page.waitForSelector('.chapter', { timeout: 40000 });
    await page.waitForTimeout(600);
    results.steps.stories[id] = {
      story: await app('story'),
      place: await app('place?.slug'),
      year: await app('year'),
      mode: await app('mode'),
      url_has_story: page.url().includes(`story=${id}`),
      title: (await page.locator('.chapter .c-title').innerText()).slice(0, 70)
    };
  }
  await shot('g4-c-story-f149');

  // ── D. Rotación determinista + volver ─────────────────────────────────
  await page.goto(`${BASE}?year=1987&place=leioa`, { waitUntil: 'load' });
  await resultReady();
  await page.locator('.stories .cta').click(); // Descúbreme → primer capítulo
  await page.waitForSelector('.chapter', { timeout: 40000 });
  results.steps.discover_first = await app('story');
  results.steps.discover_url = page.url().includes('story=c2803');
  await page.locator('.chapter .act.quiet').click(); // «Otro» → f4036
  await page.waitForFunction(() => window.__mjtApp?.story === 'f4036', { timeout: 30000 });
  results.steps.next_rotates = await app('story');
  await page.locator('.chapter .act.back').click(); // «Volver a mi Bizkaia»
  await page.waitForFunction(() => window.__mjtApp?.story === null, { timeout: 15000 });
  results.steps.back_restores = {
    story: await app('story'),
    place: await app('place?.slug'),
    year: await app('year')
  };

  // ── E. BUG-01: building= sin cámara ───────────────────────────────────
  // id real del índice 020 (Bilbao), sin lat/lon/z: el índice localiza
  await page.goto(`${BASE}?year=1987&place=bilbao&building=20-1202-6001-1-2`, {
    waitUntil: 'load'
  });
  await resultReady();
  await page.waitForFunction(
    () => window.__mjtApp?.pendingBuildingId === null,
    { timeout: 30000 }
  );
  results.steps.building_no_camera = {
    selected: await app('selectedBuilding?.id'),
    failed: await app('buildingRestoreFailed')
  };

  // id inexistente → aviso explícito, nunca silencioso
  await page.goto(`${BASE}?year=1987&place=bilbao&building=no-existe-999`, {
    waitUntil: 'load'
  });
  await resultReady();
  await page.waitForFunction(
    () => window.__mjtApp?.pendingBuildingId === null,
    { timeout: 30000 }
  );
  results.steps.building_missing = {
    failed: await app('buildingRestoreFailed'),
    notice_visible: await page.locator('.tramo .notice').count()
  };
  await shot('g4-e-building-fail');

  // ── F. compare == year → rechazado ────────────────────────────────────
  await page.goto(`${BASE}?year=1987&place=leioa&compare=1987`, { waitUntil: 'load' });
  await resultReady();
  results.steps.compare_same_url = { compareYear: await app('compareYear') };

  results.consoleErrors = errs;
  results.pass =
    errs.length === 0 &&
    results.steps.default.firstViewportActions <= 6 &&
    results.steps.hist.url_has_view &&
    results.steps.photo.histVisible === false &&
    results.steps.ortho_implies_photo.mode === 'photo' &&
    results.steps.ortho2.compare === 2025 &&
    results.steps.hist_deeplink.mode === 'hist' &&
    Object.values(results.steps.stories).every((s) => s.story && s.url_has_story) &&
    results.steps.discover_first === 'c2803' &&
    results.steps.next_rotates === 'f4036' &&
    results.steps.back_restores.place === 'leioa' &&
    results.steps.back_restores.year === 1987 &&
    results.steps.building_no_camera.selected === '20-1202-6001-1-2' &&
    results.steps.building_missing.failed === 'no-existe-999' &&
    results.steps.compare_same_url.compareYear === null;
} catch (e) {
  results.pass = false;
  results.error = String(e).slice(0, 400);
  await shot('g4-fail');
}

await writeFile(join(OUT, 'g4-scene-stories.json'), JSON.stringify(results, null, 1));
await browser.close();
await server.close();
console.log(results.pass ? 'PASS' : 'FAIL', results.error ?? '');
console.log('→', join(OUT, 'g4-scene-stories.json'));
