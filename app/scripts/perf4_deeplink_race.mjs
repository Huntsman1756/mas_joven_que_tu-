/**
 * PERF4-R — matriz de restauración de deep links (§14) y de
 * carreras/fallos (§15) bajo las fronteras lazy. No es timing.
 *
 * Deep links: cada estado serializado debe restaurar igual que antes;
 * building= no depende de interacción previa ni del flujo de dirección.
 *
 * Carreras: doble clic, cambio de vista/lugar/edificio mientras el chunk
 * resuelve, histórico abortado, back/forward durante la carga.
 * Criterio: sin UI residual, sin pageerror ni unhandledrejection.
 *
 * Salida: LAZY_OUT o ../evidence/g3/g3d/perf4-remediation/deeplink-race.json
 * Uso: node scripts/perf4_deeplink_race.mjs
 */
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import { writeFile, mkdir } from 'node:fs/promises';
import { join, resolve, basename } from 'node:path';
import { createStaticServer } from './static-server.mjs';
import { installCiFixtures } from './fixtures.mjs';

// Nombre real del chunk de dirección desde el manifiesto (hashes por build)
const manifest = JSON.parse(
  readFileSync(join('.svelte-kit', 'output', 'client', '.vite', 'manifest.json'), 'utf8')
);
const ADDRESS_CHUNK = basename(manifest['src/lib/components/AddressSearch.svelte'].file);

const ROOT = resolve(process.cwd(), '..');
const BUILD = resolve(process.cwd(), 'build');
const OUT = process.env.LAZY_OUT || join(ROOT, 'evidence/g3/g3d/perf4-remediation');
const PORT = 4191;

await mkdir(OUT, { recursive: true });
const server = await createStaticServer(BUILD, PORT);
const BASE = `http://localhost:${PORT}/`;

const BILBAO_BLD = `${BASE}?year=2024&place=bilbao&lat=43.27513&lon=-2.95964&z=17&building=20-1116-2001-1-2`;

const results = { utc: new Date().toISOString(), deeplink: {}, race: {} };

async function watch(page) {
  const errs = [];
  page.on('pageerror', (e) => errs.push(String(e).slice(0, 160)));
  // CI_STUBS=1: servicios externos stubbados (la suite mide la app).
  if (process.env.CI_STUBS === '1') await installCiFixtures(page);
  return errs;
}

const browser = await chromium.launch();
try {
  // ══════════ §14 — DEEP-LINK RESTORE ══════════
  const cases = [
    {
      name: 'year_place',
      url: `${BASE}?year=1987&place=leioa`,
      assert: (a) => a.year === 1987 && Number(a.place?.cod) === 54
    },
    {
      name: 'camera',
      url: `${BASE}?year=1987&place=bilbao&lat=43.26298&lon=-2.93493&z=14.5`,
      assert: (a) => Math.abs(a.view?.lat - 43.26298) < 0.001 && a.view?.zoom === 14.5
    },
    {
      name: 'building',
      url: BILBAO_BLD,
      assert: (a) => a.selectedBuilding?.id === '20-1116-2001-1-2'
    },
    {
      name: 'compare',
      url: `${BASE}?year=1987&place=leioa&compare=1960`,
      assert: (a) => a.compareYear === 1960
    },
    {
      name: 'view_photo',
      url: `${BASE}?year=1987&place=leioa&view=photo`,
      assert: (a) => a.mode === 'photo'
    },
    {
      name: 'play',
      url: `${BASE}?year=1987&place=leioa&view=time&play=2003`,
      assert: (a) => a.mode === 'time' && (a.playYear === 2003 || a.playing === true)
    }
  ];
  for (const c of cases) {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    const errs = await watch(page);
    await page.goto(c.url, { waitUntil: 'load' });
    await page.waitForSelector('.headline-block h1', { timeout: 30000 });
    await page.waitForTimeout(1500);
    const st = await page.evaluate(() => {
      const a = window.__mjtApp;
      return {
        year: a.year,
        place: a.place && { cod: a.place.cod },
        view: a.view,
        selectedBuilding: a.selectedBuilding && { id: a.selectedBuilding.id },
        compareYear: a.compareYear,
        mode: a.mode,
        playYear: a.playYear,
        playing: a.playing
      };
    });
    results.deeplink[c.name] = {
      state: st,
      console_errors: errs,
      pass: c.assert(st) && errs.length === 0
    };
    // reload = mismo estado restaurado
    await page.reload({ waitUntil: 'load' });
    await page.waitForSelector('.headline-block h1', { timeout: 30000 });
    await page.waitForTimeout(1500);
    const st2 = await page.evaluate(() => {
      const a = window.__mjtApp;
      return {
        year: a.year,
        place: a.place && { cod: a.place.cod },
        view: a.view,
        selectedBuilding: a.selectedBuilding && { id: a.selectedBuilding.id },
        compareYear: a.compareYear,
        mode: a.mode,
        playYear: a.playYear,
        playing: a.playing
      };
    });
    results.deeplink[c.name].reload_same = c.assert(st2);
    results.deeplink[c.name].pass = results.deeplink[c.name].pass && c.assert(st2);
    await page.close();
  }

  // ══════════ §15 — CARRERAS / FALLOS ══════════

  // R1: doble clic rápido en la invitación de dirección → un solo panel, sin errores
  {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    const errs = await watch(page);
    await page.goto(`${BASE}?year=1987&place=leioa`, { waitUntil: 'load' });
    await page.waitForSelector('.headline-block h1', { timeout: 30000 });
    await page.evaluate(() => document.querySelector('.below')?.scrollIntoView({ block: 'end' }));
    const btn = page.locator('.invite .start');
    await btn.waitFor({ timeout: 15000 });
    await btn.click();
    await btn.click({ force: true }).catch(() => {});
    await page.waitForSelector('.addr', { timeout: 15000 });
    const forms = await page.locator('.addr').count();
    results.race.double_click_address = {
      addr_panels: forms,
      console_errors: errs,
      pass: forms === 1 && errs.length === 0
    };
    await page.close();
  }

  // R2: MAPA → FOTO → MAPA antes de que el chunk resuelva
  {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    const errs = await watch(page);
    await page.route('**/_app/immutable/chunks/*.js', async (r) => {
      await new Promise((res) => setTimeout(res, 250)); // latencia artificial
      return r.continue();
    });
    await page.goto(`${BASE}?year=1987&place=leioa`, { waitUntil: 'load' });
    await page.waitForSelector('.headline-block h1', { timeout: 30000 });
    await page.locator(".viewswitch button[data-mode='photo']").click();
    await page.locator(".viewswitch button[data-mode='map']").click();
    await page.waitForTimeout(1200);
    const st = await page.evaluate(() => window.__mjtApp.mode);
    results.race.photo_switch_during_load = {
      mode_after: st,
      console_errors: errs,
      pass: st === 'map' && errs.length === 0
    };
    await page.unrouteAll();
    await page.close();
  }

  // R3: cambio de lugar mientras el chunk de dirección resuelve
  {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    const errs = await watch(page);
    await page.route(`**/${ADDRESS_CHUNK}`, async (r) => {
      await new Promise((res) => setTimeout(res, 400));
      return r.continue();
    });
    await page.goto(`${BASE}?year=1987&place=leioa`, { waitUntil: 'load' });
    await page.waitForSelector('.headline-block h1', { timeout: 30000 });
    await page.evaluate(() => document.querySelector('.below')?.scrollIntoView({ block: 'end' }));
    await page.waitForSelector('.invite .start', { timeout: 15000 });
    await page.locator('.invite .start').click();
    // cambio de municipio por la UI real mientras el chunk resuelve
    await page.locator('.topbar .change').click();
    await page.locator('#place-input').fill('bilbao');
    await page.locator('#place-listbox [role="option"]').first().click();
    await page.locator('.changeform button[type="submit"]').click();
    await page.waitForTimeout(2500);
    const st = await page.evaluate(() => ({
      cod: window.__mjtApp.place?.cod,
      addr: document.querySelectorAll('.addr').length
    }));
    results.race.place_change_during_address = {
      place_after: st.cod,
      addr_panels: st.addr,
      console_errors: errs,
      pass: Number(st.cod) === 20 && errs.length === 0
    };
    await page.unrouteAll();
    await page.close();
  }

  // R4: cambio de edificio mientras el chunk de profundidad resuelve
  {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    const errs = await watch(page);
    await page.goto(BILBAO_BLD, { waitUntil: 'load' });
    await page.waitForSelector('.headline-block h1', { timeout: 30000 });
    await page.waitForFunction(() => window.__mjtApp?.selectedBuilding !== null, {
      timeout: 30000
    });
    // swap de identidad mientras depth/dominios resuelven: el guard de
    // ensure* debe impedir facets del edificio viejo
    await page.evaluate(() => {
      const a = window.__mjtApp;
      a.selectedBuilding = { id: '20-9999-9999-9-9', mun: '020', year: 1990 };
    });
    await page.waitForTimeout(2000);
    const st = await page.evaluate(() => ({
      bid: window.__mjtApp.selectedBuilding?.id,
      localBid: window.__mjtApp.planningLocalBid,
      ctxBid: window.__mjtApp.contextLocalBid
    }));
    const consistent =
      st.bid === '20-9999-9999-9-9' &&
      (st.localBid === null || st.localBid === st.bid) &&
      (st.ctxBid === null || st.ctxBid === st.bid);
    results.race.building_swap_during_depth = {
      state: st,
      console_errors: errs,
      pass: consistent && errs.length === 0
    };
    await page.close();
  }

  // R5: clic histórico con raster abortado (fail-closed, igual que g3c)
  {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    const errs = await watch(page);
    await page.route('**/ORTO_EJ_CARTO_1925/**', (r) => r.abort());
    await page.goto(`${BASE}?year=1987&place=leioa`, { waitUntil: 'load' });
    await page.waitForSelector('.headline-block h1', { timeout: 30000 });
    await page.locator(".viewswitch button[data-mode='hist']").click();
    await page.waitForFunction(() => window.__mjtApp?.histMapState === 'UNAVAILABLE', {
      timeout: 30000
    });
    const sections = await page.locator('.histmap').count();
    results.race.histmap_aborted = {
      state: 'UNAVAILABLE',
      sections,
      console_errors: errs,
      pass: sections === 1 && errs.length === 0
    };
    await page.close();
  }

  // R6: back/forward durante carga lazy (FOTO atrás)
  {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    const errs = await watch(page);
    await page.goto(`${BASE}?year=1987&place=leioa`, { waitUntil: 'load' });
    await page.waitForSelector('.headline-block h1', { timeout: 30000 });
    await page.locator(".viewswitch button[data-mode='photo']").click();
    await page.goBack();
    await page.waitForTimeout(800);
    const st = await page.evaluate(() => window.__mjtApp.mode);
    results.race.back_during_lazy = {
      mode_after_back: st,
      console_errors: errs,
      pass: st === 'map' && errs.length === 0
    };
    await page.close();
  }

  // R7 (G11.3): chunk lazy abortado → alerta accesible + reintento que
  // recupera el panel; el contenido ya cargado se conserva. La excepción
  // esperada es el propio fallo de red: debe quedar capturada por el
  // componente (sin pageerror).
  {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    const errs = await watch(page);
    await page.route(`**/${ADDRESS_CHUNK}`, (r) => r.abort());
    await page.goto(`${BASE}?year=1987&place=leioa`, { waitUntil: 'load' });
    await page.waitForSelector('.headline-block h1', { timeout: 30000 });
    await page.evaluate(() => document.querySelector('.below')?.scrollIntoView({ block: 'end' }));
    await page.waitForSelector('.invite .start', { timeout: 15000 });
    await page.locator('.invite .start').click();
    // .invite se sustituye por el Lazy: la alerta aparece en su lugar
    const alert = page.locator('.below [role="alert"]');
    await alert.waitFor({ timeout: 15000 });
    const alertText = await alert.innerText();
    const headlineStillThere = (await page.locator('.headline-block h1').count()) === 1;
    // el reintento recarga la página (el module map cachea el fallo del
    // import para toda la sesión — no hay otra recuperación real). El
    // estado vive en la URL: tras la recarga el resultado sigue ahí y el
    // panel se puede abrir ya con la red sana.
    await page.unroute(`**/${ADDRESS_CHUNK}`);
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'load' }),
      page.locator('.below [role="alert"] button', { hasText: 'Recargar' }).click()
    ]);
    await page.waitForSelector('.headline-block h1', { timeout: 30000 });
    const stateKept = await page.evaluate(() => ({
      year: window.__mjtApp?.year,
      cod: window.__mjtApp?.place?.cod
    }));
    await page.evaluate(() => document.querySelector('.below')?.scrollIntoView({ block: 'end' }));
    await page.waitForSelector('.invite .start', { timeout: 15000 });
    await page.locator('.invite .start').click();
    const recovered = await page
      .waitForSelector('.addr', { timeout: 15000 })
      .then(() => true)
      .catch(() => false);
    results.race.lazy_chunk_failure = {
      alert_visible: true,
      alert_text: alertText.slice(0, 140),
      headline_kept: headlineStillThere,
      state_after_reload: stateKept,
      recovered,
      console_errors: errs,
      pass:
        /no se pudo cargar/i.test(alertText) &&
        headlineStillThere &&
        stateKept.year === 1987 &&
        Number(stateKept.cod) === 54 &&
        recovered &&
        errs.length === 0
    };
    await page.close();
  }
} finally {
  results.pass =
    Object.values(results.deeplink).every((j) => j.pass) &&
    Object.values(results.race).every((j) => j.pass);
  await writeFile(join(OUT, 'deeplink-race.json'), JSON.stringify(results, null, 2));
  server.close();
  await browser.close();
}
console.log(JSON.stringify(results, null, 2));
process.exit(results.pass ? 0 : 1);
