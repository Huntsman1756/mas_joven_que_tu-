import { chromium, firefox, webkit, devices } from 'playwright';
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { createStaticServer } from './static-server.mjs';
import { installCiFixtures } from './fixtures.mjs';
import { publicBase } from './qa-target.mjs';

const engines = { chromium, firefox, webkit };
const args = process.argv.slice(2);
const option = (name) => args.find((a) => a.startsWith(`--${name}=`))?.split('=')[1];
const live = args.includes('--live');
assert.ok(
  !(args.includes('--public') && args.includes('--https-fixture')),
  'Publicación existente y transporte del build local son objetivos distintos'
);
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
// Con --public el build local es opcional: la identidad se lee del HTML servido en `home`.
const stamp = /mjt:build"\s+content="([^"]+)"/.exec(
  await readFile('build/index.html', 'utf8').catch((error) => {
    if (args.includes('--public')) return '';
    throw error;
  })
)?.[1];
const report = {
  utc: new Date().toISOString(),
  build: stamp,
  live,
  headed,
  limits: 'Perfiles Playwright emulados; no teléfonos físicos ni Safari iOS real.',
  profiles: []
};
const port = Number(option('port') || 0);
assert.ok(Number.isInteger(port) && port >= 0 && port <= 65535, 'Puerto local válido');
const server = await createStaticServer(resolve('build'), port);
const host = option('host') || 'localhost';
assert.ok(['localhost', '127.0.0.1'].includes(host), 'El harness solo usa loopback');
const httpsFixtureOrigin = new URL(publicBase()).origin;
const base = args.includes('--public')
  ? publicBase()
  : args.includes('--https-fixture')
    ? httpsFixtureOrigin
    : `http://${host}:${server.address().port}`;
report.base = base;
report.artifactTransport = args.includes('--https-fixture')
  ? 'HTTPS interceptado: bytes del build local, no publicación'
  : args.includes('--public')
    ? 'Publicación existente'
    : 'Servidor HTTP local';
report.diagnosticFontsDisabled = args.includes('--diagnose-fonts');
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
      if (args.includes('--diagnose-resize')) {
        await context.addInitScript(() => {
          const Original = window.ResizeObserver;
          const deliveries = [];
          window.ResizeObserver = class extends Original {
            constructor(callback) {
              const origin = new Error().stack;
              super((entries, observer) => {
                deliveries.push({
                  origin,
                  entries: entries.map((entry) => ({
                    target: entry.target.className,
                    width: entry.contentRect.width,
                    height: entry.contentRect.height
                  }))
                });
                if (deliveries.length > 20) deliveries.shift();
                callback(entries, observer);
              });
            }
          };
          window.addEventListener('error', (event) => {
            if (event.message.includes('ResizeObserver'))
              console.info(`MJT_RESIZE_TRACE ${JSON.stringify(deliveries)}`);
          });
        });
      }
      page = await context.newPage();
      result.resizeDiagnostics = [];
      page.on('console', (message) => {
        const prefix = 'MJT_RESIZE_TRACE ';
        if (message.text().startsWith(prefix))
          result.resizeDiagnostics.push(JSON.parse(message.text().slice(prefix.length)));
      });
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
      if (args.includes('--https-fixture')) {
        await context.route(`${httpsFixtureOrigin}/**`, async (route) => {
          const requested = new URL(route.request().url());
          const local = `http://${host}:${server.address().port}${requested.pathname}${requested.search}`;
          const response = await fetch(local, { headers: route.request().headers() });
          const headers = Object.fromEntries(response.headers);
          delete headers['content-encoding'];
          delete headers['content-length'];
          await route.fulfill({
            status: response.status,
            headers,
            body: Buffer.from(await response.arrayBuffer())
          });
        });
      }
      if (!live) await installCiFixtures(page);
      if (args.includes('--diagnose-fonts'))
        await page.route('**/fonts/fonts.css', (route) =>
          route.fulfill({ contentType: 'text/css', body: '' })
        );
      await check('browser-context', async () => {
        await page.goto('about:blank', { waitUntil: 'domcontentloaded' });
        const target = args.includes('--public')
          ? `${base}/`
          : `http://${host}:${server.address().port}`;
        const response = await fetch(target, { signal: AbortSignal.timeout(15000) });
        assert.ok(response.ok, 'El servidor objetivo debe responder antes del recorrido');
        return { serverStatus: response.status };
      });
      await check('home', async () => {
        await page.goto(`${base}/`, { waitUntil: 'domcontentloaded' });
        await page.locator('.example-link').waitFor();
        report.build = await page.locator('meta[name="mjt:build"]').getAttribute('content');
        await page
          .locator('.visual img')
          .first()
          .evaluate((img) => img.decode());
        assert.match(await page.locator('.visual figcaption').innerText(), /1953.*1955/);
        const example = await page.locator('.example-link').boundingBox();
        assert.ok(example.height >= 44, 'El ejemplo debe tener un área táctil visible');
        assert.equal(
          await page.locator('.example-link').evaluate((el) => getComputedStyle(el).borderTopStyle),
          'solid'
        );
        return layout();
      });
      await check('interface-font-weights', async () => {
        const widths = await page.evaluate(async () => {
          const reference = new FontFace(
            'WeightReference',
            'url("fonts/sourcesans3-400-normal-latin.woff2")',
            { weight: '200 900' }
          );
          document.fonts.add(await reference.load());
          const text = 'Bizkaia Mungia 1979 eraikinak';
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          const measure = async (family, weight) => {
            const font = `${weight} 32px "${family}"`;
            await document.fonts.load(font, text);
            ctx.font = font;
            return ctx.measureText(text).width;
          };
          const samples = [];
          for (const weight of [400, 600, 700]) {
            samples.push({
              weight,
              actual: await measure('Source Sans 3', weight),
              expected: await measure('WeightReference', weight)
            });
          }
          const thin = await measure('WeightReference', 200);
          return { samples, thin };
        });
        for (const sample of widths.samples) {
          assert.ok(Math.abs(sample.actual - sample.expected) < 0.1, JSON.stringify(sample));
          assert.ok(Math.abs(sample.actual - widths.thin) > 1, 'No debe usar el eje 200');
        }
        await page.evaluate(() => {
          const probe = document.createElement('div');
          probe.id = 'font-weight-probe';
          probe.textContent = 'Bizkaia Mungia 1979 eraikinak';
          probe.style.cssText =
            'position:fixed;top:0;left:0;z-index:2147483647;width:600px;height:80px;' +
            'color:#000;background:#fff;font-size:32px;line-height:80px;letter-spacing:0';
          document.body.append(probe);
        });
        try {
          for (const weight of [400, 600, 700]) {
            const render = async (family) => {
              await page.locator('#font-weight-probe').evaluate(
                (el, font) => {
                  el.style.fontFamily = font.family;
                  el.style.fontWeight = String(font.weight);
                  el.style.fontVariationSettings =
                    font.family === 'WeightReference' ? `"wght" ${font.weight}` : 'normal';
                },
                { family, weight }
              );
              return page.locator('#font-weight-probe').screenshot();
            };
            assert.deepEqual(
              await render('Source Sans 3'),
              await render('WeightReference'),
              `El texto DOM debe dibujar el peso ${weight} solicitado`
            );
          }
        } finally {
          await page.evaluate(() => {
            document.getElementById('font-weight-probe')?.remove();
            for (const face of document.fonts)
              if (face.family === 'WeightReference') document.fonts.delete(face);
          });
        }
        return widths;
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
        if (page.viewportSize().width >= 1024) {
          const intro = await page.locator('.mapintro strong').boundingBox();
          const toolbar = await page.locator('.vtoolbar').boundingBox();
          assert.ok(
            intro.y >= toolbar.y + toolbar.height - 1,
            'La barra de modos no debe tapar las instrucciones del mapa al abrir el capítulo'
          );
        }
        return layout();
      });
      await screenshot('example');
      await check('compact-story-reading', async () => {
        const conclusion = page.locator('.story-notes .conclusion');
        assert.equal(await conclusion.getAttribute('open'), null);
        const action = await page
          .getByRole('button', { name: 'Ver en el mapa', exact: true })
          .boundingBox();
        const data = await page.locator('.chapter .blocks').boundingBox();
        assert.ok(action.y < data.y, 'El salto al mapa precede al detalle también en el DOM');
        assert.ok(
          action.y >= 0 && action.y + action.height <= page.viewportSize().height,
          'La acción de mapa cabe en la pantalla al entrar'
        );
        assert.ok(
          await page.getByRole('button', { name: 'Ver en el mapa', exact: true }).isVisible()
        );
        await conclusion.locator('summary').click();
        assert.match(await conclusion.innerText(), /60 de los 70/);
        await conclusion.locator('summary').click();
        const paint = await page.evaluate(() => ({
          saturation: window.__mjtMap.getPaintProperty('refbase', 'raster-saturation'),
          attribution: window.__mjtMap.getSource('refbase').attribution
        }));
        assert.equal(paint.saturation, -1);
        assert.match(paint.attribution, /geoEuskadi.*CC BY 4.0/);
        return { actionTop: action.y, dataTop: data.y, paint };
      });
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
        await page.locator('.story-notes .limits summary').click();
        assert.match(
          await page.locator('.story-notes .limits').innerText(),
          /No permite saber qué había antes/
        );
        await page.locator('.story-notes .limits summary').click();
        await page.locator('.municipal-context > summary').click();
        assert.match(await page.locator('.municipal-context').innerText(), /59,9/);
        await page.locator('.municipal-context > summary').click();
      });
      await check('map-navigation-localized', async () => {
        const original = await page.evaluate(() => ({
          year: window.__mjtApp.year,
          cod: window.__mjtApp.place.cod,
          zoom: window.__mjtMap.getZoom()
        }));
        await page.getByRole('button', { name: 'Acercar', exact: true }).click();
        await page.waitForFunction((z) => window.__mjtMap.getZoom() > z + 0.7, original.zoom);
        await page.locator('.mapreset').click();
        await page.waitForFunction((z) => window.__mjtMap.getZoom() < z - 0.1, original.zoom);
        await page.locator('.maphelp summary').click();
        await page.locator('.maphelp[open] li').first().waitFor();
        assert.match(await page.locator('.maphelp').innerText(), /dos dedos/);
        await page.locator('.maphelp summary').click();
        await page.locator('.maphelp:not([open])').waitFor();
        await page.getByRole('button', { name: 'EU', exact: true }).click();
        await page.getByRole('button', { name: 'Hurbildu', exact: true }).waitFor();
        await page.getByRole('button', { name: 'Urrundu', exact: true }).waitFor();
        await page.getByRole('button', { name: 'ES', exact: true }).click();
        await page.getByRole('button', { name: 'Acercar', exact: true }).waitFor();
        assert.deepEqual(
          await page.evaluate(() => ({
            year: window.__mjtApp.year,
            cod: window.__mjtApp.place.cod
          })),
          { year: original.year, cod: original.cod }
        );
        return layout();
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
        assert.equal(
          await page.locator('.finding').count(),
          0,
          'Leioa no muestra el hallazgo de Mungia'
        );
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
        await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
        await page.locator('a[href*="como-lo-sabemos"]:visible').first().click();
        await page.waitForURL(/\/como-lo-sabemos$/);
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
