/**
 * G0 — evidencia visual del vertical slice (desktop + móvil).
 * Servidor con HTTP Range (PMTiles lo exige).
 * Uso: node scripts/g0_screenshot.mjs
 */
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { createStaticServer } from './static-server.mjs';

const ROOT = resolve(process.cwd(), '..');
const BUILD = resolve(process.cwd(), 'build');
const OUT = join(ROOT, 'evidence/g0/08-screenshots');
const PORT = 4173;

const server = await createStaticServer(BUILD, PORT);
await mkdir(OUT, { recursive: true });

async function pickBrowser() {
  for (const channel of ['chrome', 'msedge']) {
    try { return await chromium.launch({ channel, args: ['--disable-gpu'] }); } catch { /* canal no disponible: probar el siguiente */ }
  }
  return await chromium.launch({ args: ['--disable-gpu'] });
}

const browser = await pickBrowser();
const results = [];

async function shoot(name, viewport, steps) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const consoleErrors = [];
  page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text().slice(0, 160)); });
  page.on('pageerror', (e) => consoleErrors.push(String(e).slice(0, 160)));

  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'load' });
  await page.waitForSelector('#map canvas', { timeout: 30000 });
  await page.waitForTimeout(5000);
  if (steps) await steps(page);
  await page.waitForTimeout(3000);

  const file = join(OUT, `${name}.png`);
  await page.screenshot({ path: file, fullPage: false });

  const summary = await page.evaluate(() => {
    const q = (s) => document.querySelector(s)?.textContent?.trim() ?? null;
    return {
      headline: q('.headline'),
      coverage: q('.coverage'),
      ortho: q('.ortho p'),
      warning: q('.warn'),
      legend: Array.from(document.querySelectorAll('.legend span')).map((n) => n.textContent?.trim()),
      canvases: document.querySelectorAll('#map canvas').length
    };
  });
  results.push({ name, viewport, bytes: statSync(file).size, summary, consoleErrors: [...new Set(consoleErrors)] });
  console.log(`  ${name}: ${statSync(file).size} bytes | canvases=${summary.canvases}`);
  await ctx.close();
}

await shoot('desktop-1440x900-leioa-1987', { width: 1440, height: 900 });
await shoot('mobile-390x844-leioa-1987', { width: 390, height: 844 });
await shoot('desktop-1440x900-bilbao-1975', { width: 1440, height: 900 }, async (page) => {
  await page.selectOption('#muni', '20');
  await page.waitForTimeout(2000);
  await page.$eval('#year', (el) => {
    el.value = '1975';
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await page.waitForTimeout(2000);
});
await shoot('desktop-1440x900-murueta-campaign-1956', { width: 1440, height: 900 }, async (page) => {
  await page.selectOption('#muni', '908');
  await page.waitForTimeout(2500);
  await page.selectOption('#campaign', '1956');
  await page.waitForTimeout(2500);
});

await browser.close();
server.close();
await writeFile(join(OUT, 'screenshots.json'), JSON.stringify(results, null, 1), 'utf8');
console.log('screenshots ->', OUT);
