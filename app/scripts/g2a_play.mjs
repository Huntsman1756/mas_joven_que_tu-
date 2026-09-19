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
const Q_CELL = 'year=1987&place=leioa&lat=43.326&lon=-2.988&z=11.5';
const Q_BLD = 'year=1987&place=leioa&lat=43.326&lon=-2.988&z=14.6';

const server = await createStaticServer(BUILD, PORT);
await mkdir(OUT, { recursive: true });

const out = { checks: {}, notes: [] };
const ok = (k, v) => { out.checks[k] = v; };
const note = (s) => out.notes.push(s);

const ENGINE = process.env.BROWSER ?? 'chromium';
let browser;
if (ENGINE === 'firefox') browser = await firefox.launch();
else if (ENGINE === 'webkit') browser = await webkit.launch();
else {
  for (const channel of ['chrome', 'msedge']) {
    try { browser = await chromium.launch({ channel, args: ['--disable-gpu'] }); break; } catch { /* next */ }
  }
  browser ??= await chromium.launch({ args: ['--disable-gpu'] });
}
const OUTF = join(OUT, `g2a-play${ENGINE === 'chromium' ? '' : `-${ENGINE}`}.json`);

async function newPage(ctxOpts = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, ...ctxOpts });
  const page = await ctx.newPage();
  page._orthoReqs = 0;
  page.on('request', (r) => { if (/orto|geo\.bizkaia|geo\.euskadi/i.test(r.url())) page._orthoReqs++; });
  return { ctx, page };
}

async function waitMap(page) {
  await page.waitForSelector('.mapband canvas', { timeout: 30000 });
  await page.waitForFunction(() => window.__mjtMap?.areTilesLoaded?.(), null, { timeout: 30000 }).catch(() => null);
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

  const camps = await appGet(page, 'window.__mjtApp.allCampaigns.map(c=>c.year)');
  const marks = await page.$$eval('.camp', (els) => els.map((e) => Number(e.textContent.trim())));
  ok('f1_marks_equal_catalog', JSON.stringify(marks.sort()) === JSON.stringify([...camps].sort()) ? 'PASS' : `FAIL ${marks} vs ${camps}`);

  const sizes = await page.$$eval('.timeband button, .timeband input', (els) =>
    els.filter((e) => e.offsetParent !== null).map((e) => {
      const r = e.getBoundingClientRect();
      return Math.min(r.width, r.height);
    }));
  ok('a3_targets_44px', sizes.every((s) => s >= 44) ? 'PASS' : `FAIL min=${Math.min(...sizes)}`);

  const enabledBefore = await page.$$eval('button.camp', (els) => els.map((e) => e.textContent.trim()));
  note(`marcas activas sin play (selected 1987): ${enabledBefore}`);

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
      history[m] = (...a) => { window.__urlWrites++; return f(...a); };
    }
  });

  const headlineSel = '.headline-block h1';
  const headline0 = await page.textContent(headlineSel).catch(() => '');

  // T1+T2: observación durante un ciclo de reproducción completo
  await page.click('button:has-text("Reproducir")');
  const yearMutations = [];
  const playSamples = [];
  const headlineMut = [];
  const orthoBefore = page._orthoReqs;
  const urlWritesBefore = await appGet(page, 'window.__urlWrites');
  const t0 = Date.now();
  while (Date.now() - t0 < 14000) {
    const [y, p, pl] = await Promise.all([appGet(page, 'window.__mjtApp.year'), playhead(page), playing(page)]);
    const h = await page.textContent(headlineSel).catch(() => '');
    if (y !== 1987) yearMutations.push(y);
    if (h !== headline0) headlineMut.push(h);
    playSamples.push(p);
    if (pl === false && playSamples.length > 4) break; // terminó
    await page.waitForTimeout(120);
  }
  const uniq = [...new Set(playSamples.filter((v) => v !== null))];
  const monotone = uniq.every((v, i) => i === 0 || v > uniq[i - 1]);
  ok('t1_selected_year_immutable', yearMutations.length === 0 && headlineMut.length === 0
    ? 'PASS' : `FAIL year=${yearMutations} headline=${headlineMut.length}`);
  ok('t2_progression', monotone && uniq.length > 5 ? `PASS (${uniq.length} años, ${uniq[0]}→${uniq.at(-1)})` : `FAIL ${uniq}`);

  const endYear = await playhead(page);
  const snap = await appGet(page, 'window.__mjtApp.catalog.snapshot_year');
  ok('t7_end_state', endYear === snap && (await playing(page)) === false ? `PASS (${endYear})` : `FAIL end=${endYear} snap=${snap}`);

  // F3: cero peticiones de ortofoto durante reproducción completa
  ok('f3_zero_ortho_during_play', page._orthoReqs - orthoBefore === 0 ? `PASS (${page._orthoReqs - orthoBefore})` : `FAIL ${page._orthoReqs - orthoBefore} req`);

  // URL: sin escrituras por frame — solo eventos discretos (finish cuenta como 1)
  const urlWrites = await appGet(page, 'window.__urlWrites');
  ok('url_no_frame_writes', urlWrites - urlWritesBefore <= 2 ? `PASS (${urlWrites - urlWritesBefore} en ciclo completo)` : `FAIL ${urlWrites - urlWritesBefore} writes`);

  // T5: cuota de celda = cumulative canónico (contrato S2)
  const cellCheck = await page.evaluate(async (P) => {
    const m = window.__mjtMap;
    const feats = m.queryRenderedFeatures(undefined, { layers: ['cells-fill'] }).filter((f) => f.properties.known >= 15);
    const sample = feats.slice(0, 6);
    const res = [];
    for (const f of sample) {
      const mun = String(f.properties.mun).padStart(3, '0');
      const data = await (await fetch(`data/cells/${mun}.json`)).json();
      const ysStr = data[f.properties.fid]?.[0] ?? '';
      let k = 0, until = 0;
      for (const part of String(ysStr).split(',')) {
        if (!part) continue;
        const [y, n] = part.split(':').map(Number);
        if (!Number.isFinite(y) || !Number.isFinite(n)) continue;
        k += n; if (y <= P) until += n;
      }
      const expected = k === 0 ? null : until / k;
      const st = m.getFeatureState({ source: 'cells', sourceLayer: 'cells', id: f.properties.fid });
      res.push({ fid: f.properties.fid, expected, got: st.share, diff: expected === null ? null : Math.abs(expected - (st.share ?? -1)) });
    }
    return res;
  }, endYear);
  const t5pass = cellCheck.length > 0 && cellCheck.every((c) => c.diff === null ? c.got === null : c.diff < 1e-9);
  ok('t5_cell_cumulative_contract', t5pass ? `PASS (${cellCheck.length} celdas)` : `FAIL ${JSON.stringify(cellCheck)}`);

  // T3: scrub + restart
  await page.evaluate(() => {
    const s = document.querySelector('.timeband input[type=range]');
    s.value = '2000'; s.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await page.waitForTimeout(300);
  ok('t3_scrub', (await playhead(page)) === 2000 ? 'PASS' : `FAIL ${await playhead(page)}`);
  await page.click('button:has-text("Reiniciar")');
  await page.waitForTimeout(80); // antes del primer tick (280 ms)
  ok('t3_restart', (await playhead(page)) === 1987 ? 'PASS' : `FAIL ${await playhead(page)}`);

  // teclado: flechas sobre el scrub (+1 respecto al valor previo)
  await page.click('button:has-text("Pausar")').catch(() => null);
  await page.focus('.timeband input[type=range]');
  const prevKbd = await playhead(page);
  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(250);
  ok('kbd_arrows', (await playhead(page)) === prevKbd + 1 ? `PASS (${prevKbd}→${prevKbd + 1})` : `FAIL ${prevKbd}→${await playhead(page)}`);

  // F2: marca alcanzable → acción explícita → contrato orto (tras P≥2000 vía scrub)
  await page.evaluate(() => {
    const s = document.querySelector('.timeband input[type=range]');
    s.value = '2003'; s.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await page.waitForTimeout(300);
  const cam = page.locator('button.camp').last();
  const camYear = await cam.textContent();
  const orthoReqsPre = page._orthoReqs;
  await cam.click();
  // G4: la marca abre el modo FOTO en esa campaña (panel .photo, no .ortho-state)
  await page.waitForSelector('.photo .state', { timeout: 20000 }).catch(() => null);
  const orthoTxt = await page.textContent('.photo .state').catch(() => null);
  ok('f2_marker_action', orthoTxt ? `PASS (marca ${camYear} → "${orthoTxt.trim().slice(0, 60)}")` : 'FAIL sin estado orto');
  ok('f3_ortho_only_on_action', page._orthoReqs > orthoReqsPre ? 'PASS' : 'FAIL sin petición tras clic');

  // pausa/reanudar explícitos
  await page.click('button:has-text("Reproducir")');
  await page.waitForTimeout(700);
  const mid = await playhead(page);
  await page.click('button:has-text("Pausar")');
  const p1 = await playhead(page);
  await page.waitForTimeout(600);
  const p2 = await playhead(page);
  await page.click('button:has-text("Reproducir")');
  await page.waitForTimeout(700);
  const p3 = await playhead(page);
  await page.click('button:has-text("Pausar")');
  ok('t2_pause_resume', mid > 2003 && p1 === p2 && p3 > p1 ? `PASS (${mid}→${p1}→${p3})` : `FAIL ${mid},${p1},${p2},${p3}`);

  // heap tras ciclos repetidos (3× reproducción completa)
  const heap0 = await appGet(page, 'performance.memory?.usedJSHeapSize ?? 0');
  for (let i = 0; i < 3; i++) {
    await page.click('button:has-text("Reiniciar")');
    await page.click('button:has-text("Reproducir")');
    await page.waitForFunction(() => window.__mjtApp.playing === false, null, { timeout: 20000 });
  }
  await page.waitForTimeout(800);
  const heap1 = await appGet(page, 'performance.memory?.usedJSHeapSize ?? 0');
  ok('heap_after_cycles', `info: ${(heap0 / 1048576).toFixed(1)}→${(heap1 / 1048576).toFixed(1)} MB tras 3 ciclos`);

  // A2: status vivo anuncia el cabezal
  const status = await page.textContent('.timeband [role=status]').catch(() => null);
  ok('a2_live_status', status && /\d{4}/.test(status) ? `PASS ("${status.trim().slice(0, 50)}")` : 'FAIL');

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
    const id = m.getStyle().layers.map((l) => l.id).find((i) => /^b-.+-fill$/.test(i));
    return id ?? null;
  });
  if (bLayer) {
    await page.waitForFunction((lid) => {
      const m = window.__mjtMap;
      return m.getLayer(lid) && m.queryRenderedFeatures(undefined, { layers: [lid] }).length > 0;
    }, bLayer, { timeout: 20000 }).catch(() => null);
  }

  await page.evaluate(() => {
    const s = document.querySelector('.timeband input[type=range]');
    s.value = '1970'; s.dispatchEvent(new Event('input', { bubbles: true }));
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
  ok('t4_building_filter', bLayer && bld.validLate === 0 && bld.total > 0 ? `PASS (${bLayer} ${JSON.stringify(bld.byState)})` : `FAIL layer=${bLayer} ${JSON.stringify(bld)}`);
  await page.screenshot({ path: join(OUT, 'buildings-p1970.png') });
  await ctx.close();
}

/* ---------- T6: reduced-motion ---------- */
{
  const { ctx, page } = await newPage({ reducedMotion: 'reduce' });
  await page.goto(U(Q_CELL));
  await waitMap(page);
  await page.waitForSelector('.timeband', { timeout: 10000 });
  const hasPlay = await page.$('button:has-text("Reproducir")');
  const hasStep = await page.$('button:has-text("adelante")');
  let steps = 'FAIL';
  if (!hasPlay && hasStep) {
    await page.click('button:has-text("adelante")');
    await page.waitForTimeout(250);
    steps = (await playhead(page)) === 1988 ? 'PASS' : `FAIL playYear=${await playhead(page)}`;
  }
  ok('t6_reduced_motion', `${steps} (play=${!!hasPlay}, step=${!!hasStep})`);
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
  ok('s3_deeplink', p === 2003 && pl === false && p2 === 2003 ? `PASS (2003, pausado, persiste)` : `FAIL p=${p}/${p2} playing=${pl}`);
  await ctx.close();
}

/* ---------- 320px + touch ---------- */
if (ENGINE === 'chromium') {
  const { ctx, page } = await newPage({ viewport: { width: 320, height: 700 }, hasTouch: true, isMobile: true });
  await page.goto(U(Q_CELL));
  await waitMap(page);
  const tb = await page.$('.timeband');
  let ok320 = 'FAIL';
  if (tb) {
    await page.locator('.timeband').scrollIntoViewIfNeeded();
    // tap en el hueco más ancho del eje libre de marcas de campaña
    const pt = await page.evaluate(() => {
      const ax = document.querySelector('.timeband .axis').getBoundingClientRect();
      const camps = [...document.querySelectorAll('.timeband .camp')].map((e) => e.getBoundingClientRect());
      let best = { x: ax.left + ax.width / 2, w: -1 };
      for (let i = 0; i <= 20; i++) {
        const x = ax.left + (ax.width * i) / 20;
        if (camps.every((c) => x < c.left - 2 || x > c.right + 2)) {
          const d = Math.min(...camps.map((c) => Math.min(Math.abs(x - c.left), Math.abs(x - c.right))), x - ax.left, ax.right - x);
          if (d > best.w) best = { x, w: d };
        }
      }
      return { x: best.x, y: ax.top + ax.height * 0.6 };
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
