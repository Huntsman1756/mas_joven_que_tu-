/**
 * G5 GRH1 — pack de revisión humana (NO auto-aceptable).
 *
 * Captura la pieza completa para el checklist humano del gate:
 *   judge-30s/90s (HOME + RESULT a 1440/390), los cuatro modos de la
 *   escena (mapa, tiempo, foto, foto dúo sincronizada, mapa 1923–25),
 *   el tramo «Qué más sabemos del lugar» con contexto cargado, las 5
 *   historias a ambos anchos y el fallo cerrado del mapa histórico.
 *
 * Salida: evidence/g5/human-review/ con estado PENDING_HUMAN.
 * Uso: node scripts/g5_human_review_pack.mjs
 */
import { chromium } from 'playwright';
import { writeFile, mkdir, readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { createStaticServer } from './static-server.mjs';

const ROOT = resolve(process.cwd(), '..');
const BUILD = resolve(process.cwd(), 'build');
const OUT = join(ROOT, 'evidence/g5/human-review');
const PORT = 4192;
const BASE = `http://localhost:${PORT}`;
const STORIES = ['c2803', 'f4036', 'f4233', 'f4738', 'f149'];
const Q = 'year=1987&place=leioa&lat=43.326&lon=-2.988&z=11.5';

const server = await createStaticServer(BUILD, PORT);
await mkdir(OUT, { recursive: true });
const browser = await chromium.launch();
const manifest = { status: 'PENDING_HUMAN', utc: new Date().toISOString(), shots: [] };

async function shot(page, name) {
  const p = join(OUT, `${name}.png`);
  await page.screenshot({ path: p, fullPage: false });
  manifest.shots.push(`${name}.png`);
}
async function fullshot(page, name) {
  const p = join(OUT, `${name}.png`);
  await page.screenshot({ path: p, fullPage: true });
  manifest.shots.push(`${name}.png`);
}
async function ready(page) {
  await page.waitForSelector('.headline-block h1', { timeout: 30000 });
  await page.waitForTimeout(1200);
}
/* recorrido de scroll que dispara la carga perezosa below-fold */
async function lazyScroll(page) {
  await page.evaluate(async () => {
    for (let y = 0; y <= document.body.scrollHeight; y += 600) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 120));
    }
    window.scrollTo(0, 0);
  });
  await page.waitForTimeout(1500);
}

/* ── flujos de entrada — judge 30s/90s ── */
for (const w of [
  { width: 1440, height: 900, tag: 'w1440' },
  { width: 390, height: 844, tag: 'w390' }
]) {
  const page = await browser.newPage({ viewport: w });
  await page.goto(`${BASE}/`, { waitUntil: 'load' });
  await page.waitForSelector('.hero h1', { timeout: 20000 }).catch(() => null);
  await shot(page, `judge-hero-${w.tag}`);
  await page.goto(`${BASE}/?${Q}`, { waitUntil: 'load' });
  await ready(page);
  await shot(page, `judge-30s-${w.tag}`); // primer viewport: titular + escena
  await lazyScroll(page);
  await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight * 0.55));
  await page.waitForTimeout(800);
  await shot(page, `judge-90s-mid-${w.tag}`); // contexto lugar + historias
  await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
  await page.waitForTimeout(800);
  await shot(page, `judge-90s-end-${w.tag}`); // tu calle + pie
  await page.close();
}

/* ── modos de la escena (w1440) ── */
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(`${BASE}/?${Q}&view=time&play=2003`, { waitUntil: 'load' });
  await ready(page);
  await shot(page, 'mode-time-w1440');

  await page.goto(`${BASE}/?${Q}&view=photo&ortho=1970`, { waitUntil: 'load' });
  await ready(page);
  await page.waitForTimeout(2500);
  await shot(page, 'mode-photo-w1440');

  // comparación lado a lado: dos lienzos sincronizados
  await page.goto(`${BASE}/?${Q}&view=photo&ortho=1970&ortho2=2025`, { waitUntil: 'load' });
  await ready(page);
  await page
    .waitForFunction(() => document.querySelectorAll('.mapband canvas').length === 2, {
      timeout: 30000
    })
    .catch(() => null);
  await page.waitForTimeout(2500);
  await shot(page, 'mode-photo-duo-w1440');

  await page.goto(`${BASE}/?${Q}&view=hist`, { waitUntil: 'load' });
  await ready(page);
  await page.waitForTimeout(2500);
  await shot(page, 'mode-hist-w1440');
  await page.close();
}

/* ── foto en estrecha: toggle de campaña (un lienzo) ── */
{
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.goto(`${BASE}/?${Q}&view=photo&ortho=1970&ortho2=2025`, { waitUntil: 'load' });
  await ready(page);
  await page.waitForTimeout(2000);
  await shot(page, 'mode-photo-toggle-w390');
  await page.close();
}

/* ── fallo cerrado del mapa histórico ── */
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.route('**/ORTO_EJ_CARTO_1925/**', (r) => r.abort());
  await page.goto(`${BASE}/?${Q}&view=hist`, { waitUntil: 'load' });
  await ready(page);
  await page
    .waitForFunction(() => window.__mjtApp?.histMapState === 'UNAVAILABLE', { timeout: 30000 })
    .catch(() => null);
  await page.waitForTimeout(600);
  await shot(page, 'fail-hist-w1440');
  await page.close();
}

/* ── página completa con contexto cargado (w1440) ── */
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(`${BASE}/?${Q}`, { waitUntil: 'load' });
  await ready(page);
  await lazyScroll(page);
  await fullshot(page, 'result-full-w1440');
  await page.close();
}

/* ── una hoja por historia (capítulo + acciones) a ambos anchos ── */
for (const s of STORIES) {
  for (const w of [
    { width: 390, height: 844, tag: 'w390' },
    { width: 1440, height: 900, tag: 'w1440' }
  ]) {
    const page = await browser.newPage({ viewport: w });
    await page.goto(`${BASE}/?${Q}&story=${s}`, { waitUntil: 'load' });
    await ready(page);
    await page
      .locator('.chapter')
      .scrollIntoViewIfNeeded()
      .catch(() => null);
    await page.waitForTimeout(600);
    await shot(page, `story-${s}-${w.tag}`);
    await page.close();
  }
}

await writeFile(join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 2));

/* contact-sheet: rejilla etiquetada de todas las capturas (mismo orden
   que manifest.shots), renderizada en el propio Chromium — sin deps. */
{
  const cells = [];
  for (const name of manifest.shots) {
    const b64 = (await readFile(join(OUT, name))).toString('base64');
    cells.push(
      `<figure><figcaption>${name.replace('.png', '')}</figcaption>` +
        `<img src="data:image/png;base64,${b64}"></figure>`
    );
  }
  const html = `<!doctype html><meta charset="utf-8"><style>
    body{background:#141414;color:#ddd;font:12px/1.4 monospace;margin:16px}
    h1{font-size:14px;margin:0 0 12px;color:#fff}
    .grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}
    figure{margin:0;background:#222;padding:6px;border-radius:4px}
    figcaption{padding:2px 0 6px;color:#9c9}
    img{width:100%;display:block;border:1px solid #333}
  </style><h1>G5 human-review — ${manifest.utc.slice(0, 10)} · ${manifest.shots.length} capturas · PENDING_HUMAN</h1><div class="grid">${cells.join('')}</div>`;
  const page = await browser.newPage({ viewport: { width: 1480, height: 1000 } });
  await page.setContent(html, { waitUntil: 'load' });
  await page.locator('.grid img').last().waitFor({ state: 'visible' });
  await page.screenshot({ path: join(OUT, 'contact-sheet.png'), fullPage: true });
  await page.close();
}

console.log(
  `human-review pack: ${manifest.shots.length} capturas + contact-sheet → ${OUT} (PENDING_HUMAN)`
);
await browser.close();
server.close();
