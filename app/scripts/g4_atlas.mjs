/**
 * G4 — state atlas «after» (§28). Mide el mismo contrato que
 * evidence/g4/research/current-layout-metrics.json (before, UI G3) sobre el
 * producto CUT B: altura, nº de controles, acciones del primer viewport,
 * jerarquía de secciones y las comprobaciones G4 específicas:
 *   - ≤6 acciones en el primer viewport (390×844)
 *   - una sola entrada a ortofoto (modo FOTO; sin OrthoControls)
 *   - sin CTA histórico independiente (modo 1923–25 en el switch)
 *   - historias descubribles (Descúbreme) sin chunk eager
 * Capturas clave a w1440/w390. Uso: node scripts/g4_atlas.mjs (build/ previo)
 */
import { chromium } from 'playwright';
import { writeFile, mkdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { createStaticServer } from './static-server.mjs';

const ROOT = resolve(process.cwd(), '..');
const BUILD = resolve(process.cwd(), 'build');
const OUT = join(ROOT, 'evidence/g4/state-atlas');
const PORT = 4189;
const BASE = `http://localhost:${PORT}`;
const Q = 'year=1987&place=leioa&lat=43.326&lon=-2.988&z=11.5';

const server = await createStaticServer(BUILD, PORT);
await mkdir(OUT, { recursive: true });
const browser = await chromium.launch();

const out = { utc: new Date().toISOString(), metrics: {}, g4_checks: {}, errors: [] };

async function metrics(page, tag) {
  const m = await page.evaluate(() => {
    const doc = document.documentElement;
    const actionable = (el) => {
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      return (
        r.width > 0 &&
        r.height > 0 &&
        r.top >= 0 &&
        r.bottom <= innerHeight &&
        r.left >= 0 &&
        r.right <= innerWidth &&
        cs.visibility !== 'hidden' &&
        cs.display !== 'none'
      );
    };
    const acts = [...document.querySelectorAll('button, a[href], input, summary')].filter(actionable);
    const sections = [...document.querySelectorAll('section, .below > *')].map((el) => {
      const r = el.getBoundingClientRect();
      const sc = el.getBoundingClientRect().top + scrollY;
      return {
        tag: el.tagName.toLowerCase(),
        cls: (el.getAttribute('class') ?? '').slice(0, 60),
        h: Math.round(r.height),
        top: Math.round(sc)
      };
    });
    const h = {};
    for (const el of document.querySelectorAll('h1,h2,h3,h4')) {
      const lv = el.tagName[1];
      h[lv] = (h[lv] ?? 0) + 1;
    }
    return {
      scrollHeight: doc.scrollHeight,
      scrolls: +(doc.scrollHeight / innerHeight).toFixed(1),
      actions1vp: acts.length,
      buttons: document.querySelectorAll('button').length,
      links: document.querySelectorAll('a[href]').length,
      inputs: document.querySelectorAll('input').length,
      details: document.querySelectorAll('details').length,
      h,
      sections
    };
  });
  out.metrics[tag] = m;
  return m;
}

async function goto(page, q) {
  await page.goto(`${BASE}/?${q}`, { waitUntil: 'load' });
  await page.waitForSelector('.headline-block h1', { timeout: 30000 });
  await page
    .waitForFunction(() => window.__mjtMap?.areTilesLoaded?.(), null, { timeout: 30000 })
    .catch(() => null);
  await page.waitForTimeout(1200);
}
const shot = (page, name) =>
  page.screenshot({ path: join(OUT, `${name}.png`), fullPage: false });

/* ── w1440: resultado por defecto ── */
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.on('pageerror', (e) => out.errors.push(String(e).slice(0, 160)));
  await goto(page, Q);
  await metrics(page, 'default-w1440');
  await shot(page, '01-result-w1440');
  out.g4_checks.no_ortho_section =
    (await page.locator('section.ortho').count()) === 0 &&
    (await page.locator('.photo').count()) === 0;
  out.g4_checks.no_hist_cta =
    (await page.locator('.histmap').count()) === 0;
  out.g4_checks.single_switch = (await page.locator('.viewswitch').count()) === 1;
  out.g4_checks.stories_discoverable =
    (await page.locator('.stories .item').count()) === 5;

  // FOTO: una sola entrada a la ortofoto
  await page.click('.viewswitch button[data-mode="photo"]');
  await page.waitForSelector('.photo', { timeout: 10000 });
  await shot(page, '02-foto-w1440');
  out.g4_checks.photo_single_entry =
    (await page.locator('.photo').count()) === 1 &&
    (await page.locator('section.ortho').count()) === 0;

  // 1923–25: el modo ES el opt-in
  await page.click('.viewswitch button[data-mode="hist"]');
  await page.waitForSelector('.histmap', { timeout: 10000 });
  await shot(page, '03-hist-w1440');
  out.g4_checks.hist_panel = await page.evaluate(() => {
    const a = window.__mjtApp;
    return a?.histMapVisible === true && ['UNKNOWN', 'AVAILABLE', 'UNAVAILABLE'].includes(a?.histMapState);
  });
  await page.click('.viewswitch button[data-mode="map"]');
  await page.waitForTimeout(400);
  await page.close();
}

/* ── w390: primer viewport + colisiones ── */
{
  const page = await browser.newPage({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true
  });
  page.on('pageerror', (e) => out.errors.push(String(e).slice(0, 160)));
  await goto(page, Q);
  const m = await metrics(page, 'default-w390');
  out.g4_checks.first_viewport_le6 = m.actions1vp <= 6;
  await shot(page, '10-result-w390');
  // colisión address+compare: solo una invitación primaria visible por viewport
  await page.locator('.invite .start').first().scrollIntoViewIfNeeded();
  await shot(page, '11-action-tramo-w390');
  out.g4_checks.no_hoverflow =
    (await page.evaluate(() => document.documentElement.scrollWidth)) <= 391;
  await page.close();
}

/* ── historia: tramo editorial ── */
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await goto(page, `${Q}&story=f4036`);
  await page.waitForSelector('.chapter', { timeout: 15000 }).catch(() => null);
  await metrics(page, 'story-w1440');
  await shot(page, '20-story-w1440');
  out.g4_checks.story_mounted = (await page.locator('.chapter').count()) === 1;
  await page.close();
}

await writeFile(join(OUT, 'atlas.json'), JSON.stringify(out, null, 2));
console.log(JSON.stringify({ checks: out.g4_checks, a1vp: out.metrics['default-w390']?.actions1vp, errors: out.errors }, null, 2));
await browser.close();
server.close();
