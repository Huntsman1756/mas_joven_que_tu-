import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { createStaticServer } from './static-server.mjs';

const out = resolve('../docs/submission/media');
const frames = join(out, 'play-frames-build');
await mkdir(frames, { recursive: true });
const server = await createStaticServer(resolve('build'), 4398);
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.setDefaultTimeout(30000);
const base = (process.env.CAPTURE_BASE || 'http://localhost:4398').replace(/\/$/, '');
const provenance = {
  utc: new Date().toISOString(),
  build: /mjt:build"\s+content="([^"]+)"/.exec(await readFile('build/index.html', 'utf8'))?.[1],
  browser: browser.version(),
  viewport: { width: 1440, height: 900 },
  source: process.env.CAPTURE_BASE
    ? `Publicación ${base}; servicios oficiales reales; sin respuestas simuladas`
    : 'Build estático local; servicios oficiales reales; sin respuestas simuladas',
  files: [],
  limits: 'Montaje editorial: no mide rendimiento ni acredita dispositivos físicos.'
};
const capture = async (name) => {
  await page.screenshot({ path: join(out, `${name}.png`), timeout: 15000 });
  provenance.files.push(`${name}.png`);
};
const content = () =>
  page.waitForFunction(() => {
    const map = window.__mjtMap;
    const layers = map
      ?.getStyle()
      ?.layers?.filter((l) => l.id === 'cells-fill' || /^b-\d+-fill$/.test(l.id));
    return (
      layers?.length && map.queryRenderedFeatures({ layers: layers.map((l) => l.id) }).length > 0
    );
  });
const mode = async (name) => {
  await page.locator(`.vtoolbar button[data-mode="${name}"]`).click();
  await page.waitForFunction((m) => window.__mjtApp.mode === m, name);
};
try {
  await page.goto(base);
  assert.equal(await page.locator('meta[name="mjt:build"]').getAttribute('content'), provenance.build);
  await page
    .locator('.visual img')
    .first()
    .evaluate((img) => img.decode());
  await capture('01-home');
  await page.goto(`${base}/?year=1979&place=mungia`);
  await page.locator('.headline-block h1').waitFor();
  await content();
  assert.match(await page.locator('.headline-block').innerText(), /59,9/);
  await capture('02-result');
  await mode('time');
  await page.locator('.timeband [data-action="play"]').click();
  const timing = [];
  const start = performance.now();
  for (let i = 0; i < 20; i++) {
    const file = `frame-${String(i).padStart(3, '0')}.png`;
    timing.push({
      file,
      time: (performance.now() - start) / 1000,
      year: await page.evaluate(() => window.__mjtApp.playYear)
    });
    await page.screenshot({ path: join(frames, file) });
    await page.waitForTimeout(150);
  }
  if (await page.evaluate(() => window.__mjtApp.playing))
    await page.locator('.timeband [data-action="play"]').click();
  await writeFile(join(frames, 'timing.json'), JSON.stringify(timing, null, 2));
  await capture('03-play');
  await mode('swipe');
  await page.waitForFunction(() => window.__mjtSwipe?.loaded?.(), null, { timeout: 60000 });
  await capture('04-swipe');
  await page.goto(base);
  await page.locator('.example-link').click();
  await page.locator('.chapter h1').waitFor();
  await content();
  await capture('05-story');
  await page.goto(`${base}/como-lo-sabemos`);
  await page.locator('h1').waitFor();
  await capture('06-method');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(base);
  await page.locator('.example-link').click();
  await page.locator('.chapter h1').waitFor();
  await capture('07-mobile-story');
  provenance.pass = true;
} finally {
  await writeFile(join(out, 'capture-provenance.json'), JSON.stringify(provenance, null, 2));
  await browser.close();
  server.close();
}
