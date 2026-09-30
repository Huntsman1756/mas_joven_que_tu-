import { chromium, firefox, webkit, devices } from 'playwright';
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { createStaticServer } from './static-server.mjs';
import { installCiFixtures } from './fixtures.mjs';

const engines = { chromium, firefox, webkit };
const args = process.argv.slice(2);
const option = (name) => args.find((a) => a.startsWith(`--${name}=`))?.split('=')[1];
const live = args.includes('--live');
const headed = args.includes('--headed');
const profiles = [
  { id: 'desktop-chromium', engine: 'chromium', viewport: { width: 1440, height: 900 } },
  { id: 'desktop-firefox', engine: 'firefox', viewport: { width: 1440, height: 900 } },
  { id: 'desktop-webkit', engine: 'webkit', viewport: { width: 1440, height: 900 } },
  { id: 'pixel5', engine: 'chromium', device: 'Pixel 5' },
  { id: 'galaxy-s9', engine: 'chromium', device: 'Galaxy S9+' },
  { id: 'iphone-se', engine: 'webkit', device: 'iPhone SE' },
  { id: 'iphone13', engine: 'webkit', device: 'iPhone 13' },
  { id: 'iphone13-landscape', engine: 'webkit', device: 'iPhone 13 landscape' },
  { id: 'ipad-mini', engine: 'webkit', device: 'iPad Mini' }
].filter((p) => !option('profiles') || option('profiles').split(',').includes(p.id));
assert.ok(profiles.length, 'Seleccionar al menos un perfil conocido');
const run = new Date().toISOString().replace(/[:.]/g, '-');
const out = resolve(option('out') || `../evidence/competition-20260930/matrix-${run}`);
await mkdir(out, { recursive: true });
const stamp = /mjt:build"\s+content="([^"]+)"/.exec(
  await readFile('build/index.html', 'utf8')
)?.[1];
const report = {
  utc: new Date().toISOString(),
  build: stamp,
  live,
  headed,
  limits: 'Perfiles Playwright emulados; no teléfonos físicos ni Safari iOS real.',
  profiles: []
};
const server = await createStaticServer(resolve('build'), 0);
const base = `http://localhost:${server.address().port}`;
const axe = await readFile('node_modules/axe-core/axe.min.js', 'utf8');
const results = () => writeFile(join(out, 'report.json'), JSON.stringify(report, null, 2));

try {
  for (const profile of profiles) {
    const result = { ...profile, checks: [], errors: [], screenshots: [] };
    report.profiles.push(result);
    let browser;
    let page;
    const check = async (name, action) => {
      result.activeCheck = name;
      console.log(`CHECK ${profile.id} ${name}`);
      const started = performance.now();
      try {
        const detail = await action();
        result.checks.push({
          name,
          pass: true,
          ms: Math.round(performance.now() - started),
          detail
        });
      } catch (e) {
        result.checks.push({ name, pass: false, error: String(e) });
        await results();
        throw e;
      }
    };
    const screenshot = async (step) => {
      const file = `${profile.id}-${step}.png`;
      await page.screenshot({ path: join(out, file), timeout: 10000 });
      result.screenshots.push(file);
    };
    const layout = async () => {
      const widths = await page.evaluate(() => ({
        viewport: document.documentElement.clientWidth,
        content: document.documentElement.scrollWidth
      }));
      assert.ok(widths.content <= widths.viewport + 1, JSON.stringify(widths));
      return widths;
    };
    const mapContent = async () => {
      await page.waitForFunction(
        () => {
          const map = window.__mjtMap;
          const layers = map
            ?.getStyle()
            ?.layers?.filter((l) => l.id === 'cells-fill' || /^b-\d+-fill$/.test(l.id));
          return (
            layers?.length &&
            map.queryRenderedFeatures({ layers: layers.map((l) => l.id) }).length > 0
          );
        },
        null,
        { timeout: 30000 }
      );
    };
    const mode = async (name) => {
      const switcher = page.locator('.vtoolbar');
      const button = switcher.locator(`button[data-mode="${name}"]`);
      if (await button.isVisible()) {
        await button.click();
      } else {
        await switcher.locator('.vsel').click();
        await page.locator(`.vmenu button[data-mode="${name}"]`).click();
      }
      await page.waitForFunction((m) => window.__mjtApp?.mode === m, name);
    };
    try {
      browser = await engines[profile.engine].launch({
        headless: !headed,
        ...(profile.engine === 'firefox' && process.platform === 'linux'
          ? {
              firefoxUserPrefs: { 'webgl.force-enabled': true, 'gfx.webrender.software': true }
            }
          : {})
      });
      result.renderer =
        profile.engine === 'firefox' && process.platform === 'linux'
          ? 'Software WebGL habilitado en CI Linux'
          : 'Configuración predeterminada';
      result.version = browser.version();
      const context = await browser.newContext(
        profile.device ? devices[profile.device] : { viewport: profile.viewport }
      );
      page = await context.newPage();
      page.setDefaultTimeout(15000);
      page.on('pageerror', (e) => result.errors.push(e.message));
      result.errorDetails = [];
      result.failedRequests = [];
      page.on('pageerror', (e) =>
        result.errorDetails.push({
          name: e.name,
          message: e.message,
          stack: e.stack,
          phase: result.activeCheck,
          time: new Date().toISOString()
        })
      );
      page.on('requestfailed', (r) =>
        result.failedRequests.push({
          url: r.url(),
          failure: r.failure(),
          time: new Date().toISOString()
        })
      );
      if (!live) await installCiFixtures(page);
      await check('home', async () => {
        await page.goto(base, { waitUntil: 'domcontentloaded' });
        await page.locator('.example-link').waitFor();
        await page
          .locator('.visual img')
          .first()
          .evaluate((img) => img.decode());
        assert.match(await page.locator('.visual figcaption').innerText(), /1953.*1955/);
        return layout();
      });
      await screenshot('home');
      await check('example-adjacent-to-map', async () => {
        await page.locator('.example-link').click();
        await page.locator('.sidebar .chapter[data-story="f4036"] h1').waitFor();
        assert.equal(await page.locator('.chapter').count(), 1);
        assert.match(await page.locator('.chapter').innerText(), /85,7/);
        assert.match(await page.locator('.chapter').innerText(), /1,9/);
        assert.match(await page.locator('.chapter').innerText(), /70/);
        assert.equal(await page.locator('.municipal-context').getAttribute('open'), null);
        await mapContent();
        const position = await page.locator('.chapter h1').boundingBox();
        assert.ok(
          position.y >= 0 && position.y < page.viewportSize().height,
          'El hallazgo debe estar visible al entrar'
        );
        return layout();
      });
      await screenshot('example');
      await check('story-map-action', async () => {
        await page.getByRole('button', { name: 'Ver en el mapa', exact: true }).click();
        await page.waitForFunction(() => {
          const box = document.querySelector('.mapband canvas')?.getBoundingClientRect();
          return box && box.top >= 0 && box.top < innerHeight;
        });
        assert.equal(await page.evaluate(() => window.__mjtApp.mode), 'map');
        await mapContent();
      });
      await check('scope-and-limits', async () => {
        await page.locator('.chapter details summary').click();
        assert.match(await page.locator('.chapter details').innerText(), /No nos dice|No sabemos/);
        await page.locator('.chapter details summary').click();
        await page.locator('.municipal-context > summary').click();
        assert.match(await page.locator('.municipal-context').innerText(), /59,9/);
        await page.locator('.municipal-context > summary').click();
      });
      await check('axe-example', async () => {
        // Evaluación directa: la CSP del producto no se relaja para la prueba.
        await page.evaluate(axe);
        const audit = await page.evaluate(() =>
          axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } })
        );
        assert.deepEqual(
          audit.violations.map((v) => ({ id: v.id, targets: v.nodes.map((n) => n.target) })),
          []
        );
        return { violations: 0 };
      });
      await check('return-and-personal-form', async () => {
        await page.getByRole('button', { name: 'Volver a mi Bizkaia', exact: true }).click();
        await page.locator('#year-input').fill('1987');
        await page.locator('#place-input').fill('Leioa');
        await page.locator('#place-listbox button').first().click();
        await page.locator('.cta').click();
        await page.locator('.headline-block h1').waitFor();
        assert.match(await page.locator('.headline-block').innerText(), /47,6/);
        await mapContent();
        return layout();
      });
      await screenshot('personal');
      await check('evolution-play-pause', async () => {
        await mode('time');
        await page.locator('.timeband [data-action="play"]').click();
        await page.waitForFunction(() => window.__mjtApp?.playYear > 1987);
        await page.locator('.timeband [data-action="play"]').click();
        assert.equal(await page.evaluate(() => window.__mjtApp.playing), false);
        return layout();
      });
      await check('photo-content', async () => {
        await mode('photo');
        await page.locator('.photo [data-action="activate"]').first().click();
        await page.waitForFunction(() => window.__mjtApp?.orthoRender === 'CONTENT', null, {
          timeout: 45000
        });
        return {
          evidence: live
            ? 'Servicios oficiales reales; inspeccionar captura'
            : 'Raster simulado: verifica comportamiento, no proveedor',
          layout: await layout()
        };
      });
      await screenshot('photo');
      await check('swipe-keyboard', async () => {
        await mode('swipe');
        const slider = page.locator('.swipe [role="slider"]');
        await slider.waitFor();
        const before = Number(await slider.getAttribute('aria-valuenow'));
        await slider.press('ArrowRight');
        assert.ok(Number(await slider.getAttribute('aria-valuenow')) > before);
        await page.waitForFunction(
          () => window.__mjtSwipe?.loaded?.() && window.__mjtMap?.areTilesLoaded?.(),
          null,
          { timeout: 30000 }
        );
        return layout();
      });
      await screenshot('swipe');
      await check('method-and-download', async () => {
        await page.goto(`${base}/como-lo-sabemos`, { waitUntil: 'domcontentloaded' });
        await page.locator('h1').waitFor();
        assert.ok(await page.locator('a[href*="editorial-cases.csv"]').count());
        return layout();
      });
      await screenshot('method');
      await check('no-uncaught-errors', async () => assert.deepEqual(result.errors, []));
      await check('unsupported-graphics-recovery', async () => {
        const fault = await context.newPage();
        const errors = [];
        fault.on('pageerror', (e) => errors.push(e.message));
        if (!live) await installCiFixtures(fault);
        await fault.addInitScript(() => {
          const getContext = HTMLCanvasElement.prototype.getContext;
          HTMLCanvasElement.prototype.getContext = function (type, ...args) {
            if (type === 'webgl' || type === 'webgl2') return null;
            return getContext.call(this, type, ...args);
          };
        });
        await fault.goto(`${base}/?year=1987&place=leioa`, { waitUntil: 'domcontentloaded' });
        await fault.locator('.maperror').filter({ hasText: 'no ha podido dibujar' }).waitFor();
        assert.match(await fault.locator('.headline-block').innerText(), /47,6/);
        await fault.evaluate(() => {
          window.__mjtApp.mode = 'swipe';
        });
        await fault.locator('.swipe [role="slider"]').waitFor();
        assert.deepEqual(errors, []);
        await fault.close();
        return {
          injected: 'WebGL indisponible solo en esta pestaña',
          uncaught: 0,
          metricsAvailable: true
        };
      });
      result.pass = true;
    } catch (e) {
      result.pass = false;
      result.failure = String(e);
      if (page) await screenshot('failure').catch(() => {});
    } finally {
      await results();
      if (browser)
        await Promise.race([browser.close(), new Promise((resolve) => setTimeout(resolve, 10000))]);
      await results();
      console.log(
        `${result.pass ? 'PASS' : 'FAIL'} ${profile.id}${result.failure ? ': ' + result.failure.slice(0, 170) : ''}`
      );
    }
  }
} finally {
  server.close();
  await results();
}
console.log(out);
if (report.profiles.some((p) => !p.pass)) process.exitCode = 1;
