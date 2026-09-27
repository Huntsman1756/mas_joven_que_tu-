/**
 * LAUNCH QA — smoke funcional con semántica estricta de PASS.
 *
 * Journey (modo por defecto, 3 motores): hero → año+lugar → resultado →
 * mapa → FOTOS (activación de ortofoto) → cambio de lugar.
 *
 * Cada paso OBLIGATORIO tiene una condición de éxito explícita; ningún fallo
 * obligatorio puede convertirse en PASS y el proceso sale con exit≠0.
 * Distinción registrada por separado en FOTOS (no se confunde una con otra):
 *   intención (estado/CTA) · petición (request) · respuesta (200 image) ·
 *   cobertura (sonda AVAILABLE) · contenido (orthoRender CONTENT) · URL.
 *
 * Modos extra (mismo binario, ejecuciones separadas):
 *   --reflow        viewport 320×844 estricto: sin scroll horizontal en el
 *                   documento NI en formulario/panel/menú; controles operables
 *   --csszoom400    ZOOM CSS (document.body.style.zoom=4) — NO es zoom del
 *                   navegador; se declara como tal y se comprueba operabilidad
 *   --textspacing   sobrescrituras WCAG 1.4.12 (line-height, letter-spacing,
 *                   word-spacing, párrafos) + operabilidad
 *                   (zoom real del navegador: NO verificable con esta
 *                   herramienta → pendiente declarado)
 *
 * Fault injection SOLO LOCAL (nunca en CI ni contra producción):
 *   LAUNCH_FAULT=cta_missing|place_noop|raster_blocked|metrics_blocked
 *   → cada fallo debe hacer fallar el smoke (exit≠0). Ver
 *   scripts/launch_smoke_faults.mjs, que los ejecuta y exige exit≠0 + que la
 *   corrida normal posterior vuelva a salir 0.
 *
 * Procedencia: cada corrida escribe su propio fichero
 * `launch-run-<utc>.json` (fecha, motores+versión, stubs, sello del build,
 * HEAD, node, playwright, checks). `launch-smoke.json` es solo un ÍNDICE de
 * corridas (cada entrada con SU fecha): nunca se mezclan resultados de
 * corridas distintas bajo una única fecha.
 *
 * Uso: node scripts/launch_browser_smoke.mjs [--reflow|--csszoom400|--textspacing]
 *      LAUNCH_ENGINES=chromium node scripts/launch_browser_smoke.mjs
 * Salida: LAUNCH_OUT o ../evidence/launch-qa/
 */
import { chromium, firefox, webkit } from 'playwright';
import { createRequire } from 'node:module';
import { writeFile, readFile, mkdir } from 'node:fs/promises';
import { readFileSync, existsSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { join, resolve } from 'node:path';
import { createStaticServer } from './static-server.mjs';

const require = createRequire(import.meta.url);
const ROOT = resolve(process.cwd(), '..');
const BUILD = resolve(process.cwd(), 'build');
const OUT = process.env.LAUNCH_OUT || join(ROOT, 'evidence/launch-qa');
const PORT = 4178;
const FAULT = process.env.LAUNCH_FAULT || null; // SOLO LOCAL
// Identidad de ESTA ejecución: la fija el orquestador (p. ej.
// launch_smoke_faults.mjs) y queda registrada en el informe y en el nombre
// del fichero — un informe sin run_id o con run_id ajeno no acredita esta
// corrida. Sin la variable el uso autónomo del script no cambia.
const RUN_ID = process.env.LAUNCH_RUN_ID || null;
const ENGINE_FILTER = (process.env.LAUNCH_ENGINES || '').split(',').filter(Boolean);

const doReflow = process.argv.includes('--reflow');
const doCssZoom = process.argv.includes('--csszoom400') || process.argv.includes('--zoom400');
const doTextSpacing = process.argv.includes('--textspacing');
const mode = doReflow
  ? 'reflow'
  : doCssZoom
    ? 'csszoom400'
    : doTextSpacing
      ? 'textspacing'
      : 'journey';

if (FAULT && mode !== 'journey') {
  console.error('LAUNCH_FAULT solo aplica al journey (sin flags)');
  process.exit(2);
}

/** timeouts justificados (esperas observables, no sleeps arbitrarios) */
const T = {
  load: 20000,
  result: 25000,
  canvas: 30000,
  state: 20000, // sonda de ortofoto y verdicto de raster
  place: 20000,
  control: 10000
};

await mkdir(OUT, { recursive: true });
const server = await createStaticServer(BUILD, PORT);

// ── procedencia del artefacto bajo prueba ─────────────────────────────────
function provenance() {
  let stamp = 'unknown';
  try {
    const html = readFileSync(join(BUILD, 'index.html'), 'utf8');
    stamp = /mjt:build"\s+content="([^"]+)"/.exec(html)?.[1] ?? 'unknown';
  } catch {
    /* build ausente */
  }
  let gitHead = 'unknown';
  try {
    gitHead = execSync('git rev-parse HEAD', { cwd: ROOT, encoding: 'utf8' }).trim();
  } catch {
    /* sin .git */
  }
  let pwVersion = 'unknown';
  try {
    pwVersion = require('playwright/package.json').version;
  } catch {
    /* exports restringido: se declara desconocido, nunca se inventa */
  }
  return {
    build_stamp: stamp,
    git_head: gitHead,
    build_exists: existsSync(join(BUILD, 'index.html')),
    node: process.version,
    playwright: pwVersion,
    fault: FAULT,
    services:
      FAULT === 'raster_blocked'
        ? 'real + bloqueo local de teselas'
        : 'SERVICIOS REALES (sin stubs)',
    viewport_default: '1280x800'
  };
}
const PROV = provenance();

// ── checks ────────────────────────────────────────────────────────────────
function newChecks() {
  const checks = {};
  const add = (k, ok, detail = '') => {
    checks[k] = { ok: !!ok, detail: String(detail).slice(0, 300) };
    console.log(`${ok ? 'ok  ' : 'FAIL'} ${k}${detail ? ` — ${detail}` : ''}`);
  };
  const failed = () =>
    Object.entries(checks)
      .filter(([, v]) => !v.ok)
      .map(([k]) => k);
  return { checks, add, failed };
}

const ORTO_RE = /orto/i;
const isOrtoUrl = (u) => ORTO_RE.test(u) && !/data\/ortho-previews\//.test(u);

async function journey(browserType, name) {
  const browser = await browserType.launch();
  const engineVersion = browser.version();
  const { checks, add, failed } = newChecks();
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const pageerrors = [];
  const orto = { requests: 0, image200: 0 };
  page.on('pageerror', (e) => pageerrors.push(String(e).slice(0, 200)));
  page.on('request', (r) => {
    if (isOrtoUrl(r.url())) orto.requests++;
  });
  page.on('response', (r) => {
    if (!isOrtoUrl(r.url())) return;
    const ct = r.headers()['content-type'] || '';
    if (r.status() === 200 && ct.startsWith('image/')) orto.image200++;
  });
  if (FAULT === 'raster_blocked') {
    // fallo inyectado LOCALMENTE: se cortan teselas de ortofoto
    await page.route(/orto/i, (route) => route.abort('failed'));
  }
  if (FAULT === 'metrics_blocked') {
    // fallo inyectado LOCALMENTE: el resultado obligatorio nunca aparece
    await page.route(/\/data\/metrics\//, (route) => route.abort('failed'));
  }

  const snap = (f) =>
    page.screenshot({ path: join(OUT, `smoke-${name}${f ? '-fail' : ''}.png`) }).catch(() => {});
  /** paso obligatorio: registra SU check tanto en éxito como en fallo —
   * un paso sin registro no permite demostrar que el escenario se ejecutó */
  const step = async (nm, fn) => {
    try {
      await fn();
      add(nm, true, 'esperado cumplido');
    } catch (e) {
      add(nm, false, `excepción: ${String(e).slice(0, 200)}`);
      throw e;
    }
  };

  try {
    /* ── 1. hero ─────────────────────────────────────────────────────── */
    await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'load', timeout: T.load });
    await step('hero_visible', () => page.waitForSelector('.hero h1', { timeout: T.load }));
    const heroText = (await page.locator('.hero h1').innerText()).trim();
    add('hero_visible', heroText.length > 0, heroText.slice(0, 60));

    /* ── 2. año + lugar + CTA ────────────────────────────────────────── */
    await page.fill('#year-input', '1987');
    await page.fill('#place-input', 'Leioa');
    await page.waitForSelector('#place-listbox button', { timeout: T.place });
    await page.click('#place-listbox button >> nth=0');
    const ctaDisabled = await page.locator('.cta').getAttribute('disabled');
    add('cta_habilitado_con_lugar_elegido', ctaDisabled === null, `disabled=${ctaDisabled}`);
    await page.click('.cta');

    /* ── 3. resultado con el lugar esperado (copy renderizado) ───────── */
    await step('resultado_headline', () =>
      page.waitForSelector('.headline-block h1', { timeout: T.result })
    );
    const h1 = (await page.locator('.headline-block h1').innerText()).trim();
    const kicker = (
      await page
        .locator('.headline-block .kicker')
        .innerText()
        .catch(() => '')
    ).trim();
    add('resultado_headline', h1.length > 0, h1.slice(0, 80));
    add('resultado_es_leioa', /leioa/i.test(kicker), `kicker="${kicker}"`);
    const statePlace = await page.evaluate(() => window.__mjtApp?.place?.slug);
    add('resultado_estado_place', statePlace === 'leioa', `slug=${statePlace}`);

    /* ── 4. mapa pintado ─────────────────────────────────────────────── */
    await step('mapa_canvas_presente', () =>
      page.waitForSelector('.mapband canvas', { timeout: T.canvas })
    );

    /* ── 5. FOTOS: intención → URL → petición → respuesta → cobertura → contenido */
    await page.click('.viewswitch button[data-mode="photo"]');
    await step('fotos_panel_presente', () =>
      page.waitForSelector('.photo', { timeout: T.control })
    );
    const pending = await page.locator('.photo .state.pending').count();
    add('fotos_intencion_estado_inicial', pending === 1, `pending=${pending}`);
    if (FAULT === 'cta_missing') {
      // fallo inyectado LOCALMENTE: el CTA de activación no es utilizable
      await page.addStyleTag({
        content: '.photo [data-action="activate"]{display:none!important}'
      });
    }

    const btn = page.locator('.photo [data-action="activate"]').first();
    const ctaVisible = (await btn.count()) > 0 && (await btn.isVisible().catch(() => false));
    add('fotos_cta_activacion_visible', ctaVisible, `count=${await btn.count()}`);
    if (!ctaVisible) throw new Error('CTA de activación ausente o no utilizable');

    await btn.click();
    // intención registrada por el producto
    await page.waitForFunction(() => window.__mjtApp?.orthoVisible === true, null, {
      timeout: T.state
    });
    add('fotos_intencion_registrada', true, 'orthoVisible=true');
    // URL coherente: modo + campaña
    const url = page.url();
    add('fotos_url_con_ortho', /view=photo/.test(url) && /ortho=/.test(url), url.slice(-90));
    // cobertura: la sonda sale de UNKNOWN
    const coverage = await page
      .waitForFunction(
        () => {
          const s = window.__mjtApp?.orthoState;
          return s && s !== 'UNKNOWN' ? s : false;
        },
        null,
        { timeout: T.state }
      )
      .then((h) => h.jsonValue())
      .catch(() => 'TIMEOUT');
    add('fotos_cobertura_sonda', coverage === 'AVAILABLE', `sonda=${coverage}`);
    // contenido: veredicto de raster del propio producto
    const render = await page
      .waitForFunction(
        () => {
          const s = window.__mjtApp?.orthoRender;
          return s && s !== 'IDLE' && s !== 'LOADING' ? s : false;
        },
        null,
        { timeout: T.state }
      )
      .then((h) => h.jsonValue())
      .catch(() => 'TIMEOUT');
    add('fotos_contenido_render', render === 'CONTENT', `orthoRender=${render}`);
    add('fotos_peticion_orto', orto.requests > 0, `${orto.requests} peticiones`);
    add('fotos_respuesta_imagen_200', orto.image200 > 0, `${orto.image200} imágenes 200`);

    /* ── 6. cambio de lugar → Getxo (estado + URL + copy) ────────────── */
    if (FAULT === 'place_noop') {
      // fallo inyectado LOCALMENTE: el commit del lugar no aplica
      await page.evaluate(() => {
        window.__mjtApp.commitSearch = async () => {};
      });
    }
    await page.click('.change');
    await step('cambio_lugar_formulario', () =>
      page.waitForSelector('.changeform', { timeout: T.control })
    );
    await page.fill('#place-input', 'Getxo');
    await page.waitForSelector('#place-listbox button', { timeout: T.place });
    await page.click('#place-listbox button >> nth=0');
    await page.locator('.cf-submit').click();
    const placeOk = await page
      .waitForFunction(() => window.__mjtApp?.place?.slug === 'getxo', null, { timeout: T.place })
      .then(() => true)
      .catch(() => false);
    add(
      'cambio_lugar_estado_getxo',
      placeOk,
      `slug=${await page.evaluate(() => window.__mjtApp?.place?.slug)}`
    );
    add('cambio_lugar_url', page.url().includes('place=getxo'), page.url().slice(-70));
    const kicker2 = (
      await page
        .locator('.headline-block .kicker')
        .innerText()
        .catch(() => '')
    ).trim();
    add(
      'cambio_lugar_copy_getxo',
      /getxo/i.test(kicker2) && !/leioa/i.test(kicker2),
      `kicker="${kicker2}"`
    );

    await snap(false);
    add('sin_pageerrors', pageerrors.length === 0, pageerrors.join(' | '));
  } catch (e) {
    add('ejecucion_sin_excepcion', false, String(e).slice(0, 300));
    await snap(true);
  } finally {
    await page.close().catch(() => {});
    await browser.close().catch(() => {});
  }
  const failedList = failed();
  return {
    engine: name,
    engine_version: engineVersion,
    pass: failedList.length === 0,
    failed: failedList,
    checks
  };
}

/* ── reflow 320×844 estricto ────────────────────────────────────────────── */
async function reflowRun() {
  const { checks, add, failed } = newChecks();
  const browser = await chromium.launch();
  const engineVersion = browser.version();
  const page = await browser.newPage({ viewport: { width: 320, height: 844 } });
  try {
    await page.goto(`http://localhost:${PORT}/?year=1987&place=leioa`, {
      waitUntil: 'load',
      timeout: T.load
    });
    await page.waitForSelector('.headline-block h1', { timeout: T.result });
    const audit = await page.evaluate(() => {
      const vw = document.documentElement.clientWidth;
      const docScroll = document.documentElement.scrollWidth;
      // fuera del bloque del mapa: cualquier elemento que desborde el
      // viewport es un problema (formulario, panel, menú, documento)
      const inMap = (el) => !!el.closest('.mapband, .swipe, .tclayer, .tcpanel');
      const offenders = [];
      for (const el of document.querySelectorAll('body *')) {
        const r = el.getBoundingClientRect();
        if (r.width < 2 || r.height < 2) continue;
        if (r.right > vw + 1 && !inMap(el)) {
          offenders.push({
            tag: el.tagName,
            cls: String(el.className).slice(0, 50),
            right: Math.round(r.right)
          });
        }
      }
      return { vw, docScroll, offenders: offenders.slice(0, 8) };
    });
    add(
      'reflow_sin_scroll_horizontal_documento',
      audit.docScroll <= audit.vw + 1,
      `scrollW=${audit.docScroll} vw=${audit.vw}`
    );
    add(
      'reflow_fuera_del_mapa_sin_desborde',
      audit.offenders.length === 0,
      JSON.stringify(audit.offenders)
    );
    const h1Visible = await page.locator('.headline-block h1').isVisible();
    add('reflow_titular_visible', h1Visible);
    // controles operables en móvil: el trigger «Vista — modo» es `.vsel`
    // (hermano del nav .viewswitch; a ≤700px el nav se oculta a propósito)
    const menuBtn = page.locator('.vsel');
    const hasMenu = (await menuBtn.count()) > 0 && (await menuBtn.isVisible());
    add('reflow_menu_de_modos_presente', hasMenu);
    if (hasMenu) {
      await menuBtn.click();
      await page.locator('[role="menuitemradio"]', { hasText: 'Fotos' }).first().click({
        timeout: T.control
      });
      const mode = await page.evaluate(() => window.__mjtApp?.mode);
      add('reflow_control_operable', mode === 'photo', `mode=${mode}`);
    } else {
      add('reflow_control_operable', false, 'sin menú de modos en 320px');
    }
    const canvas = (await page.locator('.mapband canvas').count()) > 0;
    add('reflow_mapa_presente', canvas);
    await page.screenshot({ path: join(OUT, 'reflow-320.png'), fullPage: true });
  } catch (e) {
    add('reflow_sin_excepcion', false, String(e).slice(0, 300));
    await page.screenshot({ path: join(OUT, 'reflow-320-fail.png') }).catch(() => {});
  } finally {
    await page.close().catch(() => {});
    await browser.close().catch(() => {});
  }
  const failedList = failed();
  return {
    engine: `chromium ${engineVersion}`,
    pass: failedList.length === 0,
    failed: failedList,
    checks
  };
}

/* ── ZOOM CSS 400 % (NO es zoom del navegador) ──────────────────────────── */
async function cssZoomRun() {
  const { checks, add, failed } = newChecks();
  const browser = await chromium.launch();
  const engineVersion = browser.version();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  let observed = null;
  try {
    await page.goto(`http://localhost:${PORT}/?year=1987&place=leioa`, {
      waitUntil: 'load',
      timeout: T.load
    });
    await page.waitForSelector('.headline-block h1', { timeout: T.result });
    await page.evaluate(() => {
      document.body.style.zoom = '4';
    });
    await page.waitForFunction(() => document.body.style.zoom === '4', null, { timeout: 5000 });
    const box = await page.locator('.headline-block h1').boundingBox();
    add(
      'csszoom_titular_con_caja',
      !!box && box.width > 0 && box.height > 0,
      box ? `${Math.round(box.width)}x${Math.round(box.height)}` : 'sin caja'
    );
    // operabilidad: el selector de modos sigue respondiendo con zoom aplicado
    const vs = page.locator('.viewswitch button[data-mode="photo"]');
    const vsVisible = (await vs.count()) > 0 && (await vs.isVisible().catch(() => false));
    add('csszoom_control_visible', vsVisible);
    if (vsVisible) {
      await vs.click({ timeout: T.control });
      const mode = await page.evaluate(() => window.__mjtApp?.mode);
      add('csszoom_control_operable', mode === 'photo', `mode=${mode}`);
    } else {
      add('csszoom_control_operable', false, 'selector de modos no visible con zoom CSS');
    }
    // solapamiento que impida leer: el titular no debe quedar con caja nula
    // ni tapado por su propio contenedor (altura del panel ≥ altura del h1)
    const panel = await page.locator('.headline-block').boundingBox();
    add(
      'csszoom_panel_envuelve_titular',
      !!panel && !!box && panel.height >= box.height - 1,
      panel && box ? `panel=${Math.round(panel.height)} h1=${Math.round(box.height)}` : 'sin caja'
    );
    await page.screenshot({ path: join(OUT, 'csszoom-400.png') });
    observed = await page.evaluate(() => ({
      zoom_css: document.body.style.zoom,
      docScrollW: document.documentElement.scrollWidth,
      viewportW: document.documentElement.clientWidth
    }));
  } catch (e) {
    add('csszoom_sin_excepcion', false, String(e).slice(0, 300));
    await page.screenshot({ path: join(OUT, 'csszoom-400-fail.png') }).catch(() => {});
  } finally {
    await page.close().catch(() => {});
    await browser.close().catch(() => {});
  }
  const failedList = failed();
  return {
    engine: `chromium ${engineVersion}`,
    pass: failedList.length === 0,
    failed: failedList,
    observed,
    note:
      'ZOOM CSS (document.body.style.zoom): el layout NO se refluye en un viewport menor, ' +
      'por eso el desbordamiento horizontal es esperado aquí. NO acredita reflow, ' +
      'NO es zoom del navegador (WCAG 1.4.4) ni zoom de texto — esos siguen pendientes.',
    checks
  };
}

/* ── espaciado de texto (WCAG 1.4.12 simulado por inyección) ───────────── */
const TEXT_SPACING_CSS = `
  * { line-height: 1.5 !important; letter-spacing: 0.12em !important; word-spacing: 0.16em !important; }
  p { margin-bottom: 2em !important; }
`;
async function textSpacingRun() {
  const { checks, add, failed } = newChecks();
  const browser = await chromium.launch();
  const engineVersion = browser.version();
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  try {
    await page.goto(`http://localhost:${PORT}/?year=1987&place=leioa`, {
      waitUntil: 'load',
      timeout: T.load
    });
    await page.waitForSelector('.headline-block h1', { timeout: T.result });
    // condición observable: el line-height del titular cambia tras inyectar
    // el espaciado (si la hoja no se aplica, el check posterior falla)
    const lhBefore = await page.evaluate(
      () => getComputedStyle(document.querySelector('.headline-block h1')).lineHeight
    );
    await page.addStyleTag({ content: TEXT_SPACING_CSS });
    await page
      .waitForFunction(
        (prev) =>
          getComputedStyle(document.querySelector('.headline-block h1')).lineHeight !== prev,
        lhBefore,
        { timeout: 5000 }
      )
      .catch(() => {});
    const lhAfter = await page.evaluate(
      () => getComputedStyle(document.querySelector('.headline-block h1')).lineHeight
    );
    add('espaciado_aplicado', lhAfter !== lhBefore, `${lhBefore} → ${lhAfter}`);
    const audit = await page.evaluate(() => {
      const vw = document.documentElement.clientWidth;
      const inMap = (el) => !!el.closest('.mapband, .swipe, .tclayer, .tcpanel');
      const offenders = [];
      for (const el of document.querySelectorAll('body *')) {
        const r = el.getBoundingClientRect();
        if (r.width < 2 || r.height < 2) continue;
        if (r.right > vw + 1 && !inMap(el)) {
          offenders.push({ tag: el.tagName, cls: String(el.className).slice(0, 50) });
        }
      }
      const h1 = document.querySelector('.headline-block h1');
      return {
        docScroll: document.documentElement.scrollWidth,
        vw,
        offenders: offenders.slice(0, 8),
        h1H: h1 ? h1.getBoundingClientRect().height : 0
      };
    });
    add('espaciado_titular_legible', audit.h1H > 0, `altura=${Math.round(audit.h1H)}px`);
    add(
      'espaciado_sin_scroll_horizontal',
      audit.docScroll <= audit.vw + 1,
      `scrollW=${audit.docScroll} vw=${audit.vw}`
    );
    add(
      'espaciado_fuera_del_mapa_sin_desborde',
      audit.offenders.length === 0,
      JSON.stringify(audit.offenders)
    );
    // recorrido operable tras el espaciado: cambiar de modo
    const vs = page.locator('.viewswitch button[data-mode="photo"]');
    const vsVisible = (await vs.count()) > 0 && (await vs.isVisible().catch(() => false));
    if (vsVisible) {
      await vs.click({ timeout: T.control });
      const mode = await page.evaluate(() => window.__mjtApp?.mode);
      add('espaciado_control_operable', mode === 'photo', `mode=${mode}`);
    } else {
      add('espaciado_control_operable', false, 'selector de modos no visible');
    }
    await page.screenshot({ path: join(OUT, 'textspacing.png'), fullPage: true });
  } catch (e) {
    add('espaciado_sin_excepcion', false, String(e).slice(0, 300));
    await page.screenshot({ path: join(OUT, 'textspacing-fail.png') }).catch(() => {});
  } finally {
    await page.close().catch(() => {});
    await browser.close().catch(() => {});
  }
  const failedList = failed();
  return {
    engine: `chromium ${engineVersion}`,
    pass: failedList.length === 0,
    failed: failedList,
    checks
  };
}

/* ── runner ─────────────────────────────────────────────────────────────── */
const ENGINES = [
  ['chromium', chromium],
  ['firefox', firefox],
  ['webkit', webkit]
].filter(([n]) => ENGINE_FILTER.length === 0 || ENGINE_FILTER.includes(n));

const run = {
  utc: new Date().toISOString(),
  run_id: RUN_ID,
  mode,
  provenance: PROV,
  engines: {},
  reflow: null,
  csszoom400: null,
  textspacing: null
};
let anyFailed = false;

try {
  if (mode === 'journey') {
    for (const [name, bt] of ENGINES) {
      const r = await journey(bt, name);
      run.engines[name] = r;
      if (!r.pass) anyFailed = true;
      console.log(
        `${name} (${r.engine_version}): ${r.pass ? 'PASS' : 'FAIL'} ${r.failed.join(',')}`
      );
    }
  } else if (mode === 'reflow') {
    run.reflow = await reflowRun();
    if (!run.reflow.pass) anyFailed = true;
    console.log(`reflow: ${run.reflow.pass ? 'PASS' : 'FAIL'} ${run.reflow.failed.join(',')}`);
  } else if (mode === 'csszoom400') {
    run.csszoom400 = await cssZoomRun();
    if (!run.csszoom400.pass) anyFailed = true;
    console.log(
      `csszoom400 (CSS, NO zoom de navegador): ${run.csszoom400.pass ? 'PASS' : 'FAIL'} ${run.csszoom400.failed.join(',')}`
    );
  } else if (mode === 'textspacing') {
    run.textspacing = await textSpacingRun();
    if (!run.textspacing.pass) anyFailed = true;
    console.log(
      `textspacing (WCAG 1.4.12 simulado): ${run.textspacing.pass ? 'PASS' : 'FAIL'} ${run.textspacing.failed.join(',')}`
    );
  }
} finally {
  // createStaticServer devuelve el http.Server (close() NO es una promesa)
  try {
    server.close();
  } catch {
    /* ya cerrado */
  }
}

// ── escritura de evidencia: fichero PROPIO por corrida + índice ───────────
const stamp = run.utc.replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z');
const runFile = join(
  OUT,
  `launch-run-${stamp}${FAULT ? `-${FAULT}` : ''}${RUN_ID ? `-${RUN_ID.slice(0, 8)}` : ''}.json`
);
run.pass = !anyFailed;
await writeFile(runFile, JSON.stringify(run, null, 1));

const indexPath = join(OUT, 'launch-smoke.json');
let index = { runs: [] };
try {
  const prev = JSON.parse(await readFile(indexPath, 'utf8'));
  index = Array.isArray(prev.runs) ? prev : { runs: [] };
} catch {
  /* primera corrida */
}
index.runs.push({
  utc: run.utc,
  run_id: RUN_ID,
  mode,
  fault: FAULT,
  pass: run.pass,
  file: runFile.split(/[\\/]/).slice(-1)[0],
  failed: anyFailed
    ? Object.entries(run.engines)
        .flatMap(([n, e]) => e.failed.map((f) => `${n}:${f}`))
        .concat(
          run.reflow?.failed || [],
          run.csszoom400?.failed || [],
          run.textspacing?.failed || []
        )
    : []
});
await writeFile(indexPath, JSON.stringify(index, null, 1));

console.log('run →', runFile);
console.log('índice →', indexPath);
console.log(anyFailed ? 'LAUNCH SMOKE FAIL' : 'LAUNCH SMOKE PASS');
process.exitCode = anyFailed ? 1 : 0;
