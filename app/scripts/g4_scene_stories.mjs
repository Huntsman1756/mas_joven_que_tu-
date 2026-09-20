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
 *   G4-H2:    etiqueta primaria dinámica (tiempo/mapa); las acciones llevan
 *             a #scene (smooth; instantáneo con reduced-motion); el h3
 *             anuncia sin caja en deep link y con subrayado editorial tras
 *             interacción de teclado; axe sobre el capítulo
 *   budget:   ≤6 acciones visibles en el primer viewport (390×844)
 *
 * Salida: G4_OUT o ../evidence/g4/browser/
 * Uso: node scripts/g4_scene_stories.mjs
 */
import { chromium } from 'playwright';
import { writeFile, mkdir } from 'node:fs/promises';
import { copyFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { createStaticServer } from './static-server.mjs';

const ROOT = resolve(process.cwd(), '..');
const BUILD = resolve(process.cwd(), 'build');
const OUT = process.env.G4_OUT || join(ROOT, 'evidence/g4/browser');
const PORT = 4184;

await mkdir(OUT, { recursive: true });
// axe servido desde el build (CSP del sitio rechaza inline) — patrón g2b
try {
  copyFileSync(join(process.cwd(), 'node_modules/axe-core/axe.min.js'), join(BUILD, '_axe.min.js'));
} catch {
  /* axe no instalado: el escaneo queda SKIP */
}
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
      const vw = 390,
        vh = 844;
      const els = [
        ...document.querySelectorAll('button, a[href], input, summary, [role="button"]')
      ];
      return els.filter((el) => {
        const r = el.getBoundingClientRect();
        // «visible» = completamente dentro del viewport (excluye skip-link
        // offscreen y controles parcialmente cortados)
        return (
          r.left >= 0 &&
          r.right <= vw &&
          r.top >= 0 &&
          r.bottom <= vh &&
          r.width > 0 &&
          r.height > 0 &&
          getComputedStyle(el).visibility !== 'hidden'
        );
      }).length;
    })
  };
  await shot('g4-a-default-390');

  // ── B. Modos de escena ────────────────────────────────────────────────
  // hist: entra y sondea (AVAILABLE/UNAVAILABLE son resultados honestos)
  await page.locator('.viewswitch .v', { hasText: '1923' }).click();
  await page
    .waitForFunction(() => window.__mjtApp?.histMapState !== 'UNKNOWN', { timeout: 30000 })
    .catch(() => {});
  results.steps.hist = {
    mode: await app('mode'),
    state: await app('histMapState'),
    url_has_view: page.url().includes('view=hist')
  };
  await shot('g4-b-hist');

  // photo: exclusividad — hist se retira al entrar en FOTO
  await page.locator('.viewswitch .v', { hasText: 'fotos' }).click();
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
  await page
    .waitForFunction(() => window.__mjtApp?.orthoState !== 'UNKNOWN', { timeout: 40000 })
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
  // PERF4-R3: el índice de historias está en el chunk lazy BelowFold
  await page.evaluate(() => document.querySelector('.below')?.scrollIntoView({ block: 'end' }));
  await page.waitForSelector('.stories .item', { timeout: 15000 });
  await page.locator('.stories .item').first().click(); // Descúbreme → primer capítulo
  await page.waitForSelector('.chapter', { timeout: 40000 });
  results.steps.discover_first = await app('story');
  results.steps.discover_url = page.url().includes('story=c2803');
  await page.locator('.chapter .act.ter:has-text("Otro")').click(); // «Otro» → f4036
  await page.waitForFunction(() => window.__mjtApp?.story === 'f4036', { timeout: 30000 });
  results.steps.next_rotates = await app('story');
  await page.locator('.chapter .act.ter:has-text("Volver")').click(); // «Volver a mi Bizkaia»
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
  await page.waitForFunction(() => window.__mjtApp?.pendingBuildingId === null, { timeout: 30000 });
  results.steps.building_no_camera = {
    selected: await app('selectedBuilding?.id'),
    failed: await app('buildingRestoreFailed')
  };

  // id inexistente → aviso explícito, nunca silencioso
  await page.goto(`${BASE}?year=1987&place=bilbao&building=no-existe-999`, {
    waitUntil: 'load'
  });
  await resultReady();
  await page.waitForFunction(() => window.__mjtApp?.pendingBuildingId === null, { timeout: 30000 });
  await page.waitForSelector('.tramo .notice', { timeout: 15000 }).catch(() => null);
  results.steps.building_missing = {
    failed: await app('buildingRestoreFailed'),
    notice_visible: await page.locator('.tramo .notice').count()
  };
  await shot('g4-e-building-fail');

  // ── F. compare == year → rechazado ────────────────────────────────────
  await page.goto(`${BASE}?year=1987&place=leioa&compare=1987`, { waitUntil: 'load' });
  await resultReady();
  results.steps.compare_same_url = { compareYear: await app('compareYear') };

  // ── G. G4-H2: etiqueta dinámica, escena como destino, foco editorial ──
  // deep link: el h3 recibe foco programático sin indicador visible
  await page.goto(`${BASE}?story=c2803`, { waitUntil: 'load' });
  await page.waitForSelector('.chapter', { timeout: 40000 });
  await page.waitForTimeout(500);
  results.steps.h2_focus_deeplink = await page.evaluate(() => {
    const el = document.querySelector('.chapter .c-title');
    const cs = getComputedStyle(el);
    return {
      focused: document.activeElement === el,
      focusVisible: el.matches(':focus-visible'),
      outline: `${cs.outlineStyle}/${cs.outlineWidth}`
    };
  });

  const sceneInView = async (pg, timeout = 6000) =>
    pg
      .waitForFunction(
        () => {
          const r = document.getElementById('scene')?.getBoundingClientRect();
          return !!r && Math.abs(r.top) < 60;
        },
        { timeout }
      )
      .then(() => true)
      .catch(() => false);

  // etiqueta primaria por señal: pulso temporal → tiempo; sin pulso → mapa
  results.steps.h2_labels = {};
  for (const [id, want] of [
    ['c2803', 'Ver en el tiempo'],
    ['f4036', 'Ver en el mapa'],
    ['f4233', 'Ver en el tiempo'],
    ['f4738', 'Ver en el mapa'],
    ['f149', 'Ver en el mapa']
  ]) {
    await page.goto(`${BASE}?story=${id}`, { waitUntil: 'load' });
    await page.waitForSelector('.chapter', { timeout: 40000 });
    const got = (await page.locator('.chapter .act').first().innerText()).trim();
    results.steps.h2_labels[id] = { got, want, ok: got === want };
  }

  // acción primaria con pulso → modo TIEMPO, cabezal pausado, escena a la vista
  await page.goto(`${BASE}?story=c2803`, { waitUntil: 'load' });
  await page.waitForSelector('.chapter', { timeout: 40000 });
  await page.locator('.chapter .act').first().click();
  await page.waitForFunction(() => window.__mjtApp?.mode === 'time', { timeout: 15000 });
  results.steps.h2_move_time = {
    mode: await app('mode'),
    playYear: await app('playYear'),
    playing: await app('playing'),
    scene_in_view: await sceneInView(page)
  };

  // sin pulso → modo MAPA + reencuadre del conjunto + escena a la vista
  await page.goto(`${BASE}?story=f4036`, { waitUntil: 'load' });
  await page.waitForSelector('.chapter', { timeout: 40000 });
  const seq0 = (await app('cameraSeq')) ?? 0;
  await page.locator('.chapter .act').first().click();
  results.steps.h2_move_map = {
    mode: await app('mode'),
    camera_moved: (await app('cameraSeq')) > seq0,
    playing: await app('playing'),
    scene_in_view: await sceneInView(page)
  };

  // «Míralo desde el aire» → FOTO activada + escena a la vista
  await page.locator('.chapter .act.sec').click();
  await page.waitForFunction(() => window.__mjtApp?.mode === 'photo', { timeout: 15000 });
  results.steps.h2_air = {
    mode: await app('mode'),
    campaign: await app('orthoCampaign?.year'),
    scene_in_view: await sceneInView(page)
  };

  // axe sobre el capítulo (contraste .scontrast incluido)
  results.steps.h2_axe_chapter = await (async () => {
    try {
      await page.addScriptTag({ url: '/_axe.min.js' });
      return await page.evaluate(async () => {
        const r = await window.axe.run(document, { resultTypes: ['violations'] });
        return r.violations.map((v) => v.id);
      });
    } catch (e) {
      return [`SKIP ${String(e).slice(0, 60)}`];
    }
  })();

  // teclado: Enter en «Otro» → el nuevo h3 muestra :focus-visible editorial
  await page.goto(`${BASE}?story=c2803`, { waitUntil: 'load' });
  await page.waitForSelector('.chapter', { timeout: 40000 });
  await page.locator('.chapter .act.ter:has-text("Otro")').press('Enter');
  await page.waitForFunction(() => window.__mjtApp?.story === 'f4036', { timeout: 30000 });
  await page.waitForTimeout(400);
  results.steps.h2_keyboard_focus = await page.evaluate(() => {
    const el = document.querySelector('.chapter .c-title');
    const cs = getComputedStyle(el);
    return {
      focused: document.activeElement === el,
      // :focus-visible no se propaga al foco programático (verificado en
      // este motor); el contrato observable es el subrayado vía .kbd
      kbd: el.classList.contains('kbd'),
      focusVisible: el.matches(':focus-visible'),
      underline: cs.textDecorationLine.includes('underline'),
      outline: `${cs.outlineStyle}/${cs.outlineWidth}`
    };
  });

  // reduced-motion: el salto a la escena es instantáneo (nunca smooth)
  const rm = await browser.newContext({
    viewport: { width: 390, height: 844 },
    reducedMotion: 'reduce'
  });
  const rmPage = await rm.newPage();
  await rmPage.goto(`${BASE}?story=f4036`, { waitUntil: 'load' });
  await rmPage.waitForSelector('.chapter', { timeout: 40000 });
  await rmPage.locator('.chapter').scrollIntoViewIfNeeded();
  await rmPage.locator('.chapter .act').first().click();
  await rmPage.waitForTimeout(120);
  results.steps.h2_reduced_motion = await rmPage.evaluate(() => ({
    reduced: matchMedia('(prefers-reduced-motion: reduce)').matches,
    scene_top: document.getElementById('scene')?.getBoundingClientRect().top ?? null
  }));
  await rm.close();

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
    results.steps.compare_same_url.compareYear === null &&
    // G4-H2
    results.steps.h2_focus_deeplink.focused === true &&
    results.steps.h2_focus_deeplink.focusVisible === false &&
    Object.values(results.steps.h2_labels).every((l) => l.ok) &&
    results.steps.h2_move_time.mode === 'time' &&
    results.steps.h2_move_time.playYear === 1969 &&
    results.steps.h2_move_time.playing === false &&
    results.steps.h2_move_time.scene_in_view === true &&
    results.steps.h2_move_map.mode === 'map' &&
    results.steps.h2_move_map.camera_moved === true &&
    results.steps.h2_move_map.scene_in_view === true &&
    results.steps.h2_air.mode === 'photo' &&
    results.steps.h2_air.campaign === 1970 &&
    results.steps.h2_air.scene_in_view === true &&
    results.steps.h2_axe_chapter.length === 0 &&
    results.steps.h2_keyboard_focus.focused === true &&
    results.steps.h2_keyboard_focus.kbd === true &&
    results.steps.h2_keyboard_focus.underline === true &&
    results.steps.h2_reduced_motion.reduced === true &&
    Math.abs(results.steps.h2_reduced_motion.scene_top) < 60;
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
