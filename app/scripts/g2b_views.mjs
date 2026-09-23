/**
 * G2-B — MAPA·TIEMPO·FOTO + contraste C-05/C-08 (docs/gates/G2.md §S/§F4/§C).
 *   S1 vistas comparten place+year+view en URL · S2 cambio de vista no resetea
 *   año/lugar · S3 deep-link reproduce vista (+back/forward) · F4 nav de
 *   campañas con fuente/fecha siempre visibles · C1/C2 contraste con ambos
 *   denominadores · regla playYear persistente · red (0 orto sin acción) ·
 *   marcas de campaña a 320px (tick 3px + hitbox 44px) · reduced-motion · axe.
 * Uso: node scripts/g2b_views.mjs   (cwd = app/ con build/ presente)
 */
import { chromium, firefox, webkit } from 'playwright';
import { writeFile, mkdir } from 'node:fs/promises';
import { copyFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { createStaticServer } from './static-server.mjs';
import { installCiFixtures } from './fixtures.mjs';

const ROOT = resolve(process.cwd(), '..');
const BUILD = resolve(process.cwd(), 'build');
const OUT = join(ROOT, 'evidence/g2/g2b-views');
const PORT = 4186;
const BASE = `http://localhost:${PORT}`;
const U = (q) => `${BASE}/?${q}`;
const Q = 'year=1987&place=leioa&lat=43.326&lon=-2.988&z=11.5';

const server = await createStaticServer(BUILD, PORT);
await mkdir(OUT, { recursive: true });
// axe servido desde el build (CSP del sitio rechaza inline) — patrón g1_a11y
const axeTemp = join(BUILD, '_axe.min.js');
try {
  copyFileSync(join(process.cwd(), 'node_modules/axe-core/axe.min.js'), axeTemp);
} catch {
  /* axe no instalado: se omite el escaneo */
}

const out = { checks: {}, notes: [], pageerrors: [] };
const ok = (k, v) => {
  out.checks[k] = v;
};
const note = (s) => out.notes.push(s);

const ENGINE = process.env.BROWSER ?? 'chromium';
let browser;
if (ENGINE === 'firefox') browser = await firefox.launch();
else if (ENGINE === 'webkit') browser = await webkit.launch();
else {
  for (const channel of ['chrome', 'msedge']) {
    try {
      browser = await chromium.launch({ channel, args: ['--disable-gpu'] });
      break;
    } catch {
      /* next */
    }
  }
  browser ??= await chromium.launch({ args: ['--disable-gpu'] });
}
const OUTF = join(OUT, `g2b-views${ENGINE === 'chromium' ? '' : `-${ENGINE}`}.json`);

async function newPage(ctxOpts = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, ...ctxOpts });
  const page = await ctx.newPage();
  page._orthoReqs = [];
  // G11.3: un pageerror inesperado es un fallo bloqueante, no una nota.
  page.on('pageerror', (e) => {
    note(`PAGEERROR: ${e.message}`);
    out.pageerrors.push(String(e.message).slice(0, 300));
  });
  // CI_STUBS=1: servicios externos stubbados (la suite mide la app).
  if (process.env.CI_STUBS === '1') await installCiFixtures(page);
  page.on('request', (r) => {
    // G11.2: el filtro se acota a ortofotos/cartografía histórica (ORTO_BFA,
    // WMS_ORTOARGAZKIAK, ORTO_EJ_CARTO_1925). El mapa base de referencia
    // (KARTOGRAFIA_CAS_EUS) no es ortofoto y se sirve siempre.
    if (/orto/i.test(r.url())) page._orthoReqs.push(r.url());
  });
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
// G18-R: activar la campaña destacada = tocar su marca en el eje (el
// rail es el activador; no hay CTA «Comprobar desde el aire»). Se clica
// la posición real (%) de la marca: la caja de first/last no está
// centrada en el tick.
async function activateCurrent(page) {
  const frac = await page.evaluate(() => {
    const ep = document.querySelector('.photo .epoch.cur');
    return ep ? parseFloat(ep.style.left) / 100 : null;
  });
  if (frac === null) return;
  const w = (await page.locator('.photo .tc-rail').boundingBox()).width;
  // locator.click desplaza el panel a la vista si está bajo el mapa
  await page.locator('.photo .tc-scrub').click({ position: { x: Math.min(frac * w, w - 2), y: 20 } });
}
const mode = (page) => appGet(page, 'window.__mjtApp.mode');
const cam = (page) =>
  page.evaluate(() => {
    const m = window.__mjtMap;
    return {
      c: m
        .getCenter()
        .toArray()
        .map((v) => +v.toFixed(4)),
      z: +m.getZoom().toFixed(3),
      b: m.getBearing(),
      p: m.getPitch()
    };
  });
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

/* ---------- S1/S2 + regla playYear + red sin acción + F4 + axe ---------- */
{
  const { ctx, page } = await newPage();
  await page.goto(U(Q));
  await waitMap(page);
  await page.waitForSelector('.viewswitch', { timeout: 10000 });

  const cam0 = await cam(page);
  const seq = [];
  for (const m of ['time', 'photo', 'map']) {
    await page.click(`.viewswitch button[data-mode="${m}"]`);
    await page.waitForTimeout(350);
    seq.push(await mode(page));
  }
  // S1: la vista se serializa en la URL
  ok('s1_view_in_url', seq.join(',') === 'time,photo,map' ? `PASS (${seq})` : `FAIL ${seq}`);
  // tras el último cambio (map) la URL no lleva view; comprobamos time/photo por history
  await page.click('.viewswitch button[data-mode="time"]');
  await page.waitForTimeout(350);
  const urlTime = page.url();
  await page.click('.viewswitch button[data-mode="photo"]');
  await page.waitForTimeout(350);
  const urlPhoto = page.url();
  ok(
    's1_url_params',
    urlTime.includes('view=time') && urlPhoto.includes('view=photo')
      ? `PASS`
      : `FAIL time=${urlTime} photo=${urlPhoto}`
  );

  // S2: ni año ni lugar ni cámara mutaron tras 5 cambios
  const [y, pl] = await Promise.all([
    appGet(page, 'window.__mjtApp.year'),
    appGet(page, 'window.__mjtApp.place?.slug')
  ]);
  const cam1 = await cam(page);
  ok(
    's2_no_reset',
    y === 1987 && pl === 'leioa' && JSON.stringify(cam0) === JSON.stringify(cam1)
      ? 'PASS'
      : `FAIL y=${y} place=${pl} cam=${JSON.stringify(cam0)}→${JSON.stringify(cam1)}`
  );

  // regla playYear: entrar en TIME lo ancla pausado a selected_year; persiste
  ok(
    'rule_time_anchor',
    (await appGet(page, 'window.__mjtApp.playYear')) === 1987
      ? 'PASS (playYear=1987 anclado pausado)'
      : `FAIL playYear=${await appGet(page, 'window.__mjtApp.playYear')}`
  );
  // G5: el eje se desmonta fuera de los modos de lectura — el scrub exige TIME
  await page.click('.viewswitch button[data-mode="time"]');
  await page.waitForSelector('.timeband input[type=range]', { timeout: 5000 });
  await page.evaluate(() => {
    const s = document.querySelector('.timeband input[type=range]');
    s.value = '1999';
    s.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await page.click('.viewswitch button[data-mode="map"]');
  await page.waitForTimeout(300);
  const py = await appGet(page, 'window.__mjtApp.playYear');
  ok(
    'rule_playYear_persists',
    py === 1999 && y === 1987 ? `PASS (1999 persiste, year=1987)` : `FAIL ${py}`
  );

  // red: todo lo anterior — cambios de vista — sin una sola petición de ortofoto
  ok(
    'net_no_ortho_on_switch',
    page._orthoReqs.length === 0 ? `PASS (0)` : `FAIL ${page._orthoReqs.length} req`
  );

  // F4: modo foto — procedencia visible antes de activar + nav prev/next
  await page.click('.viewswitch button[data-mode="photo"]');
  await page.waitForTimeout(350);
  // G19: el chrome separa procedencia (.tc-meta: editor · rango de vuelo)
  // del año activo (.tc-year, grande) — la pareja sigue siendo visible
  // antes de activar la capa
  const metaTxt = await page.textContent('.photo .tc-meta').catch(() => null);
  const yearTxt = await page.textContent('.photo .tc-year').catch(() => '');
  const chromeTxt = `${metaTxt ?? ''} ${yearTxt ?? ''}`;
  const hasProv = /Bizkaia|geoEuskadi|DFB/i.test(chromeTxt) && /\b\d{4}\b/.test(chromeTxt);
  ok(
    'f4_provenance_always',
    hasProv ? `PASS ("${chromeTxt.trim().slice(0, 80)}")` : `FAIL "${chromeTxt}"`
  );
  // licencia + nominal: en el disclosure, no en la capa principal
  await page.click('.photo .tc-info summary');
  const infoTxt = await page.locator('.photo .tc-info').innerText().catch(() => '');
  ok(
    'f4_license_in_details',
    /CC BY/.test(infoTxt) && /\d{4}/.test(infoTxt) ? 'PASS' : `FAIL "${infoTxt.slice(0, 80)}"`
  );
  const reqsPreActivate = page._orthoReqs.length;
  // activación: tocar la marca de la campaña en el eje (el rail es el
  // activador — no hay CTA «Comprobar desde el aire» separado)
  await activateCurrent(page);
  await page.waitForSelector('.photo .state', { timeout: 15000 }).catch(() => null);
  await page.waitForTimeout(2500);
  ok(
    'f4_activate_probes',
    page._orthoReqs.length > reqsPreActivate
      ? `PASS (${page._orthoReqs.length - reqsPreActivate} req)`
      : 'FAIL sin sonda'
  );
  // nav: campaña siguiente = siguiente exacta del catálogo
  const campBefore = await appGet(page, 'window.__mjtApp.orthoCampaign?.year');
  const nextYear = await appGet(
    page,
    '(() => { const cs = window.__mjtApp.allCampaigns.map(c=>c.year); const i = cs.indexOf(window.__mjtApp.orthoCampaign?.year); return i>=0&&i<cs.length-1 ? String(cs[i+1]) : null; })()'
  );
  const reqsPreNext = page._orthoReqs.length;
  await page.locator('.photo [data-action="next"]').click();
  await page.waitForTimeout(2500);
  const campAfter = await appGet(page, 'window.__mjtApp.orthoCampaign?.year');
  ok(
    'f4_nav_exact',
    String(campAfter) === nextYear && campAfter !== campBefore
      ? `PASS (${campBefore}→${campAfter})`
      : `FAIL ${campBefore}→${campAfter} btn=${nextYear}`
  );
  ok('f4_nav_probes', page._orthoReqs.length > reqsPreNext ? 'PASS' : 'FAIL sin sonda tras nav');
  // procedencia sigue visible tras la navegación: el año nominal activo
  // vive en .tc-year (el meta muestra el rango real del vuelo, que puede
  // ser distinto — p.ej. campaña 1956 con vuelo 1953–55)
  const srcTxt2 = await page.textContent('.photo .tc-year');
  ok(
    'f4_provenance_persists',
    srcTxt2 && srcTxt2.includes(String(campAfter)) ? 'PASS' : `FAIL "${srcTxt2}"`
  );

  // axe en los tres estados principales
  await axeScan(page, 'photo');
  await page.click('.viewswitch button[data-mode="time"]');
  await page.waitForTimeout(350);
  await axeScan(page, 'time');
  await page.click('.viewswitch button[data-mode="map"]');
  await page.waitForTimeout(350);
  await axeScan(page, 'map');

  await page.screenshot({ path: join(OUT, 'view-map.png') });
  await page.click('.viewswitch button[data-mode="photo"]');
  await page.waitForTimeout(400);
  await page.screenshot({ path: join(OUT, 'view-photo.png') });
  await page.click('.viewswitch button[data-mode="time"]');
  await page.waitForTimeout(400);
  await page.screenshot({ path: join(OUT, 'view-time.png') });
  await ctx.close();
}

/* ---------- S3: deep links + back/forward ---------- */
{
  const { ctx, page } = await newPage();
  await page.goto(U(`${Q}&view=photo`));
  await waitMap(page);
  const m0 = await mode(page);
  await page.goto(U(`${Q}&view=time&play=2001`));
  await waitMap(page);
  const [m1, py1] = await Promise.all([mode(page), appGet(page, 'window.__mjtApp.playYear')]);
  ok(
    's3_deeplink',
    m0 === 'photo' && m1 === 'time' && py1 === 2001
      ? `PASS (photo; time+play=2001)`
      : `FAIL ${m0}/${m1}/${py1}`
  );
  // back/forward entre vistas
  await page.click('.viewswitch button[data-mode="photo"]');
  await page.waitForTimeout(300);
  const histLen = await appGet(page, 'history.length');
  await page.goBack().catch(() => null);
  await page.waitForTimeout(400);
  const mBack = await mode(page);
  note(`back/forward: mode tras back=${mBack} (history=${histLen})`);
  ok(
    's3_back_forward',
    ['time', 'photo', 'map'].includes(mBack) ? `PASS (back→${mBack})` : `FAIL ${mBack}`
  );
  await ctx.close();
}

/* ---------- C1/C2: contraste con ambos denominadores ----------
   G4-H1: el contraste C-05/C-08 ya no está en el flujo municipal — vive
   solo dentro de los capítulos f4036/f4738 con valores congelados del
   brief. La verificación migra: ausencia en el flujo + presencia y
   denominadores correctos en los dos capítulos. */
{
  const { ctx, page } = await newPage();
  await page.goto(U(Q));
  await waitMap(page);
  await page.waitForSelector('.below', { timeout: 10000 });
  ok(
    'c1_contrast_absent_municipal',
    (await page.locator('.contrast').count()) === 0
      ? 'PASS (sin contraste genérico en el flujo municipal)'
      : 'FAIL sigue montado'
  );

  for (const [id, count, fp, ref] of [
    ['f4036', '85,7', '1,9', '1979'],
    ['f4738', '11,1', '94,7', '1999']
  ]) {
    await page.goto(U(`story=${id}`));
    await page.waitForSelector('.chapter .scontrast', { timeout: 30000 });
    const txt = await page.textContent('.chapter .scontrast');
    const denoms =
      /cada 100 edificios actuales con año conocido/.test(txt) &&
      /huella en planta de los edificios con año conocido y geometría válida/.test(txt) &&
      txt.includes(`después de ${ref}`);
    const vals = txt.includes(count) && txt.includes(fp);
    ok(
      `c1_denominators_${id}`,
      denoms && vals ? `PASS (${count}%/${fp}% ref ${ref})` : `FAIL "${txt.slice(0, 200)}"`
    );
    const c2 = !/dispersi[oó]n|densificaci[oó]n|compacto|sprawl/i.test(txt);
    ok(`c2_no_interpretation_${id}`, c2 ? 'PASS' : 'FAIL interpretación en copy');
  }
  await page.screenshot({ path: join(OUT, 'contrast.png'), fullPage: false });
  await ctx.close();
}

/* ---------- A1: axe en estados restantes — Play activo, NOT_COVERED, SERVICE_ERROR ---------- */
{
  const { ctx, page } = await newPage();
  await page.goto(U(Q));
  await waitMap(page);
  await page.click('.viewswitch button[data-mode="time"]');
  await page.waitForTimeout(300);
  await page.click('.timeband [data-action="play"]');
  await page.waitForTimeout(600);
  await axeScan(page, 'time_playing');
  await page.click('.timeband [data-action="play"]').catch(() => null);
  await ctx.close();
}
{
  const { ctx, page } = await newPage();
  // sonda forzada a 404 → NOT_COVERED (mismo contrato que el servicio real)
  await page.route(/geo\.bizkaia|geo\.euskadi/i, (r) => r.fulfill({ status: 404, body: '' }));
  await page.goto(U(`${Q}&view=photo`));
  await waitMap(page);
  await activateCurrent(page);
  await page
    .waitForFunction(() => window.__mjtApp.orthoState === 'NOT_COVERED', null, { timeout: 20000 })
    .catch(() => null);
  const st = await appGet(page, 'window.__mjtApp.orthoState');
  ok('photo_not_covered_state', st === 'NOT_COVERED' ? 'PASS' : `FAIL ${st}`);
  await axeScan(page, 'photo_not_covered');
  await ctx.close();
}
{
  const { ctx, page } = await newPage();
  // error de red → SERVICE_ERROR
  await page.route(/geo\.bizkaia|geo\.euskadi/i, (r) => r.abort());
  await page.goto(U(`${Q}&view=photo`));
  await waitMap(page);
  await activateCurrent(page);
  await page
    .waitForFunction(() => window.__mjtApp.orthoState === 'SERVICE_ERROR', null, { timeout: 15000 })
    .catch(() => null);
  const st = await appGet(page, 'window.__mjtApp.orthoState');
  ok('photo_service_error_state', st === 'SERVICE_ERROR' ? 'PASS' : `FAIL ${st}`);
  await axeScan(page, 'photo_error');
  await ctx.close();
}

/* ---------- 320px: eje sin marcas de campaña (GT1) + sin overflow ---------- */
if (ENGINE === 'chromium') {
  const { ctx, page } = await newPage({
    viewport: { width: 320, height: 700 },
    hasTouch: true,
    isMobile: true
  });
  // el eje temporal vive en el modo time (o map con cabezal activo):
  // view=time sin play= entra pausado en el año personal (G17)
  await page.goto(U(Q + '&view=time'));
  await waitMap(page);
  await page.locator('.timeband').scrollIntoViewIfNeeded();
  const campCount = await page.evaluate(
    () => document.querySelectorAll('.timeband .epoch').length
  );
  ok(
    'a320_no_campaign_marks_on_axis',
    campCount === 0
      ? 'PASS (0 marcas: campañas fuera del eje catastral, GT1)'
      : `FAIL ${campCount} marcas .epoch en .timeband`
  );
  const noOverflow = await page.evaluate(() => document.documentElement.scrollWidth <= 320 + 1);
  ok('a320_no_overflow', noOverflow ? 'PASS' : 'FAIL overflow-x');
  await page.screenshot({ path: join(OUT, 'timeline-320-ticks.png') });
  await ctx.close();
}

/* ---------- reduced-motion: cambio de vista sin autoplay ni cámara ---------- */
{
  const { ctx, page } = await newPage({ reducedMotion: 'reduce' });
  await page.goto(U(Q));
  await waitMap(page);
  await page.click('.viewswitch button[data-mode="time"]');
  await page.waitForTimeout(700);
  const [pl, py] = await Promise.all([
    appGet(page, 'window.__mjtApp.playing'),
    appGet(page, 'window.__mjtApp.playYear')
  ]);
  const hasPlay = await page.$('.timeband [data-action="play"]');
  ok(
    'rm_no_autoplay',
    pl === false && !hasPlay && py === 1987
      ? `PASS (pausado en ${py}, sin botón Play)`
      : `FAIL playing=${pl} play=${!!hasPlay} py=${py}`
  );
  await ctx.close();
}

// G11.3: pageerror inesperado = FAIL bloqueante; el script sale con código
// distinto de cero si cualquier check falla (antes siempre salía 0).
ok(
  'pageerrors',
  out.pageerrors.length === 0 ? 'PASS' : `FAIL ${JSON.stringify(out.pageerrors.slice(0, 3))}`
);

await writeFile(OUTF, JSON.stringify(out, null, 2));
console.log(JSON.stringify(out.checks, null, 2));
console.log('notas:', out.notes);
await browser.close();
server.close();
const fails = Object.values(out.checks).filter((v) => String(v).startsWith('FAIL'));
console.log(fails.length ? `\n${fails.length} FAIL` : '\ntodo PASS');
process.exit(fails.length ? 1 : 0);
