/**
 * MOB-R1 — smoke de composición móvil en emulación (no sustituye al
 * iPhone físico: el oráculo del gate es Safari real; aquí se verifica
 * la ESTRUCTURA — overlays, z-order, estado del árbitro — y se generan
 * capturas para comparación).
 *
 * Asertos:
 *  A1  Evolución: ficha de zona nace como chip colapsado; expandir la
 *      convierte en sheet ≤42 % vh y nunca cubre el player.
 *  A2  Antes/ahora: selectores NO viven sobre la imagen; chip compacto
 *      «antes ↔ después · Cambiar» sí; «Solo A/B» dentro del viewport.
 *  A3  Sheet de campañas bajo demanda; al abrirse repliega otros
 *      overlays (árbitro).
 *  A4  Editor «Cambiar»: exactamente UN «Cancelar» visible + ✕.
 *  A5  Leyenda móvil nace colapsada (<details.legend-m> sin open).
 *  A6  Player siempre dentro del viewport y ≥44 px de alto útil.
 *  R2  (MOB-06) entrar en Antes/ahora por el selector, con scroll
 *      previo profundo: ≥40 % del visual viewport es imagen, el grip
 *      del swipe queda dentro y el sheet de campañas nace cerrado.
 *
 * Uso: node scripts/_mob_r1_shots.mjs   (cwd = app/ con build/ presente)
 */
import { chromium, devices } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { createStaticServer } from './static-server.mjs';

const ROOT = resolve(process.cwd(), '..');
const BUILD = resolve(process.cwd(), 'build');
const OUT = join(ROOT, 'evidence/mobile-physical/mobr1-local');
const PORT = 4237;
const BASE = `http://localhost:${PORT}`;

const server = await createStaticServer(BUILD, PORT);
await mkdir(OUT, { recursive: true });
const errors = [];
const findings = [];
const ok = (id, cond, note = '') => findings.push({ id, pass: !!cond, note });

const browser = await chromium.launch();
const ctx = await browser.newContext({
  ...devices['iPhone 13'],
  viewport: { width: 390, height: 844 }
});
const page = await ctx.newPage();
page.on('pageerror', (e) => errors.push(String(e.message).slice(0, 200)));
const shot = (n) => page.screenshot({ path: join(OUT, `${n}.png`) });
const app = (expr) => page.evaluate(`window.__mjtApp.${expr}`);

const waitResult = () =>
  page.waitForFunction(() => window.__mjtApp?.headline !== null, { timeout: 30000 });
const waitMap = () =>
  page.waitForFunction(() => !!window.__mjtMap?.loaded?.(), null, { timeout: 30000 });

/* ── Antes/ahora ──────────────────────────────────────────────── */
await page.goto(`${BASE}/?year=1975&place=getxo&view=swipe&ortho=2017&ortho2=1956`, {
  waitUntil: 'domcontentloaded'
});
await waitResult();
await waitMap();
await page.waitForTimeout(1500);

ok('A2.compact-chip', await page.locator('.sw-compact .sw-open').isVisible());
ok('A2.no-floating-selectors', !(await page.locator('.swipectl .sw-picks').isVisible()));
const presetsBox = await page.locator('.presets').boundingBox();
ok(
  'A2.solo-ab-visible',
  presetsBox && presetsBox.y + presetsBox.height <= 844,
  JSON.stringify(presetsBox)
);
// el chip compacto no solapa con el chip del año «antes» (esquina izda)
const swOpen = await page.locator('.sw-open').boundingBox();
const chipLeft = await page.locator('.chip.left').boundingBox();
ok(
  'A2.chip-vs-yearlabel',
  !swOpen ||
    !chipLeft ||
    swOpen.x > chipLeft.x + chipLeft.width ||
    swOpen.y > chipLeft.y + chipLeft.height,
  `open=${JSON.stringify(swOpen)} left=${JSON.stringify(chipLeft)}`
);
await shot('mobr1-swipe-default');

// sheet de campañas bajo demanda
await page.locator('.sw-open').click();
await page.waitForFunction(() => window.__mjtApp?.mobileOverlay === 'campaigns', null, {
  timeout: 5000
});
ok('A3.sheet-open', await page.locator('.sw-sheet').isVisible());
await shot('mobr1-swipe-campaign-sheet');
await page.locator('.sw-cancel').click();
await page.waitForFunction(() => window.__mjtApp?.mobileOverlay === null, null, { timeout: 5000 });
ok('A3.sheet-closes', !(await page.locator('.sw-sheet').count()));

/* ── Evolución ────────────────────────────────────────────────── */
await page.goto(`${BASE}/?year=1975&place=getxo&view=time&lat=43.35&lon=-3.01&z=12.2`, {
  waitUntil: 'domcontentloaded'
});
await waitResult();
await waitMap();
await page.waitForFunction(() => window.__mjtApp?.playYear !== null, null, { timeout: 10000 });
await page.waitForTimeout(1200);

ok('A6.player-visible', await page.locator('.timeband').isVisible());
const playerBox = await page.locator('.timeband').boundingBox();
ok(
  'A6.player-in-viewport',
  playerBox && playerBox.y + playerBox.height <= 844 && playerBox.height >= 44,
  JSON.stringify(playerBox)
);
ok('A5.legend-collapsed', (await page.locator('details.legend-m').count()) === 1);
ok(
  'A5.legend-not-open',
  !(await page.locator('details.legend-m[open]').count()),
  'la leyenda nace sin [open]'
);
await shot('mobr1-time-idle');

// seleccionar una celda: tap en el centro del lienzo (nivel CELDA)
const wrap = await page.locator('.mapwrap').boundingBox();
if (wrap) {
  await page.touchscreen.tap(wrap.x + wrap.width / 2, wrap.y + wrap.height / 2);
  await page.waitForTimeout(600);
}
// si el centro no tiene celda, usar la sonda «Ver datos de esta zona»
if (!(await app('selectedCell')) && !(await app('cellInspectNone'))) {
  const probeBtn = page.locator('.cell-inspect');
  if (await probeBtn.count()) {
    await page.locator('details.legend-m summary').click(); // la sonda vive tras el desplegable
    await probeBtn.click();
    await page.waitForTimeout(600);
  }
}
const hasSel = await page.evaluate(
  () => !!(window.__mjtApp?.selectedCell || window.__mjtApp?.cellInspectNone)
);
ok('A1.cell-selected', hasSel);
if (hasSel) {
  ok('A1.chip-default', await page.locator('.cell-chip').isVisible());
  ok('A1.no-card-default', !(await page.locator('.sel-float').isVisible()));
  await page.locator('.cell-chip').click();
  await page.waitForFunction(() => window.__mjtApp?.mobileOverlay === 'cell', null, {
    timeout: 5000
  });
  const sheetBox = await page.locator('.sel-float').boundingBox();
  ok('A1.sheet-maxheight', sheetBox && sheetBox.height <= 844 * 0.42 + 2, `h=${sheetBox?.height}`);
  const pb = await page.locator('.timeband').boundingBox();
  ok(
    'A1.sheet-above-player',
    sheetBox && pb && sheetBox.y + sheetBox.height <= pb.y + 1,
    `sheetBottom=${sheetBox && sheetBox.y + sheetBox.height} playerTop=${pb?.y}`
  );
  await shot('mobr1-cell-expanded');
}

/* ── Editor Cambiar: un solo «Cancelar» ───────────────────────── */
await page.locator('.change').click();
await page.waitForFunction(() => window.__mjtApp?.mobileOverlay === 'edit', null, {
  timeout: 5000
});
await page.waitForTimeout(400);
const visibleCancel = await page.evaluate(() => {
  const els = [...document.querySelectorAll('button, [role="button"]')].filter(
    (el) => el.offsetParent !== null && el.textContent.trim() === 'Cancelar'
  );
  return els.length;
});
ok('A4.single-cancel', visibleCancel === 1, `visibles=${visibleCancel}`);
ok('A4.backdrop', await page.locator('.cf-backdrop').isVisible());
await shot('mobr1-edit-sheet');
await page.locator('.cf-cancel').click();
await page.waitForFunction(() => window.__mjtApp?.mobileOverlay === null, null, {
  timeout: 5000
});

/* ── MOB-R2 §13: entrar en swipe por el selector tras scroll profundo
   — el canvas debe anclarse a la primera pantalla ─────────────────── */
await page.goto(`${BASE}/?year=1975&place=getxo`, { waitUntil: 'domcontentloaded' });
await waitResult();
await waitMap();
await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
await page.waitForTimeout(400);
await page.locator('.vsel').click();
await page.locator('.vmenu .vopt[data-mode="swipe"]').click();
await page.waitForFunction(() => window.__mjtApp?.mode === 'swipe', null, { timeout: 15000 });
await page.waitForTimeout(1600); // scroll smooth + montaje del comparador
const fold = await page.evaluate(() => {
  const vv = window.visualViewport;
  const vh = vv ? vv.height : window.innerHeight;
  const vt = vv ? vv.offsetTop : 0;
  const wrap = document.querySelector('.mapwrap')?.getBoundingClientRect();
  const grip = document.querySelector('.swipe .grip')?.getBoundingClientRect();
  const visible = wrap ? Math.min(wrap.bottom, vt + vh) - Math.max(wrap.top, vt) : 0;
  return {
    vh,
    vt,
    wrapTop: wrap?.top,
    wrapBottom: wrap?.bottom,
    visible,
    gripTop: grip?.top,
    gripBottom: grip?.bottom
  };
});
ok(
  'R2.canvas-above-fold',
  fold.wrapTop != null && fold.wrapTop < fold.vt + fold.vh && fold.visible >= fold.vh * 0.4,
  JSON.stringify(fold)
);
ok(
  'R2.grip-in-vv',
  fold.gripTop != null && fold.gripTop >= fold.vt && fold.gripBottom <= fold.vt + fold.vh,
  `grip=[${fold.gripTop}–${fold.gripBottom}] vv=[${fold.vt}–${fold.vt + fold.vh}]`
);
ok('R2.sheet-closed-entry', !(await app('campaignSheetOpen')), '§11: nunca abierto por defecto');
ok('R2.no-menu-left', !(await page.locator('.vmenu').count()), '§15: el selector se cierra');
await shot('mobr2-swipe-entry');

await browser.close();
server.close();
await writeFile(join(OUT, 'mobr1-local.json'), JSON.stringify({ findings, errors }, null, 2));
console.log(JSON.stringify({ findings, errors }, null, 2));
process.exit(findings.some((f) => !f.pass) || errors.length ? 1 : 0);
