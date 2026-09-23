/**
 * G18 — Reproductor temporal de Evolución (un único control: play/pausa +
 * scrubber + hitos personales). Regresión E2E del modelo de interacción:
 *
 *   - un solo control coherente (sin «Reproducir»/«Reiniciar»/«10 años»
 *     como botones independientes);
 *   - play avanza, pausa congela, fin exacto en el snapshot;
 *   - Play en actualidad = empezar desde el nacimiento;
 *   - scrubber accesible (role=slider, aria-valuetext con edad, flechas,
 *     PageUp/Down ±10, Home=nacimiento, End=actualidad);
 *   - hitos personales saltan a su año (clic) y tienen accessible name;
 *   - contexto editorial «año · tenías N» se actualiza;
 *   - track de tres tramos (antes de nacer / vivido / pendiente);
 *   - URL `play=` se restaura tras recarga (eventos discretos, no por frame);
 *   - reduced-motion: sin Play, nota accesible, scrubber operativo;
 *   - móvil: sin scroll horizontal, play/pause + hito funcionan.
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

// ── Escritorio: modelo de un solo control ────────────────────────────
{
  const { ctx, page } = await newPage();
  await page.goto(U('year=1952&place=bilbao&view=time'));
  await waitResult(page);
  await page.waitForSelector('.timeband', { timeout: 15000 });

  // un único reproductor: play + año/contexto + eje
  ok('g18_player_present', await page.locator('.timeband .playbtn').isVisible());
  ok(
    'g18_now_context',
    /\b1952\b/.test(await page.locator('.timeband .now-year').innerText()) &&
      /Naciste/i.test(await page.locator('.timeband .now-ctx').innerText())
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

  // slider accesible: role nativo + metadatos de rango
  const scrub = page.locator('.timeband .scrub');
  const sem = await scrub.evaluate((el) => ({
    role: el.getAttribute('role') ?? 'slider', // input[type=range] ⇒ slider implícito
    min: el.min,
    max: el.max,
    valuetext: el.getAttribute('aria-valuetext'),
    label: el.getAttribute('aria-label')
  }));
  ok('g18_slider_semantics', sem.min === '1900' && sem.max >= '2024' && !!sem.label);
  ok('g18_valuetext', /1952/.test(sem.valuetext) && /Naciste/.test(sem.valuetext));

  // hitos: Naciste · 10 años · 18 · 30 · 50 · Hoy
  const msYears = await page
    .locator('.timeband [data-action="milestone"]')
    .evaluateAll((els) => els.map((e) => Number(e.dataset.year)).sort((a, b) => a - b));
  ok(
    'g18_milestones',
    JSON.stringify(msYears) === JSON.stringify([1952, 1962, 1970, 1982, 2002, 2026])
  );
  note(`hitos: ${JSON.stringify(msYears)}`);
  const msNames = await page
    .locator('.timeband [data-action="milestone"]')
    .evaluateAll((els) => els.map((e) => e.getAttribute('aria-label')));
  ok(
    'g18_milestone_names',
    msNames.some((n) => /Naciste/.test(n)) && msNames.some((n) => /10 años/.test(n))
  );

  // track de tres tramos: antes de nacer (pre) + vivido (done, aún 0) + base
  const segs = await page.evaluate(() => ({
    pre: document.querySelector('.timeband .seg-pre')?.getBoundingClientRect().width ?? 0,
    done: document.querySelector('.timeband .seg-done') !== null,
    base: document.querySelector('.timeband .seg-base') !== null
  }));
  ok('g18_track', segs.pre > 0 && segs.base === true && segs.done === false);

  // aria del botón play
  ok(
    'g18_play_aria',
    /Reproducir evolución/i.test(await page.locator('.playbtn').getAttribute('aria-label'))
  );
  await ctx.close();
}

// ── Escritorio: play → avanza → pausa → scrub → hito → End → recarga ──
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

  // Pause: congela el cabezal
  await page.locator('.timeband [data-action="play"]').click();
  await page.waitForFunction(() => window.__mjtApp.playing === false);
  const p1 = await head(page);
  await page.waitForTimeout(500);
  ok('g18_pause_freezes', (await head(page)) === p1);
  note(`pausado en ${p1}`);

  // teclado: PageUp +10 · End → actualidad · Home → nacimiento
  await page.locator('.timeband .scrub').focus();
  await page.keyboard.press('PageUp');
  ok('g18_pageup', (await head(page)) === Math.min(p1 + 10, 2026));
  await page.keyboard.press('End');
  const snap = await appGet(page, 'window.__mjtApp.catalog?.snapshot_year ?? 2026');
  ok('g18_end_today', (await head(page)) === snap);
  await page.keyboard.press('Home');
  ok('g18_home_birth', (await head(page)) === 1952);
  await page.keyboard.press('ArrowRight');
  ok('g18_arrow', (await head(page)) === 1953);

  // scrub directo a 1970 → contexto «tenías 18 años»
  await page.evaluate(() => {
    const s = document.querySelector('.timeband .scrub');
    s.value = '1970';
    s.dispatchEvent(new Event('input', { bubbles: true }));
    s.dispatchEvent(new Event('change', { bubbles: true }));
  });
  ok('g18_scrub_1970', (await head(page)) === 1970);
  ok(
    'g18_context_age',
    /tenías 18 años/i.test(await page.locator('.timeband .now-ctx').innerText())
  );
  ok(
    'g18_valuetext_age',
    /1970.*18/.test(await page.locator('.timeband .scrub').getAttribute('aria-valuetext'))
  );
  ok('g18_seg_done', await page.locator('.timeband .seg-done').isVisible());

  // hito «10 años» → 1962
  await page.locator('.timeband [data-action="milestone"][data-year="1962"]').click();
  ok('g18_milestone_click', (await head(page)) === 1962);
  ok(
    'g18_context_ms',
    /tenías 10 años/i.test(await page.locator('.timeband .now-ctx').innerText())
  );

  // la URL registró el salto (evento discreto, replaceState)
  await page.waitForTimeout(300);
  ok('g18_url_play', /play=1962/.test(page.url()));

  // recarga → restaura el cabezal (deep link honesto)
  await page.reload({ waitUntil: 'load' });
  await waitResult(page);
  await page.waitForSelector('.timeband', { timeout: 15000 });
  ok(
    'g18_reload_restores',
    (await head(page)) === 1962 && (await appGet(page, 'window.__mjtApp.mode')) === 'time'
  );

  // Play en actualidad = empezar desde el nacimiento
  await page.locator('.timeband .scrub').focus();
  await page.keyboard.press('End');
  await page.locator('.timeband [data-action="play"]').click();
  await page.waitForFunction(() => window.__mjtApp.playing === true);
  ok('g18_restart_from_birth', (await head(page)) >= 1952 && (await head(page)) < 1960);

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
  // hito táctil
  await page.locator('.timeband [data-action="milestone"][data-year="2002"]').tap();
  ok('g18_mobile_milestone', (await head(page)) === 2002);
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
for (const [k] of fails) console.log('  FAIL', k);
for (const n of out.notes) console.log('  note:', n);
process.exit(fails.length ? 1 : 0);
