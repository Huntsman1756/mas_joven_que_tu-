/**
 * G4-R — bug hunt (research-only). Escenarios de combinación de estado que
 * las suites felices no cubren. NO arregla nada: documenta.
 * Uso: node scripts/g4r_bughunt.mjs
 */
import { chromium } from 'playwright';
import { writeFile, mkdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { createStaticServer } from './static-server.mjs';

const ROOT = resolve(process.cwd(), '..');
const BUILD = resolve(process.cwd(), 'build');
const OUT = join(ROOT, 'evidence/g4/research');
const PORT = 4191;
const BASE = `http://localhost:${PORT}`;
const U = (q) => `${BASE}/?${q}`;
const server = await createStaticServer(BUILD, PORT);
await mkdir(OUT, { recursive: true });

const browser = await chromium.launch({ args: ['--disable-gpu'] });
const bugs = [];
const log = (id, sev, title, repro, expected, observed) =>
  bugs.push({ id, severity: sev, title, repro, expected, observed });
const note = (id, ok, obs) =>
  bugs.push({
    id,
    severity: 'NOTE',
    title: 'comportamiento verificado',
    expected: 'coherente',
    repro: '-',
    observed: `${ok ? 'OK' : 'ANOMALÍA'}: ${obs}`
  });

const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
page.setDefaultTimeout(12000);
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(m.text().slice(0, 200));
});
const ready = async () => {
  await page
    .waitForSelector('.mapband canvas, .headline-block h1', { timeout: 25000 })
    .catch(() => {});
  await page.waitForTimeout(600);
};

// B1 — deep link con TODOS los params combinados
await page.goto(
  U(
    'year=1975&place=abadino&lat=43.17&lon=-2.62&z=14&view=time&play=1990&compare=1960&building=1-1017-2001-1-1&ortho=2009'
  )
);
await ready();
await page.waitForTimeout(3000);
const s1 = await page.evaluate(() => {
  const a = window.__mjtApp;
  return {
    phase: a.phase,
    mode: a.mode,
    playYear: a.playYear,
    compare: a.compareYear,
    building: a.selectedBuilding?.id ?? a.pendingBuildingId,
    ortho: a.orthoCampaign?.year,
    orthoVisible: a.orthoVisible
  };
});
note('B1', s1.mode === 'time' && s1.compare === 1960 && !!s1.building, JSON.stringify(s1));

// B2 — orthoVisible + view=photo simultáneos en URL
await page.goto(U('year=1987&place=leioa&view=photo&ortho=2009'));
await ready();
await page.waitForTimeout(2500);
const s2 = await page.evaluate(() => {
  const a = window.__mjtApp;
  return {
    mode: a.mode,
    orthoVisible: a.orthoVisible,
    campaign: a.orthoCampaign?.year,
    state: a.orthoState
  };
});
note('B2', true, JSON.stringify(s2));

// B3 — cambio rápido de vistas
await page.goto(U('year=1987&place=leioa'));
await ready();
for (const v of ['time', 'photo', 'map', 'time', 'photo', 'map']) {
  await page
    .click(`text=${v === 'time' ? 'TIEMPO' : v === 'photo' ? 'FOTO' : 'MAPA'}`)
    .catch(() => {});
  await page.waitForTimeout(120);
}
await page.waitForTimeout(3000);
const s3 = await page.evaluate(() => ({ mode: window.__mjtApp.mode, errs: 0 }));
const errsAfterB3 = errors.length;
log(
  'B3',
  errsAfterB3 > 0 ? 'MINOR' : 'NOTE',
  'cambio rápido de vistas',
  'map→time→photo×2 en ~120ms',
  'sin errores JS, modo final coherente',
  `mode=${s3.mode} errs=${errsAfterB3}`
);

// B4 — back/forward entre estados profundos
await page.goto(U('year=1987&place=leioa'));
await ready();
await page.click('text=TIEMPO').catch(() => {});
await page.waitForTimeout(500);
await page.goBack();
await page.waitForTimeout(1200);
const s4a = await page.evaluate(() => ({ mode: window.__mjtApp.mode, url: location.search }));
await page.goForward();
await page.waitForTimeout(1200);
const s4b = await page.evaluate(() => ({ mode: window.__mjtApp.mode, url: location.search }));
log(
  'B4',
  s4a.mode !== 'map' || s4b.mode !== 'time' ? 'MAJOR' : 'NOTE',
  'back/forward vista',
  'time→back→forward',
  'back→map, forward→time',
  `back:${JSON.stringify(s4a)} fwd:${JSON.stringify(s4b)}`
);

// B5 — histórico activo + Back (NO serializado — verificación del hallazgo)
await page.goto(U('year=1970&place=bilbao&lat=43.262&lon=-2.935&z=13'));
await ready();
await page.click('text=Ver el mapa histórico').catch(() => {});
await page.waitForTimeout(3500);
const h1 = await page.evaluate(() => window.__mjtApp.histMapVisible);
const urlWithHist = await page.evaluate(() => location.search);
await page.reload();
await ready();
await page.waitForTimeout(1000);
const h2 = await page.evaluate(() => window.__mjtApp.histMapVisible);
log(
  'B5',
  h1 && !h2 ? 'MINOR' : 'NOTE',
  'histórico no sobrevive reload',
  'activar histórico → reload',
  'decidir si histmap debe ser compartible',
  `visible antes=${h1}, url tenía hist?=${urlWithHist.includes('hist')}, tras reload=${h2}`
);

// B6 — cambiar de lugar con edificio+compare activos (destructividad)
await page.goto(U('year=1975&place=abadino&building=1-1017-2001-1-1&compare=1960'));
await ready();
await page.waitForTimeout(2500);
// cambiar de lugar via PlaceSearch del topbar (cambiar → form)
await page.click('text=Cambiar').catch(() => {});
await page.waitForTimeout(500);
const placeInput = page.locator('#place-input').last();
if (await placeInput.count()) {
  await placeInput.fill('Getxo');
  await page.waitForTimeout(800);
  await page.keyboard.press('Enter');
  await page.waitForTimeout(2500);
}
const s6 = await page.evaluate(() => {
  const a = window.__mjtApp;
  return {
    place: a.place?.name,
    building: a.selectedBuilding?.id,
    compare: a.compareYear,
    url: location.search
  };
});
note('B6', s6.place === 'Getxo' && !s6.building && !s6.compare, JSON.stringify(s6));

// B7 — dos peticiones de métricas fuera de orden (delay artificial)
await page.route('**/metrics/bilbao.json', async (r) => {
  await new Promise((res) => setTimeout(res, 3000));
  await r.continue();
});
await page.goto(U('year=1987&place=leioa'));
await ready();
// cambiar rápido a bilbao y luego a leioa? usar __mjtApp.selectPlace indirecto:
// navegar por URL push: cambiar place param via hero no disponible en result;
// usar cambiar→place
await page.click('text=Cambiar').catch(() => {});
await page.waitForTimeout(400);
const pi2 = page.locator('#place-input').last();
if (await pi2.count()) {
  await pi2.fill('Bilbao');
  await page.waitForTimeout(600);
  await page.keyboard.press('Enter');
  // inmediatamente elegir otro
  await pi2.fill('Leioa').catch(() => {});
  await page.waitForTimeout(600);
  await page.keyboard.press('Enter').catch(() => {});
  await page.waitForTimeout(4500);
}
const s7 = await page.evaluate(() => ({
  place: window.__mjtApp.place?.name,
  metricsMun: window.__mjtApp.metrics?.municipality?.name
}));
note('B7', s7.place === s7.metricsMun, `place=${s7.place} metrics=${s7.metricsMun}`);
await page.unroute('**/metrics/bilbao.json');

// B8 — doble submit del hero
await page.goto(U(''));
await page.waitForSelector('#year-input');
await page.fill('#year-input', '1987');
await page.fill('#place-input', 'leioa');
await page.waitForTimeout(600);
await page.keyboard.press('ArrowDown');
await page.keyboard.press('Enter');
await page.waitForTimeout(300);
await page.click('button.cta').catch(() => {});
await page.click('button.cta').catch(() => {});
await page.waitForTimeout(3000);
const s8 = await page.evaluate(() => ({ phase: window.__mjtApp.phase }));
note('B8', s8.phase === 'result', JSON.stringify({ ...s8, errs: errors.length }));

// B9 — Escape en disclosures/detalles
await page.goto(U('year=1987&place=leioa'));
await ready();
await page.click('button.start').catch(() => {});
await page.waitForTimeout(400);
await page.keyboard.press('Escape');
await page.waitForTimeout(400);
const addrStillOpen = await page.evaluate(() => !!document.querySelector('section.addr input'));
log(
  'B9',
  addrStillOpen ? 'MINOR' : 'NOTE',
  'Escape no cierra MI EDIFICIO',
  'abrir búsqueda → Escape',
  'Escape cierra disclosure (convención)',
  `formulario sigue abierto=${addrStillOpen}`
);

// B10 — resize durante overlay contextual
await page.goto(U('year=1975&place=abadino&building=1-1017-2001-1-1'));
await ready();
await page.waitForTimeout(2500);
await page
  .locator('.ctx button.geom')
  .first()
  .click()
  .catch(() => {});
await page.waitForTimeout(2000);
await page.setViewportSize({ width: 390, height: 844 });
await page.waitForTimeout(1500);
const s10 = await page.evaluate(() => ({ overlay: !!window.__mjtApp.contextOverlay }));
note('B10', s10.overlay, JSON.stringify({ ...s10, errs: errors.length }));

// B11 — reload con ortho= inválido y view=photo
await page.goto(U('year=1987&place=leioa&view=photo&ortho=9999'));
await ready();
await page.waitForTimeout(2500);
const s11 = await page.evaluate(() => {
  const a = window.__mjtApp;
  return { mode: a.mode, ortho: a.orthoCampaign, visible: a.orthoVisible, state: a.orthoState };
});
note('B11', s11.mode === 'photo', JSON.stringify({ ...s11, errs: errors.length }));

// B12 — click rápido repetido en overlay context (abort races)
await page.goto(U('year=1975&place=abadino&building=1-1017-2001-1-1'));
await ready();
await page.waitForTimeout(2500);
const geom = page.locator('.ctx button.geom').first();
for (let i = 0; i < 4; i++) {
  await geom.click().catch(() => {});
  await page.waitForTimeout(150);
}
await page.waitForTimeout(2500);
const s12 = await page.evaluate(() => ({ overlay: window.__mjtApp.contextOverlay?.mod ?? null }));
note(
  'B12',
  true,
  `toggle ×4 rápido → overlay=${JSON.stringify(s12.overlay)} errs=${errors.length}`
);

// B13 — año inválido en URL
await page.goto(U('year=1800&place=leioa'));
await ready();
const s13 = await page.evaluate(() => ({
  phase: window.__mjtApp.phase,
  year: window.__mjtApp.year
}));
note('B13', s13.phase === 'intro' || s13.year === null, JSON.stringify(s13));

// B14 — compare == year (partición degenerada)
await page.goto(U('year=1987&place=leioa&compare=1987'));
await ready();
await page.waitForTimeout(1500);
const s14 = await page.evaluate(() => ({
  compare: window.__mjtApp.compareYear,
  year: window.__mjtApp.year
}));
note(
  'B14',
  s14.compare === 1987,
  `compare===year aceptado=${JSON.stringify(s14)} — partición vacía entre ellos`
);

// B15 — snapshot de errores JS globales acumulados
log(
  'B15',
  errors.length > 0 ? 'MINOR' : 'NOTE',
  'errores JS acumulados en sesión',
  'toda la batería',
  '0 errores pageerror/console.error',
  `${errors.length} errores: ${[...new Set(errors)].slice(0, 5).join(' | ') || 'ninguno'}`
);

await writeFile(join(OUT, 'bugs.json'), JSON.stringify(bugs, null, 2));
await browser.close();
server.close();
console.log('bugs/notes:', bugs.length);
for (const b of bugs) console.log(b.severity, b.id, b.title, '→', b.observed.slice(0, 120));
