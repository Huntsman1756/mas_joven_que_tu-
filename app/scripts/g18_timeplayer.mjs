/**
 * G18-R — Reproductor temporal de Evolución como control cartográfico:
 * play/pausa + año + scrubber con ticks, sin capa biográfica.
 * Regresión E2E del modelo de interacción corregido (G11-R):
 *
 *   - un único control compacto (sin «Reproducir»/«Reiniciar»/hitos de
 *     edad como botones ni textos «tenías N años»/«Naciste»);
 *   - play avanza, pausa congela, fin exacto en el snapshot;
 *   - Play en actualidad = empezar desde el año elegido;
 *   - scrubber accesible (slider nativo, aria-valuetext = año, flechas,
 *     PageUp/Down ±10, Home=año elegido, End=actualidad);
 *   - marcador sutil del año elegido (.ymark) sobre el eje;
 *   - ticks de década con año completo de 4 dígitos (regresión «45»);
 *   - explicación metodológica solo en el disclosure «Qué muestra esta
 *     vista» (cerrado por defecto);
 *   - URL `play=` se restaura tras recarga (eventos discretos);
 *   - reduced-motion: sin Play, nota accesible, scrubber operativo;
 *   - móvil: sin scroll horizontal, play/pause + scrub funcionan;
 *   - altura del control contenida (el mapa es el protagonista).
 *
 * Uso: node scripts/g18_timeplayer.mjs   (cwd = app/ con build/ presente)
 */
import { chromium } from 'playwright';
import { writeFile, mkdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { createStaticServer } from './static-server.mjs';
import { installCiFixtures } from './fixtures.mjs';

const ROOT = resolve(process.cwd(), '..');
const BUILD = resolve(process.cwd(), 'build');
const OUT = join(ROOT, 'evidence/g18');
const PORT = 4218;
const BASE = `http://localhost:${PORT}`;
const U = (q) => `${BASE}/?${q}`;

const server = await createStaticServer(BUILD, PORT);
await mkdir(OUT, { recursive: true });

const out = { checks: {}, notes: [], pageerrors: [] };
const ok = (k, v) => (out.checks[k] = v);
const note = (s) => out.notes.push(s);

const browser = await chromium.launch();
async function newPage(ctxOpts = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, ...ctxOpts });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => {
    note(`PAGEERROR: ${e.message}`);
    out.pageerrors.push(String(e.message).slice(0, 300));
  });
  if (process.env.CI_STUBS === '1') await installCiFixtures(page);
  return { ctx, page };
}
async function waitResult(page) {
  await page.waitForSelector('.headline-block h1.lead', { timeout: 30000 });
}
const appGet = (page, expr) => page.evaluate((e) => eval(e), expr);
const head = (page) => appGet(page, 'window.__mjtApp.playYear');

// ── Escritorio: modelo de un solo control, sin biografía ────────────
{
  const { ctx, page } = await newPage();
  await page.goto(U('year=1952&place=bilbao&view=time'));
  await waitResult(page);
  await page.waitForSelector('.timeband', { timeout: 15000 });

  ok('g18_player_present', await page.locator('.timeband .playbtn').isVisible());
  ok(
    'g18_now_year',
    (await page.locator('.timeband .now').innerText()).trim() === '1952'
  );

  // la biografía ya no es la interfaz: ni hitos de edad, ni contexto,
  // ni «Volver al presente», ni caption permanente
  const bio = await page.evaluate(() => {
    const q = (s) => document.querySelector(s) !== null;
    const txt = document.querySelector('.timeband')?.innerText ?? '';
    return {
      ms: q('.timeband .ms') || q('.timeband [data-action="milestone"]'),
      ctx: q('.timeband .now-ctx'),
      quiet: q('.timeband .t-quiet'),
      note: q('.timeband .t-note'),
      reset: q('.timeband [data-action="reset"]'),
      words: /naciste|tenías \d+|antes de nacer|volver al presente/i.test(txt)
    };
  });
  ok(
    'g18_no_biography',
    !bio.ms && !bio.ctx && !bio.quiet && !bio.note && !bio.reset && !bio.words,
    JSON.stringify(bio)
  );

  // los tres botones antiguos no existen (ni por texto ni por acción)
  const legacy = await page.evaluate(() =>
    [...document.querySelectorAll('.timeband button')].map((b) => b.textContent.trim())
  );
  ok(
    'g18_no_legacy_buttons',
    !legacy.some((s) => /^(Reproducir|Pausar|Reiniciar|Cuando tenías)/i.test(s))
  );
  note(`botones presentes: ${JSON.stringify(legacy)}`);

  // slider accesible: role nativo + metadatos de rango + año completo
  const sem = await page.locator('.timeband .scrub').evaluate((el) => ({
    min: el.min,
    max: el.max,
    valuetext: el.getAttribute('aria-valuetext'),
    label: el.getAttribute('aria-label')
  }));
  ok('g18_slider_semantics', sem.min === '1900' && sem.max >= '2024' && !!sem.label);
  ok('g18_valuetext_year', sem.valuetext === '1952', sem.valuetext);

  // marcador sutil del año elegido (única marca personal del eje)
  ok(
    'g18_year_marker',
    await page.locator('.timeband .ymark[data-year="1952"]').count() === 1
  );

  // ticks de década: año completo de 4 dígitos, posición proporcional
  const decades = await page.$$eval('.timeband .decade', (els) =>
    els.map((e) => ({ y: e.textContent.trim(), left: parseFloat(e.style.left) }))
  );
  ok(
    'g18_ticks_4digit',
    decades.length >= 3 && decades.every((d) => /^\d{4}$/.test(d.y)),
    JSON.stringify(decades.map((d) => d.y))
  );
  ok(
    'g18_ticks_proportional',
    Math.abs(decades[0].left) <= 1 && Math.abs(decades[decades.length - 1].left - 95.24) < 2,
    JSON.stringify([decades[0]?.left, decades[decades.length - 1]?.left])
  );

  // explicación metodológica solo bajo demanda: disclosure cerrado
  const info = await page.evaluate(() => {
    const d = document.querySelector('.timeband .t-info');
    const summary = d?.querySelector('summary');
    const body = d?.querySelector('.t-info-body');
    return {
      exists: !!d && !!summary && !!body,
      closed: d ? !d.open : null,
      bodyHidden: body ? body.getBoundingClientRect().height === 0 : null,
      label: summary?.textContent?.trim() ?? ''
    };
  });
  ok(
    'g18_disclosure',
    info.exists && info.closed === true && /qué muestra/i.test(info.label),
    JSON.stringify(info)
  );
  await page.locator('.timeband .t-info summary').click();
  const infoTxt = await page.locator('.timeband .t-info').innerText();
  ok('g18_disclosure_body', /parque|edificios/i.test(infoTxt), infoTxt.slice(0, 120));

  // altura contenida: el control no compite con el mapa (≤ ~110px)
  const h = await page.evaluate(
    () => document.querySelector('.timeband')?.getBoundingClientRect().height ?? 999
  );
  ok('g18_compact_height', h <= 110, `h=${Math.round(h)}`);

  // track: base + relleno hasta el cabezal
  const segs = await page.evaluate(() => ({
    base: document.querySelector('.timeband .seg-base') !== null,
    done: document.querySelector('.timeband .seg-done') !== null
  }));
  ok('g18_track', segs.base && segs.done);

  // aria del botón play
  ok(
    'g18_play_aria',
    /Reproducir evolución/i.test(await page.locator('.playbtn').getAttribute('aria-label'))
  );
  await page.screenshot({ path: join(OUT, 'player-compact.png') });
  await ctx.close();
}

// ── Escritorio: play → avanza → pausa → scrub → End → recarga ──────
{
  const { ctx, page } = await newPage();
  await page.goto(U('year=1952&place=bilbao&view=time'));
  await waitResult(page);
  await page.waitForSelector('.timeband .playbtn', { timeout: 15000 });

  // Play: avanza cronológicamente
  await page.locator('.timeband [data-action="play"]').click();
  await page.waitForFunction(() => window.__mjtApp.playing === true);
  const y0 = await head(page);
  await page.waitForTimeout(900);
  const y1 = await head(page);
  ok('g18_play_advances', y1 > y0);
  note(`avance: ${y0}→${y1}`);
  ok(
    'g18_pause_aria',
    /Pausar evolución/i.test(await page.locator('.playbtn').getAttribute('aria-label'))
  );
  // el año mostrado acompaña al cabezal
  ok('g18_now_follows', (await page.locator('.timeband .now').innerText()).trim() === String(y1));

  // Pause: congela el cabezal
  await page.locator('.timeband [data-action="play"]').click();
  await page.waitForFunction(() => window.__mjtApp.playing === false);
  const p1 = await head(page);
  await page.waitForTimeout(500);
  ok('g18_pause_freezes', (await head(page)) === p1);
  note(`pausado en ${p1}`);

  // teclado: PageUp +10 · End → actualidad · Home → año elegido
  await page.locator('.timeband .scrub').focus();
  await page.keyboard.press('PageUp');
  ok('g18_pageup', (await head(page)) === Math.min(p1 + 10, 2026));
  await page.keyboard.press('End');
  const snap = await appGet(page, 'window.__mjtApp.catalog?.snapshot_year ?? 2026');
  ok('g18_end_today', (await head(page)) === snap);
  await page.keyboard.press('Home');
  ok('g18_home_year', (await head(page)) === 1952);
  await page.keyboard.press('ArrowRight');
  ok('g18_arrow', (await head(page)) === 1953);

  // scrub directo a 1970
  await page.evaluate(() => {
    const s = document.querySelector('.timeband .scrub');
    s.value = '1970';
    s.dispatchEvent(new Event('input', { bubbles: true }));
    s.dispatchEvent(new Event('change', { bubbles: true }));
  });
  ok('g18_scrub_1970', (await head(page)) === 1970);
  ok(
    'g18_valuetext_follows',
    (await page.locator('.timeband .scrub').getAttribute('aria-valuetext')) === '1970'
  );
  ok('g18_seg_done', await page.locator('.timeband .seg-done').isVisible());

  // la URL registró el salto (evento discreto, replaceState)
  await page.waitForTimeout(300);
  ok('g18_url_play', /play=1970/.test(page.url()));

  // recarga → restaura el cabezal (deep link honesto)
  await page.reload({ waitUntil: 'load' });
  await waitResult(page);
  await page.waitForSelector('.timeband', { timeout: 15000 });
  ok(
    'g18_reload_restores',
    (await head(page)) === 1970 && (await appGet(page, 'window.__mjtApp.mode')) === 'time'
  );

  // Play en actualidad = empezar desde el año elegido
  await page.locator('.timeband .scrub').focus();
  await page.keyboard.press('End');
  await page.locator('.timeband [data-action="play"]').click();
  await page.waitForFunction(() => window.__mjtApp.playing === true);
  ok('g18_restart_from_year', (await head(page)) >= 1952 && (await head(page)) < 1960);

  // fin exacto: con la reproducción en curso, el cabezal a snap-1 llega
  // al final en el siguiente tick — clicar aquí sería pausar (toggle), no
  // arrancar. Si por timing ya hubiera parado, un Play arranca desde snap-1.
  await page.evaluate((s) => (window.__mjtApp.playYear = s - 1), snap);
  if (!(await appGet(page, 'window.__mjtApp.playing'))) {
    await page.locator('.timeband [data-action="play"]').click();
  }
  await page.waitForFunction((s) => window.__mjtApp.playYear === s, snap, { timeout: 15000 });
  await page.waitForTimeout(400);
  ok(
    'g18_exact_end',
    (await head(page)) === snap && (await appGet(page, 'window.__mjtApp.playing')) === false
  );
  await page.screenshot({ path: join(OUT, 'player-end.png') });
  await ctx.close();
}

// ── Reduced-motion ───────────────────────────────────────────────────
{
  const { ctx, page } = await newPage({ reducedMotion: 'reduce' });
  await page.goto(U('year=1952&place=bilbao&view=time'));
  await waitResult(page);
  await page.waitForSelector('.timeband', { timeout: 15000 });
  ok('g18_rm_no_play', (await page.locator('.timeband [data-action="play"]').count()) === 0);
  ok('g18_rm_note', /movimiento reducido/i.test(await page.locator('.timeband').innerText()));
  // el slider sigue operativo: End → actualidad
  await page.locator('.timeband .scrub').focus();
  await page.keyboard.press('End');
  const snap = await appGet(page, 'window.__mjtApp.catalog?.snapshot_year ?? 2026');
  ok('g18_rm_slider_works', (await head(page)) === snap);
  await ctx.close();
}

// ── Móvil ────────────────────────────────────────────────────────────
{
  const { ctx, page } = await newPage({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true
  });
  await page.goto(U('year=1952&place=bilbao&view=time'));
  await waitResult(page);
  await page.waitForSelector('.timeband', { timeout: 15000 });
  ok(
    'g18_mobile_no_hscroll',
    await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)
  );
  ok('g18_mobile_play', await page.locator('.timeband .playbtn').isVisible());
  await page.locator('.timeband [data-action="play"]').tap();
  await page.waitForFunction(() => window.__mjtApp.playing === true);
  ok('g18_mobile_playing', true);
  await page.locator('.timeband [data-action="play"]').tap();
  await page.waitForFunction(() => window.__mjtApp.playing === false);
  // scrub táctil: tocar el eje mueve el cabezal a esa posición
  const before = await head(page);
  const axis = await page.locator('.timeband .axis').boundingBox();
  await page.touchscreen.tap(axis.x + axis.width * 0.9, axis.y + axis.height / 2);
  await page.waitForTimeout(400);
  const after = await head(page);
  ok('g18_mobile_scrub', after !== null && after > before, `${before}→${after}`);
  // altura contenida también en móvil
  const h = await page.evaluate(
    () => document.querySelector('.timeband')?.getBoundingClientRect().height ?? 999
  );
  ok('g18_mobile_height', h <= 130, `h=${Math.round(h)}`);
  await page.screenshot({ path: join(OUT, 'player-mobile.png') });
  await ctx.close();
}

// G11.3: cualquier pageerror registrado es un fallo bloqueante.
ok('pageerrors', out.pageerrors.length === 0);

await writeFile(join(OUT, 'checks.json'), JSON.stringify(out, null, 2));
await browser.close();
server.close();

const fails = Object.entries(out.checks).filter(
  ([, v]) => v === false || String(v).startsWith('FAIL')
);
console.log(`checks: ${Object.keys(out.checks).length} · fails: ${fails.length}`);
for (const [k, v] of fails) console.log('  FAIL', k, v === false ? '' : v);
for (const n of out.notes) console.log('  note:', n);
process.exit(fails.length ? 1 : 0);
