/**
 * G0 — accessibility smoke (no es el gate completo de G4).
 * Comprueba: labels, aria del slider, foco visible, navegación por teclado,
 * contraste (axe) y prefers-reduced-motion.
 *
 * Uso: node scripts/g0_a11y.mjs
 */
import { chromium } from 'playwright';
import { writeFile, mkdir, readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { createStaticServer } from './static-server.mjs';

const ROOT = resolve(process.cwd(), '..');
const BUILD = resolve(process.cwd(), 'build');
const OUT = join(ROOT, 'evidence/g0/06-frontend');
const PORT = 4175;

const server = await createStaticServer(BUILD, PORT);
await mkdir(OUT, { recursive: true });

async function pickBrowser() {
  for (const channel of ['chrome', 'msedge']) {
    try { return await chromium.launch({ channel, args: ['--disable-gpu'] }); } catch { /* canal no disponible: probar el siguiente */ }
  }
  return await chromium.launch({ args: ['--disable-gpu'] });
}

const axeSrc = await readFile(join(process.cwd(), 'node_modules/axe-core/axe.min.js'), 'utf8');
const browser = await pickBrowser();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'load' });
await page.waitForSelector('#map canvas', { timeout: 30000 });
await page.waitForTimeout(4000);

const report = {};

// 1) labels presentes
report.labels = await page.evaluate(() => {
  const out = [];
  for (const el of document.querySelectorAll('input, select')) {
    const lbl = el.id ? document.querySelector(`label[for="${el.id}"]`) : null;
    out.push({ tag: el.tagName.toLowerCase(), id: el.id, hasLabel: !!lbl, text: lbl?.textContent?.trim() ?? null });
  }
  return out;
});

// 2) aria del slider
report.slider = await page.evaluate(() => {
  const el = document.querySelector('#year');
  return el ? {
    type: el.getAttribute('type'), min: el.getAttribute('min'), max: el.getAttribute('max'),
    value: el.value, ariaValueText: el.getAttribute('aria-valuetext')
  } : null;
});

// 3) teclado: foco + flecha derecha cambia el año
await page.focus('#year');
const before = await page.$eval('#year', (e) => e.value);
await page.keyboard.press('ArrowRight');
await page.waitForTimeout(300);
const after = await page.$eval('#year', (e) => e.value);
report.keyboard = { focused: await page.evaluate(() => document.activeElement?.id ?? null), before, after, changed: before !== after };

// 4) foco visible (outline distinto de none)
report.focusVisible = await page.evaluate(() => {
  const el = document.querySelector('#muni');
  el.focus();
  const s = getComputedStyle(el);
  return { outlineStyle: s.outlineStyle, outlineWidth: s.outlineWidth, boxShadow: s.boxShadow };
});

// 5) axe
await page.addScriptTag({ content: axeSrc });
const axe = await page.evaluate(async () => {
  // @ts-expect-error — axe se inyecta en runtime dentro de page.evaluate
  const r = await window.axe.run(document, { resultTypes: ['violations'] });
  return r.violations.map((v) => ({
    id: v.id, impact: v.impact, nodes: v.nodes.length, help: v.help,
    targets: v.nodes.slice(0, 4).map((n) => ({ target: n.target, html: (n.html || '').slice(0, 160) }))
  }));
});
report.axe_violations = axe;
report.axe_summary = axe.reduce((a, v) => { a[v.impact ?? 'unknown'] = (a[v.impact ?? 'unknown'] || 0) + 1; return a; }, {});

// 6) prefers-reduced-motion: sin animación al cambiar de municipio
const ctx2 = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
const page2 = await ctx2.newPage();
await page2.goto(`http://localhost:${PORT}/`, { waitUntil: 'load' });
await page2.waitForSelector('#map canvas', { timeout: 30000 });
await page2.waitForTimeout(3500);
await page2.selectOption('#muni', '20');
await page2.waitForTimeout(1200);
report.reduced_motion = await page2.evaluate(() => {
  const m = matchMedia('(prefers-reduced-motion: reduce)');
  return { matches: m.matches, canvasPresent: !!document.querySelector('#map canvas'), headline: document.querySelector('.headline')?.textContent?.trim().slice(0, 80) };
});
await ctx2.close();

await writeFile(join(OUT, 'a11y-smoke.json'), JSON.stringify(report, null, 1), 'utf8');
console.log(JSON.stringify(report, null, 1));

await browser.close();
server.close();
