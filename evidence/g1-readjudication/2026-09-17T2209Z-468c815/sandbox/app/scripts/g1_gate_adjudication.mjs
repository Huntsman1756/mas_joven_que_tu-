/**
 * G1 — ADJUDICATION EVIDENCE (gate run, candidate b891a14 ≡ 5b80240 sin PNGs debug).
 * Herramienta de medición del gate; no modifica el producto.
 * Cubre: worker, P5, M1/M2/M5/M6, deep links A–E, U1/U4/U5, U6+A9, A1/A4/A6,
 * ortofoto 4 estados, REL3/REL4/REL6, DEP1–4, VR3, capturas HR1/HR2, A8.
 * Uso: node scripts/g1_gate_adjudication.mjs
 */
import { chromium } from 'playwright';
import { writeFile, mkdir } from 'node:fs/promises';
import { copyFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { createStaticServer } from './static-server.mjs';
import { installLocalFixtures } from './fixtures.mjs';

const ROOT = resolve(process.cwd(), '..');
const BUILD = resolve(process.cwd(), 'build');
const OUT = process.env.ADJ_OUT || join(ROOT, 'evidence/g1/08-adjudication');
const PORT = 4177;
const BASE = `http://localhost:${PORT}`;

const server = await createStaticServer(BUILD, PORT);
await mkdir(OUT, { recursive: true });

async function pickBrowser() {
  for (const channel of ['chrome', 'msedge']) {
    try {
      return await chromium.launch({ channel, args: ['--disable-gpu'] });
    } catch { /* canal no disponible */ }
  }
  return await chromium.launch({ args: ['--disable-gpu'] });
}

const R = {
  meta: { candidate: process.env.CANDIDATE ?? 'unknown', utc: new Date().toISOString() },
  checks: {},
  net: { all: [], firstPartyFailures: [], external: {}, orthoPreClick: 0, worker: null },
  consoleErrors: [],
  pageErrors: [],
};

function classify(url) {
  if (url.startsWith(BASE)) return 'first-party';
  if (url.includes('demotiles.maplibre.org')) return 'demotiles-glyphs';
  if (url.includes('geo.euskadi.eus')) return url.includes('ORTOARGAZKIAK') ? 'ortho-euskadi' : 'nora';
  if (url.includes('geo.bizkaia.eus')) return 'ortho-bizkaia';
  return 'other-external';
}

async function wireNet(page, tag) {
  // VR4: NORA siempre a fixture local; las páginas que simulan servicio caído
  // registran su ruta abort DESPUÉS (tiene precedencia por orden inverso).
  await installLocalFixtures(page);
  page.on('response', (r) => {
    const u = r.url();
    const k = classify(u);
    R.net.all.push({ tag, kind: k, status: r.status(), url: u.slice(0, 160) });
    if (k === 'first-party' && r.status() >= 400) {
      R.net.firstPartyFailures.push({ tag, status: r.status(), url: u.slice(0, 160) });
    } else if (k !== 'first-party') {
      (R.net.external[k] ??= []).push({ tag, status: r.status(), url: u.slice(0, 140) });
    }
    if (u.includes('maplibre-gl-worker'))
      R.net.worker = { status: r.status(), contentType: r.headers()['content-type'] ?? null };
    if (u.includes('ORTO_BFA_') || u.includes('ORTOARGAZKIAK') || u.includes('ortho-previews/'))
      R.net.orthoPreClick++;
  });
  page.on('console', (m) => {
    if (m.type() === 'error') R.consoleErrors.push(`[${tag}] ` + m.text().slice(0, 200));
  });
  page.on('pageerror', (e) => R.pageErrors.push(`[${tag}] ` + String(e).slice(0, 200)));
}

const browser = await pickBrowser();
// CSP hash-only rechaza addScriptTag({content}); axe se sirve same-origin.
copyFileSync(join(process.cwd(), 'node_modules/axe-core/axe.min.js'), join(BUILD, '_axe.min.js'));

async function axeScan(page, _name) {
  await page.addScriptTag({ url: '/_axe.min.js' });
  return page.evaluate(async () => {
    const r = await window.axe.run(document, { resultTypes: ['violations'] });
    return r.violations.map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.length }));
  });
}

// ══ DESKTOP: journey canónico ══════════════════════════════════════════════
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
await wireNet(page, 'desktop');

await page.goto(`${BASE}/`, { waitUntil: 'load' });
await page.waitForSelector('.hero h1', { timeout: 20000 });
R.checks.p5_ortho_requests_before_click = R.net.orthoPreClick; // debe ser 0
R.checks.axe_intro_desktop = await axeScan(page, 'intro');
await page.screenshot({ path: join(OUT, 'hr1-01-hero-desktop.png') });

// ── U1: journey solo teclado ──
const focusTrail = [];
await page.evaluate(() => document.body.focus());
for (let i = 0; i < 10; i++) {
  await page.keyboard.press('Tab');
  const el = await page.evaluate(() => {
    const a = document.activeElement;
    if (!a) return null;
    const cs = getComputedStyle(a);
    return {
      tag: a.tagName, id: a.id || null, role: a.getAttribute('role'),
      text: (a.textContent || a.getAttribute('aria-label') || '').slice(0, 40),
      outline: cs.outlineStyle !== 'none' || cs.outlineWidth !== '0px' ? cs.outlineStyle + ' ' + cs.outlineWidth : 'none',
      boxShadow: cs.boxShadow !== 'none' ? 'yes' : 'no',
    };
  });
  focusTrail.push(el);
  if (el?.id === 'year-input') break;
}
R.checks.u1_focus_trail_to_year = focusTrail;
await page.keyboard.type('1987');
await page.keyboard.press('Tab'); // → place
focusTrail.push(await page.evaluate(() => document.activeElement?.id));
await page.keyboard.type('Leioa');
await page.waitForSelector('#place-listbox button', { timeout: 15000 });
await page.keyboard.press('ArrowDown');
await page.keyboard.press('Enter');
await page.keyboard.press('Tab'); // → CTA
const ctaFocused = await page.evaluate(() => ({
  tag: document.activeElement?.tagName,
  text: document.activeElement?.textContent?.trim(),
  disabled: document.activeElement?.disabled ?? null,
}));
R.checks.u1_cta_focus = ctaFocused;
await page.keyboard.press('Enter');
await page.waitForSelector('.headline-block h1', { timeout: 20000 });
R.checks.u1_keyboard_journey_reached_result = true;
R.checks.p5_after_cta_ortho_requests = R.net.orthoPreClick; // sigue siendo 0

await page.waitForSelector('.mapband canvas', { timeout: 30000 });
await page.waitForFunction(() => window.__mjtMap?.areTilesLoaded?.() === true, null, { timeout: 30000 }).catch(() => null);
await page.waitForTimeout(1500);

// ── P3: titular+denominador+cobertura sin scroll (desktop) ──
R.checks.p3_desktop = await page.evaluate(() => {
  const h = document.querySelector('.headline-block');
  const r = h.getBoundingClientRect();
  return { bottom: Math.round(r.bottom), viewport: innerHeight, fits: r.bottom <= innerHeight };
});
R.checks.axe_result_desktop = await axeScan(page, 'result');
await page.screenshot({ path: join(OUT, 'hr1-02-result-desktop.png') });

// ── U4: titular estable en 5 zooms ──
const h0 = await page.locator('.headline-block h1').textContent();
const lead0 = await page.locator('.lead2').textContent();
R.checks.u4 = { initial: h0, readings: [] };
for (const z of [8, 11, 14.5, 10, 12]) {
  await page.evaluate((zz) => window.__mjtMap?.jumpTo({ zoom: zz }), z);
  await page.waitForTimeout(400);
  R.checks.u4.readings.push(await page.locator('.headline-block h1').textContent());
}
R.checks.u4.all_identical = R.checks.u4.readings.every((t) => t === h0);
R.checks.u4.lead = lead0;

// ── M2: el zoom no dispara recálculo (fetch de metrics) ni cambia estadística ──
let metricFetches = 0;
const cntRes = (r) => { if (r.url().includes('/data/metrics/') || r.url().includes('catalog.json')) metricFetches++; };
page.on('response', cntRes);
for (const z of [8, 9, 10, 11, 12, 13, 14, 15, 9.5, 13.6]) {
  await page.evaluate((zz) => window.__mjtMap?.jumpTo({ zoom: zz }), z);
  await page.waitForTimeout(120);
}
await page.waitForTimeout(400);
page.off('response', cntRes);
R.checks.m2_metric_fetches_during_10_zooms = metricFetches;

// ── M1: barrido de zoom 7→17 paso 0,25 — dominios efectivos de capa ──
await page.evaluate(() => window.__mjtMap?.jumpTo({ zoom: 11, center: [-2.98, 43.29] }));
await page.waitForFunction(() => window.__mjtMap?.areTilesLoaded?.(), null, { timeout: 20000 }).catch(() => null);
R.checks.m1_layers = await page.evaluate(() => {
  const m = window.__mjtMap;
  const info = {};
  for (const id of ['munis-fill', 'cells-fill', 'munis-line', 'cells-smalln']) {
    const l = m.getLayer(id);
    if (!l) { info[id] = null; continue; }
    let opacity = 1;
    for (const prop of ['fill-opacity', 'line-opacity']) {
      try { const v = m.getPaintProperty(id, prop); if (v !== undefined) opacity = v; } catch { /* propiedad no aplicable */ }
    }
    info[id] = { minzoom: l.minzoom ?? 0, maxzoom: l.maxzoom ?? 24, opacity };
  }
  info.buildings_minzoom = m.getStyle().layers.filter((l) => l.id.endsWith('-fill') && l.id.startsWith('b-')).map((l) => l.minzoom);
  info.building_sources = Object.keys(m.getStyle().sources).filter((s) => s.startsWith('b-'));
  return info;
});
// evaluación del dominio efectivo (en Node, con las props reales extraídas)
function cellsOpacity(z) {
  // interpolate linear zoom: 8.5→0.75, 13.5→0.75, 14.2→0.15 (clamp)
  const stops = [[8.5, 0.75], [13.5, 0.75], [14.2, 0.15]];
  if (z <= stops[0][0]) return stops[0][1];
  for (let i = 1; i < stops.length; i++)
    if (z <= stops[i][0])
      return stops[i - 1][1] + ((stops[i][1] - stops[i - 1][1]) * (z - stops[i - 1][0])) / (stops[i][0] - stops[i - 1][0]);
  return stops[stops.length - 1][1];
}
const L = R.checks.m1_layers;
R.checks.m1_sweep = [];
for (let z = 7; z <= 17.001; z += 0.25) {
  const zz = Math.round(z * 100) / 100;
  const level = zz < 9 ? 'BIZKAIA' : zz < 13.5 ? 'CELDA' : 'EDIFICIO';
  const munis = L['munis-fill'] ? zz >= (L['munis-fill'].minzoom || 0) && zz < (L['munis-fill'].maxzoom || 24) : false;
  const cellsOn = L['cells-fill'] ? zz >= L['cells-fill'].minzoom && zz < L['cells-fill'].maxzoom && cellsOpacity(zz) > 0 : false;
  const bld = L.building_sources.length > 0 ? zz >= (L.buildings_minzoom[0] ?? 13.5) : false;
  const primaries = [munis, cellsOn, bld].filter(Boolean).length;
  const expected = level === 'BIZKAIA' ? [true, false, false] : level === 'CELDA' ? [false, true, false] : [false, false, true];
  R.checks.m1_sweep.push({ z: zz, level, munis, cells: cellsOn, cellsOpacity: Math.round(cellsOpacity(zz) * 100) / 100, buildings: bld, primaries, specMatch: munis === expected[0] && cellsOn === expected[1] && bld === expected[2] });
}
R.checks.m1_gaps = R.checks.m1_sweep.filter((r) => r.primaries === 0).length;
R.checks.m1_overlaps = R.checks.m1_sweep.filter((r) => r.primaries > 1).length;
R.checks.m1_spec_mismatches = R.checks.m1_sweep.filter((r) => !r.specMatch).map((r) => r.z);

// ── M5: leyenda por nivel ──
R.checks.m5_legend = {};
for (const [z, lv] of [[8, 'BIZKAIA'], [11, 'CELDA'], [15, 'EDIFICIO']]) {
  await page.evaluate((zz) => window.__mjtMap?.jumpTo({ zoom: zz, center: [-2.98, 43.29] }), z);
  await page.waitForTimeout(600);
  R.checks.m5_legend[lv] = (await page.locator('.legend').textContent()).replace(/\s+/g, ' ').trim().slice(0, 200);
}

// ── M6 + M4: pares de celdas + estructura de trama ──
await page.evaluate(() => window.__mjtMap?.jumpTo({ zoom: 11, center: [-2.98, 43.29] }));
await page.waitForFunction(() => window.__mjtMap?.areTilesLoaded?.(), null, { timeout: 20000 }).catch(() => null);
R.checks.m6 = await page.evaluate(() => {
  const m = window.__mjtMap;
  const parseYs = (ys) => { const o = new Map(); for (const p of String(ys || '').split(',')) { const [y, n] = p.split(':'); const yi = +y, ni = +n; if (Number.isFinite(yi) && Number.isFinite(ni)) o.set(yi, (o.get(yi) ?? 0) + ni); } return o; };
  const share = (ys, Y) => { let k = 0, a = 0; for (const [y, n] of parseYs(ys)) { k += n; if (y > Y) a += n; } return k ? a / k : null; };
  const cells = m.querySourceFeatures('cells', { sourceLayer: 'cells' });
  const small = [], big = [];
  for (const c of cells) {
    const s = share(c.properties.ys, 1987);
    if (s === null) continue;
    (c.properties.known < 15 ? small : big).push({ share: Math.round(s * 1000) / 1000, known: c.properties.known });
  }
  const pair = small.find((s) => big.some((b) => Math.abs(b.share - s.share) < 0.001));
  const pairBig = pair ? big.find((b) => Math.abs(b.share - pair.share) < 0.001) : null;
  return {
    total_cells_queried: cells.length, small_n: small.length,
    sample_pair: pair && pairBig ? { share: pair.share, known_small: pair.known, known_big: pairBig.known } : null,
    note: 'fill-color = interpolate(feature-state share) → cuota igual ⇒ color idéntico por construcción; la señal small-N es SOLO contorno (cells-smalln, dasharray).',
    smalln_layer: (() => { const l = m.getLayer('cells-smalln'); return l ? { filter: l.filter, dasharray: m.getPaintProperty('cells-smalln', 'line-dasharray') } : null; })(),
    cell_tooltip_present: !!document.querySelector('.cell-tip, [data-cell-tooltip]'),
  };
});
R.checks.m4_structure = await page.evaluate(() => {
  const m = window.__mjtMap;
  const noyearLayers = m.getStyle().layers.filter((l) => l.id.includes('noyear')).map((l) => ({ id: l.id, pattern: m.getPaintProperty(l.id, 'fill-pattern') }));
  return { hatch_image: m.hasImage('noyear-hatch'), noyear_layers: noyearLayers };
});

// ── VR3: aserciones estructurales por nivel ──
R.checks.vr3 = {};
for (const z of [8, 11, 15]) {
  await page.evaluate((zz) => window.__mjtMap?.jumpTo({ zoom: zz, center: [-2.986, 43.326] }), z);
  await page.waitForTimeout(900);
  R.checks.vr3[`z${z}`] = await page.evaluate(() => {
    const m = window.__mjtMap;
    const rendered = m.queryRenderedFeatures();
    const bySource = {};
    for (const f of rendered) bySource[f.source] = (bySource[f.source] || 0) + 1;
    return { rendered_total: rendered.length, bySource, tiles_loaded: m.areTilesLoaded() };
  });
}

// ── P4: distribución — buckets desktop ──
R.checks.p4_desktop = await page.evaluate(() => {
  const fig = document.querySelector('.dist');
  const bars = fig.querySelectorAll('rect.bar.before').length;
  const noneBars = fig.querySelectorAll('rect.bar.none').length;
  const marker = fig.querySelector('.marker-label')?.textContent ?? null;
  const ticks = [...fig.querySelectorAll('.tick')].map((t) => t.textContent).filter(Boolean);
  const srTable = !!fig.querySelector('table.sr-only');
  return { temporal_bars: bars, noyear_bars: noneBars, marker, ticks, srTable, hScroll: document.documentElement.scrollWidth > innerWidth };
});

// ── A6: aria-live al cambiar resultado ──
R.checks.a6 = await page.evaluate(async () => {
  const announcements = [];
  const obs = new MutationObserver(() => {
    for (const el of document.querySelectorAll('[aria-live], [role=status], [role=alert]'))
      announcements.push(el.textContent.trim().slice(0, 120));
  });
  obs.observe(document.body, { subtree: true, childList: true, characterData: true });
  // cambiar año por UI
  const btn = document.querySelector('.change');
  btn.click();
  await new Promise((r) => setTimeout(r, 300));
  const inp = document.querySelector('.changeform input');
  inp.value = '1990';
  inp.dispatchEvent(new Event('input', { bubbles: true }));
  document.querySelector('.changeform button[type=submit]').click();
  await new Promise((r) => setTimeout(r, 900));
  obs.disconnect();
  return { announcements: [...new Set(announcements)], count: new Set(announcements).size };
});
await page.evaluate(() => { document.querySelector('.changeform .change'); }); // noop
await page.screenshot({ path: join(OUT, 'hr1-03-result-after-year-change.png') });

// ── deep link A: vista explícita ──
await page.goto(`${BASE}/?year=1987&place=leioa&lat=43.326&lon=-2.988&z=14.6`, { waitUntil: 'load' });
await page.waitForSelector('.mapband canvas', { timeout: 30000 });
await page.waitForTimeout(6000);
R.checks.deeplink_A = await page.evaluate(() => {
  const m = window.__mjtMap;
  const c = m.getCenter();
  return { lat: +c.lat.toFixed(4), lon: +c.lng.toFixed(4), zoom: +m.getZoom().toFixed(2), requested: { lat: 43.326, lon: -2.988, z: 14.6 } };
});
await page.screenshot({ path: join(OUT, 'deeplink-A-z14.png') });
// edificio click → ficha (canonical state 3)
const pt = await page.evaluate(() => {
  const m = window.__mjtMap;
  const c = m.getCanvas();
  for (let x = 30; x < c.clientWidth; x += 20)
    for (let y = 30; y < c.clientHeight; y += 20) {
      const f = m.queryRenderedFeatures([x, y]).find((f) => f.source?.startsWith('b-') && f.layer.id.endsWith('-fill'));
      if (f) return { x, y };
    }
  return null;
});
R.checks.building_feature_found = pt !== null;
if (pt) {
  const box = await page.locator('.mapband').boundingBox();
  await page.mouse.click(box.x + pt.x, box.y + pt.y);
  await page.waitForTimeout(700);
  R.checks.building_card = await page.locator('.card .main').textContent().catch(() => null);
  await page.screenshot({ path: join(OUT, 'hr1-03-building-desktop.png') });
  R.checks.axe_building_desktop = await axeScan(page, 'building');
}

// ── deep link B: sin coords → fitBounds municipal ──
await page.goto(`${BASE}/?year=1987&place=leioa`, { waitUntil: 'load' });
await page.waitForSelector('.mapband canvas', { timeout: 30000 });
await page.waitForTimeout(6000);
R.checks.deeplink_B = await page.evaluate(() => ({ zoom: +window.__mjtMap.getZoom().toFixed(2), lat: +window.__mjtMap.getCenter().lat.toFixed(4) }));
// C: reload reproduce mismo estado
await page.reload({ waitUntil: 'load' });
await page.waitForSelector('.mapband canvas', { timeout: 30000 });
await page.waitForTimeout(5000);
R.checks.deeplink_C_reload = await page.evaluate(() => ({ zoom: +window.__mjtMap.getZoom().toFixed(2), headline: document.querySelector('.headline-block h1')?.textContent }));
// D: back/forward
await page.goto(`${BASE}/`, { waitUntil: 'load' });
await page.waitForSelector('.hero h1');
await page.goto(`${BASE}/?year=1987&place=leioa`, { waitUntil: 'load' });
await page.waitForSelector('.headline-block h1', { timeout: 20000 });
await page.goBack({ waitUntil: 'load' }).catch(() => null);
await page.waitForTimeout(800);
const afterBack = { url: page.url(), hero: await page.locator('.hero h1').count() };
await page.goForward({ waitUntil: 'load' }).catch(() => null);
await page.waitForTimeout(2500);
const afterFwd = { url: page.url(), headline: await page.locator('.headline-block h1').textContent().catch(() => null) };
R.checks.deeplink_D = { afterBack, afterFwd };
// E: parámetros inválidos
await page.goto(`${BASE}/?year=1700&place=noexiste&lat=999&lon=abc&z=99&ortho=1234`, { waitUntil: 'load' });
await page.waitForTimeout(2500);
R.checks.deeplink_E_invalid = await page.evaluate(() => ({
  crashed: !document.body.textContent.trim().length,
  heroVisible: !!document.querySelector('.hero'),
  text: document.body.textContent.slice(0, 100),
}));

// ── Ortofoto AVAILABLE (1987→1990 en Leioa) ──
await page.goto(`${BASE}/?year=1987&place=leioa`, { waitUntil: 'load' });
await page.waitForSelector('.mapband canvas', { timeout: 30000 });
await page.waitForTimeout(2500);
const orthoBtn = page.locator('.ortho .btn').first();
R.checks.ortho_proposal = await page.locator('.ortho .proposal').textContent().catch(() => null);
await orthoBtn.click();
const loadingText = await page.locator('.ortho-state').textContent().catch(() => '');
R.checks.ortho_state_unknown_loading = loadingText.trim().slice(0, 80);
await page.waitForTimeout(6000);
R.checks.ortho_available = (await page.locator('.ortho-state').textContent()).replace(/\s+/g, ' ').trim().slice(0, 200);
await page.screenshot({ path: join(OUT, 'ortho-available.png') });
// comparar con 2025
const cmpBtn = page.locator('.ortho .btn.ghost').first();
if (await cmpBtn.count()) { await cmpBtn.click(); await page.waitForTimeout(4000); await page.screenshot({ path: join(OUT, 'ortho-compare.png') }); }

// ── Ortofoto NOT_COVERED real: 1975 no cubre Murueta (evidencia G0) ──
await page.goto(`${BASE}/?year=1975&place=murueta`, { waitUntil: 'load' });
await page.waitForSelector('.mapband canvas', { timeout: 30000 });
await page.waitForTimeout(2500);
const ob2 = page.locator('.ortho .btn').first();
R.checks.ortho_proposal_1975 = await page.locator('.ortho .proposal').textContent().catch(() => null);
if (await ob2.count()) {
  await ob2.click();
  await page.waitForTimeout(10000);
  R.checks.ortho_notcovered = (await page.locator('.ortho-state').textContent()).replace(/\s+/g, ' ').trim().slice(0, 260);
  await page.screenshot({ path: join(OUT, 'ortho-notcovered.png') });
}

// ── Ortofoto SERVICE_ERROR forzado (abort de la sonda) ──
const ctx3 = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const p3 = await ctx3.newPage();
await wireNet(p3, 'svc-error');
await p3.route('**/geo.bizkaia.eus/**', (r) => r.abort());
await p3.route('**/geo.euskadi.eus/WMS_ORTOARGAZKIAK**', (r) => r.abort());
await p3.goto(`${BASE}/?year=1987&place=leioa`, { waitUntil: 'load' });
await p3.waitForSelector('.mapband canvas', { timeout: 30000 });
await p3.waitForTimeout(2000);
const ob3 = p3.locator('.ortho .btn').first();
if (await ob3.count()) {
  await ob3.click();
  await p3.waitForTimeout(5000);
  R.checks.ortho_service_error = (await p3.locator('.ortho-state').textContent()).replace(/\s+/g, ' ').trim().slice(0, 200);
  await p3.screenshot({ path: join(OUT, 'ortho-service-error.png') });
}

// ── REL4: NORA caído ──
const p4 = await ctx3.newPage();
await wireNet(p4, 'nora-down');
await p4.route('**/geo.euskadi.eus/t17iApiRestWar/**', (r) => r.abort());
await p4.goto(`${BASE}/`, { waitUntil: 'load' });
await p4.waitForSelector('.hero h1');
await p4.fill('#place-input', 'zzzzzzz');
await p4.waitForTimeout(1500);
R.checks.rel4_nora_error = (await p4.locator('.search').textContent()).replace(/\s+/g, ' ').trim().slice(0, 160);
await p4.fill('#place-input', 'Lei');
await p4.waitForTimeout(1500);
R.checks.rel4_nora_error_with_local = (await p4.locator('.search').textContent()).replace(/\s+/g, ' ').trim().slice(0, 160);

// ── U3: estados de búsqueda ──
const p5 = await ctx3.newPage();
await wireNet(p5, 'search-states');
await p5.goto(`${BASE}/`, { waitUntil: 'load' });
await p5.waitForSelector('.hero h1');
R.checks.u3 = {};
await p5.fill('#place-input', 'ab');
await p5.waitForTimeout(500);
R.checks.u3.TOO_SHORT = (await p5.locator('.search').textContent()).replace(/\s+/g, ' ').trim().slice(0, 120);
await p5.fill('#place-input', 'lei');
await p5.waitForTimeout(2500);
R.checks.u3.RESULTS = (await p5.locator('.search').textContent()).replace(/\s+/g, ' ').trim().slice(0, 160);
await p5.fill('#place-input', 'xqzzk');
await p5.waitForTimeout(2500);
R.checks.u3.NO_RESULTS = (await p5.locator('.search').textContent()).replace(/\s+/g, ' ').trim().slice(0, 160);
await p5.fill('#place-input', 'vitoria');
await p5.waitForTimeout(2500);
R.checks.u3.OUT_OF_SCOPE = (await p5.locator('.search').textContent()).replace(/\s+/g, ' ').trim().slice(0, 160);

// ── REL3: PMTiles caído ──
const p6 = await ctx3.newPage();
await wireNet(p6, 'pmtiles-down');
await p6.route('**/*.pmtiles', (r) => r.abort());
await p6.goto(`${BASE}/?year=1987&place=leioa`, { waitUntil: 'load' });
await p6.waitForSelector('.headline-block h1', { timeout: 20000 }).catch(() => null);
await p6.waitForTimeout(5000);
R.checks.rel3_pmtiles_down = {
  maperror_visible: await p6.locator('.maperror').isVisible().catch(() => false),
  maperror_text: await p6.locator('.maperror').textContent().catch(() => null),
  headline_alive: await p6.locator('.headline-block h1').textContent().catch(() => null),
  dist_alive: await p6.locator('.dist').count(),
};
await p6.screenshot({ path: join(OUT, 'rel3-pmtiles-down.png') });
await ctx3.close();

// ── DEP: trazas HTTP ──
const dr = await page.request.get(`${BASE}/data/cells.pmtiles`, { headers: { Range: 'bytes=0-99' } });
R.checks.dep = {
  range_status: dr.status(),
  content_range: dr.headers()['content-range'] ?? null,
  accept_ranges: dr.headers()['accept-ranges'] ?? null,
  pmtiles_mime: dr.headers()['content-type'] ?? null,
};
const jr = await page.request.get(`${BASE}/_app/immutable/entry/start.js`, { headers: { 'Accept-Encoding': 'gzip, br' } }).catch(() => null);
R.checks.dep.js_content_encoding = jr ? (jr.headers()['content-encoding'] ?? null) : 'no-js-found';
// buscar un .js real
const jsl = await page.request.get(`${BASE}/`, {}).catch(() => null);
R.checks.dep.html_content_encoding = jsl ? (jsl.headers()['content-encoding'] ?? null) : null;

// ── MÓVIL 390×844 ──
const ctxM = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
const pm = await ctxM.newPage();
await wireNet(pm, 'mobile');
await pm.goto(`${BASE}/`, { waitUntil: 'load' });
await pm.waitForSelector('.hero h1', { timeout: 20000 });
R.checks.axe_intro_mobile = await axeScan(pm, 'intro_m');
await pm.screenshot({ path: join(OUT, 'hr1-04-hero-mobile.png') });
await pm.goto(`${BASE}/?year=1987&place=leioa`, { waitUntil: 'load' });
await pm.waitForSelector('.mapband canvas', { timeout: 30000 });
await pm.waitForFunction(() => window.__mjtMap?.areTilesLoaded?.(), null, { timeout: 30000 }).catch(() => null);
await pm.waitForTimeout(1500);
R.checks.p3_mobile = await pm.evaluate(() => {
  const h = document.querySelector('.headline-block');
  const r = h.getBoundingClientRect();
  return { bottom: Math.round(r.bottom), viewport: innerHeight, fits: r.bottom <= innerHeight };
});
R.checks.p4_mobile = await pm.evaluate(() => ({
  temporal_bars: document.querySelectorAll('.dist rect.bar.before').length,
  noyear_bars: document.querySelectorAll('.dist rect.bar.none').length,
  marker: document.querySelector('.dist .marker-label')?.textContent ?? null,
  hScroll: document.documentElement.scrollWidth > innerWidth,
  sameBuckets: document.querySelectorAll('.dist rect.bar.before').length,
}));
R.checks.axe_result_mobile = await axeScan(pm, 'result_m');
await pm.screenshot({ path: join(OUT, 'hr1-05-result-mobile.png') });
// detail mobile: abrir edificio
await pm.evaluate(() => window.__mjtMap?.jumpTo({ zoom: 15, center: [-2.986, 43.326] }));
await pm.waitForTimeout(2500);
const ptm = await pm.evaluate(() => {
  const m = window.__mjtMap; const c = m.getCanvas();
  for (let x = 20; x < c.clientWidth; x += 15)
    for (let y = 20; y < c.clientHeight; y += 15) {
      const f = m.queryRenderedFeatures([x, y]).find((f) => f.source?.startsWith('b-') && f.layer.id.endsWith('-fill'));
      if (f) return { x, y };
    }
  return null;
});
if (ptm) {
  const bb = await pm.locator('.mapband').boundingBox();
  await pm.touchscreen.tap(bb.x + ptm.x, bb.y + ptm.y);
  await pm.waitForTimeout(800);
}
R.checks.building_card_mobile = await pm.locator('.card .main').textContent().catch(() => null);
await pm.screenshot({ path: join(OUT, 'hr1-06-detail-mobile.png') });
R.checks.axe_detail_mobile = await axeScan(pm, 'detail_m');

// A9/U6: objetivos táctiles ≥44px en móvil
R.checks.a9_targets = await pm.evaluate(() => {
  const bad = [];
  for (const el of document.querySelectorAll('button, a[href], input, [role=option]')) {
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;
    if (r.width < 44 || r.height < 44)
      bad.push({ text: (el.textContent || el.getAttribute('aria-label') || el.id || '').trim().slice(0, 40), w: Math.round(r.width), h: Math.round(r.height) });
  }
  return { under44: bad, checked: document.querySelectorAll('button, a[href], input, [role=option]').length };
});

// A8: zoom 200 % (CSS zoom, proxy de text-zoom del navegador)
const ctxZ = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const pz = await ctxZ.newPage();
await wireNet(pz, 'zoom200');
await pz.goto(`${BASE}/?year=1987&place=leioa`, { waitUntil: 'load' });
await pz.waitForSelector('.headline-block h1', { timeout: 20000 });
await pz.evaluate(() => { document.body.style.zoom = '2'; });
await pz.waitForTimeout(800);
R.checks.a8_200pct = await pz.evaluate(() => ({
  hScroll: document.documentElement.scrollWidth > innerWidth,
  headlineVisible: (() => { const r = document.querySelector('.headline-block h1').getBoundingClientRect(); return r.width > 0 && r.height > 0; })(),
  clippedText: (() => { const r = document.querySelector('.headline-block h1').getBoundingClientRect(); return r.right > innerWidth; })(),
}));
await pz.screenshot({ path: join(OUT, 'a8-zoom200.png') });
await ctxZ.close();
await ctxM.close();

// ── A5: prefers-reduced-motion ──
const ctxR = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
const pr = await ctxR.newPage();
await wireNet(pr, 'rm');
await pr.goto(`${BASE}/`, { waitUntil: 'load' });
await pr.waitForSelector('.hero h1');
await pr.fill('#year-input', '1987');
await pr.fill('#place-input', 'Leioa');
await pr.waitForSelector('#place-listbox button', { timeout: 15000 });
await pr.click('#place-listbox button >> nth=0');
await pr.click('.cta');
await pr.waitForSelector('.mapband canvas', { timeout: 30000 });
await pr.waitForTimeout(600);
R.checks.a5_reduced_motion = await pr.evaluate(() => {
  const m = window.__mjtMap;
  return { mediaMatches: matchMedia('(prefers-reduced-motion: reduce)').matches, mapMoving: m ? m.isMoving() : null, headline: document.querySelector('.headline-block h1')?.textContent };
});
await ctxR.close();

await ctx.close();
await browser.close();
server.close();

await writeFile(join(OUT, 'adjudication.json'), JSON.stringify(R, null, 1));
console.log(JSON.stringify({ checks: R.checks, worker: R.net.worker, fpFailures: R.net.firstPartyFailures.length, consoleErrors: R.consoleErrors, pageErrors: R.pageErrors, external: Object.fromEntries(Object.entries(R.net.external).map(([k, v]) => [k, v.length])) }, null, 1));
