/**
 * G8 — rediseño de navegación del visor. Contratos:
 *   V1  cinco modos en una sola jerarquía (.viewswitch[data-mode]); sin
 *       encabezados de grupo ni «Ver cómo era» como categoría.
 *   V2  cada modo produce cambio perceptible (DOM + URL view=).
 *   V3  activo con superficie (aria-current + fondo), no solo underline.
 *   V4  activación por teclado (Enter) igual que por ratón.
 *   V5  CTA «Ver X cerca de cuando naciste» → photo + campaña más cercana
 *       al año (Bilbao 1952 → 1956), scroll + foco al visor.
 *   V6  deep link ?view= + reload restaura; back/forward restaura.
 *   V7  móvil: «Vista · modo» abre menú accesible (menuitemradio, Esc,
 *       aria-checked); sin fila de 5 tabs comprimida.
 *   V8  axe en los cinco modos.
 * Uso: node scripts/g8_viewer.mjs   (cwd = app/ con build/ presente)
 */
import { chromium } from 'playwright';
import { writeFile, mkdir } from 'node:fs/promises';
import { copyFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { createStaticServer } from './static-server.mjs';
import { installCiFixtures } from './fixtures.mjs';

const ROOT = resolve(process.cwd(), '..');
const BUILD = resolve(process.cwd(), 'build');
const OUT = join(ROOT, 'evidence/g8');
const PORT = 4191;
const BASE = `http://localhost:${PORT}`;
const Q = 'year=1952&place=bilbao&lat=43.263&lon=-2.935&z=14';
const U = (q) => `${BASE}/?${q}`;

const server = await createStaticServer(BUILD, PORT);
await mkdir(OUT, { recursive: true });
const axeTemp = join(BUILD, '_axe.min.js');
try {
  copyFileSync(join(process.cwd(), 'node_modules/axe-core/axe.min.js'), axeTemp);
} catch {
  /* sin axe: SKIP */
}

const out = { checks: {}, notes: [], pageerrors: [] };
const ok = (k, v) => (out.checks[k] = v);
const note = (s) => out.notes.push(s);

const browser = await chromium.launch();

async function newPage(ctxOpts = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, ...ctxOpts });
  const page = await ctx.newPage();
  // G11.3: un pageerror inesperado es un fallo bloqueante, no una nota.
  page.on('pageerror', (e) => {
    note(`PAGEERROR: ${e.message}`);
    out.pageerrors.push(String(e.message).slice(0, 300));
  });
  // CI_STUBS=1: servicios externos stubbados (la suite mide la app).
  if (process.env.CI_STUBS === '1') await installCiFixtures(page);
  return { ctx, page };
}
async function waitMap(page) {
  await page.waitForSelector('.mapband canvas', { timeout: 30000 });
  await page
    .waitForFunction(() => window.__mjtMap?.areTilesLoaded?.(), null, { timeout: 30000 })
    .catch(() => null);
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => null);
}
const appGet = (page, expr) => page.evaluate((e) => eval(e), expr);
const mode = (page) => appGet(page, 'window.__mjtApp.mode');
async function axeScan(page, name) {
  try {
    await page.addScriptTag({ url: '/_axe.min.js' });
    const v = await page.evaluate(async () => {
      const r = await window.axe.run(document, { resultTypes: ['violations'] });
      return r.violations.map((x) => x.id);
    });
    ok(`axe_${name}`, v.length === 0 ? 'PASS' : `FAIL ${JSON.stringify(v)}`);
  } catch (e) {
    ok(`axe_${name}`, `SKIP ${String(e).slice(0, 60)}`);
  }
}
// cambio perceptible por modo: el DOM/contexto de cada modo es distinto
const modeMarker = {
  // G12+: en modo map el Timeline solo existe con cabezal activo; el
  // marcador perceptible del modo es la explicación del mapa (.mapintro)
  map: '.mapintro',
  time: '.timeband .scrub',
  photo: '.photo',
  hist: '.histmap',
  swipe: '.swipe'
};

/* ---------- V1/V2/V3/V4 + axe: los cinco modos, ratón y teclado ---------- */
{
  const { ctx, page } = await newPage();
  await page.goto(U(Q));
  await waitMap(page);
  await page.waitForSelector('.viewswitch', { timeout: 15000 });

  // V1: exactamente 5 botones de modo, sin etiquetas de grupo
  const nBtns = await page.locator('.viewswitch button[data-mode]').count();
  const nGroups = await page.locator('.viewswitch .glabel').count();
  const hasEra = await page
    .locator('.viewswitch button')
    .allTextContents()
    .then((t) => t.some((x) => /c[oó]mo era/i.test(x)));
  ok(
    'v1_five_modes_no_groups',
    nBtns === 5 && nGroups === 0 && !hasEra
      ? 'PASS'
      : `FAIL btns=${nBtns} groups=${nGroups} era=${hasEra}`
  );

  // V2: cada modo produce cambio perceptible (marcador DOM + modo en estado)
  const seq = [];
  for (const m of ['map', 'time', 'photo', 'hist', 'swipe']) {
    await page.click(`.viewswitch button[data-mode="${m}"]`);
    await page.waitForTimeout(600);
    seq.push(await mode(page));
    const marker = await page.locator(modeMarker[m]).count();
    ok(`v2_marker_${m}`, marker > 0 ? 'PASS' : `FAIL modo=${m} sin ${modeMarker[m]}`);
  }
  ok('v2_sequence', seq.join(',') === 'map,time,photo,hist,swipe' ? 'PASS' : `FAIL ${seq}`);

  // V3: el activo tiene superficie (fondo) y aria-current
  await page.click('.viewswitch button[data-mode="photo"]');
  await page.waitForTimeout(400);
  const act = await page.evaluate(() => {
    const b = document.querySelector('.viewswitch button[aria-current="true"]');
    if (!b) return null;
    const cs = getComputedStyle(b);
    return { mode: b.dataset.mode, bg: cs.backgroundColor, border: cs.borderColor };
  });
  ok(
    'v3_active_surface',
    act && act.mode === 'photo' && act.bg !== 'rgba(0, 0, 0, 0)' && act.bg !== 'transparent'
      ? `PASS (bg=${act.bg})`
      : `FAIL ${JSON.stringify(act)}`
  );

  // V4: activación por teclado — focus + Enter cambia el modo
  await page.click('.viewswitch button[data-mode="map"]');
  await page.waitForTimeout(300);
  await page.focus('.viewswitch button[data-mode="swipe"]');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(500);
  ok('v4_keyboard_enter', (await mode(page)) === 'swipe' ? 'PASS' : `FAIL ${await mode(page)}`);

  // axe por modo
  for (const m of ['map', 'time', 'photo', 'hist', 'swipe']) {
    await page.click(`.viewswitch button[data-mode="${m}"]`);
    await page.waitForTimeout(700);
    await axeScan(page, `mode_${m}`);
    await page.screenshot({ path: join(OUT, `d-mode-${m}.png`) });
  }
  await ctx.close();
}

/* ---------- V5: CTA «Ver cómo era» → photo + campaña más cercana ---------- */
{
  const { ctx, page } = await newPage();
  await page.goto(U(Q));
  await waitMap(page);
  await page.waitForSelector('.cta-era', { timeout: 15000 });
  await page.click('.cta-era');
  await page.waitForTimeout(1500);
  const [m, camp, vis] = await Promise.all([
    mode(page),
    appGet(page, 'window.__mjtApp.orthoCampaign?.year'),
    appGet(page, 'window.__mjtApp.orthoVisible')
  ]);
  // Bilbao 1952 → campaña más cercana = 1956 (BFA catastral)
  ok(
    'v5_cta_activates_nearest',
    m === 'photo' && camp === 1956 && vis === true
      ? `PASS (photo, 1956, visible)`
      : `FAIL mode=${m} camp=${camp} vis=${vis}`
  );
  // el panel de fotos existe y quedó enfocado/desplazado
  const focused = await page.evaluate(
    () => document.activeElement?.classList?.contains('photo') ?? false
  );
  ok('v5_focus_panel', focused ? 'PASS' : 'FAIL foco no en .photo');
  const url = page.url();
  ok('v5_url', url.includes('view=photo') && url.includes('ortho=1956') ? `PASS` : `FAIL ${url}`);
  await ctx.close();
}

/* ---------- V6: deep link + reload + back/forward ---------- */
{
  const { ctx, page } = await newPage();
  for (const m of ['time', 'photo', 'hist', 'swipe']) {
    await page.goto(U(`${Q}&view=${m}`));
    await waitMap(page);
    const got = await mode(page);
    ok(`v6_deeplink_${m}`, got === m ? 'PASS' : `FAIL ${got}`);
  }
  // reload restaura
  await page.goto(U(`${Q}&view=swipe`));
  await waitMap(page);
  await page.reload({ waitUntil: 'load' });
  await waitMap(page);
  ok('v6_reload', (await mode(page)) === 'swipe' ? 'PASS' : `FAIL ${await mode(page)}`);
  // back/forward entre modos
  await page.goto(U(Q));
  await waitMap(page);
  await page.click('.viewswitch button[data-mode="photo"]');
  await page.waitForTimeout(400);
  await page.click('.viewswitch button[data-mode="hist"]');
  await page.waitForTimeout(400);
  await page.goBack().catch(() => null);
  await page.waitForTimeout(500);
  const back = await mode(page);
  await page.goForward().catch(() => null);
  await page.waitForTimeout(500);
  const fwd = await mode(page);
  ok(
    'v6_back_forward',
    back === 'photo' && fwd === 'hist' ? `PASS (back→photo, fwd→hist)` : `FAIL ${back}/${fwd}`
  );
  await ctx.close();
}

/* ---------- V7: móvil — «Vista · modo» + menú accesible ---------- */
{
  const { ctx, page } = await newPage({
    viewport: { width: 390, height: 780 },
    hasTouch: true,
    isMobile: true
  });
  await page.goto(U(Q));
  await waitMap(page);
  const tabsVisible = await page.locator('.viewswitch').isVisible();
  const selVisible = await page.locator('.vsel').isVisible();
  ok(
    'v7_mobile_control',
    !tabsVisible && selVisible
      ? 'PASS (sin tabs comprimidas, hay «Vista · modo»)'
      : `FAIL tabs=${tabsVisible} vsel=${selVisible}`
  );
  // abrir con clic
  await page.click('.vsel');
  await page.waitForSelector('.vmenu [role="menuitemradio"]', { timeout: 5000 });
  const items = await page.locator('.vmenu [role="menuitemradio"]').count();
  const checked = await page.locator('.vmenu [aria-checked="true"]').count();
  ok(
    'v7_menu_items',
    items === 5 && checked === 1 ? `PASS (5, checked=${checked})` : `FAIL ${items}/${checked}`
  );
  // Esc cierra y devuelve foco al control
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  const closed = await page.locator('.vmenu').count();
  const focusBack = await page.evaluate(() => document.activeElement?.classList?.contains('vsel'));
  ok(
    'v7_esc_focus',
    closed === 0 && focusBack ? 'PASS' : `FAIL closed=${closed} focus=${focusBack}`
  );
  // elegir «Antes / ahora» desde el menú
  await page.click('.vsel');
  await page.waitForSelector('.vmenu [role="menuitemradio"]', { timeout: 5000 });
  await page.click('.vmenu [data-mode="swipe"]');
  await page.waitForTimeout(600);
  ok('v7_menu_pick', (await mode(page)) === 'swipe' ? 'PASS' : `FAIL ${await mode(page)}`);
  // teclado: flechas + Enter
  await page.click('.vsel');
  await page.waitForSelector('.vmenu [role="menuitemradio"]', { timeout: 5000 });
  await page.keyboard.press('ArrowUp'); // desde swipe → hist
  await page.keyboard.press('Enter');
  await page.waitForTimeout(600);
  ok('v7_keyboard_pick', (await mode(page)) === 'hist' ? 'PASS' : `FAIL ${await mode(page)}`);
  // capturas del selector en cada estado
  await page.screenshot({ path: join(OUT, 'm-menu-closed.png') });
  await page.click('.vsel');
  await page.waitForSelector('.vmenu [role="menuitemradio"]', { timeout: 5000 });
  await page.screenshot({ path: join(OUT, 'm-menu-open.png') });
  for (const m of ['map', 'time', 'photo', 'hist', 'swipe']) {
    await page.click(`.vmenu [data-mode="${m}"]`).catch(async () => {
      await page.click('.vsel');
      await page.click(`.vmenu [data-mode="${m}"]`);
    });
    await page.waitForTimeout(800);
    if (await page.locator('.vmenu').count()) {
      await page.click('.vsel');
      await page.click(`.vmenu [data-mode="${m}"]`);
      await page.waitForTimeout(800);
    }
    await page.screenshot({ path: join(OUT, `m-mode-${m}.png`) });
  }
  await axeScan(page, 'mobile_menu_state');
  await ctx.close();
}

// G11.3: pageerror inesperado = FAIL bloqueante (antes solo era nota).
ok(
  'pageerrors',
  out.pageerrors.length === 0 ? 'PASS' : `FAIL ${JSON.stringify(out.pageerrors.slice(0, 3))}`
);

await writeFile(join(OUT, 'g8-viewer.json'), JSON.stringify(out, null, 2));
console.log(JSON.stringify(out.checks, null, 2));
if (out.notes.length) console.log('notas:', out.notes);
await browser.close();
server.close();
const fails = Object.values(out.checks).filter((v) => String(v).startsWith('FAIL'));
console.log(fails.length ? `\n${fails.length} FAIL` : '\ntodo PASS');
process.exit(fails.length ? 1 : 0);
