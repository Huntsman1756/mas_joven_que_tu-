import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { createStaticServer } from './static-server.mjs';
import { installCiFixtures } from './fixtures.mjs';

const out = resolve(process.env.NAV_OUT || `../evidence/map-guidance-20260930/run-${Date.now()}`);
await mkdir(out, { recursive: true });
const server = process.env.NAV_BASE ? null : await createStaticServer(resolve('build'), 0);
const base = process.env.NAV_BASE || `http://localhost:${server.address().port}/`;
const browser = await chromium.launch({ headless: !process.argv.includes('--headed') });
const report = {
  base,
  fixtures: process.argv.includes('--fixtures'),
  checks: [],
  errors: [],
  hosts: [],
  pass: false
};
const hosts = new Set();
const axe = await readFile('node_modules/axe-core/axe.min.js', 'utf8');
const check = async (name, action) => {
  try {
    report.checks.push({ name, pass: true, detail: await action() });
  } catch (e) {
    report.checks.push({ name, pass: false, error: String(e) });
    throw e;
  }
};
const layout = async (page) => {
  const sizes = await page.evaluate(() => ({
    width: document.documentElement.clientWidth,
    content: document.documentElement.scrollWidth
  }));
  assert.ok(sizes.content <= sizes.width + 1, JSON.stringify(sizes));
  return sizes;
};
try {
  for (const width of [320, 390, 768, 1440]) {
    const page = await browser.newPage({
      viewport: { width, height: 900 },
      hasTouch: width === 390,
      reducedMotion: 'reduce'
    });
    page.on('pageerror', (e) => report.errors.push(e.message));
    page.on('request', (r) => {
      if (/^https?:/.test(r.url())) hosts.add(new URL(r.url()).hostname);
    });
    if (report.fixtures) await installCiFixtures(page);
    await page.goto(`${base}?year=1979&place=mungia`, { waitUntil: 'domcontentloaded' });
    await page.locator('.maplibregl-ctrl-zoom-in').waitFor();
    await page.waitForFunction(() => window.__mjtMap?.loaded());
    const stamp = await page
      .locator('meta[name="mjt:build"]')
      .getAttribute('content')
      .catch(() => null);
    if (process.env.EXPECTED_BUILD) assert.equal(stamp, process.env.EXPECTED_BUILD);
    report.build = stamp;
    const original = await page.evaluate(() => ({
      year: window.__mjtApp.year,
      cod: window.__mjtApp.place.cod,
      zoom: window.__mjtMap.getZoom(),
      center: window.__mjtMap.getCenter().toArray()
    }));
    await check(`${width}-zoom-keyboard-reset`, async () => {
      await page.getByRole('button', { name: 'Acercar', exact: true }).focus();
      await page.keyboard.press('Enter');
      await page.waitForFunction((z) => window.__mjtMap.getZoom() > z + 0.7, original.zoom);
      await page.getByRole('button', { name: 'Alejar', exact: true }).click();
      await page.waitForFunction(
        (z) => Math.abs(window.__mjtMap.getZoom() - z) < 0.05,
        original.zoom
      );
      const canvas = page.locator('.mapwrap canvas').first();
      await canvas.focus();
      await page.keyboard.press('ArrowRight');
      await page.waitForFunction(
        (c) => Math.abs(window.__mjtMap.getCenter().lng - c[0]) > 0.0001,
        original.center
      );
      await page.locator('.mapreset').click();
      await page.waitForFunction(
        (c) => Math.abs(window.__mjtMap.getCenter().lng - c[0]) < 0.001,
        original.center
      );
      const state = await page.evaluate(() => ({
        year: window.__mjtApp.year,
        cod: window.__mjtApp.place.cod
      }));
      assert.deepEqual(state, { year: original.year, cod: original.cod });
      return layout(page);
    });
    await check(`${width}-help-reflow-and-locale`, async () => {
      await page.locator('.maphelp summary').click();
      assert.match(await page.locator('.maphelp').innerText(), /dos dedos/);
      await layout(page);
      await page.evaluate(() => document.fonts.ready);
      await page.locator('.mapintro').screenshot({ path: join(out, `${width}-help.png`) });
      await page.locator('.maphelp summary').click();
      await page.getByRole('button', { name: 'EU', exact: true }).click();
      assert.ok(await page.getByRole('button', { name: 'Hurbildu', exact: true }).count());
      assert.ok(await page.getByRole('button', { name: 'Urrundu', exact: true }).count());
      assert.match(await page.locator('.maphint').innerText(), /Sakatu|Hautatu/);
      await layout(page);
      await page.locator('.mapintro').screenshot({ path: join(out, `${width}-eu.png`) });
      await page.getByRole('button', { name: 'ES', exact: true }).click();
      for (let i = 0; i < 5; i++) {
        await page.locator('.maphelp summary').click();
        await page.waitForTimeout(60);
      }
      await page.evaluate(axe);
      const audit = await page.evaluate(() =>
        axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } })
      );
      assert.deepEqual(
        audit.violations.map((v) => ({ id: v.id, targets: v.nodes.map((n) => n.target) })),
        []
      );
      return { violations: 0, layout: await layout(page) };
    });
    if (width === 390)
      await check('390-touch-pan-and-pinch', async () => {
        const canvas = page.locator('.mapwrap canvas').first();
        await canvas.scrollIntoViewIfNeeded();
        const rect = await canvas.boundingBox();
        assert.ok(rect);
        const x = rect.x + rect.width / 2;
        const y = rect.y + rect.height / 2;
        const client = await page.context().newCDPSession(page);
        const touch = (type, points) =>
          client.send('Input.dispatchTouchEvent', {
            type,
            touchPoints: points.map(([px, py], id) => ({ x: px, y: py, id }))
          });
        try {
          const before = await page.evaluate(() => ({
            center: window.__mjtMap.getCenter().toArray(),
            zoom: window.__mjtMap.getZoom()
          }));
          await touch('touchStart', [[x, y]]);
          for (let offset = 5; offset <= 50; offset += 5) {
            await touch('touchMove', [[x + offset, y]]);
            await page.waitForTimeout(30);
          }
          await touch('touchEnd', []);
          await page.waitForFunction(
            (c) => Math.abs(window.__mjtMap.getCenter().lng - c[0]) > 0.0001,
            before.center
          );
          await touch('touchStart', [
            [x - 30, y],
            [x + 30, y]
          ]);
          for (let offset = 35; offset <= 80; offset += 5) {
            await touch('touchMove', [
              [x - offset, y],
              [x + offset, y]
            ]);
            await page.waitForTimeout(30);
          }
          await touch('touchEnd', []);
          await page.waitForFunction((z) => window.__mjtMap.getZoom() > z + 0.3, before.zoom);
          await page.locator('.mapreset').click();
          await page.waitForFunction(
            (c) => Math.abs(window.__mjtMap.getCenter().lng - c[0]) < 0.001,
            original.center
          );
          assert.deepEqual(
            await page.evaluate(() => ({
              year: window.__mjtApp.year,
              cod: window.__mjtApp.place.cod
            })),
            { year: original.year, cod: original.cod }
          );
          return {
            pan: true,
            pinch: true,
            reset: true,
            device: 'Chromium con eventos táctiles CDP; no teléfono físico'
          };
        } finally {
          await client.detach();
        }
      });
    await check(`${width}-canvas-after-resize`, async () => {
      for (const w of [width + 40, width]) {
        await page.setViewportSize({ width: w, height: 900 });
        await page.waitForFunction(() => {
          const c = window.__mjtMap?.getCanvas();
          const box = window.__mjtMap?.getContainer();
          return (
            c &&
            box &&
            Math.abs(parseFloat(c.style.width) - box.clientWidth) < 2 &&
            Math.abs(parseFloat(c.style.height) - box.clientHeight) < 2
          );
        });
        await layout(page);
      }
      await page.locator('.maphelp summary').click();
      await page.locator('.mapintro').screenshot({ path: join(out, `${width}-intro.png`) });
      await page
        .locator('.mapwrap')
        .first()
        .screenshot({ path: join(out, `${width}-map.png`) });
      return layout(page);
    });
    await page.close();
  }
  await check('no-carto-dependency-or-pageerrors', async () => {
    report.hosts = [...hosts].sort();
    assert.deepEqual(report.errors, []);
    assert.deepEqual(
      [...hosts].filter((h) => /(^|\.)carto\.com$|(^|\.)cartocdn\.com$/.test(h)),
      []
    );
    return { hosts: report.hosts };
  });
  report.pass = true;
} finally {
  await writeFile(join(out, 'report.json'), JSON.stringify(report, null, 2));
  await browser.close();
  server?.close();
}
