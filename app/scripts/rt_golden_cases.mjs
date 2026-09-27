/**
 * FASE B — golden cases: los cinco casos de la auditoría, verificados contra
 * el build candidato (los mismos números que `docs/red-team/EVIDENCE/*-dom.txt`
 * observó en producción) + nombre largo en ES y EU a 320 px.
 *
 *   Bilbao 1922        11.780 / 13.738 = 85,7 %
 *   Getxo 1952          4.927 /  6.211 = 79,3 %
 *   Mungia 1979         2.679 /  4.472 = 59,9 %
 *   Arakaldo 1987          28 /    109 = 25,7 %
 *   Karrantza 2025           1 /  3.528 = <0,1 %  (RT-04: nunca «0 %»)
 *
 * Uso: node scripts/rt_golden_cases.mjs   (cwd = app/, build/ presente)
 * Salida: ../evidence/red-team-2026/golden-cases.json + capturas golden-*.png
 */
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { createStaticServer } from './static-server.mjs';
import { installCiFixtures } from './fixtures.mjs';

const ROOT = resolve(process.cwd(), '..');
const BUILD = resolve(process.cwd(), 'build');
const OUT = join(ROOT, 'evidence/red-team-2026');
const PORT = 4337;
const BASE = `http://localhost:${PORT}`;
const STUBS = process.env.CI_STUBS === '1';

await mkdir(OUT, { recursive: true });
const server = await createStaticServer(BUILD, PORT);
const browser = await chromium.launch();

const checks = {};
const ok = (k, v, detail = '') => {
  checks[k] = !!v;
  console.log(`${v ? 'PASS' : 'FAIL'} ${k}${detail ? ` — ${detail}` : ''}`);
};

const CASES = [
  { id: 'bilbao-1922', place: 'bilbao', year: 1922, known: '13.738', after: '11.780', pct: '85,7' },
  { id: 'getxo-1952', place: 'getxo', year: 1952, known: '6.211', after: '4.927', pct: '79,3' },
  { id: 'mungia-1979', place: 'mungia', year: 1979, known: '4.472', after: '2.679', pct: '59,9' },
  { id: 'arakaldo-1987', place: 'arakaldo', year: 1987, known: '109', after: '28', pct: '25,7' },
  { id: 'karrantza-2025', place: 'karrantza-harana-valle-de-carranza', year: 2025, known: '3.528', after: '1', pct: '<0,1' }
];

async function golden(ctxOpts, lang) {
  const ctx = await browser.newContext(ctxOpts);
  const page = await ctx.newPage();
  if (STUBS) await installCiFixtures(page);
  for (const c of CASES) {
    await page.goto(`${BASE}/?year=${c.year}&place=${c.place}`, { waitUntil: 'load' });
    await page.waitForFunction(() => window.__mjtApp?.headline != null, null, { timeout: 30000 });
    await page.waitForSelector('.headline-block h1', { timeout: 20000 });
    await page.waitForTimeout(400);
    const support = await page.locator('.headline-block .support').innerText().catch(() => '');
    const lead2 = await page.locator('.headline-block .lead2').innerText().catch(() => '');
    // ES: «11.780 de 13.738 …» · EU: «…13.738 eraikinetatik 11.780.» —
    // se exigen los dos recuentos, no la frase (la phrasing es por locale)
    ok(
      `golden_${c.id}_${lang}_recuento`,
      lead2.includes(c.after) && lead2.includes(c.known),
      lead2.trim().slice(0, 90)
    );
    const pctOk = lang === 'eu' ? support.includes(`% ${c.pct}`) || support.includes(c.pct) : support.includes(c.pct);
    ok(`golden_${c.id}_${lang}_cuota`, pctOk, support.trim());
    if (c.id === 'karrantza-2025') {
      ok(`golden_karrantza_${lang}_sin_cero_falso`, !/0\s?%/.test(support) && /<0,1/.test(support), support.trim());
      ok(`golden_karrantza_${lang}_sin_exacta`, !/exacta|zehatza/i.test(support), support.trim());
    }
    await page.screenshot({ path: join(OUT, `golden-${c.id}-${lang}.png`) });
  }
  await ctx.close();
}

// ES desktop — nombre largo también cabe en el panel
await golden({ viewport: { width: 1440, height: 900 } }, 'es');

// EU a 320 px — nombre largo (Karrantza Harana/Valle de Carranza) sin overflow
{
  const ctx = await browser.newContext({
    viewport: { width: 320, height: 800 },
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 2
  });
  const page = await ctx.newPage();
  if (STUBS) await installCiFixtures(page);
  await page.goto(`${BASE}/?year=2025&place=karrantza-harana-valle-de-carranza`, {
    waitUntil: 'load'
  });
  await page.click('.langs button:has-text("EU")');
  await page.waitForFunction(() => document.documentElement.lang === 'eu');
  await page.waitForFunction(() => window.__mjtApp?.headline != null, null, { timeout: 30000 });
  await page.waitForTimeout(500);
  const dims = await page.evaluate(() => ({
    scrollW: document.documentElement.scrollWidth,
    vw: window.innerWidth,
    lang: document.documentElement.lang
  }));
  ok('golden_eu_320_lang', dims.lang === 'eu', dims.lang);
  ok('golden_eu_320_no_overflow', dims.scrollW <= dims.vw + 1, `scrollW=${dims.scrollW} vw=${dims.vw}`);
  const support = await page.locator('.headline-block .support').innerText().catch(() => '');
  ok('golden_eu_320_pct_style', !/\d[.,\d]*\s+%/.test(support), support.trim());
  await page.screenshot({ path: join(OUT, 'golden-eu-320-karrantza.png'), fullPage: false });
  await ctx.close();
}

/* ── RT-18 · plurales en casos límite reproducibles ──────────────────── */
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  if (STUBS) await installCiFixtures(page);

  // (a) Karrantza/2025 → numerador 1 en «Cómo lo calculamos»
  await page.goto(`${BASE}/?year=2025&place=karrantza-harana-valle-de-carranza`, {
    waitUntil: 'load'
  });
  await page.waitForFunction(() => window.__mjtApp?.headline != null, null, { timeout: 30000 });
  // BelowFold es un chunk perezoso: se recorre hasta el disclosure «Cálculo»
  for (let i = 0; i < 25 && (await page.locator('.calc summary').count()) === 0; i++) {
    await page.mouse.wheel(0, 900);
    await page.waitForTimeout(150);
  }
  await page.waitForSelector('.calc summary', { timeout: 20000 });
  await page.locator('.calc summary').first().click();
  await page.waitForTimeout(300);
  const calc = await page.locator('.calc p').first().innerText();
  ok('rt18_calc_singular', /1 edificio terminado/.test(calc) && !/1 edificios/.test(calc), calc.slice(0, 110));

  // (b) Abadiño 1901→1907 → la partición «Entre» tiene exactamente 1 edificio
  //     (par real del registro; los años de comparación van de 1900 en adelante)
  await page.goto(`${BASE}/?year=1901&place=abadino&compare=1907`, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__mjtApp?.headline != null, null, { timeout: 30000 });
  await page.waitForSelector('.buckets li', { timeout: 20000 });
  const buckets = await page.locator('.buckets li').allInnerTexts();
  const oneLine = buckets.find((b) => /1 edificio/.test(b));
  ok('rt18_partition_singular', !!oneLine && !buckets.some((b) => /1 edificios/.test(b)), JSON.stringify(buckets));
  await page.screenshot({ path: join(OUT, 'rt18-compare-one.png') });

  await ctx.close();
}

await browser.close();
server.close();

const fails = Object.entries(checks).filter(([, v]) => !v).map(([k]) => k);
await writeFile(
  join(OUT, 'golden-cases.json'),
  JSON.stringify({ utc: new Date().toISOString(), stubs: STUBS, checks }, null, 2)
);
console.log(
  fails.length === 0
    ? `GOLDEN PASS (${Object.keys(checks).length} checks)`
    : `GOLDEN FAIL (${fails.length}): ${fails.join(', ')}`
);
process.exit(fails.length === 0 ? 0 : 1);
