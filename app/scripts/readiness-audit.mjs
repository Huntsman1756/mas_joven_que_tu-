import { chromium } from 'playwright';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createStaticServer } from './static-server.mjs';
import assert from 'node:assert/strict';

const out = '../evidence/readiness-20260928';
await mkdir(out, { recursive: true });
const server = await createStaticServer('build', 0);
const base = `http://localhost:${server.address().port}`;
const browser = await chromium.launch();
const report = { date: new Date().toISOString(), browser: browser.version(), stubs: false, steps: [] };
const axe = await readFile('node_modules/axe-core/axe.min.js', 'utf8');
try {
  for (const width of [1440, 390, 320]) {
    const page = await browser.newPage({ viewport: { width, height: 900 }, isMobile: width < 700, hasTouch: width < 700 });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.route('**/readiness-axe.js', route => route.fulfill({ contentType: 'text/javascript', body: axe }));
    const capture = async (name) => {
      await page.screenshot({ path: `${out}/${width}-${name}.png`, fullPage: ['home', 'result', 'method'].includes(name), timeout: 10000 });
      await page.addScriptTag({ url: `${base}/readiness-axe.js` });
      const result = await page.evaluate(async () => ({
        overflow: document.documentElement.scrollWidth > innerWidth + 1,
        violations: (await window.axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } })).violations.map(v => ({ id: v.id, impact: v.impact, nodes: v.nodes.map(n => n.target) })),
        state: { mode: window.__mjtApp?.mode, ortho: window.__mjtApp?.orthoRender }
      }));
      report.steps.push({ width, name, url: page.url(), ...result, errors: [...errors] });
    };
    await page.goto(base);
    await page.locator('#year-input').waitFor();
    await capture('home');
    await page.locator('#year-input').fill('1987');
    await page.locator('#place-input').fill('Leioa');
    await page.locator('#place-listbox button').first().click();
    await page.locator('.cta').click();
    await page.locator('.mapband canvas').waitFor();
    await page.waitForFunction(() => window.__mjtMap?.queryRenderedFeatures().length > 0, null, { timeout: 20000 });
    await capture('result');
    if (width < 700) await page.locator('.vsel').click();
    await page.locator(`${width < 700 ? '.vmenu' : '.viewswitch'} [data-mode="time"]`).click();
    await page.locator('.timeband').waitFor();
    await capture('evolution');
    const mode = async (value) => {
      if (width < 700) await page.locator('.vsel').click();
      await page.locator(`${width < 700 ? '.vmenu' : '.viewswitch'} [data-mode="${value}"]`).click();
    };
    await mode('photo');
    await page.locator('.photo [data-action="activate"]').first().click();
    await page.waitForFunction(() => window.__mjtApp.orthoRender === 'CONTENT', null, { timeout: 30000 });
    await capture('photo');
    await mode('swipe');
    await page.locator('.handle[role="slider"]').waitFor();
    await page.waitForFunction(() => window.__mjtSwipe?.loaded?.(), null, { timeout: 30000 });
    const slider = page.locator('.handle[role="slider"]');
    const before = Number(await slider.getAttribute('aria-valuenow'));
    await slider.press('ArrowRight');
    assert.ok(Number(await slider.getAttribute('aria-valuenow')) > before, 'cortina operable con teclado');
    await capture('swipe');
    await mode('hist');
    await page.waitForFunction(() => window.__mjtApp.histMapState === 'AVAILABLE', null, { timeout: 30000 });
    await page.waitForFunction(() => window.__mjtMap?.loaded?.(), null, { timeout: 30000 });
    await capture('historical-map');
    await page.goto(`${base}/como-lo-sabemos`);
    await page.locator('.how h1').waitFor();
    await capture('method');
    await page.goto(base);
    await page.locator('.example-link').click();
    await page.locator('.chapter[data-story="f4036"]').waitFor();
    await page.locator('.chapter').scrollIntoViewIfNeeded();
    await capture('example');
    await page.close();
  }
} finally {
  await writeFile(`${out}/visual-a11y.json`, JSON.stringify(report, null, 2));
  await browser.close();
  server.close();
}
console.log(JSON.stringify(report.steps.map(({ width, name, overflow, violations, errors }) => ({ width, name, overflow, violations: violations.length, errors: errors.length })), null, 2));
if (report.steps.some(s => s.overflow || s.violations.length || s.errors.length)) process.exitCode = 1;
