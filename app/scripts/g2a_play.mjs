/**
 * G2-A — verificación del núcleo temporal (Play/scrub + marcadores de campaña).
 * Criterios cubiertos (docs/gates/G2.md):
 *   T1 selected_year no muta · T2 progresión · T3 scrub/restart · T4 filtro
 *   edificios · T5 proyección celda = contrato S2 · T6 reduced-motion · T7 fin
 *   F1 marcas = catálogo · F2 acción de marca → contrato orto · F3 0 peticiones
 *   orto sin acción · S3 deep link · A2 live status · A3 tamaños · teclado ·
 *   escrituras de URL solo en eventos discretos · heap tras ciclos repetidos.
 * Uso: node scripts/g2a_play.mjs   (cwd = app/ con build/ presente)
 */
import { chromium, firefox, webkit } from 'playwright';
import { writeFile, mkdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { createStaticServer } from './static-server.mjs';

const ROOT = resolve(process.cwd(), '..');
const BUILD = resolve(process.cwd(), 'build');
const OUT = join(ROOT, 'evidence/g2/g2a-play');
const PORT = 4185;
const BASE = `http://localhost:${PORT}`;
const U = (q) => `${BASE}/?${q}`;
const Q_CELL = 'year=1987&place=leioa&lat=43.326&lon=-2.988&z=11.5&view=time';
const Q_BLD = 'year=1987&place=leioa&lat=43.326&lon=-2.988&z=14.6&view=time';

const server = await createStaticServer(BUILD, PORT);
await mkdir(OUT, { recursive: true });

const out = { checks: {}, notes: [] };
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
const OUTF = join(OUT, `g2a-play${ENGINE === 'chromium' ? '' : `-${ENGINE}`}.json`);

async function newPage(ctxOpts = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, ...ctxOpts });
  const page = await ctx.newPage();
  page._orthoReqs = 0;
  page.on('request', (r) => {
    if (/orto|geo\.bizkaia|geo\.euskadi/i.test(r.url())) page._orthoReqs++;
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
const playhead = (page) => appGet(page, 'window.__mjtApp.playYear');
const playing = (page) => appGet(page, 'window.__mjtApp.playing');

/* ---------- F1 + S1/S2 + A3: estructura del eje (z celda) ---------- */
{
  const { ctx, page } = await newPage();
  await page.goto(U(Q_CELL));
  await waitMap(page);
  await page.waitForSelector('.timeband', { timeout: 10000 });

  // G5 GT1: las campañas ya NO son marcas del eje catastral — viven en el
  // panel FOTO con su propio sistema de fechas. El eje solo lleva TU AÑO,
  // REPRODUCCIÓN y (si hay) COMPARAR.
  const camps = await appGet(page, 'window.__mjtApp.allCampaigns.map(c=>c.year)');
  const marks = await page.$$eval('.timeband .epoch', (els) => els.length);
  ok(
    'f1_axis_cadastral_only',
    camps.length > 0 && marks === 0
      ? `PASS (${camps.length} campañas en catálogo, 0 marcas en eje)`
      : `FAIL marks=${marks} camps=${camps.length}`
  );

  // A3 (G18): los controles primarios (play/pausa + scrubber) ≥44px. Los
  // hitos .ms reparten su hitbox al punto medio con el vecino — en un eje
  // estrecho es físicamente imposible 44px por hito sin solape; el slider
  // ofrece la misma acción con target completo (excepción «equivalent»).
  const sizes = await page.$$eval('.timeband button, .timeband input', (els) =>
    els
      .filter((e) => e.offsetParent !== null)
      .map((e) => {
        const r = e.getBoundingClientRect();
        return { cls: String(e.className).split(' ')[0], min: Math.min(r.width, r.height) };
      })
  );
  const primary = sizes.filter((s) => s.cls === 'tc-play' || s.cls === 'tc-scrub');
  note(`targets timeband: ${JSON.stringify(sizes)}`);
  ok(
    'a3_targets_44px',
    primary.length >= 2 && primary.every((s) => s.min >= 44)
      ? 'PASS (primarios ≥44; hitos = atajos del slider)'
      : `FAIL ${JSON.stringify(primary)}`
  );

  const axisMarks = await page.$$eval('.timeband .decade', (els) => els.map((e) => e.className));
  note(`marcas del eje sin play (selected 1987): ${axisMarks}`);

  await page.screenshot({ path: join(OUT, 'timeline-cell.png'), fullPage: false });
  await ctx.close();
}

/* ---------- T1/T2/T3/T5/T7 + F2/F3 + URL discreta + heap (z celda) ---------- */
{
  const { ctx, page } = await newPage();
  await page.goto(U(Q_CELL));
  await waitMap(page);
  await page.waitForSelector('.timeband', { timeout: 10000 });
  // gancho de URL: contar replaceState/pushState durante reproducción
  await page.evaluate(() => {
    window.__urlWrites = 0;
    for (const m of ['replaceState', 'pushState']) {
      const f = history[m].bind(history);
      history[m] = (...a) => {
        window.__urlWrites++;
        return f(...a);
      };
    }
  });

  // G19: en el visor el titular editorial no existe; el h1 de la página
  // es el resumen sr-only (.sr-summary) — igualmente inmutable al play
  const headlineSel = 'h1.sr-summary';
  const headline0 = await page.textContent(headlineSel).catch(() => '');

  // T1+T2: observación durante un ciclo de reproducción completo
  await page.click('.timeband [data-action="play"]');
  const yearMutations = [];
  const playSamples = [];
  const headlineMut = [];
  const orthoBefore = page._orthoReqs;
  const urlWritesBefore = await appGet(page, 'window.__urlWrites');
  const t0 = Date.now();
  while (Date.now() - t0 < 14000) {
    const [y, p, pl] = await Promise.all([
      appGet(page, 'window.__mjtApp.year'),
      playhead(page),
      playing(page)
    ]);
    const h = await page.textContent(headlineSel).catch(() => '');
    if (y !== 1987) yearMutations.push(y);
    if (h !== headline0) headlineMut.push(h);
    playSamples.push(p);
    if (pl === false && playSamples.length > 4) break; // terminó
    await page.waitForTimeout(120);
  }
  const uniq = [...new Set(playSamples.filter((v) => v !== null))];
  const monotone = uniq.every((v, i) => i === 0 || v > uniq[i - 1]);
  ok(
    't1_selected_year_immutable',
    yearMutations.length === 0 && headlineMut.length === 0
      ? 'PASS'
      : `FAIL year=${yearMutations} headline=${headlineMut.length}`
  );
  ok(
    't2_progression',
    monotone && uniq.length > 5
      ? `PASS (${uniq.length} años, ${uniq[0]}→${uniq.at(-1)})`
      : `FAIL ${uniq}`
  );

  const endYear = await playhead(page);
  const snap = await appGet(page, 'window.__mjtApp.catalog.snapshot_year');
  ok(
    't7_end_state',
    endYear === snap && (await playing(page)) === false
      ? `PASS (${endYear})`
      : `FAIL end=${endYear} snap=${snap}`
  );

  // F3: cero peticiones de ortofoto durante reproducción completa
  ok(
    'f3_zero_ortho_during_play',
    page._orthoReqs - orthoBefore === 0
      ? `PASS (${page._orthoReqs - orthoBefore})`
      : `FAIL ${page._orthoReqs - orthoBefore} req`
  );

  // URL: sin escrituras por frame — solo eventos discretos (finish cuenta como 1)
  const urlWrites = await appGet(page, 'window.__urlWrites');
  ok(
    'url_no_frame_writes',
    urlWrites - urlWritesBefore <= 2
      ? `PASS (${urlWrites - urlWritesBefore} en ciclo completo)`
      : `FAIL ${urlWrites - urlWritesBefore} writes`
  );

  // T5: cuota de celda = cumulative canónico (contrato S2)
  const cellCheck = await page.evaluate(async (P) => {
    const m = window.__mjtMap;
    const feats = m
      .queryRenderedFeatures(undefined, { layers: ['cells-fill'] })
      .filter((f) => f.properties.known >= 15);
    const sample = feats.slice(0, 6);
    const res = [];
    for (const f of sample) {
      const mun = String(f.properties.mun).padStart(3, '0');
      const data = await (await fetch(`data/cells/${mun}.json`)).json();
      const ysStr = data[f.properties.fid]?.[0] ?? '';
      let k = 0,
        until = 0;
      for (const part of String(ysStr).split(',')) {
        if (!part) continue;
        const [y, n] = part.split(':').map(Number);
        if (!Number.isFinite(y) || !Number.isFinite(n)) continue;
        k += n;
        if (y <= P) until += n;
      }
      const expected = k === 0 ? null : until / k;
      const st = m.getFeatureState({ source: 'cells', sourceLayer: 'cells', id: f.properties.fid });
      res.push({
        fid: f.properties.fid,
        expected,
        got: st.share,
        diff: expected === null ? null : Math.abs(expected - (st.share ?? -1))
      });
    }
    return res;
  }, endYear);
  const t5pass =
    cellCheck.length > 0 &&
    cellCheck.every((c) => (c.diff === null ? c.got === null : c.diff < 1e-9));
  ok(
    't5_cell_cumulative_contract',
    t5pass ? `PASS (${cellCheck.length} celdas)` : `FAIL ${JSON.stringify(cellCheck)}`
  );

  // T3: scrub + restart
  await page.evaluate(() => {
    const s = document.querySelector('.timeband input[type=range]');
    s.value = '2000';
    s.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await page.waitForTimeout(300);
  ok('t3_scrub', (await playhead(page)) === 2000 ? 'PASS' : `FAIL ${await playhead(page)}`);
  // G18-R: «Reiniciar» ya no es botón — Home en el scrubber fija el
  // cabezal en el año elegido, pausado.
  await page.locator('.timeband [data-action="scrub"]').press('Home');
  await page.waitForTimeout(80);
  ok('t3_restart', (await playhead(page)) === 1987 ? 'PASS' : `FAIL ${await playhead(page)}`);

  // teclado: flechas sobre el scrub (+1 respecto al valor previo)
  await page.click('.timeband [data-action="play"]').catch(() => null);
  await page.focus('.timeband input[type=range]');
  const prevKbd = await playhead(page);
  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(250);
  ok(
    'kbd_arrows',
    (await playhead(page)) === prevKbd + 1
      ? `PASS (${prevKbd}→${prevKbd + 1})`
      : `FAIL ${prevKbd}→${await playhead(page)}`
  );

  // F2 (G5): la campaña se activa desde el panel FOTO — acción explícita →
  // contrato orto (sonda + estado visible). El eje ya no abre campañas.
  await page.evaluate(() => {
    const s = document.querySelector('.timeband input[type=range]');
    s.value = '2003';
    s.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await page.waitForTimeout(300);
  await page.click('.viewswitch button[data-mode="photo"]');
  await page.waitForSelector('.photo', { timeout: 10000 });
  const cam = page.locator('.photo [data-action="next"]');
  const camYear = await cam.getAttribute('data-year');
  const orthoReqsPre = page._orthoReqs;
  await cam.click();
  await page.waitForSelector('.photo .state', { timeout: 20000 }).catch(() => null);
  const orthoTxt = await page.textContent('.photo .state').catch(() => null);
  ok(
    'f2_marker_action',
    orthoTxt
      ? `PASS (nav ${camYear} → "${orthoTxt.trim().slice(0, 60)}")`
      : 'FAIL sin estado orto'
  );
  ok(
    'f3_ortho_only_on_action',
    page._orthoReqs > orthoReqsPre ? 'PASS' : 'FAIL sin petición tras clic'
  );

  // pausa/reanudar explícitos (volver al eje temporal)
  await page.click('.viewswitch button[data-mode="time"]');
  await page.waitForSelector('.timeband input[type=range]', { timeout: 5000 });
  await page.click('.timeband [data-action="play"]');
  await page.waitForTimeout(700);
  const mid = await playhead(page);
  await page.click('.timeband [data-action="play"]');
  const p1 = await playhead(page);
  await page.waitForTimeout(600);
  const p2 = await playhead(page);
  await page.click('.timeband [data-action="play"]');
  await page.waitForTimeout(700);
  const p3 = await playhead(page);
  await page.click('.timeband [data-action="play"]');
  ok(
    't2_pause_resume',
    mid > 2003 && p1 === p2 && p3 > p1
      ? `PASS (${mid}→${p1}→${p3})`
      : `FAIL ${mid},${p1},${p2},${p3}`
  );

  // heap tras ciclos repetidos (3× reproducción completa)
  const heap0 = await appGet(page, 'performance.memory?.usedJSHeapSize ?? 0');
  for (let i = 0; i < 3; i++) {
    await page.locator('.timeband [data-action="scrub"]').press('Home');
    await page.click('.timeband [data-action="play"]');
    await page.waitForFunction(() => window.__mjtApp.playing === false, null, { timeout: 20000 });
  }
  await page.waitForTimeout(800);
  const heap1 = await appGet(page, 'performance.memory?.usedJSHeapSize ?? 0');
  ok(
    'heap_after_cycles',
    `info: ${(heap0 / 1048576).toFixed(1)}→${(heap1 / 1048576).toFixed(1)} MB tras 3 ciclos`
  );

  // A2: status vivo anuncia el cabezal
  const status = await page.textContent('.timeband [role=status]').catch(() => null);
  ok(
    'a2_live_status',
    status && /\d{4}/.test(status) ? `PASS ("${status.trim().slice(0, 50)}")` : 'FAIL'
  );

  await page.screenshot({ path: join(OUT, 'timeline-playing.png') });
  await ctx.close();
}

/* ---------- T4: filtro de edificios (z≥14) + UNKNOWN visible ---------- */
{
  const { ctx, page } = await newPage();
  await page.goto(U(Q_BLD));
  await waitMap(page);
  await page.waitForSelector('.timeband', { timeout: 10000 });
  const bLayer = await page.evaluate(() => {
    const m = window.__mjtMap;
    const id = m
      .getStyle()
      .layers.map((l) => l.id)
      .find((i) => /^b-.+-fill$/.test(i));
    return id ?? null;
  });
  if (bLayer) {
    await page
      .waitForFunction(
        (lid) => {
          const m = window.__mjtMap;
          return (
            m.getLayer(lid) && m.queryRenderedFeatures(undefined, { layers: [lid] }).length > 0
          );
        },
        bLayer,
        { timeout: 20000 }
      )
      .catch(() => null);
  }

  await page.evaluate(() => {
    const s = document.querySelector('.timeband input[type=range]');
    s.value = '1970';
    s.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await page.waitForTimeout(600);
  const bld = await page.evaluate((lid) => {
    const m = window.__mjtMap;
    const fs = lid ? m.queryRenderedFeatures(undefined, { layers: [lid] }) : [];
    const byState = {};
    let validLate = 0;
    for (const f of fs) {
      const st = f.properties.state ?? '?';
      byState[st] = (byState[st] ?? 0) + 1;
      if (st === 'VALID' && f.properties.year > 1970) validLate++;
    }
    return { total: fs.length, byState, validLate };
  }, bLayer);
  ok(
    't4_building_filter',
    bLayer && bld.validLate === 0 && bld.total > 0
      ? `PASS (${bLayer} ${JSON.stringify(bld.byState)})`
      : `FAIL layer=${bLayer} ${JSON.stringify(bld)}`
  );
  await page.screenshot({ path: join(OUT, 'buildings-p1970.png') });
  await ctx.close();
}

/* ---------- T6: reduced-motion ---------- */
{
  const { ctx, page } = await newPage({ reducedMotion: 'reduce' });
  await page.goto(U(Q_CELL));
  await waitMap(page);
  await page.waitForSelector('.timeband', { timeout: 10000 });
  const hasPlay = await page.$('.timeband [data-action="play"]');
  const scrub = page.locator('.timeband [data-action="scrub"]');
  let steps = 'FAIL';
  if (!hasPlay && (await scrub.count())) {
    await scrub.press('ArrowRight'); // paso manual: +1 año
    await page.waitForTimeout(250);
    steps = (await playhead(page)) === 1988 ? 'PASS' : `FAIL playYear=${await playhead(page)}`;
  }
  ok('t6_reduced_motion', `${steps} (play=${!!hasPlay}, scrub=${await scrub.count()})`);
  await ctx.close();
}

/* ---------- S3: deep link ?play= ---------- */
{
  const { ctx, page } = await newPage();
  await page.goto(U(`${Q_CELL}&play=2003`));
  await waitMap(page);
  await page.waitForSelector('.timeband', { timeout: 10000 });
  const p = await playhead(page);
  const pl = await playing(page);
  await page.reload();
  await waitMap(page);
  const p2 = await playhead(page);
  ok(
    's3_deeplink',
    p === 2003 && pl === false && p2 === 2003
      ? `PASS (2003, pausado, persiste)`
      : `FAIL p=${p}/${p2} playing=${pl}`
  );
  await ctx.close();
}

/* ---------- 320px + touch ---------- */
if (ENGINE === 'chromium') {
  const { ctx, page } = await newPage({
    viewport: { width: 320, height: 700 },
    hasTouch: true,
    isMobile: true
  });
  await page.goto(U(Q_CELL));
  await waitMap(page);
  const tb = await page.$('.timeband');
  let ok320 = 'FAIL';
  if (tb) {
    await page.locator('.timeband').scrollIntoViewIfNeeded();
    // G5: el eje ya no tiene marcas de campaña — tap en el centro del eje
    const pt = await page.evaluate(() => {
      const ax = document.querySelector('.timeband .tc-rail').getBoundingClientRect();
      return { x: ax.left + ax.width / 2, y: ax.top + ax.height * 0.6 };
    });
    await page.touchscreen.tap(pt.x, pt.y);
    await page.waitForTimeout(300);
    ok320 = (await playhead(page)) !== null ? 'PASS' : 'FAIL playYear null';
  }
  ok('mobile_320_touch', ok320);
  await page.screenshot({ path: join(OUT, 'timeline-320.png') });
  await ctx.close();
}

await writeFile(OUTF, JSON.stringify(out, null, 2));
console.log(JSON.stringify(out.checks, null, 2));
await browser.close();
server.close();
