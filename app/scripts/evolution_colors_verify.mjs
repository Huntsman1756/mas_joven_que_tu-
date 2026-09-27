import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';

// Read-only QA handles; interactions go through the player and mode controls.
const base = process.env.EVOLUTION_BASE || 'http://127.0.0.1:5199';
const out = new URL(`../../evidence/evolution-colors-${Date.now()}/`, import.meta.url);
await mkdir(out, { recursive: true });
const browser = await chromium.launch();
const report = { base, utc: new Date().toISOString(), samples: [], checks: [] };
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await page.goto(
    `${base}/?year=1979&place=mungia&view=time&play=2000&lat=43.328&lon=-2.8427&z=16`,
    { timeout: 90000 }
  );
  await page.waitForFunction(
    () => window.__mjtMap?.queryRenderedFeatures().some((f) => /^b-\d+-fill$/.test(f.layer.id)),
    null,
    { timeout: 90000 }
  );
  const sample = async () =>
    page.evaluate(() => {
      const m = window.__mjtMap,
        a = window.__mjtApp;
      const layers = m.getStyle().layers.filter((l) => /^b-\d+-fill$/.test(l.id));
      const features = m.queryRenderedFeatures({ layers: layers.map((l) => l.id) });
      const valid = features.filter((f) => f.properties.state === 'VALID');
      return {
        year: a.year,
        playYear: a.playYear,
        mode: a.mode,
        layers: layers.map((l) => ({
          id: l.id,
          fill: m.getPaintProperty(l.id, 'fill-color'),
          opacity: m.getPaintProperty(l.id, 'fill-opacity'),
          filter: m.getFilter(l.id)
        })),
        before: valid
          .filter((f) => f.properties.year <= a.year)
          .map((f) => ({ id: f.properties.id, year: f.properties.year })),
        after: valid
          .filter((f) => f.properties.year > a.year)
          .map((f) => ({ id: f.properties.id, year: f.properties.year })),
        future: valid.filter((f) => f.properties.year > a.playYear).length
      };
    });
  const initial = await sample();
  report.samples.push(initial);
  assert(
    initial.before.length > 0 && initial.after.length > 0,
    'Both personal-year classes must be rendered'
  );
  assert.equal(initial.future, 0);
  for (const layer of initial.layers) {
    assert.deepEqual(layer.fill.slice(0, 3), [
      'case',
      ['!=', ['get', 'state'], 'VALID'],
      layer.fill[2]
    ]);
    assert.deepEqual(layer.fill[3], ['>', ['get', 'year'], 1979]);
    assert.notEqual(layer.fill[4], layer.fill[5]);
    assert.equal(layer.opacity[4], 0.95);
    assert.equal(layer.opacity[5], 0.45);
  }
  report.checks.push(
    'Both colors use personal year; future buildings excluded; non-VALID separate'
  );
  await page.screenshot({
    path: new URL('colors-2000.png', out).pathname.replace(/^\/(\w:)/, '$1')
  });
  await page.locator('.timeband .tc-play').click();
  await page.waitForFunction(() => window.__mjtApp.playYear > 2000);
  await page.locator('.timeband .tc-play').click();
  const paused = await sample();
  await page.waitForTimeout(800);
  assert.equal((await sample()).playYear, paused.playYear);
  assert.equal(paused.year, 1979);
  report.checks.push('Play advances, pause freezes, personal year unchanged');
  const slider = page.locator('.timeband input[type=range]');
  await slider.fill('1979');
  await slider.dispatchEvent('change');
  await page.waitForTimeout(500);
  const back = await sample();
  report.samples.push(back);
  assert.equal(back.playYear, 1979);
  assert.equal(back.after.length, 0);
  assert(back.before.length > 0);
  report.checks.push('Scrubbing back hides later buildings');
  await page.goto(`${base}/?year=1979&place=mungia&view=map&play=1979&lat=43.328&lon=-2.8427&z=16`);
  await page.waitForFunction(
    () =>
      window.__mjtMap
        ?.queryRenderedFeatures()
        .some((f) => /^b-\d+-fill$/.test(f.layer.id) && f.properties.year > 1979),
    null,
    { timeout: 60000 }
  );
  const map = await sample();
  report.samples.push(map);
  assert.equal(map.mode, 'map');
  assert(map.after.length > 0);
  report.checks.push('Map mode does not apply saved temporal cutoff');
  report.pass = true;
} catch (error) {
  report.pass = false;
  report.error = String(error.stack || error);
  process.exitCode = 1;
} finally {
  await browser.close();
  await writeFile(new URL('report.json', out), JSON.stringify(report, null, 2));
  console.log(
    JSON.stringify({
      pass: report.pass,
      checks: report.checks,
      error: report.error,
      evidence: out.href
    })
  );
}
