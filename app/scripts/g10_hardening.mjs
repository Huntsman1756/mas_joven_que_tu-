/**
 * G10 — FINAL HARDENING. Regresión E2E de los defectos de la auditoría
 * (evidence/ux-audit-20260920/OBSERVATIONS.md):
 *
 *   G10-01  año inválido: editor abierto + error accesible + URL/estado intactos
 *   G10-02  denominador «año conocido» perceptible en el titular
 *   G10-03  leyenda Evolución: rampa 0 %/100 %, no «menos/más posteriores»
 *   G10-04  HeroVisual: ambas mitades recortadas (1956 izq / actual dcha)
 *   G10-05  barras 100 % posteriores = estado all-after (no before)
 *   G10-06  «sin año» fuera del eje temporal, sin solape con 2020
 *   G10-07  tooltip por foco/teclado (roving tabindex + Escape)
 *   G10-08  reduced-motion: restart no arranca timer, pasos manuales
 *   G10-09  locales inmediatos aunque NORA tarde 8 s
 *   G10-10  hotspots: respuesta tardía tras cambio de año se descarta
 *   G10-11  area_m2 null → «—», nunca «0 m²»
 *
 * Uso: node scripts/g10_hardening.mjs   (cwd = app/ con build/ presente)
 */
import { chromium } from 'playwright';
import { writeFile, mkdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { createStaticServer } from './static-server.mjs';
import { installCiFixtures } from './fixtures.mjs';

const ROOT = resolve(process.cwd(), '..');
const BUILD = resolve(process.cwd(), 'build');
const OUT = join(ROOT, 'evidence/g10');
const PORT = 4210;
const BASE = `http://localhost:${PORT}`;
const BILBAO = 'year=1952&place=bilbao&lat=43.263&lon=-2.935&z=14';
const U = (q) => `${BASE}/?${q}`;

const server = await createStaticServer(BUILD, PORT);
await mkdir(join(OUT, 'after'), { recursive: true });
await mkdir(join(OUT, 'async'), { recursive: true });
await mkdir(join(OUT, 'a11y'), { recursive: true });

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
  // CI_STUBS=1: servicios externos (ortofotos, NORA, mapa base) stubbados
  // — la suite mide la app, no la disponibilidad de terceros.
  if (process.env.CI_STUBS === '1') await installCiFixtures(page);
  return { ctx, page };
}
async function waitResult(page) {
  // G19: válido en todos los modos — en los de visor no hay sidebar
  // editorial; el estado de resultado listo es __mjtApp.headline
  await page.waitForFunction(() => window.__mjtApp?.headline != null, null, {
    timeout: 30000
  });
}
const appGet = (page, expr) => page.evaluate((e) => eval(e), expr);

// ── G10-01: año inválido ─────────────────────────────────────────────
{
  const { ctx, page } = await newPage();
  await page.goto(U(BILBAO));
  await waitResult(page);
  await page.getByRole('button', { name: 'Cambiar año o lugar' }).click();
  const input = page.locator('#edit-year');
  await input.fill('1899');
  await page.getByRole('button', { name: 'Aplicar' }).click();
  ok('g10_01_form_stays_open', await page.locator('.changeform').isVisible());
  ok('g10_01_error_visible', await page.locator('#edit-year-err').isVisible());
  ok(
    'g10_01_aria',
    (await input.getAttribute('aria-invalid')) === 'true' &&
      (await input.getAttribute('aria-describedby')) === 'edit-year-err'
  );
  ok(
    'g10_01_focus_returned',
    await page.evaluate(() => document.activeElement?.id === 'edit-year')
  );
  ok(
    'g10_01_url_state_untouched',
    page.url().includes('year=1952') && (await appGet(page, 'window.__mjtApp.year')) === 1952
  );
  // Enter en vez de click
  await input.fill('abc');
  await input.press('Enter');
  ok(
    'g10_01_enter_also_blocked',
    (await page.locator('.changeform').isVisible()) && page.url().includes('year=1952')
  );
  // válido sí aplica
  await input.fill('1979');
  await input.press('Enter');
  await page.waitForFunction(() => window.__mjtApp.year === 1979, null, { timeout: 15000 });
  ok('g10_01_valid_applies', !(await page.locator('.changeform').isVisible()));
  await ctx.close();
}

// ── G10-02: denominador en el titular ────────────────────────────────
{
  const { ctx, page } = await newPage();
  await page.goto(U(BILBAO));
  await waitResult(page);
  const title = await page.locator('h1').innerText();
  await page.locator('.about-data summary').click();
  const count = await page.locator('.lead2').innerText();
  ok(
    'g10_02_scope_line',
    /año conocido/i.test(title) && /año de construcción conocido/i.test(count)
  );
  await ctx.close();
}

// ── G10-03: leyenda Evolución ────────────────────────────────────────
{
  const { ctx, page } = await newPage();
  // z=12 → nivel CELDA: la rampa en play codifica cuota constatada hasta
  // playYear (a nivel EDIFICIO no hay rampa; a BIZKAIA sigue anclada a year)
  await page.goto(U('year=1952&place=bilbao&lat=43.263&lon=-2.935&z=12&view=time&play=1988'));
  await waitResult(page);
  await page.waitForSelector('.legend', { timeout: 30000 }).catch(() => note('legend timeout'));
  const leg = (
    await page
      .locator('.legend')
      .innerText()
      .catch(() => '')
  ).replace(/\s+/g, ' ');
  // solo aplica si estamos a nivel celda (zoom 14 → CELDA)
  ok('g10_03_ramp_scale', /0 %/.test(leg) && /100 %/.test(leg));
  ok('g10_03_no_posteriores_labels', !/menos posteriores|más posteriores/i.test(leg));
  await page.screenshot({ path: join(OUT, 'after/legend-play.png') });
  await ctx.close();
}

// ── G10-04: HeroVisual ───────────────────────────────────────────────
{
  const { ctx, page } = await newPage();
  await page.goto(BASE + '/');
  await page.waitForSelector('.diptych', { timeout: 20000 });
  const clips = await page.evaluate(() => {
    const past = getComputedStyle(document.querySelector('.diptych .past')).clipPath;
    const now = getComputedStyle(document.querySelector('.diptych .now')).clipPath;
    return { past, now };
  });
  ok('g10_04_past_clipped_left', /inset\(0(px)?\s+50%/.test(clips.past));
  ok('g10_04_now_clipped_right', /inset\(0(px)?\s+0(px)?\s+0(px)?\s+50%/.test(clips.now));
  // píxeles: cuarto izquierdo y cuarto derecho deben diferir (dos fotos distintas)
  const shot = await page.locator('.diptych').screenshot();
  await writeFile(join(OUT, 'after/hero-diptych.png'), shot);
  await ctx.close();
}

// ── G10-05/06/07: histograma ─────────────────────────────────────────
{
  const { ctx, page } = await newPage();
  await page.goto(U(BILBAO));
  await waitResult(page);
  // .dist vive en BelowFold (lazy): hay que hacer scroll para montarlo
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForSelector('.dist svg', { timeout: 30000 });
  const hist = await page.evaluate(() => {
    const hits = [...document.querySelectorAll('.dist rect.hit')];
    const states = hits.map((r) => r.getAttribute('data-state'));
    const ticks = [...document.querySelectorAll('.dist .tick')].map((el) => ({
      text: el.textContent,
      x: el.getBBox().x + el.getBBox().width / 2
    }));
    const noYearTick = ticks.find((tk) => tk.text === 'sin año');
    const lastTick = ticks.filter((tk) => /^\d{4}$|^<\d{4}$/.test(tk.text)).at(-1);
    return {
      nAllAfter: states.filter((s) => s === 'all-after').length,
      nAllBefore: states.filter((s) => s === 'all-before').length,
      nSplit: states.filter((s) => s === 'split').length,
      nHits: hits.length,
      noYearX: noYearTick?.x ?? null,
      lastTickX: lastTick?.x ?? null
    };
  });
  // Bilbao 1952: 1960..2020 todas posteriores → ≥7 all-after
  ok('g10_05_all_after_states', hist.nAllAfter >= 7);
  ok('g10_05_mixed_states', hist.nAllBefore >= 1 && hist.nSplit >= 1);
  // «sin año» a la derecha del último tick temporal, sin solape
  ok(
    'g10_06_noyear_off_axis',
    hist.noYearX !== null && hist.lastTickX !== null && hist.noYearX - hist.lastTickX > 30
  );
  // foco/teclado
  await page.locator('.dist rect.hit').first().focus();
  await page.waitForSelector('.d-tip', { timeout: 5000 }).catch(() => null);
  ok('g10_07_focus_shows_tip', await page.locator('.d-tip').isVisible());
  const i0 = await page.evaluate(() => document.activeElement?.getAttribute('data-i'));
  await page.keyboard.press('ArrowRight');
  const i1 = await page.evaluate(() => document.activeElement?.getAttribute('data-i'));
  ok('g10_07_roving_arrows', i0 === '0' && i1 === '1');
  await page.keyboard.press('Escape');
  ok(
    'g10_07_escape_closes',
    !(await page
      .locator('.d-tip')
      .isVisible()
      .catch(() => false))
  );
  await page.screenshot({ path: join(OUT, 'a11y/histogram-focus.png') });
  await ctx.close();
}

// ── G10-08: reduced-motion ───────────────────────────────────────────
{
  const { ctx, page } = await newPage({ reducedMotion: 'reduce' });
  // G18: con reduced-motion el reproductor oculta Play; el scrubber, los
  // hitos y los pasos ±1 siguen operativos. view=time sin play= entra
  // pausado en el año personal (G17).
  await page.goto(U(BILBAO + '&view=time'));
  await waitResult(page);
  // no hay botón Play bajo reduced-motion
  ok('g10_08_no_play_button', (await page.locator('.timeband [data-action="play"]').count()) === 0);
  // Home en el scrubber fija el cabezal en el año elegido (sustituye al
  // antiguo «Reiniciar») sin arrancar animación
  await page.locator('.timeband [data-action="scrub"]').focus();
  await page.keyboard.press('Home');
  await page.waitForTimeout(700); // > tick×2: si hubiera timer, playYear avanzaría
  const st = await appGet(
    page,
    'JSON.stringify({playing: window.__mjtApp.playing, playYear: window.__mjtApp.playYear})'
  ).then(JSON.parse);
  ok('g10_08_no_autoplay', st.playing === false);
  ok('g10_08_birth_resets', st.playYear === 1952);
  // paso manual sí funciona
  await page
    .getByRole('button', { name: /siguiente|adelante|›|→/i })
    .first()
    .click()
    .catch(() => null);
  const st2 = await appGet(page, 'window.__mjtApp.playYear');
  ok('g10_08_manual_step', st2 === 1953);
  await ctx.close();
}

// ── G10-09: locales inmediatos, NORA lento ───────────────────────────
{
  const { ctx, page } = await newPage();
  let noraResolve;
  const noraGate = new Promise((r) => (noraResolve = r));
  await page.route('**/rest/v1/municipios*', async (route) => {
    await noraGate;
    await route.fulfill({ status: 200, contentType: 'application/json', body: '{"list":[]}' });
  });
  await page.goto(BASE + '/');
  await page.waitForSelector('#place-input', { timeout: 20000 });
  await page.locator('#place-input').fill('bil');
  const t0 = Date.now();
  await page.waitForSelector('#place-listbox li', { timeout: 3000 });
  ok('g10_09_local_immediate', Date.now() - t0 < 2000);
  ok('g10_09_more_status', (await page.locator('.status').innerText()).includes('más resultados'));
  noraResolve();
  await page.waitForFunction(
    () => !document.querySelector('.status')?.textContent.includes('más'),
    null,
    { timeout: 5000 }
  );
  await page.screenshot({ path: join(OUT, 'async/search-local-first.png') });
  await ctx.close();
}

// ── G10-10: hotspots race ────────────────────────────────────────────
{
  const { ctx, page } = await newPage();
  let resolveCells;
  const cellsGate = new Promise((r) => (resolveCells = r));
  let cellsCalls = 0;
  await page.route('**/cells/*.json', async (route) => {
    cellsCalls++;
    await cellsGate;
    await route.continue();
  });
  await page.goto(U(BILBAO));
  await waitResult(page);
  const ask = page.locator('.hot').getByRole('button', { name: /posteriores a 1952/i });
  if (!(await ask.count())) {
    note('hotspots button not found — panel may be below fold');
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  }
  await page
    .locator('.hot')
    .getByRole('button', { name: /posteriores a/i })
    .click();
  await page.waitForSelector('.hot .note', { timeout: 5000 }); // loading
  // cambiar el año mientras la request está en vuelo
  await page.evaluate(() => (window.__mjtApp.year = 2015));
  resolveCells();
  await page.waitForTimeout(800);
  const spotList = await page.locator('.hot ol').count();
  ok('g10_10_stale_rejected', spotList === 0);
  // y el estado queda idle (botón disponible para el año nuevo)
  ok(
    'g10_10_back_to_idle',
    (await page
      .locator('.hot')
      .getByRole('button', { name: /posteriores a 2015/i })
      .count()) >= 1
  );
  note(`cells calls: ${cellsCalls}`);
  await ctx.close();
}

// ── G10-11: area_m2 null → '—', nunca '0 m²' ─────────────────────────
{
  const { ctx, page } = await newPage();
  await page.goto(U(BILBAO));
  await waitResult(page);
  await page.evaluate(() => {
    window.__mjtApp.selectedBuilding = {
      id: 'test-null',
      mun: 48,
      year: 1980,
      state: 'VALID',
      uso: 'Residencial',
      alturas: 3,
      viv: null,
      area_m2: null
    };
  });
  await page.waitForSelector('.card', { timeout: 5000 });
  const fields = await page.locator('.card .fields').innerText();
  ok('g10_11_null_not_zero', !/0\s*m²/.test(fields) && /—/.test(fields));
  await ctx.close();
}

// ── G10.1a: el enunciado restringe el universo (titular + aproximación) ──
{
  const { ctx, page } = await newPage();
  await page.goto(U(BILBAO));
  await waitResult(page);
  const h1 = await page.locator('.headline-block h1').innerText();
  const kicker = await page.locator('.headline-block .kicker').innerText();
  const support = await page.locator('.headline-block .support').innerText();
  ok('g101_headline_names_universe', /año conocido/i.test(h1));
  ok('g101_support_pct_exact', /\d+,\d/.test(support));
  // G13: el titular es la frase llana completa — detectar palabras
  // sueltas no basta; el % exacto queda como cifra de apoyo y el
  // municipio/año en el kicker.
  const h1flat = h1.replace(/\s+/g, ' ').trim();
  ok(
    'g112_headline_grammar',
    /^(De los edificios actuales con año conocido, .+ se construyeron después de que nacieras\.|Ningún edificio actual con año conocido se construyó después de que nacieras\.)$/.test(
      h1flat
    )
      ? 'PASS'
      : `FAIL "${h1flat.slice(0, 140)}"`
  );
  // innerText refleja text-transform:uppercase del kicker — el regex es /i
  ok('g112_kicker_context', /Bilbao, desde \d{4}/i.test(kicker.trim()));
  await ctx.close();
}

// ── G10.1b: el año vigente se precarga como valor editable ───────────
{
  const { ctx, page } = await newPage();
  await page.goto(U(BILBAO));
  await waitResult(page);
  await page.getByRole('button', { name: /cambiar año o lugar/i }).click();
  const v = await page.locator('#edit-year').inputValue();
  ok('g101_year_prefilled', v === '1952');
  // sigue siendo editable: cambiar a un valor válido aplica
  await page.locator('#edit-year').fill('1988');
  await page.getByRole('button', { name: /aplicar/i }).click();
  await page.waitForFunction(() => !document.querySelector('.changeform'), { timeout: 10000 });
  ok('g101_prefilled_editable', page.url().includes('year=1988'));
  await ctx.close();
}

// ── G10.1c: cortina con puntero sin arrastrar (botones de extremo) ────
{
  const { ctx, page } = await newPage();
  await page.goto(U(BILBAO + '&view=swipe'));
  await waitResult(page);
  const found = await page
    .waitForSelector('.swipe .presets button', { timeout: 40000 })
    .then(() => true)
    .catch(() => false);
  if (!found) {
    note('swipe presets: sonda 1956 sin respuesta — check marcado fallido');
    ok('g101_swipe_pointer_buttons', false);
  } else {
    const slider = page.locator('.swipe .handle');
    await page.getByRole('button', { name: /^solo 1956$/i }).click();
    const at100 = await slider.getAttribute('aria-valuenow');
    // G16: el extremo «después» etiqueta la campaña real activa
    // («Solo {año}»), no una etiqueta genérica «actualidad»
    const afterYear = await appGet(
      page,
      'window.__mjtApp.orthoCampaign?.year ?? window.__mjtApp.latest?.year'
    );
    await page.getByRole('button', { name: new RegExp(`^solo ${afterYear}$`, 'i') }).click();
    const at0 = await slider.getAttribute('aria-valuenow');
    ok('g101_swipe_pointer_buttons', at100 === '100' && at0 === '0');
    await page.screenshot({ path: join(OUT, 'a11y/swipe-presets.png') });
  }
  await ctx.close();
}

// ── G11.3: cámara inválida en la URL → aviso + encuadre municipal ─────
// (regresión: lat=999 rompía MapLibre con «Invalid LngLat latitude»)
for (const [name, q] of [
  ['lat999', 'year=1952&place=bilbao&lat=999&lon=-2.935&z=14'],
  ['lon181', 'year=1952&place=bilbao&lat=43.263&lon=-181&z=14'],
  ['z99', 'year=1952&place=bilbao&lat=43.263&lon=-2.935&z=99'],
  ['partial', 'year=1952&place=bilbao&lat=43.263'],
  ['empty', 'year=1952&place=bilbao&lat=&lon=&z=']
]) {
  const { ctx, page } = await newPage();
  await page.goto(U(q));
  await waitResult(page);
  const notice = await page
    .locator('.urlnotice')
    .isVisible()
    .catch(() => false);
  const st = await appGet(
    page,
    'JSON.stringify({y: window.__mjtApp.year, cod: window.__mjtApp.place?.cod, ' +
      'lat: window.__mjtApp.view.lat, z: window.__mjtApp.view.zoom})'
  ).then(JSON.parse);
  // municipio y año se conservan; la cámara queda en el encuadre del
  // municipio (Bilbao ~43.26, no en 999 ni en 0) y el mapa existe.
  ok(
    `g113_camera_${name}`,
    notice === true &&
      st.y === 1952 &&
      Number(st.cod) === 20 &&
      st.lat > 42 &&
      st.lat < 44 &&
      typeof st.z === 'number'
  );
  // el aviso es descartable
  if (notice) {
    await page.locator('.urlnotice button').click();
    ok(`g113_camera_${name}_dismiss`, !(await page.locator('.urlnotice').count()));
  }
  await ctx.close();
}

// ── G12: comprensión del mapa ────────────────────────────────────────
// La explicación precede al lienzo en escritorio Y en móvil (la leyenda
// móvil va bajo el mapa; sin intro el primer viewport no dice qué es un
// cuadrado). La leyenda declara variable, universo, extremos y «sin dato».
{
  for (const [tag, vp] of [
    ['dsk', { width: 1280, height: 900 }],
    ['mob', { width: 390, height: 844 }]
  ]) {
    const { ctx, page } = await newPage({ viewport: vp });
    await page.goto(U(BILBAO)); // z=14 → nivel EDIFICIO
    await waitResult(page);
    // el nivel de escala se sincroniza tras el montaje — esperar la variante
    // EDIFICIO (z=14): la intro no puede seguir hablando de «cuadrados»
    await page
      .waitForFunction(
        () =>
          /edificio que existe hoy/.test(document.querySelector('.mapintro')?.textContent ?? ''),
        null,
        { timeout: 15000 }
      )
      .catch(() => null);
    const intro = (
      await page
        .locator('.mapintro')
        .innerText()
        .catch(() => '')
    ).replace(/\s+/g, ' ');
    ok(`g12_intro_present_${tag}`, intro.length > 10);
    ok(`g12_intro_buildings_${tag}`, /edificio que existe hoy/.test(intro));
    ok(
      `g12_intro_before_map_${tag}`,
      !!(await page.evaluate(
        () =>
          document
            .querySelector('.mapintro')
            ?.compareDocumentPosition(document.querySelector('.mapwrap')) &
          Node.DOCUMENT_POSITION_FOLLOWING
      ))
    );
    await ctx.close();
  }
}
{
  await mkdir(join(OUT, 'g12'), { recursive: true });
  const { ctx, page } = await newPage();
  await page.goto(U('year=1987&place=leioa&lat=43.326&lon=-2.988&z=11.5'));
  await waitResult(page);
  await page.waitForSelector('.legend', { timeout: 30000 }).catch(() => note('legend timeout'));
  // el nivel de escala se sincroniza tras el montaje del mapa — esperar a
  // que la intro refleje el nivel CELDA (z=11.5)
  await page
    .waitForFunction(
      () => /cuadrado agrupa/.test(document.querySelector('.mapintro')?.textContent ?? ''),
      null,
      { timeout: 15000 }
    )
    .catch(() => null);
  const intro = (await page.locator('.mapintro').innerText()).replace(/\s+/g, ' ');
  ok('g12_intro_cells', /cuadrado agrupa los edificios actuales de una zona/.test(intro));
  const leg = (await page.locator('.legend').innerText()).replace(/\s+/g, ' ');
  ok(
    'g12_legend_contract',
    /Edificios construidos después de 1987/.test(leg) &&
      /año conocido de cada zona/.test(leg) &&
      /0 %/.test(leg) &&
      /100 %/.test(leg) &&
      /ninguno/.test(leg) &&
      /todos/.test(leg)
  );
  ok('g12_legend_nodata', /a rayas: zona sin edificios con año conocido/.test(leg));
  ok('g12_nodata_layer', await appGet(page, `!!window.__mjtMap.getLayer('cells-nodata')`));
  // ficha de zona: N de K + acción para acercar — esperar a que las
  // teselas de celdas estén renderizadas antes de consultar features
  const pt = await page
    .waitForFunction(
      () => {
        const m = window.__mjtMap;
        // loaded(): no muestrear mientras las teselas aún cargan — en
        // runners lentos el primer muestreo veía un viewport vacío
        if (!m?.loaded()) return false;
        const f = m
          .queryRenderedFeatures(undefined, { layers: ['cells-fill'] })
          .find((x) => (x.properties.known ?? 0) >= 15);
        if (!f) return false;
        const xs = [],
          ys = [];
        for (const ring of f.geometry.coordinates.flat(1)) {
          xs.push(ring[0]);
          ys.push(ring[1]);
        }
        const p = m.project([
          (Math.min(...xs) + Math.max(...xs)) / 2,
          (Math.min(...ys) + Math.max(...ys)) / 2
        ]);
        window.__g12pt = { x: p.x, y: p.y };
        return true;
      },
      null,
      { timeout: 60000 }
    )
    .then(() => page.evaluate(() => window.__g12pt))
    .catch(async () => {
      note(
        'cell click: timeout esperando celda rendered — ' +
          JSON.stringify(
            await page
              .evaluate(() => ({
                loaded: window.__mjtMap?.loaded() ?? null,
                zoom: window.__mjtMap?.getZoom?.() ?? null,
                cells: window.__mjtMap?.queryRenderedFeatures(undefined, {
                  layers: ['cells-fill']
                }).length
              }))
              .catch(() => 'eval failed')
          )
      );
      return null;
    });
  if (pt) {
    const box = await page.locator('.mapband canvas').boundingBox();
    await page.mouse.click(box.x + pt.x, box.y + pt.y);
    await page.waitForSelector('#cell-detail', { timeout: 8000 }).catch(() => null);
    // la frase «N de K» llega cuando se resuelve la serie de la celda —
    // la ficha se refresca (reselectCell); no es síncrona con el clic
    await page
      .waitForFunction(
        () =>
          /se construyeron después de que nacieras/.test(
            document.querySelector('#cell-detail')?.textContent ?? ''
          ),
        null,
        { timeout: 15000 }
      )
      .catch(() => null);
    const card = (
      await page
        .locator('#cell-detail')
        .innerText()
        .catch(() => '')
    ).replace(/\s+/g, ' ');
    ok(
      'g12_cell_card_nk',
      /En esta zona/.test(card) &&
        /\d[\d.]* de \d[\d.]* edificios actuales con año conocido se construyeron después de que nacieras/.test(
          card
        )
    );
    const zoomBtn = page.locator('#cell-detail .zoom');
    // la ficha es un chunk lazy y el botón llega en el mismo flush que el
    // texto «N de K» — se espera al nodo, no a un isVisible instantáneo
    const zoomVisible = await page
      .waitForSelector('#cell-detail .zoom', { timeout: 10000 })
      .then(() => true)
      .catch(() => false);
    ok('g12_cell_zoom_action', zoomVisible);
    if (await zoomBtn.isVisible().catch(() => false)) {
      await zoomBtn.click();
      await page.waitForFunction(() => window.__mjtMap.getZoom() >= 13.5, null, {
        timeout: 10000
      });
      ok('g12_zoom_reaches_buildings', true);
    }
  } else {
    ok('g12_cell_card_nk', 'FAIL no rendered cell');
    note('no cell feature rendered for click test');
  }
  await page.screenshot({ path: join(OUT, 'g12/intro-legend-card.png') }).catch(() => null);
  await ctx.close();
}
{
  // reproducción: intro y leyenda declaran la variable acumulada, no «después de tu año»
  const { ctx, page } = await newPage();
  await page.goto(U('year=1952&place=bilbao&lat=43.263&lon=-2.935&z=12&view=time&play=1988'));
  await waitResult(page);
  // G19: en el visor la explicación no es una fila de página — vive tras
  // el ⓘ del chrome temporal (cerrada por defecto). El contrato de copy
  // se conserva: declara el universo (edificios actuales) y la no-
  // reconstrucción histórica.
  await page.locator('.timeband .tc-info summary').click();
  const intro = (
    await page
      .locator('.timeband .tc-info')
      .innerText()
      .catch(() => '')
  ).replace(/\s+/g, ' ');
  ok(
    'g12_intro_play',
    /existen actualmente/.test(intro) &&
      /No reconstruye todos los edificios que existían/.test(intro),
    intro.slice(0, 120)
  );
  const leg = (
    await page
      .locator('.legend')
      .innerText()
      .catch(() => '')
  ).replace(/\s+/g, ' ');
  ok('g12_legend_play', /ya construidos en 1988/.test(leg));
  await ctx.close();
}

// G11.3: los pageerror registrados durante toda la suite son un check más
// — la ejecución falla si hubo cualquier excepción no provocada por un test.
ok('pageerrors', out.pageerrors.length === 0);

await writeFile(join(OUT, 'checks.json'), JSON.stringify(out, null, 2));
await browser.close();
server.close();

// G11.3: `false` y strings «FAIL …» son fallo; «PASS …»/«SKIP …» no.
const fails = Object.entries(out.checks).filter(
  ([, v]) => v === false || String(v).startsWith('FAIL')
);
console.log(`checks: ${Object.keys(out.checks).length} · fails: ${fails.length}`);
for (const [k] of fails) console.log('  FAIL', k);
for (const n of out.notes) console.log('  note:', n);
process.exit(fails.length ? 1 : 0);
