import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { createStaticServer } from './static-server.mjs';
import { installLocalFixtures, installExternalStubs } from './fixtures.mjs';

const server = process.env.UX_URL ? null : await createStaticServer('build', 4402);
const base = process.env.UX_URL || 'http://localhost:4402';
const browser = await chromium.launch();
const errors = [];
async function open(width, path = '') {
  const page = await browser.newPage({
    viewport: { width, height: 900 },
    hasTouch: width < 700,
    isMobile: width < 700
  });
  page.on('pageerror', (e) => errors.push(e.message));
  await installLocalFixtures(page);
  await installExternalStubs(page);
  await page.goto(`${base}/${path}`);
  return page;
}
try {
  for (const width of [1440, 390]) {
    const p = await open(width);
    await p.waitForSelector('#place-input');
    const before = await p.locator('#place-input').boundingBox();
    await p.fill('#year-input', '1980');
    await p.fill('#place-input', 'Bilbao');
    await p.locator('[role=option] button').filter({ hasText: 'Bilbao' }).click();
    const after = await p.locator('#place-input').boundingBox();
    assert.ok(Math.abs(before.y - after.y) <= 1);
    await p.locator('.cta').click();
    await p.waitForSelector('.timeband');
    await p.waitForSelector('.mapcell canvas');
    const pos = await p.evaluate(() => ({
      tb: document.querySelector('.timeband').getBoundingClientRect().top,
      mb: document.querySelector('.mapband').getBoundingClientRect().top,
      canvas: document.querySelector('.mapcell canvas').getBoundingClientRect(),
      vh: innerHeight
    }));
    if (width > 700) {
      // escritorio: controles contextuales encima del lienzo
      assert.ok(pos.tb < pos.mb);
    } else {
      // móvil (G15): lienzo antes que los controles y visible en la
      // primera pantalla — criterio: ≥110 px de canvas en el viewport.
      assert.ok(pos.mb < pos.tb);
      const vis = Math.max(0, Math.min(pos.canvas.bottom, pos.vh) - Math.max(pos.canvas.top, 0));
      assert.ok(vis >= 110, `mobile canvas visible ${vis}px < 110`);
      // y el orden DOM coincide con el visual: Tab/lectores recorren
      // controles DESPUÉS del lienzo, no antes.
      const domAfter = await p.evaluate(() => {
        const mb = document.querySelector('.mapband');
        const tb = document.querySelector('.timeband');
        return !!(mb.compareDocumentPosition(tb) & Node.DOCUMENT_POSITION_FOLLOWING);
      });
      assert.ok(domAfter, 'mobile DOM order must match visual order');
    }
    console.log(`PASS stable municipality field and scene order: ${width}`);
    await p.close();
  }
  const p = await open(1440, '?year=2025&place=bilbao');
  await p.locator('.timeband .primary').click();
  await p.waitForFunction(() => window.__mjtApp.playYear === 2026 && !window.__mjtApp.playing);
  await p.locator('.change').click();
  await p.fill('#edit-year', '1980');
  await p.fill('#place-input', 'Muskiz');
  assert.equal(await p.locator('#place-input').evaluate((el) => el.checkValidity()), false);
  await p.locator('[role=option] button').filter({ hasText: 'Muskiz' }).click();
  assert.equal(await p.locator('#place-input').evaluate((el) => el.checkValidity()), true);
  await p.locator('.cf-submit').click();
  await p.waitForFunction(
    () =>
      window.__mjtApp.place.slug === 'muskiz' &&
      window.__mjtApp.year === 1980 &&
      window.__mjtApp.playYear === null
  );
  await p.getByRole('button', { name: 'Evolución', exact: true }).click();
  await p.waitForFunction(() => window.__mjtApp.playYear === 1980);
  const beforeAnchor = await p.evaluate(() => ({
    year: window.__mjtApp.playYear,
    mode: window.__mjtApp.mode,
    place: window.__mjtApp.place.slug
  }));
  await p.locator('.fnav a[href="#sources-h"]').click();
  await p.waitForTimeout(600);
  assert.deepEqual(
    await p.evaluate(() => ({
      year: window.__mjtApp.playYear,
      mode: window.__mjtApp.mode,
      place: window.__mjtApp.place.slug
    })),
    beforeAnchor
  );
  console.log('PASS completed playback → new search → evolution; sources preserves state');
  await p.close();

  for (const mode of ['time', 'photo']) {
    const q = await open(
      1440,
      `?year=1980&place=getxo&view=${mode}${mode === 'photo' ? '&ortho=1956' : ''}`
    );
    const panel = mode === 'photo' ? '.photo' : '.timeband';
    const playLabel = mode === 'photo' ? 'Reproducir fotografías' : 'Reproducir';
    await q.locator(panel).getByRole('button', { name: playLabel, exact: true }).click();
    await q.evaluate(() => document.querySelector('.lazyview')?.scrollIntoView());
    await q.locator('.invite .start').click();
    await q.fill('#addr-street', 'ogono');
    await q.waitForSelector('#addr-num');
    const readYear = () =>
      q.evaluate(
        (m) => (m === 'photo' ? window.__mjtApp.orthoCampaign?.year : window.__mjtApp.playYear),
        mode
      );
    const paused = await readYear();
    await q.waitForTimeout(2100);
    assert.equal(await readYear(), paused);
    await q.locator(panel).getByRole('button', { name: playLabel, exact: true }).click();
    await q.waitForTimeout(2100);
    assert.notEqual(await readYear(), paused);
    console.log(`PASS address pauses ${mode}; playback resumes`);
    await q.close();
  }

  // ── G15: borrador del editor + historial coherente ──────────────────
  const st = (q) =>
    q.evaluate(() => ({
      place: window.__mjtApp.place?.slug ?? null,
      year: window.__mjtApp.year,
      mode: window.__mjtApp.mode,
      lat: +window.__mjtApp.view.lat.toFixed(4),
      lon: +window.__mjtApp.view.lon.toFixed(4),
      zoom: window.__mjtApp.view.zoom,
      metrics: !!window.__mjtApp.metrics,
      sel: !!window.__mjtApp.selectedBuilding || !!window.__mjtApp.selectedCell,
      seq: window.__mjtApp.searchNavSeq,
      url: location.search
    }));
  const openEditor = (q) => q.locator('.change').click();
  const pickPlace = async (q, name) => {
    await q.fill('#place-input', '');
    await q.fill('#place-input', name);
    await q.locator('[role=option] button').filter({ hasText: name }).first().click();
  };

  // 1) Elegir en la lista NO confirma; cancelar preserva todo
  {
    const q = await open(1440, '?year=2025&place=bilbao');
    await q.waitForSelector('.mapband');
    await q.waitForFunction(() => window.__mjtApp.metrics !== null);
    await q.waitForTimeout(900); // deja terminar el fitBounds (camera settle)
    const s0 = await st(q);
    await openEditor(q);
    await pickPlace(q, 'Muskiz');
    await q.waitForTimeout(400);
    assert.deepEqual(await st(q), s0, 'pick in editor must not mutate state/URL');
    await q.locator('.cf-cancel').click();
    assert.deepEqual(await st(q), s0, 'cancel must preserve state/URL');

    // 2) año inválido: ni estado ni URL
    await openEditor(q);
    await q.fill('#edit-year', '1234x');
    await q.locator('.cf-submit').click();
    await q.waitForTimeout(300);
    assert.deepEqual(await st(q), s0, 'invalid year must not mutate');
    assert.ok(await q.locator('.cf-err').isVisible(), 'year error visible');
    await q.locator('.cf-cancel').click();

    // 3) nombre escrito sin seleccionar bloquea la confirmación
    await openEditor(q);
    await q.fill('#place-input', 'Muskiz');
    await q.waitForSelector('[role=option]');
    await q.keyboard.press('Escape'); // cierra el desplegable sin elegir
    await q.locator('.cf-submit').click();
    await q.waitForTimeout(300);
    assert.deepEqual(await st(q), s0, 'typed-but-not-selected must not mutate');
    assert.ok(await q.locator('.cf-err').isVisible(), 'place error visible');
    // el error está asociado al campo (aria-invalid + describedby → id)
    const a11y = await q.evaluate(() => {
      const i = document.getElementById('place-input');
      const e = document.querySelector('.cf-err');
      return {
        inv: i?.getAttribute('aria-invalid'),
        desc: i?.getAttribute('aria-describedby'),
        id: e?.id ?? null
      };
    });
    assert.equal(a11y.inv, 'true', 'input must carry aria-invalid');
    assert.ok(a11y.id && a11y.desc === a11y.id, `describedby→id: ${JSON.stringify(a11y)}`);
    // y se limpia al elegir una opción válida, sin otro envío
    await pickPlace(q, 'Muskiz');
    await q.waitForTimeout(200);
    const cleared = await q.evaluate(() => ({
      vis: !!document.querySelector('.cf-err'),
      inv: document.getElementById('place-input')?.getAttribute('aria-invalid') ?? null,
      desc: document.getElementById('place-input')?.getAttribute('aria-describedby') ?? null
    }));
    assert.ok(
      !cleared.vis && !cleared.inv && !cleared.desc,
      `error must clear on valid pick: ${JSON.stringify(cleared)}`
    );

    // 4) confirmar Muskiz/1980 aplica ambos de una vez → una entrada
    await q.fill('#edit-year', '1980');
    await pickPlace(q, 'Muskiz');
    assert.equal((await st(q)).place, 'bilbao', 'draft pick must not commit');
    const seq0 = (await st(q)).seq;
    await q.locator('.cf-submit').click();
    await q.waitForFunction(
      () => window.__mjtApp.place?.slug === 'muskiz' && window.__mjtApp.year === 1980
    );
    await q.waitForFunction(() => window.__mjtApp.metrics !== null);
    const s1 = await st(q);
    assert.equal(s1.seq, seq0 + 1, 'one commit = one nav seq');
    assert.ok(s1.url.includes('place=muskiz') && s1.url.includes('year=1980'), s1.url);

    // 5) Atrás → Bilbao/2025 completo (no estado fantasma); Adelante → Muskiz/1980
    // (la cámara se compara con epsilon: moveend escribe el centro real
    // y serializeUrl redondea a 5/2 decimales)
    const sameCam = (a, b) =>
      Math.abs(a.lat - b.lat) < 0.005 &&
      Math.abs(a.lon - b.lon) < 0.005 &&
      Math.abs(a.zoom - b.zoom) < 0.1;
    const urlHas = (url, k, v) => new URLSearchParams(url).get(k) === String(v);
    await q.goBack();
    await q.waitForFunction(
      () => window.__mjtApp.place?.slug === 'bilbao' && window.__mjtApp.year === 2025
    );
    const sb = await st(q);
    assert.equal(sb.place, 'bilbao');
    assert.equal(sb.year, 2025);
    assert.ok(urlHas(sb.url, 'place', 'bilbao') && urlHas(sb.url, 'year', '2025'), sb.url);
    assert.ok(
      sameCam(sb, s0),
      `back camera ${sb.lat},${sb.lon},${sb.zoom} != ${s0.lat},${s0.lon},${s0.zoom}`
    );
    await q.goForward();
    await q.waitForFunction(
      () => window.__mjtApp.place?.slug === 'muskiz' && window.__mjtApp.year === 1980
    );
    const sf = await st(q);
    assert.ok(urlHas(sf.url, 'place', 'muskiz') && urlHas(sf.url, 'year', '1980'), sf.url);
    assert.ok(
      sameCam(sf, s1),
      `fwd camera ${sf.lat},${sf.lon},${sf.zoom} != ${s1.lat},${s1.lon},${s1.zoom}`
    );

    // 6) confirmar sin cambios: no commit ni entrada nueva
    await openEditor(q);
    await q.locator('.cf-submit').click();
    await q.waitForTimeout(300);
    const snc = await st(q);
    assert.equal(snc.seq, sf.seq, 'no-change confirm must not bump seq');
    assert.ok(urlHas(snc.url, 'place', 'muskiz') && urlHas(snc.url, 'year', '1980'), snc.url);
    assert.ok(!(await q.locator('.changeform').isVisible()), 'editor closes');

    // 7) solo año: Muskiz/1980 → Muskiz/1960; Atrás restaura Muskiz/1980
    await openEditor(q);
    await q.fill('#edit-year', '1960');
    await q.locator('.cf-submit').click();
    await q.waitForFunction(
      () => window.__mjtApp.place?.slug === 'muskiz' && window.__mjtApp.year === 1960
    );
    await q.goBack();
    await q.waitForFunction(() => window.__mjtApp.year === 1980);
    assert.equal((await st(q)).place, 'muskiz');
    await q.goForward();
    await q.waitForFunction(() => window.__mjtApp.year === 1960);

    // 8) solo municipio: Muskiz/1960 → Getxo/1960; Atrás restaura
    await openEditor(q);
    await pickPlace(q, 'Getxo');
    await q.locator('.cf-submit').click();
    await q.waitForFunction(() => window.__mjtApp.place?.slug === 'getxo');
    const sg = await st(q);
    assert.equal(sg.year, 1960);
    await q.goBack();
    await q.waitForFunction(() => window.__mjtApp.place?.slug === 'muskiz');
    assert.equal((await st(q)).year, 1960);
    await q.close();
    console.log('PASS editor draft: pick/cancel/invalid/typed; back/forward; partial changes');

    // 9) deep link recargado restaura la búsqueda completa
    const q2 = await open(1440, sg.url);
    await q2.waitForSelector('.mapband');
    await q2.waitForFunction(() => window.__mjtApp.metrics !== null);
    const sr = await st(q2);
    assert.equal(sr.place, 'getxo');
    assert.equal(sr.year, 1960);
    assert.ok(urlHas(sr.url, 'place', 'getxo') && urlHas(sr.url, 'year', '1960'), sr.url);
    await q2.close();
    console.log('PASS deep link reload restores full search');

    // 10) portada → resultado → marca → portada → Atrás/Adelante
    const h = await open(390);
    await h.waitForSelector('#place-input');
    await h.fill('#year-input', '1980');
    await h.fill('#place-input', 'Bilbao');
    await h.locator('[role=option] button').filter({ hasText: 'Bilbao' }).click();
    await h.locator('.cta').click();
    await h.waitForSelector('.mapband');
    await h.waitForFunction(() => window.__mjtApp.metrics !== null);
    await h.locator('.brand').click();
    await h.waitForSelector('#year-input');
    assert.equal(await h.evaluate(() => window.__mjtApp.phase), 'intro');
    assert.equal(await h.evaluate(() => location.search), '', 'home url clean');
    await h.goBack();
    await h.waitForSelector('.mapband');
    await h.waitForFunction(
      () => window.__mjtApp.place?.slug === 'bilbao' && window.__mjtApp.year === 1980
    );
    await h.goForward();
    await h.waitForSelector('#year-input');
    assert.equal(await h.evaluate(() => window.__mjtApp.phase), 'intro');
    await h.close();
    console.log('PASS home → result → brand → back/forward');
  }

  // ── G15b: remontaje de controles al cruzar el breakpoint ≤1023 px ────
  {
    const TICK = 280; // ritmo del Timeline (ver TICK_MS)
    const q = await open(1200, '?year=1952&place=getxo');
    await q.waitForSelector('.timeband .primary');
    await q.waitForFunction(() => window.__mjtApp.metrics !== null);

    // reproducción en curso + foco en una acción concreta («10 años»)
    await q.locator('.timeband .primary').click(); // Reproducir
    await q.waitForFunction(() => window.__mjtApp.playing === true);
    await q.locator('[data-action="first-decade"]').focus();
    assert.equal(
      await q.evaluate(() => document.activeElement?.dataset?.action),
      'first-decade',
      'pre-cross focused action'
    );
    await q.waitForTimeout(3 * TICK + 200);
    const y0 = await q.evaluate(() => window.__mjtApp.playYear);
    assert.ok(y0 !== null && y0 > 1952 && y0 < 2000, `playhead advanced: ${y0}`);

    // cruce 1200 → 768: continúa desde el mismo año — nunca playing=true
    // con el año congelado
    await q.setViewportSize({ width: 768, height: 844 });
    await q.waitForTimeout(400);
    const mid = await q.evaluate(() => ({
      playing: window.__mjtApp.playing,
      y: window.__mjtApp.playYear
    }));
    assert.equal(mid.playing, true, 'playing survives breakpoint cross');
    assert.ok(Math.abs(mid.y - y0) <= 3, `no jump on remount: ${y0}→${mid.y}`);
    await q.waitForTimeout(4 * TICK + 200); // ~1,4 s — «intervalo suficiente»
    const y1 = await q.evaluate(() => window.__mjtApp.playYear);
    assert.ok(y1 > mid.y, `playing=true must keep advancing: ${mid.y}→${y1}`);
    // foco devuelto a la MISMA acción — identidad, no solo contenedor
    assert.equal(
      await q.evaluate(() => document.activeElement?.dataset?.action),
      'first-decade',
      'focus restored to the same action after remount'
    );

    // varios cruces consecutivos: sin intervalos duplicados ni aceleración
    for (const w of [1200, 768, 1200]) {
      await q.setViewportSize({ width: w, height: 844 });
      await q.waitForTimeout(250);
    }
    const ya = await q.evaluate(() => window.__mjtApp.playYear);
    await q.waitForTimeout(5 * TICK + 300);
    const yb = await q.evaluate(() => window.__mjtApp.playYear);
    const gained = yb - ya;
    assert.ok(gained >= 3 && gained <= 8, `advance rate sane, no dup timers: +${gained}y`);

    // identidad en sentido contrario (1200 → 768) con otra acción
    await q.locator('[data-action="restart"]').focus();
    await q.setViewportSize({ width: 768, height: 844 });
    await q.waitForTimeout(400);
    assert.equal(
      await q.evaluate(() => document.activeElement?.dataset?.action),
      'restart',
      'reverse cross keeps same action focused'
    );
    await q.setViewportSize({ width: 1200, height: 900 });
    await q.waitForTimeout(300);

    // cruce estando pausado: no arranca
    await q.evaluate(() =>
      document.querySelector('.timeband')?.scrollIntoView({ block: 'center' })
    );
    await q.locator('.timeband .primary').click(); // Pausar
    await q.waitForFunction(() => window.__mjtApp.playing === false);
    const yp = await q.evaluate(() => window.__mjtApp.playYear);
    await q.setViewportSize({ width: 390, height: 844 });
    await q.waitForTimeout(3 * TICK + 200);
    const afterPause = await q.evaluate(() => ({
      playing: window.__mjtApp.playing,
      y: window.__mjtApp.playYear
    }));
    assert.equal(afterPause.playing, false);
    assert.equal(afterPause.y, yp, 'paused cross must not start playback');

    // final de reproducción: terminado no revive al cruzar
    const snap = await q.evaluate(() => window.__mjtApp.catalog?.snapshot_year ?? 2026);
    await q.evaluate((s) => (window.__mjtApp.playYear = s - 1), snap);
    // en 390 el control queda tras el mapa: scroll al centro para que la
    // toolbar sticky no lo tape al clicar
    await q.evaluate(() =>
      document.querySelector('.timeband')?.scrollIntoView({ block: 'center' })
    );
    await q.locator('.timeband .primary').click();
    await q.waitForFunction((s) => window.__mjtApp.playYear === s, snap); // terminó
    assert.equal(await q.evaluate(() => window.__mjtApp.playing), false);
    await q.setViewportSize({ width: 1200, height: 900 });
    await q.waitForTimeout(400);
    assert.equal(
      await q.evaluate(() => window.__mjtApp.playing),
      false,
      'finished playback stays finished'
    );
    await q.close();
    console.log('PASS breakpoint remount: playing/timer/year/button coherent');

    // identidad de acción también en EU — el texto traducido no es
    // identidad; data-action sí
    const eu = await open(1200, '?year=1952&place=getxo');
    await eu.waitForSelector('.timeband');
    await eu.waitForFunction(() => window.__mjtApp.metrics !== null);
    await eu.click('.langs button:has-text("EU")');
    await eu.waitForFunction(() => document.documentElement.lang === 'eu');
    await eu.locator('[data-action="restart"]').focus();
    await eu.setViewportSize({ width: 768, height: 844 });
    await eu.waitForTimeout(400);
    assert.equal(
      await eu.evaluate(() => document.activeElement?.dataset?.action),
      'restart',
      'EU: same action after cross'
    );
    await eu.setViewportSize({ width: 1200, height: 900 });
    await eu.waitForTimeout(300);
    assert.equal(
      await eu.evaluate(() => document.activeElement?.dataset?.action),
      'restart',
      'EU: same action on reverse cross'
    );
    await eu.close();
    console.log('PASS focus action identity: both directions, ES/EU');

    // reduced-motion ACTIVADO EN SESIÓN (G15c): detiene el temporizador y
    // deja el estado pausado con el año conservado; desactivarlo no
    // reinicia; los pasos manuales siguen disponibles
    const rm = await open(1200, '?year=1952&place=getxo');
    await rm.waitForSelector('.timeband .primary');
    await rm.waitForFunction(() => window.__mjtApp.metrics !== null);
    await rm.locator('.timeband .primary').click(); // Reproducir
    await rm.waitForFunction(() => window.__mjtApp.playing === true);
    await rm.waitForTimeout(2 * TICK);
    await rm.emulateMedia({ reducedMotion: 'reduce' });
    await rm.waitForFunction(() => window.__mjtApp.playing === false);
    const yr = await rm.evaluate(() => window.__mjtApp.playYear);
    await rm.waitForTimeout(3 * TICK + 200);
    assert.equal(
      await rm.evaluate(() => window.__mjtApp.playYear),
      yr,
      'RM mid-session freezes the timer'
    );
    await rm.locator('[data-action="step-fwd"]').click(); // paso manual
    assert.equal(
      await rm.evaluate(() => window.__mjtApp.playYear),
      yr + 1,
      'manual step works under RM'
    );
    await rm.emulateMedia({ reducedMotion: 'no-preference' });
    await rm.waitForTimeout(3 * TICK + 200);
    assert.equal(
      await rm.evaluate(() => window.__mjtApp.playing),
      false,
      'RM off does not auto-resume'
    );
    assert.equal(await rm.evaluate(() => window.__mjtApp.playYear), yr + 1);
    // remontaje bajo RM: sin autoplay (carga inicial ya cubierta por G13)
    await rm.setViewportSize({ width: 390, height: 844 });
    await rm.waitForTimeout(600);
    assert.equal(
      await rm.evaluate(() => window.__mjtApp.playing),
      false,
      'reduced-motion never auto-plays'
    );
    await rm.close();
    console.log('PASS reduced-motion: mid-session pause, manual steps, no auto-resume');

    // PhotoPanel: el cruce pausa de forma explícita; campaña, etiqueta y
    // velocidad sobreviven al remontaje
    const f = await open(1200, '?year=1952&place=getxo&view=photo&ortho=1956');
    await f.waitForSelector('.photo');
    await f.waitForFunction(() => window.__mjtApp.orthoState === 'AVAILABLE', null, {
      timeout: 15000
    });
    await f.selectOption('.speed-lbl select', 'fast');
    await f.getByRole('button', { name: 'Reproducir fotografías' }).click();
    await f.waitForTimeout(400);
    const preCross = await f.evaluate(() => window.__mjtApp.orthoCampaign?.year);
    await f.setViewportSize({ width: 768, height: 844 });
    await f.waitForTimeout(700);
    const post = await f.evaluate(() => ({
      year: window.__mjtApp.orthoCampaign?.year,
      label: document.querySelector('.photo .p-year')?.textContent?.trim(),
      speed: document.querySelector('.speed-lbl select')?.value,
      pressed: document.querySelector('.photo .state .btn')?.getAttribute('aria-pressed')
    }));
    assert.equal(post.year, preCross, 'campaign survives remount');
    assert.equal(post.label, String(preCross), 'label matches shown campaign');
    assert.equal(post.speed, 'fast', 'speed preference survives remount');
    assert.equal(post.pressed, 'false', 'photo playback pauses explicitly on remount');
    await f.close();
    console.log('PASS photo remount: campaign/label/speed coherent, explicit pause');

    // PhotoPanel + reduced-motion en sesión (G15c): para el avance y
    // limpia el intervalo; el control de reproducción desaparece
    const fp = await open(1200, '?year=1952&place=getxo&view=photo&ortho=1956');
    await fp.waitForSelector('.photo');
    await fp.waitForFunction(() => window.__mjtApp.orthoState === 'AVAILABLE', null, {
      timeout: 15000
    });
    await fp.selectOption('.speed-lbl select', 'fast');
    await fp.getByRole('button', { name: 'Reproducir fotografías' }).click();
    await fp.waitForTimeout(400);
    await fp.emulateMedia({ reducedMotion: 'reduce' });
    await fp.waitForTimeout(1200); // > 1 tick a velocidad rápida (900 ms)
    assert.equal(
      await fp.evaluate(() => window.__mjtApp.orthoCampaign?.year),
      1956,
      'RM mid-session stops photo advance'
    );
    assert.equal(
      await fp.locator('.photo [data-action="play"]').count(),
      0,
      'play control hidden under RM'
    );
    await fp.close();
    console.log('PASS photo reduced-motion mid-session: advance stopped, interval cleared');
  }
  assert.deepEqual(errors, []);
} finally {
  await browser.close();
  if (server) await new Promise((resolve) => server.close(resolve));
}
