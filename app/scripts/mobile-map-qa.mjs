import { chromium, firefox, webkit, devices } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { createStaticServer } from './static-server.mjs';
import { installCiFixtures } from './fixtures.mjs';

const out = resolve(
  process.env.MOBILE_MAP_OUT || '../evidence/mobile-map-stability-20261001/layout'
);
await mkdir(out, { recursive: true });
const server = await createStaticServer(resolve('build'), 0);
const base = `http://localhost:${server.address().port}/`;
const report = {
  utc: new Date().toISOString(),
  platform: process.platform,
  build: /mjt:build"\s+content="([^"]+)"/.exec(await readFile('build/index.html', 'utf8'))?.[1],
  fixtures: true,
  checks: [],
  errors: [],
  pass: false
};
const headed = process.argv.includes('--headed');
const selectedEngines = Object.entries({ chromium, firefox, webkit }).filter(
  ([name]) =>
    !process.env.MOBILE_MAP_ENGINES || process.env.MOBILE_MAP_ENGINES.split(',').includes(name)
);
assert.ok(selectedEngines.length, 'At least one supported engine');
report.engines = selectedEngines.map(([name]) => name);
const waitForMapContent = (page) =>
  page.waitForFunction(
    () => {
      const map = window.__mjtMap;
      const layers = map
        ?.getStyle()
        ?.layers?.filter((l) => l.id === 'cells-fill' || /^b-\d+-fill$/.test(l.id));
      return (
        layers?.length && map.queryRenderedFeatures({ layers: layers.map((l) => l.id) }).length > 0
      );
    },
    null,
    { timeout: 30000 }
  );
const captureErrors = (page, label) =>
  page.on('pageerror', (e) => report.errors.push({ label, error: e.message }));
try {
  for (const [name, engine] of selectedEngines) {
    const browser = await engine.launch({
      headless: !headed,
      ...(name === 'firefox' && process.platform === 'linux'
        ? { firefoxUserPrefs: { 'webgl.force-enabled': true, 'gfx.webrender.software': true } }
        : {})
    });
    try {
      for (const lang of ['es', 'eu']) {
        const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
        try {
          const page = await context.newPage();
          captureErrors(page, `${name}-${lang}`);
          await installCiFixtures(page);
          await page.goto(base);
          if (lang === 'eu')
            await page.locator('.langs button').getByText('EU', { exact: true }).click();
          await page
            .locator('#year-example')
            .getByText(lang === 'eu' ? /Adibidez/ : /Por ejemplo/)
            .waitFor();
          for (const [id, hint] of [
            ['year-input', 'year-example'],
            ['place-input', 'place-example']
          ]) {
            assert.equal(await page.locator(`#${id}`).inputValue(), '');
            assert.equal(await page.locator(`#${id}`).getAttribute('placeholder'), null);
            assert.ok(
              (await page.locator(`#${id}`).getAttribute('aria-describedby'))
                .split(' ')
                .includes(hint)
            );
            assert.ok(await page.locator(`#${hint}`).isVisible());
          }
          await page.screenshot({ path: join(out, `${name}-${lang}-home.png`) });
          await page.locator('.example-link').click();
          await page.locator('.chapter h1').waitFor();
          await waitForMapContent(page);
          const canvas = await page.locator('.mapband canvas').boundingBox();
          assert.ok(canvas.y <= 720, `Map too far from facts: ${canvas.y}`);
          const notes = page.locator('.story-after-map .story-notes');
          await notes.waitFor();
          const order = await page.evaluate(
            () =>
              !!(
                document
                  .querySelector('.mapband')
                  .compareDocumentPosition(document.querySelector('.story-after-map')) &
                Node.DOCUMENT_POSITION_FOLLOWING
              )
          );
          assert.ok(order);
          assert.match(await page.locator('.chapter .blocks').innerText(), /85,7/);
          const action = await page.locator('.chapter .c-actions button').first().boundingBox();
          assert.ok(action.height >= 44);
          await page.screenshot({ path: join(out, `${name}-${lang}-example.png`) });
          for (const part of ['conclusion', 'limits']) {
            const detail = notes.locator(`.${part}`);
            assert.equal(await detail.getAttribute('open'), null);
            await detail.locator('summary').click();
            assert.notEqual(await detail.getAttribute('open'), null);
            assert.ok((await detail.locator('p').innerText()).length > 30);
            await detail.locator('summary').click();
          }
          await page.setViewportSize({ width: 320, height: 568 });
          await page.waitForFunction(
            () =>
              window.__mjtMap.getCanvas().clientWidth === window.__mjtMap.getContainer().clientWidth
          );
          assert.ok(
            await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)
          );
          await page.setViewportSize({ width: 1440, height: 900 });
          await page.locator('.chapter .story-notes').waitFor();
          assert.equal(await page.locator('.story-after-map').count(), 0);
          await page.setViewportSize({ width: 390, height: 844 });
          await page.locator('.story-after-map .story-notes').waitFor();
          report.checks.push({
            name: `${name}-${lang}`,
            pass: true,
            canvasTop: canvas.y,
            actionHeight: action.height
          });
          console.log('PASS', name, lang, canvas.y);
        } finally {
          await context.close();
        }
      }
    } finally {
      await browser.close();
    }
  }
  const browser = await webkit.launch({ headless: !headed });
  try {
    const context = await browser.newContext(devices['iPhone 13 landscape']);
    const page = await context.newPage();
    captureErrors(page, 'webkit-40-openings');
    await installCiFixtures(page);
    for (let i = 0; i < 40; i++) {
      await page.goto(base);
      await page.locator('.example-link').click();
      await page.locator('.chapter h1').waitFor();
      await waitForMapContent(page);
      // Finish glyph/tile requests before navigating away from this document.
      await page.waitForFunction(() => window.__mjtMap?.loaded(), null, { timeout: 30000 });
      await page.waitForLoadState('networkidle');
    }
    report.checks.push({ name: 'webkit-40-openings', pass: true, openings: 40 });
  } finally {
    await browser.close();
  }
  assert.deepEqual(report.errors, [], 'Unexpected page errors, including ResizeObserver');
  report.pass = true;
} finally {
  await writeFile(join(out, 'report.json'), JSON.stringify(report, null, 2));
  server.close();
}
