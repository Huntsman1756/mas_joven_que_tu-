import { chromium } from 'playwright';
import { mkdir, readFile, writeFile, readdir, stat } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { createStaticServer } from './static-server.mjs';

const out = resolve(process.env.PERF_OUT || '../evidence/competition-20260930/performance');
await mkdir(out, { recursive: true });
const server = await createStaticServer(resolve('build'), 0);
const base = `http://localhost:${server.address().port}`;
const browser = await chromium.launch({ channel: 'chrome' });
const report = {
  utc: new Date().toISOString(),
  browser: browser.version(),
  build: /mjt:build"\s+content="([^"]+)"/.exec(await readFile('build/index.html', 'utf8'))?.[1],
  repetitions: 20,
  profiles: [],
  definitions: {
    hero: 'Inicio de navegación hasta input de año habilitado',
    result: 'Commit de navegación deep link hasta titular, cifra y features cells renderizadas',
    transfer: 'encodedBodySize first-party hasta resultado; compresión real',
    limits:
      'Diagnóstico local; deep link no equivale al tiempo desde CTA. No certifica el gate G1 completo.'
  }
};
const stats = (values) => {
  const sorted = [...values].sort((a, b) => a - b);
  return {
    n: values.length,
    p75: sorted[Math.ceil(values.length * 0.75) - 1],
    p95: sorted[Math.ceil(values.length * 0.95) - 1],
    max: Math.max(...values),
    raw: values
  };
};
const save = () => writeFile(join(out, 'report.json'), JSON.stringify(report, null, 2));
try {
  for (const mobile of [false, true]) {
    const result = {
      name: mobile ? 'P2-mobile-4x-Slow4G' : 'P1-desktop',
      hero: [],
      ready: [],
      transfer: [],
      cls: []
    };
    report.profiles.push(result);
    for (let i = 0; i < 20; i++) {
      const context = await browser.newContext({
        viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 900 },
        deviceScaleFactor: mobile ? 3 : 1,
        isMobile: mobile,
        hasTouch: mobile
      });
      const page = await context.newPage();
      if (mobile) {
        const cdp = await context.newCDPSession(page);
        await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
        await cdp.send('Network.enable');
        await cdp.send('Network.emulateNetworkConditions', {
          offline: false,
          latency: 150,
          downloadThroughput: (1.6 * 1024 * 1024) / 8,
          uploadThroughput: (750 * 1024) / 8
        });
      }
      await page.addInitScript(() => {
        window.__cls = 0;
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries())
            if (!entry.hadRecentInput) window.__cls += entry.value;
        }).observe({ type: 'layout-shift', buffered: true });
      });
      const start = performance.now();
      await page.goto(base, { waitUntil: 'commit' });
      await page.locator('#year-input:not([disabled])').waitFor({ timeout: 30000 });
      result.hero.push(Math.round(performance.now() - start));
      result.cls.push(await page.evaluate(() => window.__cls));
      await page.goto(`${base}/?year=1987&place=leioa`, { waitUntil: 'commit' });
      const t0 = performance.now();
      await page.locator('.headline-block h1').waitFor();
      await page.locator('.lead2').waitFor();
      await page.waitForFunction(
        () =>
          window.__mjtMap?.getLayer('cells-fill') &&
          window.__mjtMap.queryRenderedFeatures({ layers: ['cells-fill'] }).length > 0,
        null,
        { timeout: 45000 }
      );
      result.ready.push(Math.round(performance.now() - t0));
      if (i < 5)
        result.transfer.push(
          await page.evaluate(() =>
            Math.round(
              performance
                .getEntriesByType('resource')
                .filter((r) => new URL(r.name).host === location.host)
                .reduce(
                  (sum, r) => sum + r.encodedBodySize,
                  performance.getEntriesByType('navigation')[0].encodedBodySize
                ) / 1024
            )
          )
        );
      await context.close();
      await save();
    }
    result.hero_stats = stats(result.hero);
    result.ready_stats = stats(result.ready);
    console.log(result.name, result.hero_stats.p75, result.ready_stats.p75);
    await save();
  }
  async function size(dir) {
    let bytes = 0;
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) bytes += await size(path);
      else if (entry.name.endsWith('.js')) bytes += (await stat(path)).size;
    }
    return bytes;
  }
  report.build_js_raw = await size(resolve('build/_app/immutable'));
} finally {
  await save();
  await browser.close();
  server.close();
}
