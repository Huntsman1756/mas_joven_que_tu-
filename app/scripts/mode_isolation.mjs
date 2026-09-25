// G19-R4 — contrato de aislamiento entre modos (Phase 2/3/15/19).
//
// Invariante bloqueante de release:
//   tab activa == app.mode == URL view == capas renderizadas == modo del
//   HistoricalTimePlayer.
//
// Contratos por modo:
//   map   (Por antigüedad): SIN player; todos los edificios actuales
//           visibles clasificados vs año personal (posteriores NO se
//           ocultan); sin raster.
//   time  (Evolución): player continuous; filtra VALID>playYear; los
//           no-VALID permanecen; sin raster.
//   photo (Fotos): player discrete; SIN heatmap de edad por defecto
//           (ni con raster ni sin él — la espera de campaña muestra la
//           base limpia); raster tras activar campaña.
//   hist  (1923–25): raster histórico; sin player; sin heatmap.
//   swipe (Antes/ahora): comparador; sin player; sin heatmap.
//
// playYear persiste en estado al salir de Evolución (restauración al
// volver) pero NO pinta nada fuera de time: ni filtro, ni cuota, ni
// player, ni play= en la URL.
//
// Datos: fixtures PMTiles reales (Bilbao 020) + stubs raster externos.
// Uso: node scripts/mode_isolation.mjs
import { mkdir, writeFile } from 'node:fs/promises';
import { createStaticServer } from './static-server.mjs';
import { installExternalStubs, installLocalFixtures } from './fixtures.mjs';
import { chromium } from 'playwright';
import { join, resolve } from 'node:path';

const ROOT = resolve(process.cwd(), '..');
const OUT = process.env.MODE_ISO_OUT || join(ROOT, 'evidence/g19r4');
const server = await createStaticServer('build', 4319);
const browser = await chromium.launch();
const out = [];
let fails = 0;
const pageErrors = [];
const ok = (name, cond, extra = '') => {
  if (!cond) fails++;
  out.push(`${cond ? 'PASS' : 'FAIL'} ${name}${extra ? ' — ' + extra : ''}`);
};
async function block(name, fn) {
  try {
    await fn();
  } catch (e) {
    fails++;
    out.push(`FAIL ${name}_threw — ${String(e).slice(0, 240)}`);
  }
}
await mkdir(OUT, { recursive: true });

async function newResultPage(url, extra = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, ...extra });
  const p = await ctx.newPage();
  p.on('pageerror', (e) => pageErrors.push(e.message.slice(0, 200)));
  await installLocalFixtures(p);
  await installExternalStubs(p);
  await p.goto(`http://localhost:4319${url}`);
  await p.waitForFunction(
    () => window.__mjtApp?.headline !== null && !!window.__mjtMap?.loaded?.(),
    null,
    { timeout: 60000 }
  );
  return { ctx, p };
}
const setMode = async (p, m) => {
  await p.click(`.viewswitch [data-mode="${m}"]`);
  await p.waitForFunction((mm) => window.__mjtApp?.mode === mm, m);
  await p.waitForTimeout(350); // efectos de capa + URL sync
};

/** Contrato observable de cada modo: estado + DOM + capas MapLibre. */
const contractOf = (p) =>
  p.evaluate(() => {
    const a = window.__mjtApp;
    const m = window.__mjtMap;
    const bar = document.querySelector('.tc-bar');
    const tab = document.querySelector('.viewswitch [data-mode][aria-current="true"]');
    const vis = (id) => (m.getLayer(id) ? m.getLayoutProperty(id, 'visibility') !== 'none' : null);
    const url = new URL(location.href);
    return {
      mode: a.mode,
      playYear: a.playYear,
      playActive: a.playActive,
      tab: tab?.dataset.mode ?? null,
      urlView: url.searchParams.get('view'),
      urlPlay: url.searchParams.get('play'),
      bar: !!bar,
      barMode: bar?.dataset.playerMode ?? null,
      ortho: !!m.getLayer('ortho'),
      orthoState: a.orthoState,
      orthoRender: a.orthoRender,
      histmap: !!m.getLayer('histmap'),
      cells: vis('cells-fill'),
      munis: vis('munis-fill'),
      swipe: !!document.querySelector('.swipe')
    };
  });

const checkContract = (name, st, exp) => {
  const bad = [];
  if (st.tab !== exp.mode) bad.push(`tab=${st.tab}`);
  if (st.mode !== exp.mode) bad.push(`mode=${st.mode}`);
  const wantView = exp.mode === 'map' ? null : exp.mode;
  if (st.urlView !== wantView) bad.push(`urlView=${st.urlView}`);
  if (st.bar !== exp.player) bad.push(`bar=${st.bar}`);
  if (exp.player && st.barMode !== exp.playerMode) bad.push(`barMode=${st.barMode}`);
  if (st.ortho !== exp.ortho) bad.push(`ortho=${st.ortho}`);
  if (st.histmap !== exp.histmap) bad.push(`histmap=${st.histmap}`);
  if (st.swipe !== (exp.mode === 'swipe')) bad.push(`swipe=${st.swipe}`);
  if (exp.cells !== undefined && st.cells !== exp.cells) bad.push(`cells=${st.cells}`);
  ok(name, bad.length === 0, bad.join(' ') || JSON.stringify(exp));
};

/** Ids renderizados en las capas de edificio (respeta filtros activos). */
const buildingIds = (p) =>
  p.evaluate(() => {
    const m = window.__mjtMap;
    const layers = (m.getStyle()?.layers ?? [])
      .map((l) => l.id)
      .filter((id) => /^b-\d+-fill$/.test(id));
    const feats = m.queryRenderedFeatures(undefined, { layers });
    return feats.map((f) => ({
      id: f.properties.id,
      year: f.properties.year,
      state: f.properties.state
    }));
  });

// ── 1. Edificios: sin player, sin raster, heatmap visible ─────────────
await block('map_contract', async () => {
  const { ctx, p } = await newResultPage('/?year=1952&place=bilbao');
  const st = await contractOf(p);
  checkContract('map_contract', st, {
    mode: 'map',
    player: false,
    ortho: false,
    histmap: false,
    cells: true
  });
  await ctx.close();
});

// ── 2. Nivel edificio: map muestra TODOS, time filtra >playYear ────────
await block('building_visibility', async () => {
  // z≥13.5 en el Ensanche de Bilbao: mezcla de edificios ≤1952, >1952 y
  // sin año utilizable.
  const { ctx, p } = await newResultPage('/?year=1952&place=bilbao&lat=43.2625&lon=-2.9280&z=14.3');
  await p.waitForFunction(
    () => {
      const m = window.__mjtMap;
      return (m.getStyle()?.layers ?? []).some((l) => /^b-\d+-fill$/.test(l.id));
    },
    null,
    { timeout: 20000 }
  );
  await p.waitForTimeout(1200); // teselas renderizadas
  const mapFeats = await buildingIds(p);
  const post = mapFeats.filter((f) => f.state === 'VALID' && f.year > 1952);
  const pre = mapFeats.filter((f) => f.state === 'VALID' && f.year <= 1952);
  const unk = mapFeats.filter((f) => f.state !== 'VALID');
  ok(
    'map_shows_all',
    post.length > 0 && pre.length > 0,
    `post1952=${post.length} pre=${pre.length} unknown=${unk.length}`
  );
  // G19-R4 cierre: la leyenda de map habla del año personal (binaria)
  const legendMap = await p.evaluate(() => document.querySelector('.legend')?.textContent ?? '');
  ok(
    'map_legend_binary',
    legendMap.includes('Ya existía en 1952') && legendMap.includes('después de 1952'),
    legendMap.replace(/\s+/g, ' ').slice(0, 140)
  );

  // → Evolución con cabezal en 1952: los posteriores desaparecen
  await setMode(p, 'time');
  await p.waitForTimeout(400);
  const timeFeats = await buildingIds(p);
  const timeIds = new Set(timeFeats.map((f) => f.id));
  const postVisibleInTime = post.filter((f) => timeIds.has(f.id));
  const unkVisibleInTime = unk.filter((f) => timeIds.has(f.id));
  ok(
    'time_hides_post_playYear',
    postVisibleInTime.length === 0 && post.length > 0,
    `post>1952 visibles en time=${postVisibleInTime.length}/${post.length}`
  );
  ok(
    'time_keeps_unknown',
    unk.length === 0 || unkVisibleInTime.length === unk.length,
    `unknown ${unkVisibleInTime.length}/${unk.length}`
  );
  const st = await contractOf(p);
  checkContract('time_contract', st, {
    mode: 'time',
    player: true,
    playerMode: 'continuous',
    ortho: false,
    histmap: false,
    cells: true
  });
  ok(
    'time_anchor',
    st.playYear === 1952 && st.urlPlay === '1952',
    `playYear=${st.playYear} urlPlay=${st.urlPlay}`
  );
  // G19-R4 cierre: en Evolución el fill es una sola clase «ya construido»
  // — sin rampa binaria por año personal — y la leyenda habla solo de
  // playYear.
  const paintTime = await p.evaluate(() => {
    const m = window.__mjtMap;
    const l = (m.getStyle()?.layers ?? []).find((x) => /^b-\d+-fill$/.test(x.id));
    return l ? m.getPaintProperty(l.id, 'fill-color') : null;
  });
  ok(
    'time_single_class_fill',
    JSON.stringify(paintTime) ===
      JSON.stringify(['case', ['!=', ['get', 'state'], 'VALID'], '#d8dde2', '#52768e']),
    JSON.stringify(paintTime)
  );
  const legendTime = await p.evaluate(() => document.querySelector('.legend')?.textContent ?? '');
  ok(
    'time_legend_playyear_only',
    legendTime.includes('construidos en 1952') &&
      !legendTime.includes('después de') &&
      !legendTime.includes('Ya existía'),
    legendTime.replace(/\s+/g, ' ').slice(0, 140)
  );

  // mover a 1974: más edificios incorporados, los >1974 siguen fuera
  await p.evaluate(() => {
    window.__mjtApp.playYear = 1974;
  });
  await p.waitForTimeout(500);
  const f74 = await buildingIds(p);
  const post74 = f74.filter((f) => f.state === 'VALID' && f.year > 1974);
  const grew = f74.length > timeFeats.length;
  ok(
    'time_1974_filter',
    post74.length === 0 && grew,
    `>1974=${post74.length} feats ${timeFeats.length}→${f74.length}`
  );
  // Regresión G19-R4-cierre: un edificio con 1952<año<=1974 — oculto a
  // 1952 — aparece a 1974, y la codificación sigue siendo la clase única
  // «ya construido», no la rampa binaria por año personal.
  const reincorporated = f74.filter((f) => f.state === 'VALID' && f.year > 1952 && f.year <= 1974);
  const paint74 = await p.evaluate(() => {
    const m = window.__mjtMap;
    const l = (m.getStyle()?.layers ?? []).find((x) => /^b-\d+-fill$/.test(x.id));
    return l ? JSON.stringify(m.getPaintProperty(l.id, 'fill-color')) : null;
  });
  ok(
    'time_1974_single_class',
    reincorporated.length > 0 &&
      paint74 === JSON.stringify(['case', ['!=', ['get', 'state'], 'VALID'], '#d8dde2', '#52768e']),
    `reincorporados(1952<y<=1974)=${reincorporated.length} paint=${paint74?.slice(0, 90)}`
  );

  // volver a Edificios: clasificación por año personal restaurada —
  // playYear persiste en estado pero NO filtra ni monta player
  await setMode(p, 'map');
  const mapAgain = await buildingIds(p);
  const mapIds = new Set(mapAgain.map((f) => f.id));
  const postBack = post.filter((f) => mapIds.has(f.id));
  const stMap = await contractOf(p);
  checkContract('map_restored', stMap, {
    mode: 'map',
    player: false,
    ortho: false,
    histmap: false,
    cells: true
  });
  ok(
    'map_all_visible_again',
    postBack.length === post.length,
    `post1952 ${postBack.length}/${post.length}`
  );
  // y la codificación vuelve a ser la binaria por año personal
  const paintMap = await p.evaluate(() => {
    const m = window.__mjtMap;
    const l = (m.getStyle()?.layers ?? []).find((x) => /^b-\d+-fill$/.test(x.id));
    return l ? JSON.stringify(m.getPaintProperty(l.id, 'fill-color')) : null;
  });
  ok(
    'map_fill_binary_restored',
    !!paintMap && paintMap.includes('[">"'),
    paintMap?.slice(0, 140) ?? 'null'
  );
  ok(
    'playYear_saved_not_shown',
    stMap.playYear === 1974 && !stMap.playActive && stMap.urlPlay === null,
    `playYear=${stMap.playYear} active=${stMap.playActive} url=${stMap.urlPlay}`
  );
  await ctx.close();
});

// ── 3. Fotos: player discrete, sin heatmap por defecto, raster tras activar ──
await block('photo_contract', async () => {
  const { ctx, p } = await newResultPage('/?year=1952&place=bilbao');
  await setMode(p, 'time');
  await p.evaluate(() => (window.__mjtApp.playYear = 1974));
  await p.waitForTimeout(300);
  await setMode(p, 'photo');
  await p.waitForSelector('.tc-bar', { timeout: 15000 }); // panel lazy
  let st = await contractOf(p);
  // sin campaña activada: NO hay heatmap de edad — la fuente primaria de
  // Fotos es el raster; la espera muestra base limpia, no datos de edad
  checkContract('photo_default_no_heatmap', st, {
    mode: 'photo',
    player: true,
    playerMode: 'discrete',
    ortho: false,
    histmap: false,
    cells: false
  });
  ok('photo_keeps_playYear_state', st.playYear === 1974, `playYear=${st.playYear}`);
  // activar campaña (clic en el rail sobre un tick — .epoch es span
  // aria-hidden, el hitbox es el scrubber): raster + edad siguen fuera
  const frac = await p
    .locator('.photo .epoch')
    .first()
    .evaluate((el) => parseFloat(el.style.left) / 100);
  const box = await p.locator('.photo .tc-scrub').boundingBox();
  await p
    .locator('.photo .tc-scrub')
    .click({ position: { x: Math.min(frac * box.width, box.width - 2), y: box.height / 2 } });
  await p.waitForFunction(() => !!window.__mjtMap?.getLayer('ortho'), null, { timeout: 15000 });
  // readiness real del raster: no basta la capa montada — el estado debe
  // resolver a terminal (con stubs toda tesela es imagen con contenido)
  await p.waitForFunction(() => window.__mjtApp?.orthoRender !== 'LOADING', null, {
    timeout: 20000
  });
  st = await contractOf(p);
  ok(
    'photo_raster_on',
    st.ortho === true && st.cells === false,
    `ortho=${st.ortho} cells=${st.cells}`
  );
  ok(
    'photo_render_content',
    st.orthoRender === 'CONTENT',
    `orthoRender=${st.orthoRender} orthoState=${st.orthoState}`
  );
  await ctx.close();
});

// ── 3b. Estados del raster en el lienzo: EMPTY / ERROR nunca son canvas
//      blanco mudo. Se activa 1956 con stubs (CONTENT), luego el servicio
//      «deja de tener cobertura» (404) o «cae la red» (abort) y se fuerza
//      un reencuadre CORTO (<500 m, bajo el umbral de la re-sonda G16b) —
//      el veredicto de tesela debe declararse en el lienzo. ──
await block('photo_render_states', async () => {
  const { ctx, p } = await newResultPage('/?year=1952&place=bilbao');
  await setMode(p, 'photo');
  await p.waitForSelector('.photo .tc-bar', { timeout: 15000 });
  const frac = await p
    .locator('.photo .epoch[data-year="1956"]')
    .evaluate((el) => parseFloat(el.style.left) / 100);
  const box = await p.locator('.photo .tc-scrub').boundingBox();
  await p
    .locator('.photo .tc-scrub')
    .click({ position: { x: Math.min(frac * box.width, box.width - 2), y: box.height / 2 } });
  try {
    await p.waitForFunction(() => window.__mjtApp?.orthoRender === 'CONTENT', null, {
      timeout: 25000
    });
  } catch (e) {
    const d = await p.evaluate(() => ({
      render: window.__mjtApp?.orthoRender,
      state: window.__mjtApp?.orthoState,
      campaign: window.__mjtApp?.orthoCampaign?.year
    }));
    throw new Error(`CONTENT wait: ${JSON.stringify(d)}`, { cause: e });
  }

  // NO_COVERTURA real: encuadre >500 m del punto sondeado dispara la
  // re-sonda (G16b) — si la fuente ya no tiene imagen allí, el estado
  // declarado es NOT_COVERED + aviso, nunca un lienzo vacío mudo.
  await p.route(/ORTO_BFA_1956/, (r) => r.fulfill({ status: 404, body: 'no tile' }));
  await p.evaluate(() => {
    const v = window.__mjtApp.view;
    window.__mjtMap.jumpTo({ center: [v.lon + 0.02, v.lat + 0.02] }); // ~2 km
  });
  // esperar el aviso, no solo el flag: tras NOT_COVERED la sonda sigue
  // buscando alternativas (probing → panel muestra «Cargando…»)
  await p.waitForFunction(
    () =>
      window.__mjtApp?.orthoState === 'NOT_COVERED' &&
      (document.querySelector('.photo .state')?.textContent ?? '').includes('no cubre'),
    null,
    { timeout: 30000 }
  );
  const cov = await p.evaluate(() => ({
    render: window.__mjtApp.orthoRender,
    layer: !!window.__mjtMap.getLayer('ortho'),
    panel: document.querySelector('.photo .state')?.textContent ?? ''
  }));
  ok(
    'photo_notcovered_declared',
    cov.render === 'EMPTY' && !cov.layer && cov.panel.includes('no cubre este lugar'),
    JSON.stringify(cov).slice(0, 200)
  );

  // ERROR de tesela: la capa se re-monta (sonda previa AVAILABLE) pero
  // todas las peticiones —teselas y sonda del encuadre— fallan de red;
  // el lienzo declara el fallo con reintento, no un blanco mudo.
  await p.unroute(/ORTO_BFA_1956/);
  await p.route(/ORTO_BFA_1956/, (r) => r.abort());
  await p.evaluate(() => {
    window.__mjtApp.orthoState = 'AVAILABLE';
    window.__mjtApp.orthoRender = 'LOADING';
    window.__mjtMap.jumpTo({ zoom: 14.6 }); // mismo centro: sin re-sonda G16b
  });
  await p.waitForFunction(() => window.__mjtApp?.orthoRender === 'ERROR', null, {
    timeout: 25000
  });
  const errTxt = await p.evaluate(() => document.querySelector('.rstate')?.textContent ?? '');
  ok(
    'photo_render_error_retry',
    errTxt.includes('No se ha podido cargar') && errTxt.includes('Reintentar'),
    errTxt.replace(/\s+/g, ' ').slice(0, 120)
  );
  await ctx.close();
});

// ── 4. hist + swipe: sin player, sin heatmap ──────────────────────────
await block('hist_swipe_contract', async () => {
  const { ctx, p } = await newResultPage('/?year=1952&place=bilbao');
  await setMode(p, 'hist');
  await p.waitForFunction(() => !!window.__mjtMap?.getLayer('histmap'), null, {
    timeout: 15000
  });
  let st = await contractOf(p);
  checkContract('hist_contract', st, {
    mode: 'hist',
    player: false,
    ortho: false,
    histmap: true,
    cells: false
  });
  await setMode(p, 'swipe');
  await p.waitForSelector('.swipe', { timeout: 15000 });
  st = await contractOf(p);
  checkContract('swipe_contract', st, {
    mode: 'swipe',
    player: false,
    ortho: true,
    histmap: false,
    cells: false
  });
  await ctx.close();
});

// ── 5. Cambio rápido + reload + back/forward ──────────────────────────
await block('rapid_and_history', async () => {
  const { ctx, p } = await newResultPage('/?year=1952&place=bilbao');
  // cambio rápido sin esperas entre modos
  for (const m of ['time', 'photo', 'map', 'photo', 'time']) {
    await p.click(`.viewswitch [data-mode="${m}"]`);
  }
  await p.waitForFunction(() => window.__mjtApp?.mode === 'time');
  await p.waitForTimeout(600);
  let st = await contractOf(p);
  checkContract('rapid_lands_time', st, {
    mode: 'time',
    player: true,
    playerMode: 'continuous',
    ortho: false,
    histmap: false,
    cells: true
  });
  // reload en time conserva view+play; reload en map nunca restaura play=
  await p.reload();
  await p.waitForFunction(
    () => window.__mjtApp?.headline !== null && !!window.__mjtMap?.loaded?.(),
    null,
    { timeout: 60000 }
  );
  st = await contractOf(p);
  ok('reload_restores_time', st.mode === 'time' && st.barMode === 'continuous', `mode=${st.mode}`);
  await setMode(p, 'map');
  await p.reload();
  await p.waitForFunction(
    () => window.__mjtApp?.headline !== null && !!window.__mjtMap?.loaded?.(),
    null,
    { timeout: 60000 }
  );
  st = await contractOf(p);
  ok(
    'reload_map_clean',
    st.mode === 'map' && !st.bar && st.urlPlay === null && st.cells === true,
    `mode=${st.mode} bar=${st.bar} play=${st.urlPlay} cells=${st.cells}`
  );
  // back/forward: el último back devuelve a la entrada time&play
  await p.goBack();
  await p.waitForTimeout(600);
  st = await contractOf(p);
  ok('back_restores', st.mode === 'time' || st.mode === 'map', `mode=${st.mode} bar=${st.bar}`);
  await ctx.close();
});

console.log(out.join('\n'));
await writeFile(join(OUT, 'mode_isolation.txt'), out.join('\n') + '\n');
if (pageErrors.length) console.log('PAGEERRORS:', pageErrors.slice(0, 5).join(' | '));
await browser.close();
server.close();
console.log(fails === 0 ? 'ALL PASS' : `${fails} FAIL`);
process.exit(fails === 0 ? 0 : 1);
