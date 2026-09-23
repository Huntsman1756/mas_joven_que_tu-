// G17 — regresiones dirigidas a los cuatro problemas de UX:
//   P1  año/municipio: valores válidos sin apariencia de error; foco
//       neutro; errores reales con texto+aria y se limpian al corregir.
//   P2  fotos: un control temporal único (scrub), play/pausa inequívoco,
//       fin de serie claro sin bucle, etiqueta==imagen.
//   P3  «Ver datos…»: dentro de la leyenda (en flujo bajo el lienzo en
//       móvil), no tapa el lienzo, el copy dice que consulta el centro.
//   P4  Evolución: entrar cambia vista de forma evidente (Timeline monta,
//       municipios responden al cabezal, leyenda/intro cambian), nunca
//       autoplay, deep link inicializa el cabezal.
// Datos locales reales (Getxo 044); servicios raster externos stub.
import { mkdir } from 'node:fs/promises';
import { createStaticServer } from './static-server.mjs';
import { installExternalStubs, installLocalFixtures, STUB_PNG } from './fixtures.mjs';
import { chromium } from 'playwright';

const server = await createStaticServer('build', 4317);
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
  await p.goto(`http://localhost:4317${url}`);
  // G19: en los modos de visor no hay .headline-block — la resolución del
  // resultado se detecta por estado, no por el panel editorial.
  await p.waitForFunction(
    () =>
      window.__mjtApp?.phase === 'intro' ||
      window.__mjtApp?.headline !== null ||
      !!document.querySelector('.hero h1'),
    null,
    { timeout: 30000 }
  );
  return { ctx, p };
}
const setMode = async (p, m) => {
  await p.click(`.viewswitch [data-mode="${m}"]`);
  await p.waitForFunction((mm) => window.__mjtApp?.mode === mm, m);
};
await mkdir('../evidence/g17', { recursive: true });

const INK = 'rgb(24, 38, 49)';
const ACCENT_DEEP = 'rgb(140, 45, 33)';
const TOPO = 'rgb(61, 122, 68)';

// ── P1a. Portada: foco neutro, error real accesible, se limpia al corregir ──
await block('p1_hero', async () => {
  const ctx = await browser.newContext(ctxOpts);
  const p = await ctx.newPage();
  p.on('pageerror', (e) => pageErrors.push(e.message.slice(0, 200)));
  await installLocalFixtures(p);
  await installExternalStubs(p);
  await p.goto('http://localhost:4317/');
  await p.waitForSelector('#year-input', { timeout: 30000 });

  // foco sobre un campo vacío/válido: outline neutro (ink), borde normal
  await p.focus('#year-input');
  const fo = await p.evaluate(() => {
    const cs = getComputedStyle(document.getElementById('year-input'));
    return { outline: cs.outlineColor, border: cs.borderColor };
  });
  ok('p1_year_focus_neutral', fo.outline === INK && fo.border !== ACCENT_DEEP, JSON.stringify(fo));

  // año inválido → error real: texto + role=alert + aria-invalid + borde rojo
  // (requestSubmit: el CTA queda disabled hasta elegir municipio, y el
  // error de año se evalúa antes que el de municipio)
  await p.fill('#year-input', '1800');
  await p.locator('.hero form').evaluate((f) => f.requestSubmit());
  const err = await p.evaluate(() => {
    const i = document.getElementById('year-input');
    const msg = document.getElementById('year-err');
    const cs = getComputedStyle(i);
    return {
      invalid: i.getAttribute('aria-invalid'),
      desc: i.getAttribute('aria-describedby'),
      msg: msg?.textContent.trim() ?? null,
      role: msg?.getAttribute('role'),
      border: cs.borderColor
    };
  });
  ok(
    'p1_year_error_real',
    err.invalid === 'true' &&
      err.desc === 'year-err' &&
      !!err.msg &&
      err.role === 'alert' &&
      err.border === ACCENT_DEEP,
    JSON.stringify(err)
  );

  // corregir: el mensaje y el estilo inválido desaparecen al teclear
  await p.fill('#year-input', '1952');
  const clr = await p.evaluate(() => {
    const i = document.getElementById('year-input');
    return {
      invalid: i.getAttribute('aria-invalid'),
      msg: !!document.getElementById('year-err'),
      border: getComputedStyle(i).borderColor
    };
  });
  ok('p1_year_error_clears', clr.invalid !== 'true' && !clr.msg && clr.border !== ACCENT_DEEP, JSON.stringify(clr));

  // municipio: foco neutro + confirmación no roja
  await p.focus('#place-input');
  const pf = await p.evaluate(() => getComputedStyle(document.getElementById('place-input')).outlineColor);
  ok('p1_place_focus_neutral', pf === INK, pf);
  await p.fill('#place-input', 'get');
  await p.waitForSelector('#place-listbox [role="option"]', { timeout: 15000 });
  await p.locator('#place-listbox [role="option"] button').first().click();
  const sel = await p.evaluate(() => {
    const el = document.querySelector('.hero .sel');
    return { txt: el?.textContent.trim() ?? '', color: el ? getComputedStyle(el).color : null };
  });
  ok('p1_place_selected_neutral', /Getxo/.test(sel.txt) && sel.color !== ACCENT_DEEP, JSON.stringify(sel));

  // el tick ✓ de la opción elegida no es rojo: blur+focus reabre la
  // lista conservando `picked` (reteclear lo limpiaría — comportamiento
  // correcto del borrador).
  await p.evaluate(() => document.getElementById('place-input').blur());
  await p.focus('#place-input');
  await p.waitForSelector('#place-listbox li.picked', { timeout: 15000 });
  const tick = await p.evaluate(() => {
    const b = document.querySelector('#place-listbox li.picked button');
    return getComputedStyle(b, '::after').color;
  });
  ok('p1_picked_tick_not_red', tick === TOPO, tick);
  await ctx.close();
});

// ── P1b. Editor del resultado: misma regla; EU igual ────────────────────────
await block('p1_editor', async () => {
  const { ctx, p } = await newResultPage();
  await p.locator('.change').click();
  await p.waitForSelector('#edit-year');
  await p.focus('#edit-year');
  const fo = await p.evaluate(() => getComputedStyle(document.getElementById('edit-year')).outlineColor);
  ok('p1_editor_focus_neutral', fo !== 'rgb(168, 55, 42)', fo); // nunca el rojo de acento

  await p.fill('#edit-year', '9999');
  await p.locator('.cf-submit').click();
  const err = await p.evaluate(() => {
    const i = document.getElementById('edit-year');
    return {
      invalid: i.getAttribute('aria-invalid'),
      msg: !!document.getElementById('edit-year-err'),
      border: getComputedStyle(i).borderColor
    };
  });
  ok('p1_editor_error', err.invalid === 'true' && err.msg && err.border === ACCENT_DEEP, JSON.stringify(err));
  await p.fill('#edit-year', '1965');
  const clr = await p.evaluate(() => ({
    invalid: document.getElementById('edit-year').getAttribute('aria-invalid'),
    msg: !!document.getElementById('edit-year-err')
  }));
  ok('p1_editor_error_clears', clr.invalid !== 'true' && !clr.msg, JSON.stringify(clr));

  // municipio sin elegir → error con aria-invalid asociado
  await p.fill('#place-input', 'texto sin elegir');
  await p.locator('.cf-submit').click();
  const pe = await p.evaluate(() => ({
    invalid: document.getElementById('place-input').getAttribute('aria-invalid'),
    desc: document.getElementById('place-input').getAttribute('aria-describedby'),
    msg: !!document.getElementById('edit-place-err')
  }));
  ok('p1_place_error', pe.invalid === 'true' && pe.desc === 'edit-place-err' && pe.msg, JSON.stringify(pe));
  // elegir de la lista limpia el error sin reenviar
  await p.fill('#place-input', 'bilb');
  await p.waitForSelector('#place-listbox [role="option"]', { timeout: 15000 });
  await p.locator('#place-listbox [role="option"] button').first().click();
  const pc = await p.evaluate(() => ({
    invalid: document.getElementById('place-input').getAttribute('aria-invalid'),
    msg: !!document.getElementById('edit-place-err')
  }));
  ok('p1_place_error_clears', pc.invalid !== 'true' && !pc.msg, JSON.stringify(pc));
  await ctx.close();
});

await block('p1_eu', async () => {
  const ctx = await browser.newContext({ ...ctxOpts, locale: 'eu' });
  const p = await ctx.newPage();
  p.on('pageerror', (e) => pageErrors.push(e.message.slice(0, 200)));
  await installLocalFixtures(p);
  await installExternalStubs(p);
  await p.addInitScript(() => localStorage.setItem('mjt-lang', 'eu'));
  await p.goto('http://localhost:4317/');
  await p.waitForSelector('#year-input', { timeout: 30000 });
  await p.fill('#year-input', '1800');
  await p.locator('.hero form').evaluate((f) => f.requestSubmit());
  const eu = await p.evaluate(() => ({
    invalid: document.getElementById('year-input').getAttribute('aria-invalid'),
    msg: document.getElementById('year-err')?.textContent.trim() ?? null,
    border: getComputedStyle(document.getElementById('year-input')).borderColor
  }));
  ok('p1_eu_error', eu.invalid === 'true' && !!eu.msg && eu.border === ACCENT_DEEP, JSON.stringify(eu));
  await ctx.close();
});

// ── P2. Fotos: un control temporal, play/pausa, fin claro ───────────────────
await block('p2_photos', async () => {
  const { ctx, p } = await newResultPage();
  await setMode(p, 'photo');
  await p.waitForSelector('.photo .tc-scrub', { timeout: 15000 });
  const camps = await p.evaluate(() => window.__mjtApp.allCampaigns.map((c) => c.year));
  const cur0 = await p.evaluate(() => window.__mjtApp.orthoCampaign?.year ?? window.__mjtApp.nearest?.year);

  // teclado: ArrowRight salta a la SIGUIENTE campaña (no a un año vacío)
  await p.focus('.photo .tc-scrub');
  await p.keyboard.press('ArrowRight');
  await p.waitForFunction(
    (y0) => (window.__mjtApp.orthoCampaign?.year ?? -1) !== y0,
    cur0,
    { timeout: 8000 }
  );
  const afterArrow = await p.evaluate(() => window.__mjtApp.orthoCampaign.year);
  const i0 = camps.indexOf(cur0);
  ok('p2_scrub_arrow_campaign', afterArrow === camps[i0 + 1], `${cur0}→${afterArrow}`);

  // End/Home recorren los extremos de la serie
  await p.keyboard.press('End');
  await p.waitForFunction((y) => window.__mjtApp.orthoCampaign?.year === y, camps[camps.length - 1]);
  await p.keyboard.press('Home');
  await p.waitForFunction((y) => window.__mjtApp.orthoCampaign?.year === y, camps[0]);
  ok('p2_scrub_home_end', true, `first=${camps[0]} last=${camps[camps.length - 1]}`);

  // puntero/tacto: input+change sobre el rango activa la campaña cercana
  const target = camps[Math.floor(camps.length / 2)];
  await p.locator('.photo .tc-scrub').evaluate((el, v) => {
    el.value = String(v);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }, target);
  await p.waitForFunction((y) => window.__mjtApp.orthoCampaign?.year === y, target);
  ok('p2_scrub_commits_nearest', true, `→${target}`);

  // etiqueta == campaña activa (nunca una etiqueta sobre otra imagen)
  const label = await p.locator('.photo .tc-year').first().textContent();
  ok('p2_label_matches_image', label.trim() === String(target), `${label.trim()} vs ${target}`);

  // play → avanza campañas reales; pausa → se detiene
  await p.locator('.photo [data-action="play"]').click();
  await p.waitForTimeout(2600); // ≥1 paso a velocidad normal (1.8 s)
  const moved = await p.evaluate(() => window.__mjtApp.orthoCampaign.year);
  ok('p2_play_advances', moved !== target, `${target}→${moved}`);
  await p.locator('.photo [data-action="play"]').click(); // pausa
  const pausedAt = await p.evaluate(() => window.__mjtApp.orthoCampaign.year);
  await p.waitForTimeout(2200);
  const still = await p.evaluate(() => window.__mjtApp.orthoCampaign.year);
  ok('p2_pause_stops', still === pausedAt, `${pausedAt}→${still}`);

  // scrub durante la reproducción la detiene (elección manual)
  await p.locator('.photo [data-action="play"]').click();
  await p.waitForTimeout(200);
  await p.locator('.photo .tc-scrub').evaluate((el, v) => {
    el.value = String(v);
    el.dispatchEvent(new Event('input', { bubbles: true }));
  }, target);
  // G19: el play es un icono — el estado se lee por aria-label.
  const st = await p.evaluate(
    () => document.querySelector('.photo [data-action="play"]')?.getAttribute('aria-label') ?? ''
  );
  ok('p2_scrub_stops_play', /Reproducir/.test(st), st.trim());
  await p.locator('.photo .tc-scrub').evaluate((el) => {
    el.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await p.waitForFunction((y) => window.__mjtApp.orthoCampaign?.year === y, target);
  await ctx.close();
});

await block('p2_end_of_series', async () => {
  const { ctx, p } = await newResultPage();
  await setMode(p, 'photo');
  await p.waitForSelector('.photo .tc-scrub', { timeout: 15000 });
  const camps = await p.evaluate(() => window.__mjtApp.allCampaigns.map((c) => c.year));
  // sitúa el cabezal en la PENÚLTIMA campaña y reproduce: alcanza la
  // última y se detiene con estado claro (ended), sin bucle automático.
  await p.focus('.photo .tc-scrub');
  await p.keyboard.press('End');
  await p.waitForFunction((y) => window.__mjtApp.orthoCampaign?.year === y, camps[camps.length - 1]);
  await p.keyboard.press('ArrowLeft');
  await p.waitForFunction(
    (y) => window.__mjtApp.orthoCampaign?.year === y,
    camps[camps.length - 2]
  );
  await p.locator('.photo [data-action="play"]').click();
  await p.waitForSelector('.photo .ended', { timeout: 15000 });
  const st = await p.evaluate(() => ({
    year: window.__mjtApp.orthoCampaign.year,
    play: document.querySelector('.photo [data-action="play"]')?.getAttribute('aria-label')?.trim() ?? ''
  }));
  ok('p2_end_stops_clear', st.year === camps[camps.length - 1] && /Reproducir/.test(st.play), JSON.stringify(st));
  // reanudar desde el final = reinicio explícito a la primera campaña
  await p.locator('.photo [data-action="play"]').click();
  await p.waitForFunction((y) => window.__mjtApp.orthoCampaign?.year === y, camps[0], { timeout: 8000 });
  ok('p2_restart_first', true, `→${camps[0]}`);
  await p.locator('.photo [data-action="play"]').click(); // pausa limpia
  await ctx.close();
});

// ── P3. «Ver datos…»: dentro de la leyenda, no tapa el lienzo ───────────────
await block('p3_cell_inspect', async () => {
  // z=14 → nivel CELDA
  const { ctx, p } = await newResultPage(
    { viewport: { width: 390, height: 844 } },
    '/?year=1952&place=getxo&lat=43.34311&lon=-3.00762&z=13'
  );
  // la cámara del deep link tarda unos segundos en aplicar el zoom CELDA
  await p.waitForFunction(() => window.__mjtMap?.getZoom() >= 9, null, { timeout: 30000 });
  await p.waitForSelector('.cell-inspect', { timeout: 20000 });
  const g = await p.evaluate(() => {
    const b = document.querySelector('.cell-inspect');
    const R = (el) => {
      const r = el.getBoundingClientRect();
      return [r.top, r.bottom, r.left, r.right];
    };
    return {
      inLegend: !!b.closest('.legend'),
      btn: R(b),
      mw: R(document.querySelector('.mapwrap')),
      lg: R(document.querySelector('.legend')),
      txt: b.textContent.trim()
    };
  });
  ok('p3_inside_legend', g.inLegend);
  // en móvil la leyenda va bajo el lienzo: el botón NO cubre el canvas
  ok('p3_not_over_canvas', g.btn[0] >= g.mw[1] - 1, `btn.top=${g.btn[0]} canvas.bottom=${g.mw[1]}`);
  ok('p3_copy_says_center', /centrada|zentro|erdiko/i.test(g.txt), g.txt);
  // no tapa el centro del lienzo
  const cover = await p.evaluate(() => {
    const mw = document.querySelector('.mapwrap').getBoundingClientRect();
    const el = document.elementFromPoint(
      mw.left + mw.width / 2,
      mw.top + mw.height / 2
    );
    return el?.closest('.cell-inspect') ? 'cell-inspect' : (el?.className ?? 'canvas');
  });
  ok('p3_canvas_center_free', cover !== 'cell-inspect', cover);

  // efecto real: selecciona la celda del centro y abre la ficha enfocada
  await p.locator('.cell-inspect').click();
  await p.waitForFunction(() => window.__mjtApp?.selectedCell !== null, null, { timeout: 15000 });
  await p.waitForSelector('#cell-detail', { timeout: 20000 });
  const focus = await p.evaluate(() => ({
    cell: window.__mjtApp.selectedCell?.fid ?? null,
    focused: document.activeElement?.id === 'cell-detail'
  }));
  ok('p3_selects_center_cell', focus.cell !== null && focus.focused, JSON.stringify(focus));

  // no aparece en modos con evidencia (swipe oculta la capa de celdas)
  await p.click('.vsel');
  await p.waitForSelector('.vmenu [data-mode="swipe"]');
  await p.click('.vmenu [data-mode="swipe"]');
  await p.waitForFunction(() => window.__mjtApp?.mode === 'swipe');
  await p.waitForTimeout(600);
  ok('p3_hidden_in_swipe', (await p.locator('.cell-inspect').count()) === 0);
  await ctx.close();
});

// ── P4. Evolución: cambio de vista evidente y funcional ─────────────────────
await block('p4_evolution', async () => {
  const { ctx, p } = await newResultPage();
  // modo mapa sin cabezal: sin Timeline (Edificios es la vista limpia)
  ok('p4_map_clean', (await p.locator('.timeband').count()) === 0);
  const legend0 = await p.locator('.legend .legend-title').textContent();
  // share renderizada antes de entrar (vista «posteriores a año») — la
  // misma lectura que hace refreshShares: rendered features + fid.
  const shareOf = () =>
    p.evaluate(() => {
      const m = window.__mjtMap;
      for (const [src, layer] of [
        ['municipalities', 'munis-fill'],
        ['cells', 'cells-fill']
      ]) {
        if (!m.getLayer(layer)) continue;
        const f = m.queryRenderedFeatures(undefined, { layers: [layer] })[0];
        if (!f) continue;
        const fid = f.properties.fid ?? f.id;
        const st = m.getFeatureState({ source: src, sourceLayer: src, id: fid });
        if (st && st.share !== undefined) return { fid, src, share: st.share };
      }
      return null;
    });
  // esperar a que el estado de feature esté pintado antes de medir
  await p.waitForFunction(() => {
    const m = window.__mjtMap;
    if (!m) return false;
    for (const [src, layer] of [
      ['municipalities', 'munis-fill'],
      ['cells', 'cells-fill']
    ]) {
      if (!m.getLayer(layer)) continue;
      const f = m.queryRenderedFeatures(undefined, { layers: [layer] })[0];
      if (!f) continue;
      const st = m.getFeatureState({
        source: src,
        sourceLayer: src,
        id: f.properties.fid ?? f.id
      });
      if (st && st.share !== undefined && st.share !== null) return true;
    }
    return false;
  });
  const share0 = await shareOf();

  await setMode(p, 'time');
  const st = await p.evaluate(() => ({
    mode: window.__mjtApp.mode,
    playYear: window.__mjtApp.playYear,
    playing: window.__mjtApp.playing,
    year: window.__mjtApp.year
  }));
  ok('p4_mode_time', st.mode === 'time');
  ok('p4_playhead_init', st.playYear === st.year, JSON.stringify(st));
  ok('p4_no_autoplay', st.playing === false);
  // el cambio es visible: Timeline aparece, intro y leyenda explican la variable
  ok('p4_timeline_mounts', (await p.locator('.timeband').count()) === 1);
  // G19: en el visor la explicación no es una fila de página — vive tras
  // el ⓘ del chrome temporal, cerrada por defecto.
  ok('p4_intro_collapsed', (await p.locator('.mapintro').count()) === 0);
  const infoClosed = await p.evaluate(
    () => !document.querySelector('.timeband .tc-info')?.open
  );
  ok('p4_info_closed_default', infoClosed);
  await p.locator('.timeband .tc-info summary').click();
  const intro1 = await p.locator('.timeband .tc-info-body').textContent();
  ok('p4_intro_explains', /catastro/i.test(intro1 ?? ''), (intro1 ?? '').slice(0, 80));
  const legend1 = await p.locator('.legend .legend-title').textContent();
  ok('p4_legend_play', legend1 !== legend0 && /1952/.test(legend1), legend1.slice(0, 90));
  // el mapa responde: la cuota proyecta «hasta playYear», no «después de»
  await p.waitForTimeout(800); // refreshShares tras el cambio de playYear
  const share1 = await shareOf();
  ok(
    'p4_map_repaints',
    share0 !== null &&
      share1 !== null &&
      share0.fid === share1.fid &&
      share1.share !== share0.share,
    `${JSON.stringify(share0)}→${JSON.stringify(share1)}`
  );

  // reproducir avanza el año y el mapa; pausar detiene
  await p.locator('.timeband [data-action="play"]').click();
  await p.waitForTimeout(900);
  const adv = await p.evaluate(() => ({ y: window.__mjtApp.playYear, on: window.__mjtApp.playing }));
  ok('p4_play_advances', adv.on && adv.y > st.year, JSON.stringify(adv));
  await p.locator('.timeband [data-action="play"]').click();
  const at = adv.y;
  await p.waitForTimeout(700);
  const after = await p.evaluate(() => ({ y: window.__mjtApp.playYear, on: window.__mjtApp.playing }));
  ok('p4_pause_stops', !after.on && after.y === at, JSON.stringify(after));
  await ctx.close();
});

await block('p4_paths', async () => {
  // desde FOTO → Evolución (frecuente: «quiero ver la evolución tras la foto»)
  const { ctx, p } = await newResultPage();
  await setMode(p, 'photo');
  await p.waitForSelector('.photo', { timeout: 15000 });
  await setMode(p, 'time');
  const st = await p.evaluate(() => ({
    mode: window.__mjtApp.mode,
    playYear: window.__mjtApp.playYear,
    playing: window.__mjtApp.playing,
    ortho: window.__mjtApp.orthoVisible
  }));
  ok('p4_photo_to_time', st.mode === 'time' && st.playYear !== null && !st.playing && !st.ortho, JSON.stringify(st));

  // reproducción iniciada → salir a Edificios → volver: NO reanuda sola
  await p.locator('.timeband [data-action="play"]').click();
  await p.waitForTimeout(600);
  await setMode(p, 'map');
  await setMode(p, 'time');
  const re = await p.evaluate(() => ({ on: window.__mjtApp.playing, py: window.__mjtApp.playYear }));
  ok('p4_reenter_paused', re.on === false && re.py !== null, JSON.stringify(re));
  await ctx.close();
});

await block('p4_deeplink', async () => {
  const { ctx, p } = await newResultPage({}, '/?year=1952&place=getxo&view=time');
  const st = await p.evaluate(() => ({
    mode: window.__mjtApp.mode,
    playYear: window.__mjtApp.playYear,
    playing: window.__mjtApp.playing,
    year: window.__mjtApp.year
  }));
  ok('p4_dl_playhead', st.mode === 'time' && st.playYear === st.year && !st.playing, JSON.stringify(st));
  ok('p4_dl_timeline', (await p.locator('.timeband').count()) === 1);
  await ctx.close();
});

await block('p4_mobile', async () => {
  const { ctx, p } = await newResultPage(
    { viewport: { width: 390, height: 844 } },
    '/?year=1952&place=getxo'
  );
  ok('p4_mobile_map_clean', (await p.locator('.timeband').count()) === 0);
  await p.click('.vsel');
  await p.waitForSelector('.vmenu [data-mode="time"]');
  await p.click('.vmenu [data-mode="time"]');
  await p.waitForFunction(() => window.__mjtApp?.mode === 'time');
  const st = await p.evaluate(() => ({
    playYear: window.__mjtApp.playYear,
    playing: window.__mjtApp.playing,
    tb: !!document.querySelector('.timeband')
  }));
  ok('p4_mobile_enter', st.tb && st.playYear !== null && !st.playing, JSON.stringify(st));
  await ctx.close();
});

// ── Resumen ──────────────────────────────────────────────────────────────────
for (const l of out) console.log(l);
if (pageErrors.length) {
  console.log('PAGEERRORS:');
  for (const e of pageErrors) console.log('  -', e);
}
console.log(`\nRESUMEN PASS=${out.length - fails} FAIL=${fails} PAGEERRORS=${pageErrors.length}`);
await browser.close();
server.close();
process.exit(fails > 0 || pageErrors.length > 0 ? 1 : 0);
