// G16 — regresiones de la ronda «referentes + fuentes»:
//   P1-A/P1-D  zona destacada → fotos (misma selección, sonda en la zona,
//              referencia territorial neutral, acción por ítem)
//   P1-B       hitos vitales → campañas reales (chips, dedup, sin futuros,
//              etiqueta con campaña real + edad aproximada)
//   P1-C       swipe con dos imágenes elegibles (selectores 1/2, chips
//              honestos, URL ortho/ortho2, atrás/adelante)
// Datos locales reales (Getxo 044); servicios raster externos stub.
// Cada bloque es independiente: una excepción se registra como fallo del
// bloque y no impide ejecutar el resto.
import { mkdir } from 'node:fs/promises';
import { createStaticServer } from './static-server.mjs';
import { installExternalStubs, installLocalFixtures, STUB_PNG } from './fixtures.mjs';
import { chromium } from 'playwright';

const server = await createStaticServer('build', 4296);
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
const ctxOpts = { viewport: { width: 1280, height: 800 } };
async function newResultPage(extra = {}, url = '/?year=1952&place=getxo') {
  const ctx = await browser.newContext({ ...ctxOpts, ...extra });
  const p = await ctx.newPage();
  p.on('pageerror', (e) => pageErrors.push(e.message.slice(0, 200)));
  await installLocalFixtures(p);
  await installExternalStubs(p);
  await p.goto(`http://localhost:4296${url}`);
  await p.waitForFunction(() => window.__mjtApp?.headline != null, null, { timeout: 30000 });
  return { ctx, p };
}
const setMode = async (p, m) => {
  await p.click(`.viewswitch [data-mode="${m}"]`);
  await p.waitForFunction((mm) => window.__mjtApp?.mode === mm, m);
};
await mkdir('../evidence/g16', { recursive: true });

// ── 1. Hotspots: referencia territorial + acción a fotos por zona ─────────
await block('hotspots', async () => {
  const { ctx, p } = await newResultPage();
  // Hotspots vive en BelowFold (lazy): hay que acercarlo al viewport.
  await p.evaluate(() => document.querySelector('.lazyview')?.scrollIntoView());
  await p.waitForSelector('.hot .btn.ghost', { timeout: 30000 });
  await p.click('.hot .btn.ghost');
  await p.waitForSelector('.hot .spot', { timeout: 30000 });
  const refs = await p.$$eval('.hot .spot .ref', (els) => els.map((e) => e.textContent.trim()));
  ok('hotspot_zone_ref', refs.length > 0 && refs.every((r) => /Zona \d+/.test(r)), refs[0]);
  ok(
    'hotspot_ref_territorial',
    refs.every((r) => /km|centro/.test(r)),
    refs.join(' | ')
  );
  ok('hotspot_photo_action', (await p.locator('[data-action="spot-photo"]').count()) > 0);
  // La acción foto lleva a la vista FOTO, mantiene la celda seleccionada
  // y fija el punto de sonda EN la zona (no en el centroide municipal).
  await p.click('[data-action="spot-photo"]');
  await p.waitForFunction(() => window.__mjtApp?.mode === 'photo');
  const st = await p.evaluate(() => ({
    mode: window.__mjtApp.mode,
    point: window.__mjtApp.orthoPoint,
    cell: window.__mjtApp.selectedCell?.fid ?? null,
    campaign: window.__mjtApp.orthoCampaign?.year ?? null,
    centroid: [window.__mjtApp.place.lon, window.__mjtApp.place.lat]
  }));
  ok('spot_photo_enters_photo', st.mode === 'photo');
  ok('spot_photo_keeps_cell', st.cell !== null, `fid=${st.cell}`);
  ok(
    'spot_photo_probes_zone',
    st.point !== null &&
      (Math.abs(st.point[0] - st.centroid[0]) > 1e-6 ||
        Math.abs(st.point[1] - st.centroid[1]) > 1e-6),
    `point=${JSON.stringify(st.point)} vs centroid=${JSON.stringify(st.centroid)}`
  );
  ok('spot_photo_campaign', st.campaign !== null, `c=${st.campaign}`);
  await ctx.close();
});

// ── 2. Ficha de celda → «Ver esta zona en fotos» ───────────────────────────
await block('cell_photos', async () => {
  const { ctx, p } = await newResultPage();
  // Selección de celda directa por estado (la ficha es la misma que
  // produce el clic en mapa; lo que se prueba es la acción).
  await p.evaluate(() => {
    const app = window.__mjtApp;
    app.selectedCell = {
      mun: 44,
      fid: 999,
      known: 40,
      dataState: 'READY',
      share: 0.5,
      after: 20,
      until: null,
      footprint: null,
      center: [-3.01, 43.34]
    };
    app.cellInspectNone = false;
  });
  await p.waitForSelector('#cell-detail [data-action="cell-photos"]');
  await p.click('#cell-detail [data-action="cell-photos"]');
  await p.waitForFunction(() => window.__mjtApp?.mode === 'photo');
  const st = await p.evaluate(() => ({
    fid: window.__mjtApp.selectedCell?.fid ?? null,
    point: window.__mjtApp.orthoPoint
  }));
  ok('cell_photos_enters_photo', true);
  ok('cell_photos_keeps_selection', st.fid === 999, `fid=${st.fid}`);
  ok(
    'cell_photos_probe_at_cell',
    st.point !== null && Math.abs(st.point[0] + 3.01) < 1e-9,
    JSON.stringify(st.point)
  );
  await ctx.close();
});

// ── 3. Eje de campañas (G18-R): marcas reales a todo lo ancho, sin
//    cards de hitos vitales ni capa biográfica ────────────────────────
await block('rail_marks', async () => {
  const { ctx, p } = await newResultPage();
  await setMode(p, 'photo');
  await p.waitForSelector('.photo .epoch', { timeout: 15000 });
  // una marca por campaña del catálogo, posicionada por su año real
  const total = await p.evaluate(() => window.__mjtApp.allCampaigns.length);
  const n = await p.locator('.photo .epoch').count();
  ok('rail_all_campaigns', n === total && n > 0, `${n}/${total}`);
  // las cuatro cards biográficas ya no existen: el rail es el único
  // selector temporal del panel
  ok('rail_no_ms_cards', (await p.locator('.photo .ms-row').count()) === 0);
  // etiquetas visibles: año completo de 4 dígitos (regresión «45»)
  const yrs = await p.$$eval('.photo .epoch .yr', (els) =>
    els.map((e) => e.textContent.trim()).filter(Boolean)
  );
  ok('rail_year_4digit', yrs.length > 0 && yrs.every((y) => /^\d{4}$/.test(y)), yrs.join(','));
  // el eje usa todo el ancho disponible (regresión: antes un rail con
  // scroll solo mostraba una franja de las campañas)
  const span = await p.evaluate(() => {
    const es = [...document.querySelectorAll('.photo .epoch')];
    return [parseFloat(es[0].style.left), parseFloat(es[es.length - 1].style.left)];
  });
  ok('rail_full_span', span[0] <= 1 && span[1] >= 99, span.join('→'));
  // la etiqueta de la primera campaña no se recorta en el borde (era el
  // «45» visible en la captura)
  const clip = await p.evaluate(() => {
    const rail = document.querySelector('.photo .tc-rail')?.getBoundingClientRect();
    const lbl = document.querySelector('.photo .epoch.first .yr')?.getBoundingClientRect();
    return rail && lbl ? { railL: rail.left, lblL: lbl.left } : null;
  });
  ok(
    'rail_first_label_unclipped',
    clip !== null && clip.lblL >= clip.railL - 1,
    JSON.stringify(clip)
  );
  // tocar una marca activa su campaña (snap exclusivo a campañas reales)
  const years = await p.evaluate(() => ({
    list: window.__mjtApp.allCampaigns.map((c) => c.year),
    cur: window.__mjtApp.orthoCampaign?.year ?? window.__mjtApp.nearest?.year ?? null
  }));
  const pick = years.list.find((y) => y !== years.cur) ?? null;
  ok('rail_pick_differs', pick !== null, `pick=${pick} cur=${years.cur}`);
  // clic en la posición real (%) de la marca — la caja de first/last no
  // está centrada en el tick; locator.click desplaza el panel si queda
  // bajo el mapa en apilado
  const frac = await p.evaluate((y) => {
    const ep = document.querySelector(`.photo .epoch[data-year="${y}"]`);
    return parseFloat(ep.style.left) / 100;
  }, pick);
  const w = (await p.locator('.photo .tc-rail').boundingBox()).width;
  await p.locator('.photo .tc-scrub').click({ position: { x: Math.min(frac * w, w - 2), y: 20 } });
  await p.waitForFunction((yy) => window.__mjtApp?.orthoCampaign?.year === yy, pick);
  const shown = await p.locator('.photo .tc-year').first().textContent();
  ok('rail_click_activates', shown.trim() === String(pick), `${pick} vs "${shown.trim()}"`);
  // G19: la campaña activa no repite etiqueta en el rail (el año grande
  // es la fuente de verdad) y ninguna etiqueta visible colisiona
  const lbls = await p.evaluate(() => {
    const es = [...document.querySelectorAll('.photo .epoch')];
    const vis = es
      .filter((e) => e.classList.contains('show'))
      .map((e) => ({
        y: e.dataset.year,
        cur: e.classList.contains('cur'),
        r: e.querySelector('.yr').getBoundingClientRect()
      }));
    const curHas = es.find((e) => e.classList.contains('cur'))?.classList.contains('show');
    let collide = false;
    for (let i = 0; i < vis.length; i++)
      for (let j = i + 1; j < vis.length; j++)
        if (Math.abs(vis[i].r.left - vis[j].r.left) < (vis[i].r.width + vis[j].r.width) / 2 - 2)
          collide = true;
    return { curLabeled: !!curHas, collide, n: vis.length };
  });
  ok(
    'rail_no_label_collision',
    lbls.curLabeled === false && !lbls.collide && lbls.n >= 2,
    JSON.stringify(lbls)
  );
  // nav siguiente = siguiente exacta del catálogo (si pick fuera la
  // última, comprobamos prev en su lugar)
  const nav = await p.evaluate(() => {
    const cs = window.__mjtApp.allCampaigns.map((c) => c.year);
    const i = cs.indexOf(window.__mjtApp.orthoCampaign?.year);
    return i < cs.length - 1 ? { dir: 'next', y: cs[i + 1] } : { dir: 'prev', y: cs[i - 1] };
  });
  await p.click(`.photo [data-action="${nav.dir}"]`);
  await p.waitForFunction((yy) => window.__mjtApp?.orthoCampaign?.year === yy, nav.y);
  ok('rail_nav_exact', true, `${nav.dir}=${nav.y}`);
  await ctx.close();
});

// ── 3b. Eje con año reciente: misma estructura, campaña destacada = la
//    más cercana al año elegido; etiquetas siempre de 4 dígitos ──────
await block('rail_edge', async () => {
  const { ctx, p } = await newResultPage({}, '/?year=2010&place=getxo');
  await setMode(p, 'photo');
  await p.waitForSelector('.photo .epoch', { timeout: 15000 });
  const cur = await p.evaluate(() => ({
    shown: document.querySelector('.photo .epoch.cur')?.dataset.year ?? null,
    nearest: window.__mjtApp.nearest?.year ?? null
  }));
  ok(
    'rail_cur_is_nearest',
    cur.shown !== null && String(cur.nearest) === cur.shown,
    JSON.stringify(cur)
  );
  const yrs = await p.$$eval('.photo .epoch .yr', (els) =>
    els.map((e) => e.textContent.trim()).filter(Boolean)
  );
  ok(
    'rail_edge_4digit',
    yrs.every((y) => /^\d{4}$/.test(y)),
    yrs.join(',')
  );
  await ctx.close();
});

// ── 4. Swipe: dos imágenes elegibles + URL + chips honestos ────────────────
await block('swipe_pick', async () => {
  const { ctx, p } = await newResultPage();
  await setMode(p, 'swipe');
  await p.waitForSelector('.swipectl select[data-action="swipe-first"]', { timeout: 15000 });
  const s1 = p.locator('select[data-action="swipe-first"]');
  const s2 = p.locator('select[data-action="swipe-second"]');
  const v1 = await s1.inputValue();
  const v2 = await s2.inputValue();
  ok('swipe_defaults_distinct', v1 !== v2, `${v1}/${v2}`);
  // la opción activa de un lado está deshabilitada en el otro
  const disabled = async (sel, val) =>
    sel.locator(`option[value="${val}"]`).evaluate((o) => o.disabled);
  ok('swipe_mutual_exclusion', (await disabled(s1, v2)) && (await disabled(s2, v1)));
  // elegir imagen 1 = 1956 → URL gana ortho2=1956 y el chip lo muestra
  await s1.selectOption('1956');
  await p.waitForFunction(() => window.__mjtApp?.swipeBefore?.year === 1956);
  await p.waitForFunction(() => location.search.includes('ortho2=1956'), null, {
    timeout: 8000
  });
  // elegir imagen 2 = 2002 → ortho=2002 en URL; el chip derecho dice el
  // año, no «Actualidad»
  await s2.selectOption('2002');
  await p.waitForFunction(() => window.__mjtApp?.orthoCampaign?.year === 2002);
  await p.waitForFunction(() => /ortho=2002/.test(location.search), null, { timeout: 8000 });
  const chipRight = await p.locator('.swipe .chip.right').textContent();
  ok('swipe_chip_honest', chipRight.includes('2002') && !/Actualidad/.test(chipRight), chipRight);
  const aria = await p.locator('.swipe [role="slider"]').getAttribute('aria-label');
  ok('swipe_slider_both_years', aria.includes('1956') && aria.includes('2002'), aria);
  await ctx.close();
});

// ── 5. Deep link swipe con ortho/ortho2 explícitos ─────────────────────────
await block('swipe_deeplink', async () => {
  const { ctx, p } = await newResultPage(
    {},
    '/?year=1952&place=getxo&view=swipe&ortho=2002&ortho2=1956'
  );
  await p.waitForSelector('.swipectl select', { timeout: 15000 });
  const st = await p.evaluate(() => ({
    after: window.__mjtApp.orthoCampaign?.year ?? null,
    before: window.__mjtApp.swipeBefore?.year ?? null,
    mode: window.__mjtApp.mode
  }));
  ok('swipe_dl_mode', st.mode === 'swipe');
  ok('swipe_dl_images', st.before === 1956 && st.after === 2002, JSON.stringify(st));
  await ctx.close();
});

// ── 5c. G16c — campaña fallida en el comparador. El mapa de respaldo
// nunca se etiqueta como ortofoto, ningún control promete una imagen
// inexistente, los avisos viven fuera del lienzo (en flujo) y cada fallo
// tiene reintento explícito. Se comprueba contenido y etiquetas, no solo
// geometría. Fallo dirigido por lado: «después» = geoEuskadi (WMS,
// capa ORTO_2025), «antes» = BFA (tesela ArcGIS ORTO_BFA_aaaa). ──────────
await block('swipe_fail', async () => {
  const ctx = await browser.newContext(ctxOpts);
  const p = await ctx.newPage();
  p.on('pageerror', (e) => pageErrors.push(e.message.slice(0, 200)));
  await installLocalFixtures(p);
  await installExternalStubs(p);
  const failWms = new Set(); // capas WMS que responden 404
  const failBfa = new Set(); // años BFA que responden 404
  const slowBfa = new Set(); // años BFA lentos pero disponibles (respuesta tardía)
  await p.route(/WMS_ORTOARGAZKIAK/, (route) => {
    const layer =
      route
        .request()
        .url()
        .match(/layers=([^&]+)/)?.[1] ?? '';
    if (failWms.has(layer)) return route.fulfill({ status: 404, body: '' });
    return route.fallback();
  });
  await p.route(/ORTO_BFA_(\d+)\//, (route) => {
    const u = route.request().url();
    const year = u.match(/ORTO_BFA_(\d+)/)[1];
    if (slowBfa.has(year) && /\/tile\/15\//.test(u))
      return setTimeout(
        () => route.fulfill({ status: 200, contentType: 'image/png', body: STUB_PNG }),
        1500
      );
    if (failBfa.has(year)) return route.fulfill({ status: 404, body: '' });
    return route.fallback();
  });
  failWms.add('ORTO_2025');
  failBfa.add('1956');
  await p.goto('http://localhost:4296/?year=1952&place=getxo&view=swipe&ortho=2025&ortho2=1956');
  await p.waitForSelector('.swipectl select[data-action="swipe-first"]', { timeout: 15000 });
  const snap = () =>
    p.evaluate(() => ({
      beforeSt: window.__mjtApp.swipeBeforeState,
      orthoSt: window.__mjtApp.orthoState,
      left: document.querySelector('.swipe .chip.left')?.textContent ?? null,
      right: document.querySelector('.swipe .chip.right')?.textContent ?? null,
      rightMiss: !!document.querySelector('.swipe .chip.right.miss'),
      handle: !!document.querySelector('.swipe .handle'),
      presets: [...document.querySelectorAll('.presets button')].map((b) => b.textContent.trim()),
      overlayStatus: !!document.querySelector('.swipe [role="status"]'),
      warns: [...document.querySelectorAll('.swipectl .sw-status.warn')].map((e) =>
        e.textContent.replace(/\s+/g, ' ').trim()
      ),
      retryA: !!document.querySelector('[data-action="swipe-retry-after"]'),
      retryB: !!document.querySelector('[data-action="swipe-retry-before"]'),
      aria: document.querySelector('.swipe [role="slider"]')?.getAttribute('aria-label') ?? null,
      src: document.querySelector('.swipe .src')?.textContent ?? null
    }));

  // 1) AMBOS lados fallan: ninguna etiqueta anuncia fotografía; ambos
  // avisos están en el panel en flujo con su reintento; nada tapa el lienzo.
  await p.waitForFunction(
    () =>
      window.__mjtApp?.swipeBeforeState === 'error' &&
      window.__mjtApp?.orthoState === 'NOT_COVERED',
    null,
    { timeout: 20000 }
  );
  await p.waitForFunction(() => document.querySelectorAll('.sw-status.warn').length === 2, null, {
    timeout: 15000
  });
  let s = await snap();
  ok(
    'swfail_both_no_photo_labels',
    s.left === null && !s.handle && s.presets.length === 0,
    JSON.stringify({ left: s.left, handle: s.handle, presets: s.presets })
  );
  ok(
    'swfail_both_right_honest',
    s.rightMiss && /sin imagen/.test(s.right) && !/Actualidad/.test(s.right),
    s.right
  );
  ok(
    'swfail_both_warns_in_flow',
    s.warns.length === 2 && s.retryA && s.retryB,
    JSON.stringify(s.warns)
  );
  ok('swfail_notice_outside_canvas', !s.overlayStatus);

  // 2) Recuperación del lado «antes» con el «después» aún caído: la
  // imagen válida vuelve con su etiqueta y la derecha sigue honesta
  // (preset adaptado, slider y atribución declaran el mapa de respaldo).
  failBfa.delete('1956');
  await p.click('[data-action="swipe-retry-before"]');
  await p.waitForFunction(() => window.__mjtApp?.swipeBeforeState === 'ready', null, {
    timeout: 15000
  });
  s = await snap();
  ok('swfail_before_recovered', s.left === '1956' && s.handle, JSON.stringify(s.left));
  ok('swfail_after_preset_map', s.presets[1] === 'Solo el mapa', JSON.stringify(s.presets));
  ok(
    'swfail_after_slider_honest',
    s.aria !== null && /mapa de edificios/.test(s.aria) && !/2025 a la derecha/.test(s.aria),
    s.aria
  );
  ok(
    'swfail_after_src_honest',
    s.src !== null && /mapa de edificios/.test(s.src) && !/Campaña 2025/.test(s.src),
    s.src
  );

  // 3) Recuperación del lado «después»: vuelve la etiqueta de fotografía
  // verificada y los controles prometen de nuevo la imagen real.
  failWms.delete('ORTO_2025');
  await p.click('[data-action="swipe-retry-after"]');
  await p.waitForFunction(() => window.__mjtApp?.orthoState === 'AVAILABLE', null, {
    timeout: 15000
  });
  s = await snap();
  ok(
    'swfail_after_recovered',
    !s.rightMiss && /Actualidad · 2025/.test(s.right) && s.presets[1] === 'Solo 2025',
    JSON.stringify({ right: s.right, presets: s.presets })
  );
  ok('swfail_after_aria_restored', s.aria !== null && /2025 a la derecha/.test(s.aria), s.aria);

  // 4) Fallo SOLO del lado «antes»: la imagen válida conserva su
  // etiqueta, el divisor desaparece (no hay nada que comparar) y el
  // aviso con reintento queda en flujo.
  failBfa.add('1983');
  await p.selectOption('select[data-action="swipe-first"]', '1983');
  await p.waitForFunction(() => window.__mjtApp?.swipeBeforeState === 'error', null, {
    timeout: 15000
  });
  await p.waitForSelector('.sw-status.warn', { timeout: 10000 });
  s = await snap();
  ok(
    'swfail_before_only',
    s.left === null &&
      !s.handle &&
      /Actualidad · 2025/.test(s.right) &&
      s.warns.some((w) => /1983/.test(w)),
    JSON.stringify({ left: s.left, right: s.right, warns: s.warns })
  );
  failBfa.delete('1983');
  await p.click('[data-action="swipe-retry-before"]');
  await p.waitForFunction(() => window.__mjtApp?.swipeBeforeState === 'ready', null, {
    timeout: 15000
  });
  s = await snap();
  ok('swfail_before_retry_ok', s.left === '1983' && s.handle, JSON.stringify(s.left));

  // 5) Respuesta tardía: sonda lenta de 1956 en vuelo → se elige 1983,
  //    que falla rápido. El éxito tardío de 1956 NO debe resucitar la
  //    cortina ni cambiar la etiqueta.
  slowBfa.add('1956');
  failBfa.add('1983');
  await p.selectOption('select[data-action="swipe-first"]', '1956');
  await p.waitForTimeout(250); // la sonda de 1956 sigue en vuelo (1500 ms)
  await p.selectOption('select[data-action="swipe-first"]', '1983');
  await p.waitForFunction(() => window.__mjtApp?.swipeBeforeState === 'error', null, {
    timeout: 15000
  });
  await p.waitForTimeout(1600); // ya llegó la respuesta tardía de 1956
  s = await snap();
  ok(
    'swfail_late_probe_ignored',
    s.beforeSt === 'error' && s.left === null && /Actualidad · 2025/.test(s.right),
    JSON.stringify({ st: s.beforeSt, left: s.left })
  );
  await ctx.close();
});

// ── 5b. Móvil (390 px): selectores accesibles desde el menú de vista ───────
await block('mobile_swipe', async () => {
  // z=14 → nivel CELDA: así «Ver datos de esta zona» existiría en modo
  // mapa y la aserción de que no se interpone en el comparador no es
  // trivial.
  const { ctx, p } = await newResultPage(
    { viewport: { width: 390, height: 844 } },
    '/?year=1952&place=getxo&lat=43.34311&lon=-3.00762&z=14'
  );
  await p.click('.vsel');
  await p.waitForSelector('.vmenu [data-mode="swipe"]');
  await p.click('.vmenu [data-mode="swipe"]');
  await p.waitForFunction(() => window.__mjtApp?.mode === 'swipe');
  await p.waitForSelector('.swipectl select[data-action="swipe-first"]', { timeout: 15000 });
  const s1 = await p.locator('select[data-action="swipe-first"]').inputValue();
  const s2 = await p.locator('select[data-action="swipe-second"]').inputValue();
  ok('mobile_swipe_controls', s1 !== s2, `${s1}/${s2}`);
  // G16c: la cortina cubre EXACTAMENTE el lienzo (no la leyenda en flujo);
  // la leyenda empieza donde acaba el canvas. Antes del fix la cortina
  // medía la celda completa (canvas+leyenda) y el botón «Ver datos de
  // esta zona» quedaba sobre los chips.
  await p.waitForSelector('.swipe', { timeout: 15000 });
  await p.waitForTimeout(1200);
  const g = await p.evaluate(() => {
    const R = (s) => {
      const el = document.querySelector(s);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return [r.top | 0, r.bottom | 0];
    };
    return { sw: R('.swipe'), mw: R('.mapwrap'), lg: R('.legend'), ci: R('.cell-inspect') };
  });
  ok(
    'swipe_box_eq_canvas',
    g.sw && g.mw && Math.abs(g.sw[0] - g.mw[0]) <= 3 && Math.abs(g.sw[1] - g.mw[1]) <= 3,
    JSON.stringify(g)
  );
  ok('legend_below_canvas', !g.lg || !g.mw || g.lg[0] >= g.mw[1] - 2, JSON.stringify(g));
  ok('cellinspect_hidden_in_swipe', g.ci === null, JSON.stringify(g.ci));
  // en pantalla estrecha el control de campañas sigue siendo táctil
  await p.click('.vsel');
  await p.waitForSelector('.vmenu [data-mode="photo"]');
  await p.click('.vmenu [data-mode="photo"]');
  await p.waitForFunction(() => window.__mjtApp?.mode === 'photo');
  await p.waitForSelector('.photo [data-action="next"]', { timeout: 15000 });
  const h = await p
    .locator('.photo [data-action="next"]')
    .evaluate((e) => e.getBoundingClientRect().height);
  ok('mobile_nav_touch', h >= 40, `h=${h}`);
  await ctx.close();
});

// ── 5c. EU: claves nuevas traducidas, sin caída a ES ───────────────────────
await block('eu_copy', async () => {
  const { ctx, p } = await newResultPage();
  await p.click('.langs button:last-child'); // EU
  await p.evaluate(() => document.querySelector('.lazyview')?.scrollIntoView());
  await p.waitForSelector('.hot .btn.ghost', { timeout: 30000 });
  await p.click('.hot .btn.ghost');
  await p.waitForSelector('.hot .spot', { timeout: 30000 });
  const ref = await p.locator('.hot .spot .ref').first().textContent();
  ok('eu_zone_ref', /gunea/.test(ref), ref);
  await p.click('[data-action="spot-photo"]');
  await p.waitForFunction(() => window.__mjtApp?.mode === 'photo');
  await p.waitForSelector('.photo .tc-info summary', { timeout: 15000 });
  await p.click('.photo .tc-info summary');
  const info = await p.locator('.photo .tc-info').innerText();
  ok('eu_details_label', /kanpaina/i.test(info), info.trim().slice(0, 80));
  await p.evaluate(() => document.querySelector('.vsel,.viewswitch')?.scrollIntoView());
  await ctx.close();
});

// ── 6. Atrás tras elegir imágenes: el par se restaura ──────────────────────
await block('swipe_history', async () => {
  const { ctx, p } = await newResultPage();
  await setMode(p, 'swipe');
  await p.waitForSelector('select[data-action="swipe-first"]', { timeout: 15000 });
  await p.selectOption('select[data-action="swipe-first"]', '1983');
  await p.waitForFunction(() => location.search.includes('ortho2=1983'), null, {
    timeout: 8000
  });
  await p.goBack();
  // atrás vuelve al modo anterior (map) — la selección no deja residuos
  // incoherentes al re-entrar
  await p.waitForFunction(() => window.__mjtApp?.mode === 'map');
  await setMode(p, 'swipe');
  await p.waitForSelector('select[data-action="swipe-first"]', { timeout: 15000 });
  const st = await p.evaluate(() => ({
    before: window.__mjtApp.swipeBefore?.year ?? null,
    after: window.__mjtApp.orthoCampaign?.year ?? null
  }));
  ok('swipe_reentry_consistent', st.before !== st.after, JSON.stringify(st));
  await ctx.close();
});

// ── 7. G16b — punto de sonda: coordenadas de la petición REAL ─────────────
// Stub diferenciado por PUNTO: la tesela z15 que contiene el centroide
// municipal responde imagen con contenido (AVAILABLE); todas las demás
// responden 404 (NOT_COVERED). Así el estado de cobertura delata qué
// coordenadas se pidieron de verdad — no basta mirar `orthoPoint`.
await block('probe_point', async () => {
  const ctx = await browser.newContext(ctxOpts);
  const p = await ctx.newPage();
  p.on('pageerror', (e) => pageErrors.push(e.message.slice(0, 200)));
  await installLocalFixtures(p);
  await installExternalStubs(p);
  const z15key = (lon, lat) => {
    const n = 2 ** 15;
    const x = Math.floor(((lon + 180) / 360) * n);
    const y = Math.floor(
      ((1 -
        Math.log(Math.tan((lat * Math.PI) / 180) + 1 / Math.cos((lat * Math.PI) / 180)) / Math.PI) /
        2) *
        n
    );
    return `${y}/${x}`;
  };
  let centroidKey = null; // se fija tras cargar (datos reales del lugar)
  const probeKeys = [];
  // registrada DESPUÉS del stub genérico → gana para teselas z15 BFA
  await p.route(/ORTO_BFA_\d+\/MapServer\/tile\/15\/\d+\/\d+/, (route) => {
    const key = route
      .request()
      .url()
      .match(/\/tile\/15\/(\d+\/\d+)/)[1];
    probeKeys.push(key);
    return route.fulfill({
      status: key === centroidKey ? 200 : 404,
      contentType: 'image/png',
      body: STUB_PNG
    });
  });
  await p.goto('http://localhost:4296/?year=1952&place=getxo');
  await p.waitForFunction(() => window.__mjtApp?.headline != null, null, { timeout: 30000 });
  centroidKey = await p.evaluate(() => {
    const pl = window.__mjtApp.place;
    const n = 2 ** 15;
    const x = Math.floor(((pl.lon + 180) / 360) * n);
    const y = Math.floor(
      ((1 -
        Math.log(Math.tan((pl.lat * Math.PI) / 180) + 1 / Math.cos((pl.lat * Math.PI) / 180)) /
          Math.PI) /
        2) *
        n
    );
    return `${y}/${x}`;
  });
  // zona destacada → fotos: la sonda debe pedir la tesela de la ZONA
  // (NOT_COVERED), no la del centroide (que daría AVAILABLE).
  await p.evaluate(() => document.querySelector('.lazyview')?.scrollIntoView());
  await p.waitForSelector('.hot .btn.ghost', { timeout: 30000 });
  await p.click('.hot .btn.ghost');
  await p.waitForSelector('[data-action="spot-photo"]', { timeout: 30000 });
  await p.click('[data-action="spot-photo"]');
  await p.waitForFunction(() => window.__mjtApp?.orthoState === 'NOT_COVERED', null, {
    timeout: 15000
  });
  // La cámara vuela a la zona (flyTo animado): la URL solo lleva sus
  // coordenadas tras el moveend final — hay que esperar al encuadre.
  await p.waitForFunction(
    () => {
      const a = window.__mjtApp;
      const pt = a?.orthoPoint;
      return (
        pt &&
        Math.abs(a.view.lon - pt[0]) < 1e-3 &&
        Math.abs(a.view.lat - pt[1]) < 1e-3 &&
        a.view.zoom > 12.5
      );
    },
    null,
    { timeout: 15000 }
  );
  const zonePt = await p.evaluate(() => window.__mjtApp.orthoPoint);
  const zoneKey = z15key(zonePt[0], zonePt[1]);
  ok('probe_zone_ne_centroid', zoneKey !== centroidKey, `zone=${zoneKey} centroid=${centroidKey}`);
  ok(
    'probe_req_at_zone',
    probeKeys.length > 0 && probeKeys.every((k) => k === zoneKey),
    `reqs=${probeKeys.join(',')} zone=${zoneKey}`
  );
  // La URL serializada lleva la cámara de la zona — el contrato que
  // permite que la recarga sondee el mismo punto sin parámetro extra.
  const url = p.url();
  ok(
    'probe_url_has_zone',
    Math.abs(Number(new URL(url).searchParams.get('lon')) - zonePt[0]) < 1e-3,
    url
  );
  const before = probeKeys.length;
  await p.goto(url);
  await p.waitForFunction(() => window.__mjtApp?.headline != null, null, { timeout: 30000 });
  await p.waitForFunction(() => window.__mjtApp?.orthoState === 'NOT_COVERED', null, {
    timeout: 15000
  });
  const pt2 = await p.evaluate(() => window.__mjtApp.orthoPoint);
  const newReqs = probeKeys.slice(before);
  ok(
    'probe_reload_restores_point',
    pt2 !== null && Math.abs(pt2[0] - zonePt[0]) < 1e-6 && Math.abs(pt2[1] - zonePt[1]) < 1e-6,
    `pt=${JSON.stringify(pt2)} vs zone=${JSON.stringify(zonePt)}`
  );
  ok(
    'probe_reload_req_at_zone',
    newReqs.length > 0 && newReqs.every((k) => k === zoneKey),
    `reqs=${newReqs.join(',')}`
  );
  ok('probe_reload_same_result', true); // NOT_COVERED verificado arriba
  // Paneo >0,5 km: la afirmación de cobertura sigue al lugar mostrado —
  // moveend re-sondea en el nuevo centro (aquí, el centroide → AVAILABLE).
  const before2 = probeKeys.length;
  await p.evaluate(() => {
    const pl = window.__mjtApp.place;
    window.__mjtApp.cameraTarget = { lat: pl.lat, lon: pl.lon, zoom: 13.2 };
    window.__mjtApp.cameraSeq++;
  });
  await p.waitForFunction(() => window.__mjtApp?.orthoState === 'AVAILABLE', null, {
    timeout: 15000
  });
  ok(
    'probe_reprobe_on_pan',
    probeKeys.slice(before2).includes(centroidKey),
    `reqs=${probeKeys.slice(before2).join(',')} centroid=${centroidKey}`
  );
  await ctx.close();
});

// ── 8. G16b — foco por identidad de acción (data-action+year), ambos
//    sentidos ───────────────────────────────────────────────────────
await block('focus_nav', async () => {
  const { ctx, p } = await newResultPage(); // 1280 px (apilado=false)
  await setMode(p, 'photo');
  await p.waitForSelector('.photo [data-action="next"]', { timeout: 15000 });
  const navYear = await p.locator('.photo [data-action="next"]').getAttribute('data-year');
  await p.focus('.photo [data-action="next"]');
  // 1200→768 cruza el breakpoint 1023: el panel se remonta y el foco debe
  // volver a la MISMA acción (mismo data-action y data-year), no al
  // primer control de la familia.
  await p.setViewportSize({ width: 760, height: 800 });
  await p.waitForFunction(
    (y) =>
      document.activeElement?.dataset?.action === 'next' &&
      document.activeElement?.dataset?.year === y,
    navYear,
    { timeout: 10000 }
  );
  ok('focus_nav_narrow', true);
  // sentido contrario: 768→1200
  await p.setViewportSize({ width: 1280, height: 800 });
  await p.waitForFunction(
    (y) =>
      document.activeElement?.dataset?.action === 'next' &&
      document.activeElement?.dataset?.year === y,
    navYear,
    { timeout: 10000 }
  );
  ok('focus_nav_wide', true);
  await ctx.close();
});

await block('focus_swipe_sel', async () => {
  const { ctx, p } = await newResultPage();
  await setMode(p, 'swipe');
  await p.waitForSelector('select[data-action="swipe-second"]', { timeout: 15000 });
  await p.focus('select[data-action="swipe-second"]');
  await p.setViewportSize({ width: 760, height: 800 });
  await p.waitForFunction(() => document.activeElement?.dataset?.action === 'swipe-second', null, {
    timeout: 10000
  });
  ok('focus_swipe_second_narrow', true);
  await p.setViewportSize({ width: 1280, height: 800 });
  await p.waitForFunction(() => document.activeElement?.dataset?.action === 'swipe-second', null, {
    timeout: 10000
  });
  ok('focus_swipe_second_wide', true);
  await ctx.close();
});

await block('focus_nav_eu', async () => {
  const { ctx, p } = await newResultPage();
  await p.click('.langs button:last-child'); // EU
  await setMode(p, 'photo');
  await p.waitForSelector('.photo [data-action="next"]', { timeout: 15000 });
  await p.focus('.photo [data-action="next"]');
  await p.setViewportSize({ width: 760, height: 800 });
  // identidad por data-action: no depende del texto traducido
  await p.waitForFunction(() => document.activeElement?.dataset?.action === 'next', null, {
    timeout: 10000
  });
  ok('focus_nav_eu', true);
  await ctx.close();
});

// La acción desaparece → alternativa coherente (primer control del panel).
await block('focus_nav_fallback', async () => {
  const { ctx, p } = await newResultPage();
  await setMode(p, 'photo');
  await p.waitForSelector('.photo [data-action="next"]', { timeout: 15000 });
  await p.focus('.photo [data-action="next"]');
  // Al remontar, el control renace con data-action="next"; renombrarlo
  // por MutationObserver simula un control que ya no existe → el
  // restaurador debe caer al primer [data-action] del panel, no a body
  // ni a otro panel.
  await p.evaluate(() => {
    const mo = new MutationObserver(() => {
      for (const e of document.querySelectorAll('[data-action="next"]')) e.dataset.action = 'gone';
    });
    mo.observe(document.body, { subtree: true, childList: true });
  });
  await p.setViewportSize({ width: 760, height: 800 });
  await p.waitForFunction(
    () => {
      const ae = document.activeElement;
      return (
        ae instanceof HTMLElement &&
        !!ae.dataset.action &&
        !!ae.closest('.timeband, .photo, .histmap, .swipectl')
      );
    },
    null,
    { timeout: 10000 }
  );
  // el estado final estable (tras los reintentos del restaurador) debe
  // ser un control del panel, no body ni un elemento fuera de escena
  await p.waitForTimeout(600);
  const ae = await p.evaluate(() => {
    const el = document.activeElement;
    return el instanceof HTMLElement && el.dataset.action ? el.dataset.action : null;
  });
  ok('focus_nav_fallback', ae !== null, `action=${ae}`);
  await ctx.close();
});

// No robar el foco: si la persona movió el foco tras el remontaje, el
// restaurador no lo pisa (guarda `activeElement !== body`).
await block('focus_no_steal', async () => {
  const { ctx, p } = await newResultPage();
  await setMode(p, 'photo');
  await p.waitForSelector('.photo [data-action="next"]', { timeout: 15000 });
  await p.focus('.photo [data-action="next"]');
  await p.setViewportSize({ width: 760, height: 800 });
  // mueve el foco a un control fuera del panel remontado (cabecera)
  await p.focus('.langs button:last-child');
  await p.waitForTimeout(800); // ventana mayor que los ~30 frames de retry
  const ae = await p.evaluate(() => ({
    action: document.activeElement?.dataset?.action ?? null,
    tag: document.activeElement?.tagName ?? null
  }));
  ok('focus_no_steal', ae.action !== 'next' && ae.tag === 'BUTTON', JSON.stringify(ae));
  await ctx.close();
});

// ── 9. G16c — estados entre sondas: avisos y alternativas no son del punto
// anterior; respuestas tardías no pisan el lugar vigente ──────────────────
// Stub por tesela z15: zona → 404 en la campaña activa (NOT_COVERED con
// alternativas que sí cubren), centroide → 200 (AVAILABLE, con retraso),
// punto C → 500 (SERVICE_ERROR). Cada petición se registra con su campaña.
await block('probe_states', async () => {
  const ctx = await browser.newContext(ctxOpts);
  const p = await ctx.newPage();
  p.on('pageerror', (e) => pageErrors.push(e.message.slice(0, 200)));
  await installLocalFixtures(p);
  await installExternalStubs(p);
  const z15key = (lon, lat) => {
    const n = 2 ** 15;
    const x = Math.floor(((lon + 180) / 360) * n);
    const y = Math.floor(
      ((1 -
        Math.log(Math.tan((lat * Math.PI) / 180) + 1 / Math.cos((lat * Math.PI) / 180)) / Math.PI) /
        2) *
        n
    );
    return `${y}/${x}`;
  };
  let centroidKey = null;
  let zoneKey = null;
  let cKey = null;
  let slowCentroid = false;
  const reqs = [];
  const probePts = []; // [lon,lat] decodificado de CADA sonda (BFA y WMS)
  const invMerc = (mx, my) => {
    const R = 6378137;
    return [
      (mx / R) * (180 / Math.PI),
      (2 * Math.atan(Math.exp(my / R)) - Math.PI / 2) * (180 / Math.PI)
    ];
  };
  await p.route(/ORTO_BFA_(\d+)\/MapServer\/tile\/15\/(\d+)\/(\d+)/, (route) => {
    const u = route.request().url();
    const year = u.match(/ORTO_BFA_(\d+)/)[1];
    const key = u.match(/\/tile\/15\/(\d+\/\d+)/)[1];
    reqs.push(`${year}@${key}`);
    // centro de la tesela z15 → punto sondeado aproximado
    const n = 2 ** 15;
    const [ty, tx] = key.split('/').map(Number);
    const lonT = ((tx + 0.5) / n) * 360 - 180;
    const latT = (Math.atan(Math.sinh(Math.PI * (1 - (2 * (ty + 0.5)) / n))) * 180) / Math.PI;
    probePts.push([lonT, latT]);
    const respond = () => {
      if (key === cKey) return route.fulfill({ status: 500, body: 'err' });
      if (key === centroidKey || (key === zoneKey && year !== '1956'))
        return route.fulfill({ status: 200, contentType: 'image/png', body: STUB_PNG });
      return route.fulfill({ status: 404, body: '' });
    };
    if (slowCentroid && key === centroidKey) return setTimeout(respond, 1400);
    return respond();
  });
  // geoEuskadi (WMS): la sonda «antes» de campañas no-BFA llega aquí;
  // el bbox está centrado en el punto sondeado (EPSG:3857, ±200 m)
  await p.route(/WMS_ORTOARGAZKIAK.*request=GetMap/, (route) => {
    const u = route.request().url();
    const bb = u
      .match(/bbox=([-\d.,]+)/)?.[1]
      .split(',')
      .map(Number);
    if (bb) probePts.push(invMerc((bb[0] + bb[2]) / 2, (bb[1] + bb[3]) / 2));
    return route.fulfill({ status: 200, contentType: 'image/jpeg', body: STUB_PNG });
  });
  await p.goto('http://localhost:4296/?year=1952&place=getxo');
  await p.waitForFunction(() => window.__mjtApp?.headline != null, null, { timeout: 30000 });
  const pts = await p.evaluate(() => ({
    centroid: [window.__mjtApp.place.lon, window.__mjtApp.place.lat]
  }));
  centroidKey = z15key(...pts.centroid);
  // C: ~2 km al este del centroide (tesela distinta, error de servicio)
  const cPt = [pts.centroid[0] + 0.025, pts.centroid[1]];
  cKey = z15key(...cPt);
  // A) zona destacada sin cobertura: aviso + alternativas propias
  await p.evaluate(() => document.querySelector('.lazyview')?.scrollIntoView());
  await p.waitForSelector('.hot .btn.ghost', { timeout: 30000 });
  await p.click('.hot .btn.ghost');
  await p.waitForSelector('[data-action="spot-photo"]', { timeout: 30000 });
  await p.click('[data-action="spot-photo"]');
  await p.waitForFunction(
    () =>
      window.__mjtApp?.orthoState === 'NOT_COVERED' &&
      window.__mjtApp?.orthoAlternatives.length > 0,
    null,
    { timeout: 15000 }
  );
  zoneKey = z15key(...(await p.evaluate(() => window.__mjtApp.orthoPoint)));
  const altCount = await p.locator('[data-action="alt"]').count();
  ok('probeA_alts_shown', altCount > 0, `alts=${altCount}`);
  // B) paneo al centroide con respuesta LENTA: mientras sondea, no queda
  // aviso de ausencia ni alternativas del punto A en la interfaz
  slowCentroid = true;
  await p.evaluate(() => {
    const pl = window.__mjtApp.place;
    window.__mjtApp.cameraTarget = { lat: pl.lat, lon: pl.lon, zoom: 13.2 };
    window.__mjtApp.cameraSeq++;
  });
  await p.waitForFunction(
    () =>
      window.__mjtApp?.orthoState === 'UNKNOWN' && window.__mjtApp?.orthoAlternatives.length === 0,
    null,
    { timeout: 10000 }
  );
  ok('probeB_clears_old_state', true);
  // C) paneo a un punto con error ANTES de que responda B: la respuesta
  // tardía de B no debe pisar el resultado de C
  await p.waitForTimeout(150); // B sigue en vuelo (1400 ms)
  await p.evaluate((pt) => {
    window.__mjtApp.cameraTarget = { lat: pt[1], lon: pt[0], zoom: 13.2 };
    window.__mjtApp.cameraSeq++;
  }, cPt);
  await p.waitForFunction(() => window.__mjtApp?.orthoState === 'SERVICE_ERROR', null, {
    timeout: 15000
  });
  await p.waitForTimeout(1600); // la respuesta tardía de B ya llegó
  const stC = await p.evaluate(() => ({
    st: window.__mjtApp.orthoState,
    pt: window.__mjtApp.orthoPoint
  }));
  ok(
    'probeC_late_B_ignored',
    stC.st === 'SERVICE_ERROR' && Math.abs(stC.pt[0] - cPt[0]) < 1e-3,
    JSON.stringify(stC)
  );
  // Recuperación: volver al centroide → AVAILABLE sin aviso de error
  slowCentroid = false;
  await p.evaluate(() => {
    const pl = window.__mjtApp.place;
    window.__mjtApp.cameraTarget = { lat: pl.lat, lon: pl.lon, zoom: 13.2 };
    window.__mjtApp.cameraSeq++;
  });
  await p.waitForFunction(() => window.__mjtApp?.orthoState === 'AVAILABLE', null, {
    timeout: 15000
  });
  const noAlt = await p.evaluate(
    () =>
      window.__mjtApp.orthoAlternatives.length === 0 &&
      !document.querySelector('[data-action="alt"]')
  );
  ok('probe_recovery_no_stale_notice', noAlt);
  // Recarga en el centroide: el punto restaurado es el mostrado
  await p.goto(p.url());
  await p.waitForFunction(() => window.__mjtApp?.headline != null, null, { timeout: 30000 });
  await p.waitForFunction(() => window.__mjtApp?.orthoState === 'AVAILABLE', null, {
    timeout: 15000
  });
  const ptR = await p.evaluate(() => window.__mjtApp.orthoPoint);
  ok(
    'probe_reload_at_centroid',
    ptR && Math.abs(ptR[0] - pts.centroid[0]) < 1e-3,
    JSON.stringify(ptR)
  );
  // Swipe: las DOS sondas (imagen 1 y 2, fuentes distintas) piden el MISMO
  // punto — se verifica decodificando la coordenada real de cada petición
  const ptsBefore = probePts.length;
  const reqsBefore = reqs.length;
  await p.click('.viewswitch [data-mode="swipe"]');
  await p.waitForFunction(() => window.__mjtApp?.mode === 'swipe');
  await p.waitForSelector('select[data-action="swipe-first"]', { timeout: 15000 });
  await p.waitForTimeout(2500); // margen para ambas sondas
  const swPts = probePts.slice(ptsBefore);
  const swReqs = reqs.slice(reqsBefore);
  // La sonda WMS codifica el punto EXACTO (bbox ±200 m); las teselas de la
  // capa raster decodifican a centros de rejilla, no al punto → el hit a
  // ~0 del centroide solo puede ser la sonda de la imagen 1 (geoEuskadi).
  const exactProbe = swPts.some(
    (pt) =>
      pt && Math.abs(pt[0] - pts.centroid[0]) < 0.0005 && Math.abs(pt[1] - pts.centroid[1]) < 0.0005
  );
  ok(
    'swipe_both_probe_same_point',
    exactProbe && swReqs.some((r) => r.endsWith(`@${centroidKey}`)),
    JSON.stringify({ swPts, swReqs })
  );
  await ctx.close();
});

server.close();
await browser.close();
console.log(out.join('\n'));
if (pageErrors.length) console.log('PAGEERRORS:\n' + pageErrors.slice(0, 10).join('\n'));
console.log(`\n${fails === 0 ? 'ALL PASS' : fails + ' FAIL'}`);
process.exit(fails === 0 && pageErrors.length === 0 ? 0 : 1);
