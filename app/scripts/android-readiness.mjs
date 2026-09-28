import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';

// Adjunta Chrome del emulador: no lanza Chromium ni emula un viewport de escritorio.
const out = process.env.ANDROID_OUT || '../evidence/android-maestro-20260928/content';
const base = process.env.ANDROID_URL || 'http://localhost:4297';
await mkdir(out, { recursive: true });
const browser = await chromium.connectOverCDP('http://localhost:9222');
const page = browser.contexts()[0].pages().at(-1);
assert.ok(page, 'Chrome Android debe tener una pestaña abierta');
page.setDefaultTimeout(20000);
const report = { utc: new Date().toISOString(), browser: browser.version(), base, simulatedResponses: false, checks: [], errors: [] };
page.on('pageerror', e => report.errors.push(e.message));
const check = async (name, fn) => {
  try {
    const detail = await fn();
    report.checks.push({ name, pass: true, detail });
    console.log(`PASS ${name}`);
  } catch (e) {
    report.checks.push({ name, pass: false, error: e.message });
    console.log(`FAIL ${name}: ${e.message.slice(0, 180)}`);
  }
  await writeFile(`${out}/report.json`, JSON.stringify(report, null, 2));
};
try {
  await check('local-result-and-pmtiles', async () => {
    await page.goto(`${base}/?year=1987&place=leioa`, { waitUntil: 'domcontentloaded' });
    await page.locator('.headline-block').waitFor();
    await page.waitForFunction(() => window.__mjtMap?.getLayer('cells-fill') && window.__mjtMap.queryRenderedFeatures({ layers: ['cells-fill'] }).length > 0);
    const state = await page.evaluate(() => ({
      year: window.__mjtApp.year, place: window.__mjtApp.place.slug,
      build: document.querySelector('meta[name="mjt:build"]')?.content,
      viewport: [innerWidth, innerHeight], userAgent: navigator.userAgent,
      features: window.__mjtMap.queryRenderedFeatures({ layers: ['cells-fill'] }).length
    }));
    assert.equal(state.year, 1987);
    assert.equal(state.place, 'leioa');
    await page.screenshot({ path: `${out}/result.png`, timeout: 10000 });
    return state;
  });
  const mode = async name => {
    await page.locator('.vsel').click();
    await page.locator(`.vmenu [data-mode="${name}"]`).click();
  };
  await check('evolution-play-pause', async () => {
    await mode('time');
    await page.locator('.timeband [data-action="play"]').click();
    await page.waitForFunction(() => window.__mjtApp.playYear > 1987);
    await page.locator('.timeband [data-action="play"]').click();
    assert.equal(await page.evaluate(() => window.__mjtApp.playing), false);
    await page.screenshot({ path: `${out}/evolution.png`, timeout: 10000 });
    return await page.evaluate(() => ({ playYear: window.__mjtApp.playYear }));
  });
  await check('photo-real-content', async () => {
    await mode('photo');
    await page.locator('.photo [data-action="activate"]').first().click();
    await page.waitForFunction(() => window.__mjtApp.orthoRender === 'CONTENT', null, { timeout: 45000 });
    await page.screenshot({ path: `${out}/photo.png`, timeout: 10000 });
    return await page.evaluate(() => ({ render: window.__mjtApp.orthoRender, coverage: window.__mjtApp.orthoState }));
  });
  await check('swipe-loaded-and-operable', async () => {
    await mode('swipe');
    await page.waitForFunction(() => window.__mjtSwipe?.loaded?.(), null, { timeout: 45000 });
    const slider = page.locator('.handle[role="slider"]');
    const before = Number(await slider.getAttribute('aria-valuenow'));
    await slider.press('ArrowRight');
    const after = Number(await slider.getAttribute('aria-valuenow'));
    assert.ok(after > before);
    await page.screenshot({ path: `${out}/swipe.png`, timeout: 10000 });
    return { before, after, note: 'La captura requiere inspeccion visual de ambos lados.' };
  });
  await check('historical-map-content', async () => {
    await mode('hist');
    await page.waitForFunction(() => window.__mjtApp.histMapState === 'AVAILABLE' && window.__mjtMap?.loaded?.(), null, { timeout: 45000 });
    await page.screenshot({ path: `${out}/historical.png`, timeout: 10000 });
    return { coverage: 'AVAILABLE', note: 'La captura requiere inspeccion visual.' };
  });
} finally {
  await writeFile(`${out}/report.json`, JSON.stringify(report, null, 2));
  await browser.close();
}
if (report.checks.some(c => !c.pass) || report.errors.length) process.exitCode = 1;
