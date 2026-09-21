/**
 * G1 — accessibility smoke (no es el gate completo de G4).
 * Comprueba: labels, combobox del buscador, teclado, contraste (axe) en INTRO y
 * RESULT, y prefers-reduced-motion en el encuadre del mapa.
 *
 * Uso: node scripts/g1_a11y.mjs
 */
import { chromium } from 'playwright';
import { writeFile, mkdir } from 'node:fs/promises';
import { copyFileSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { createStaticServer } from './static-server.mjs';

const ROOT = resolve(process.cwd(), '..');
const BUILD = resolve(process.cwd(), 'build');
const OUT = join(ROOT, 'evidence/g1/06-frontend');
const PORT = 4174;

const server = await createStaticServer(BUILD, PORT);
await mkdir(OUT, { recursive: true });

async function pickBrowser() {
  for (const channel of ['chrome', 'msedge']) {
    try {
      return await chromium.launch({ channel, args: ['--disable-gpu'] });
    } catch {
      /* canal no disponible: probar el siguiente */
    }
  }
  return await chromium.launch({ args: ['--disable-gpu'] });
}

// La CSP hash del build rechaza addScriptTag({content}) — se sirve axe como
// recurso same-origin (script-src 'self'), que además ejercita la propia CSP.
const axeTemp = join(BUILD, '_axe.min.js');
copyFileSync(join(process.cwd(), 'node_modules/axe-core/axe.min.js'), axeTemp);
const browser = await pickBrowser();
const report = {};

async function axeScan(page, name) {
  await page.addScriptTag({ url: `/_axe.min.js` });
  const v = await page.evaluate(async () => {
    const r = await window.axe.run(document, { resultTypes: ['violations'] });
    return r.violations.map((v) => ({
      id: v.id,
      impact: v.impact,
      nodes: v.nodes.length,
      help: v.help,
      targets: v.nodes.slice(0, 4).map((n) => n.target)
    }));
  });
  report[`axe_${name}`] = v;
}

// ── INTRO ──────────────────────────────────────────────────────────────────
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'load' });
await page.waitForSelector('.hero h1', { timeout: 20000 });

report.labels_intro = await page.evaluate(() => {
  const out = [];
  for (const el of document.querySelectorAll('input, select, textarea')) {
    const lbl = el.id ? document.querySelector(`label[for="${el.id}"]`) : null;
    out.push({
      id: el.id,
      hasLabel: !!lbl || !!el.getAttribute('aria-label') || !!el.getAttribute('aria-labelledby'),
      text: lbl?.textContent?.trim() ?? el.getAttribute('aria-label')
    });
  }
  return out;
});

report.combobox = await page.evaluate(() => {
  const el = document.querySelector('#place-input');
  return el
    ? {
        role: el.getAttribute('role'),
        expanded: el.getAttribute('aria-expanded'),
        controls: el.getAttribute('aria-controls'),
        autocomplete: el.getAttribute('aria-autocomplete')
      }
    : null;
});

// teclado: escribir, flecha abajo, enter selecciona
await page.fill('#year-input', '1987');
await page.fill('#place-input', 'Leioa');
await page.waitForSelector('#place-listbox button', { timeout: 15000 });
await page.focus('#place-input');
await page.keyboard.press('ArrowDown');
await page.waitForTimeout(200);
report.keyboard_nav = {
  active: await page.evaluate(() => document.activeElement?.tagName ?? null),
  listboxVisible: await page.locator('#place-listbox').isVisible()
};
await page.keyboard.press('Enter');
await page.waitForTimeout(300);

await axeScan(page, 'intro');

// ── RESULT ─────────────────────────────────────────────────────────────────
await page.goto(`http://localhost:${PORT}/?year=1987&place=leioa`, { waitUntil: 'load' });
await page.waitForSelector('.headline-block h1', { timeout: 20000 });
await page.waitForSelector('.mapband canvas', { timeout: 30000 });
await page.waitForTimeout(4000);

report.labels_result = await page.evaluate(() => {
  const out = [];
  for (const el of document.querySelectorAll('input, select, textarea')) {
    const lbl = el.id ? document.querySelector(`label[for="${el.id}"]`) : null;
    out.push({
      id: el.id,
      hasLabel: !!lbl || !!el.getAttribute('aria-label') || !!el.getAttribute('aria-labelledby'),
      text: lbl?.textContent?.trim() ?? el.getAttribute('aria-label')
    });
  }
  return out;
});
report.map_canvas_aria = await page.evaluate(
  () => document.querySelector('.mapband canvas')?.getAttribute('aria-label') ?? null
);
await axeScan(page, 'result');
await ctx.close();

// ── prefers-reduced-motion: el encuadre no debe animar ──────────────────────
const ctx2 = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  reducedMotion: 'reduce'
});
const page2 = await ctx2.newPage();
await page2.goto(`http://localhost:${PORT}/`, { waitUntil: 'load' });
await page2.waitForSelector('.hero h1', { timeout: 20000 });
await page2.fill('#year-input', '1987');
await page2.fill('#place-input', 'Leioa');
await page2.waitForSelector('#place-listbox button', { timeout: 15000 });
await page2.click('#place-listbox button >> nth=0');
await page2.click('.cta');
await page2.waitForSelector('.mapband canvas', { timeout: 30000 });
await page2.waitForTimeout(500);
report.reduced_motion = await page2.evaluate(() => {
  const m = window.__mjtMap;
  return {
    matches: matchMedia('(prefers-reduced-motion: reduce)').matches,
    // con reduce, fitBounds salta sin animación: el zoom ya es el final a los 0,5 s
    zoom_now: m ? m.getZoom() : null,
    moving: m ? m.isMoving() : null
  };
});
await ctx2.close();

await browser.close();
server.close();
rmSync(axeTemp, { force: true });

await writeFile(join(OUT, 'a11y-smoke.json'), JSON.stringify(report, null, 1), 'utf8');
console.log(JSON.stringify(report, null, 1));
