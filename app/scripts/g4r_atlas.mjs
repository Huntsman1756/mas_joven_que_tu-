/**
 * G4-R — atlas de estados del producto (research-only, fuera del build).
 * Recorre estados user-facing con deep links + interacciones y captura
 * screenshots + métricas de layout por estado.
 * Uso: node scripts/g4r_atlas.mjs   (cwd = app/ con build/ presente)
 */
import { chromium } from 'playwright';
import { writeFile, mkdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { createStaticServer } from './static-server.mjs';

const ROOT = resolve(process.cwd(), '..');
const BUILD = resolve(process.cwd(), 'build');
const OUT = join(ROOT, 'evidence/g4/research/state-atlas');
const PORT = 4190;
const BASE = `http://localhost:${PORT}`;
const U = (q) => (q ? `${BASE}/?${q}` : `${BASE}/`);

const server = await createStaticServer(BUILD, PORT);
await mkdir(OUT, { recursive: true });

const browser = await chromium.launch({ args: ['--disable-gpu'] });
const atlas = [];

const DT = { width: 1440, height: 900 };
const MB = { width: 390, height: 844 };
const ALL = [
  { width: 320, height: 720, tag: 'w320' },
  { width: 390, height: 844, tag: 'w390' },
  { width: 768, height: 1024, tag: 'w768' },
  { width: 1440, height: 900, tag: 'w1440' },
  { width: 1920, height: 1080, tag: 'w1920' }
];

async function metrics(page) {
  return page.evaluate(() => {
    const doc = document.documentElement;
    const count = (s) => document.querySelectorAll(s).length;
    const sections = [...document.querySelectorAll('section, main > div, .below > *')].map(
      (el) => ({
        tag: el.tagName.toLowerCase(),
        cls: (el.className?.toString() ?? '').slice(0, 60),
        h: Math.round(el.getBoundingClientRect().height),
        top: Math.round(el.getBoundingClientRect().top + scrollY)
      })
    );
    return {
      scrollHeight: doc.scrollHeight,
      viewportH: innerHeight,
      scrolls: +(doc.scrollHeight / innerHeight).toFixed(1),
      h: [count('h1'), count('h2'), count('h3'), count('h4')],
      buttons: count('button'),
      links: count('a[href]'),
      inputs: count('input, select, textarea'),
      details: count('details'),
      sections,
      actionsFirstViewport: [
        ...document.querySelectorAll('button, a[href], input, summary')
      ].filter((el) => {
        const r = el.getBoundingClientRect();
        return r.top >= 0 && r.bottom <= innerHeight && r.width > 0;
      }).length
    };
  });
}

async function shot(page, name, tag, opts = {}) {
  const m = await metrics(page).catch(() => null);
  const file = `${name}${tag ? `-${tag}` : ''}.png`;
  await page.screenshot({ path: join(OUT, file), fullPage: opts.fullPage ?? false });
  atlas.push({ state: name, viewport: tag ?? 'default', file, metrics: m, note: opts.note ?? '' });
  console.log('shot', file);
}

async function waitReady(page, timeout = 25000) {
  // mapa listo o fallback: headline presente
  await page
    .waitForSelector('.mapband canvas, .headline-block h1, .boot-err', { timeout })
    .catch(() => {});
}

async function goto(page, q, opts = {}) {
  await page.goto(U(q), { waitUntil: 'load' });
  if (opts.early) return; // captura durante carga
  await waitReady(page, opts.timeout ?? 25000);
  await page.waitForTimeout(opts.settle ?? 700);
}

async function scrollToSel(page, sel) {
  await page.evaluate((s) => {
    const el = document.querySelector(s);
    if (el) el.scrollIntoView({ block: 'center' });
  }, sel);
  await page.waitForTimeout(500);
}

const ctx = await browser.newContext({ viewport: DT });
const page = await ctx.newPage();
page.setDefaultTimeout(15000);

// ---------- INITIAL ----------
await goto(page, '');
await shot(page, '01-intro', 'w1440');
await page.fill('#year-input', '1987');
await shot(page, '02-year-entered', 'w1440');
await page.fill('#place-input', 'bil');
await page.waitForSelector('#place-listbox', { timeout: 5000 }).catch(() => {});
await page.waitForTimeout(400);
await shot(page, '03-place-suggestions', 'w1440');
// loading: navegar y capturar antes del settle
await page.goto(U('year=1987&place=leioa'));
await page.waitForTimeout(300);
await shot(page, '04-result-loading', 'w1440', { note: 'captura intermedia de carga' });
await waitReady(page);
await page.waitForTimeout(800);

// ---------- CORE (Leioa como caso neutro) ----------
const Q = 'year=1987&place=leioa';
await goto(page, Q);
await shot(page, '05-result-ready', 'w1440');
// clic en celda del mapa → tooltip/detalle
await page.click('.mapband canvas', { position: { x: 700, y: 400 } }).catch(() => {});
await page.waitForTimeout(900);
await shot(page, '06-mapa-cell', 'w1440', { note: 'tras tap en centro del mapa' });
await goto(page, `${Q}&view=time`);
await shot(page, '07-tiempo-paused', 'w1440');
await page.click('button.t-btn.primary').catch(() => {});
await page.waitForTimeout(1500);
await shot(page, '08-tiempo-playing', 'w1440', { note: 'play en curso (~1.5s)' });
await page.click('button.t-btn.primary').catch(() => {});
await goto(page, `${Q}&play=2025`);
await shot(page, '09-tiempo-endpoint', 'w1440', { note: 'cabezal en fin de serie' });
await goto(page, `${Q}&view=photo`, { settle: 2500 });
await shot(page, '10-foto', 'w1440');
await goto(page, Q);

// FOTO no cubierta / error: interceptar el WMS de probe
const routeOrtho = async (p, handler) => p.route('**/WMS_ORTOARGAZKIAK**', handler, { times: 30 });
await routeOrtho(page, (r) => r.fulfill({ status: 404, body: '' }));
await goto(page, `${Q}&view=photo`, { settle: 2500 });
await shot(page, '11-foto-not-covered', 'w1440', { note: 'WMS probe forzado 404' });
await page.unroute('**/WMS_ORTOARGAZKIAK**');
await routeOrtho(page, (r) => r.abort());
await goto(page, `${Q}&view=photo`, { settle: 2500 });
await shot(page, '12-foto-error', 'w1440', { note: 'WMS probe abortado' });
await page.unroute('**/WMS_ORTOARGAZKIAK**');

// ---------- HISTÓRICO ----------
await goto(page, 'year=1970&place=bilbao&lat=43.262&lon=-2.935&z=13');
await scrollToSel(page, '.histmap');
await shot(page, '13-histmap-proposal', 'w1440');
await page.click('text=Ver el mapa histórico').catch(() => {});
await page.waitForTimeout(3500);
await shot(page, '14-histmap-after-click', 'w1440', { note: 'estado tras opt-in (cubierto o no)' });
await goto(page, Q);

// ---------- PERSONAL ----------
await scrollToSel(page, '.addr, button.start');
await shot(page, '15-address-closed', 'w1440');
await page.click('button.start').catch(() => {});
await page.waitForTimeout(600);
await shot(page, '16-address-open', 'w1440');
// calle con varias candidatas en Leioa? usar Bilbao para candidatas múltiples
await goto(page, 'year=1987&place=bilbao');
await scrollToSel(page, 'button.start');
await page.click('button.start').catch(() => {});
await page.waitForTimeout(400);
const streetInput = page.locator('section.addr input').first();
await streetInput.fill('Ercilla').catch(() => {});
await page.waitForTimeout(2500);
await shot(page, '17-address-street', 'w1440', { note: 'candidatas o calle resuelta' });
// seleccionar primera candidata si listbox
const opt = page.locator('section.addr [role="option"], section.addr ul button').first();
if (await opt.count()) {
  await opt.click().catch(() => {});
  await page.waitForTimeout(2000);
}
// portal con variantes: Gran Vía 1 tenía 8 variantes en corpus
const num = page.locator('#addr-num, section.addr input[inputmode="numeric"]').first();
if (await num.count()) await num.fill('1').catch(() => {});
await page.click('section.addr button.go').catch(() => {});
await page.waitForTimeout(3500);
await shot(page, '18-address-portals', 'w1440', { note: 'portales/variantes o resultado' });
// NORA_ONLY: Portugalete Maria Diaz de Haro 12
await goto(page, 'year=1987&place=portugalete');
await scrollToSel(page, 'button.start');
await page.click('button.start').catch(() => {});
await page.waitForTimeout(400);
await page
  .locator('section.addr input')
  .first()
  .fill('Maria Diaz de Haro')
  .catch(() => {});
await page.waitForTimeout(2500);
const opt2 = page.locator('section.addr [role="option"], section.addr ul button').first();
if (await opt2.count()) {
  await opt2.click().catch(() => {});
  await page.waitForTimeout(1500);
}
const num2 = page.locator('#addr-num, section.addr input[inputmode="numeric"]').first();
if (await num2.count()) await num2.fill('12').catch(() => {});
await page.click('section.addr button.go').catch(() => {});
await page.waitForTimeout(4000);
await shot(page, '19-address-nora-only', 'w1440', { note: 'esperado NORA_ONLY (c06)' });
// BOTH_DIFFER: Durango Kurutziaga 4
await goto(page, 'year=1987&place=durango');
await scrollToSel(page, 'button.start');
await page.click('button.start').catch(() => {});
await page.waitForTimeout(400);
await page
  .locator('section.addr input')
  .first()
  .fill('Kurutziaga')
  .catch(() => {});
await page.waitForTimeout(2500);
const opt3 = page.locator('section.addr [role="option"], section.addr ul button').first();
if (await opt3.count()) {
  await opt3.click().catch(() => {});
  await page.waitForTimeout(1500);
}
const num3 = page.locator('#addr-num, section.addr input[inputmode="numeric"]').first();
if (await num3.count()) await num3.fill('4').catch(() => {});
await page.click('section.addr button.go').catch(() => {});
await page.waitForTimeout(4000);
await shot(page, '20-address-both-differ', 'w1440', { note: 'esperado BOTH_DIFFER (c13)' });

// building por deep link
await goto(page, 'year=1987&place=bilbao&building=20-1116-2001-1-2', { settle: 2500 });
await scrollToSel(page, '.addr, .building, section');
await shot(page, '21-building-selected', 'w1440', { note: 'building= por deep link (Bilbao V1)' });

// DOS AÑOS
await goto(page, `${Q}&compare=1960`);
await shot(page, '22-compare-active', 'w1440');
await scrollToSel(page, '.below');
await shot(page, '22b-compare-legend', 'w1440', { note: 'leyenda partición DOS AÑOS' });

// ---------- PLANNING ----------
await goto(page, `${Q}`);
await scrollToSel(page, 'section.plan, [aria-label*="previsto"], .planning');
await shot(page, '23-planning-municipal', 'w1440', { note: 'si existe sección visible' });
// planning local: edificio en Bilbao
await goto(page, 'year=1987&place=bilbao&building=20-1116-2001-1-2', { settle: 2500 });
await page.evaluate(() => scrollTo(0, document.body.scrollHeight * 0.7));
await page.waitForTimeout(1200);
await shot(page, '24-building-depth', 'w1440', { note: 'tramo profundo con edificio' });

// ---------- CONTEXTO ----------
await goto(page, 'year=1975&place=abadino&building=1-1017-2001-1-1', { settle: 3000 });
await scrollToSel(page, '.ctx');
await page.waitForTimeout(1500);
await shot(page, '25-context-abdino', 'w1440', { note: 'ruido banda + 2 paradas (V5)' });
await page
  .locator('.ctx button.geom')
  .first()
  .click()
  .catch(() => {});
await page.waitForTimeout(2500);
await shot(page, '26-context-overlay', 'w1440', { note: 'overlay contextual activo' });
await goto(page, 'year=1975&place=abadino&building=1-13-10-2-1', { settle: 3000 });
await scrollToSel(page, '.ctx');
await shot(page, '27-monte-inside', 'w1440', { note: 'TOKI-ALAI (V9)' });
await goto(page, 'year=1975&place=orozko&building=75-49-90-1-1', { settle: 3000 });
await scrollToSel(page, '.ctx');
await shot(page, '28-context-negatives', 'w1440', { note: 'Orozko: negativos explícitos (V8)' });

// ---------- EDGE ----------
await goto(page, 'year=1987&place=izurtza');
await shot(page, '29-low-coverage', 'w1440', { note: 'cobertura 91,6 % — aviso esperado' });
await goto(page, 'year=1987&place=municipio-inventado');
await shot(page, '30-invalid-deeplink', 'w1440', { note: 'place inexistente' });
await goto(page, 'year=1987&place=leioa&view=photo&ortho=9999');
await shot(page, '31-invalid-ortho-param', 'w1440', { note: 'campaña inexistente' });

// ---------- FULLPAGE + métricas layout ----------
await goto(page, 'year=1987&place=leioa');
await shot(page, '40-fullpage', 'w1440', { fullPage: true });

// ---------- MÓVIL (390×844) estados clave ----------
const mb = await browser.newContext({ viewport: MB });
const mp = await mb.newPage();
mp.setDefaultTimeout(15000);
await goto(mp, '');
await shot(mp, '01-intro', 'w390');
await goto(mp, Q);
await shot(mp, '05-result-ready', 'w390');
await shot(mp, '41-fullpage', 'w390', { fullPage: true });
await goto(mp, `${Q}&view=time`);
await shot(mp, '07-tiempo-paused', 'w390');
await goto(mp, `${Q}&view=photo`, { settle: 2500 });
await shot(mp, '10-foto', 'w390');
await goto(mp, Q);
await scrollToSel(mp, 'button.start');
await mp.click('button.start').catch(() => {});
await mp.waitForTimeout(500);
await shot(mp, '16-address-open', 'w390');
await mp.close();
await mb.close();

// ---------- 320 / 768 / 1920 solo intro+result ----------
for (const vp of ALL) {
  if (vp.tag === 'w390' || vp.tag === 'w1440') continue;
  const c2 = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
  const p2 = await c2.newPage();
  p2.setDefaultTimeout(15000);
  await goto(p2, '');
  await shot(p2, '01-intro', vp.tag);
  await goto(p2, Q);
  await shot(p2, '05-result-ready', vp.tag);
  await p2.close();
  await c2.close();
}

await writeFile(join(OUT, 'atlas.json'), JSON.stringify(atlas, null, 2));
await browser.close();
server.close();
console.log('atlas entries:', atlas.length);
