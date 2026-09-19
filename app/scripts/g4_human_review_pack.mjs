/**
 * G4 §29 — pack de revisión humana (NO auto-aceptable).
 * Captura para cada historia: w390 + w1440 del capítulo; más flujos de
 * entrada (hero, resultado, judge-30s) a ambos anchos. Salida:
 * evidence/g4/human-review/ con estado PENDING_HUMAN.
 * Uso: node scripts/g4_human_review_pack.mjs
 */
import { chromium } from 'playwright';
import { writeFile, mkdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { createStaticServer } from './static-server.mjs';

const ROOT = resolve(process.cwd(), '..');
const BUILD = resolve(process.cwd(), 'build');
const OUT = join(ROOT, 'evidence/g4/human-review');
const PORT = 4190;
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

async function ready(page) {
  await page.waitForSelector('.headline-block h1', { timeout: 30000 });
  await page.waitForTimeout(1200);
}

/* flujos de entrada — judge 30s/90s */
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
  await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight * 0.55));
  await page.waitForTimeout(800);
  await shot(page, `judge-90s-mid-${w.tag}`); // tramo acción
  await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
  await page.waitForTimeout(800);
  await shot(page, `judge-90s-end-${w.tag}`); // tramo editorial
  await page.close();
}

/* una hoja por historia (capítulo + acciones visibles) */
for (const s of STORIES) {
  for (const w of [
    { width: 390, height: 844, tag: 'w390' },
    { width: 1440, height: 900, tag: 'w1440' }
  ]) {
    const page = await browser.newPage({ viewport: w });
    await page.goto(`${BASE}/?${Q}&story=${s}`, { waitUntil: 'load' });
    await ready(page);
    await page.locator('.chapter').scrollIntoViewIfNeeded().catch(() => null);
    await page.waitForTimeout(600);
    await shot(page, `story-${s}-${w.tag}`);
    await page.close();
  }
}

await writeFile(join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 2));
console.log(`human-review pack: ${manifest.shots.length} capturas → ${OUT} (PENDING_HUMAN)`);
await browser.close();
server.close();
