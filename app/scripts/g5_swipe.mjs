/**
 * Sonda del modo SWIPE (G6/G11): cortina «antes»/hoy sobre la misma vista.
 *
 * Verifica:
 *  - entrada por click («Antes / ahora») y deep link `?view=swipe`
 *  - el lienzo principal pide la última campaña («hoy») y el overlay
 *    pide la campaña más cercana al año del usuario (G11: 1987→1989) —
 *    requests reales emitidas
 *  - el divisor existe como role=slider con nombre, valor y flechas
 *    de teclado operativas (clip-path cambia)
 *  - arrastre por puntero mueve la cortina
 *  - el overlay está sincronizado con el mapa principal (mismo centro/zoom)
 *  - salir del modo retira la ortofoto del lienzo principal
 *
 * Uso: node scripts/g5_swipe.mjs   (build ya compilado en app/build)
 * Salida: JSON por stdout + evidence/g5/swipe/*.png
 */
import { chromium } from 'playwright';
import { writeFile, mkdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { createStaticServer } from './static-server.mjs';
import { installLocalFixtures, installCiFixtures } from './fixtures.mjs';

// G11.3: con CI_STUBS=1 los servicios externos de imagen se stubban —
// la suite mide la app, no la disponibilidad de geoEuskadi/Bizkaia.
const installFixtures =
  process.env.CI_STUBS === '1' ? installCiFixtures : installLocalFixtures;

const ROOT = resolve(process.cwd(), '..');
const OUT = join(ROOT, 'evidence/g5/swipe');
const PORT = 4198;
const BASE = `http://localhost:${PORT}`;

const server = await createStaticServer(resolve('build'), PORT);
await mkdir(OUT, { recursive: true });
const browser = await chromium.launch({ args: ['--disable-gpu'] });

const results = { utc: new Date().toISOString(), checks: {}, errors: [] };

const clip = (page) => page.locator('.swipe .pane').evaluate((el) => getComputedStyle(el).clipPath);

for (const vp of [
  { name: 'w1440', width: 1440, height: 900 },
  { name: 'w390', width: 390, height: 844, hasTouch: true }
]) {
  const page = await browser.newPage({ viewport: vp });
  await installFixtures(page);
  const errs = [];
  page.on('pageerror', (e) => errs.push(String(e)));
  const reqs = [];
  page.on('request', (r) => reqs.push(r.url()));

  await page.goto(`${BASE}/?year=1987&place=leioa`, { waitUntil: 'load' });
  await page.waitForSelector('.headline-block h1', { timeout: 30000 });

  // G8: en estrecho los modos viven en el menú «Vista · …», no en tabs
  const setMode = async (m) => {
    if (await page.locator('.viewswitch').isVisible()) {
      await page.click(`.viewswitch button[data-mode="${m}"]`);
    } else {
      await page.click('.vsel');
      await page.click(`.vmenu [data-mode="${m}"]`);
    }
  };

  // entrada por click en el modo «Antes / ahora»
  await setMode('swipe');
  await page.waitForSelector('.swipe .handle', { timeout: 30000 }).catch(() => null);

  const appGet = (expr) => page.evaluate((e) => eval(e), expr);
  const checks = {
    mode: await appGet('window.__mjtApp.mode'),
    ortho_year: await appGet('window.__mjtApp.orthoCampaign?.year'),
    slider_role: await page.locator('.swipe .handle[role="slider"]').count(),
    slider_label: await page.locator('.swipe .handle').getAttribute('aria-label'),
    valuenow_0: await page.locator('.swipe .handle').getAttribute('aria-valuenow'),
    clip_0: await clip(page),
    chips: await page.locator('.swipe .chip').allTextContents(),
    hint: await page
      .locator('.swipe .hint')
      .innerText()
      .catch(() => null),
    // arrastre por puntero sobre el handle (lectura tras flush de Svelte)
    drag: await (async () => {
      const h = page.locator('.swipe .handle');
      await h.scrollIntoViewIfNeeded(); // el centro puede quedar bajo el fold
      const box = await h.boundingBox();
      if (!box) return null;
      const y = box.y + box.height / 2;
      await page.mouse.move(box.x + box.width / 2, y);
      await page.mouse.down();
      await page.mouse.move(box.x - 160, y, { steps: 6 });
      await page.mouse.up();
      await page.waitForTimeout(200);
      return { value: Number(await h.getAttribute('aria-valuenow')), clip: await clip(page) };
    })(),
    // teclado: → debe mover la cortina y cambiar el clip
    kb: await (async () => {
      const h = page.locator('.swipe .handle');
      await h.focus();
      const v0 = Number(await h.getAttribute('aria-valuenow'));
      await h.press('ArrowRight');
      const v1 = Number(await h.getAttribute('aria-valuenow'));
      await h.press('End');
      const v2 = Number(await h.getAttribute('aria-valuenow'));
      const c2 = await clip(page);
      return { v0, v1, v2, clipAfterEnd: c2 };
    })(),
    // sincronización: mover el principal debe mover el overlay (__mjtSwipe)
    sync: await (async () => {
      await page.evaluate(() => window.__mjtMap?.jumpTo({ center: [-2.99, 43.33], zoom: 14 }));
      await page.waitForTimeout(500);
      return page.evaluate(() => {
        const m = window.__mjtMap;
        const s = window.__mjtSwipe;
        if (!m || !s) return null;
        const mc = m.getCenter();
        const sc = s.getCenter();
        return {
          main: [mc.lng, mc.lat, m.getZoom()],
          overlay: [sc.lng, sc.lat, s.getZoom()]
        };
      });
    })(),
    // G11: «antes» = campaña más cercana al año (1987→1989, ORTO_1989)
    req_before: reqs.filter((u) => u.includes('ORTO_1989')).length,
    req_latest: reqs.filter((u) => u.includes('ORTO_2025')).length,
    console_errors: errs.length
  };

  // el overlay replica la cámara: centros a ~1e-4 (jumpTo exacto)
  checks.sync_match = await page.evaluate(() => {
    const m = window.__mjtMap;
    const s = window.__mjtSwipe;
    if (!m || !s) return null;
    const mc = m.getCenter();
    const sc = s.getCenter();
    return (
      Math.abs(mc.lng - sc.lng) < 1e-4 &&
      Math.abs(mc.lat - sc.lat) < 1e-4 &&
      Math.abs(m.getZoom() - s.getZoom()) < 1e-4
    );
  });

  await page.screenshot({ path: join(OUT, `swipe-${vp.name}.png`) });
  await setMode('map');
  await page.waitForTimeout(600);
  checks.exit_ortho_off = await appGet('window.__mjtApp.orthoVisible');
  results.checks[vp.name] = checks;
  results.errors.push(...errs);
  await page.close();
}

// deep link directo
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await installFixtures(page);
  await page.goto(`${BASE}/?year=1987&place=leioa&view=swipe`, { waitUntil: 'load' });
  await page.waitForSelector('.headline-block h1', { timeout: 30000 });
  await page.waitForSelector('.swipe .handle', { timeout: 30000 }).catch(() => null);
  results.deeplink = {
    mode: await page.evaluate(() => window.__mjtApp?.mode),
    slider: await page.locator('.swipe .handle[role="slider"]').count()
  };
  await page.screenshot({ path: join(OUT, 'swipe-deeplink.png') });
  await page.close();
}

// G11.3: editar el año DENTRO del modo swipe — chip y fuente solicitada
// deben corresponder a la NUEVA campaña (regresión: chip «1956» mientras
// el mapa seguía pidiendo teselas ORTO_1989).
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await installFixtures(page);
  const errs = [];
  page.on('pageerror', (e) => errs.push(String(e)));
  const reqs = [];
  page.on('request', (r) => reqs.push(r.url()));

  await page.goto(`${BASE}/?year=1988&place=getxo`, { waitUntil: 'load' });
  await page.waitForSelector('.headline-block h1', { timeout: 30000 });
  if (await page.locator('.viewswitch').isVisible()) {
    await page.click('.viewswitch button[data-mode="swipe"]');
  } else {
    await page.click('.vsel');
    await page.click('.vmenu [data-mode="swipe"]');
  }
  await page.waitForSelector('.swipe .chip.left', { timeout: 30000 });
  const chip0 = (await page.locator('.swipe .chip.left').innerText()).trim();
  const reqCount0 = reqs.length;

  // el usuario cambia su año: 1988 → 1960 («antes» pasa 1989 → 1956)
  await page.click('.topbar .change');
  await page.fill('#edit-year', '1960');
  await page.click('.cf-submit');

  // la etiqueta solo puede anunciar la campaña nueva una vez la sonda la
  // verifica; esperamos al chip nuevo y contamos las requests emitidas
  // DESPUÉS del cambio (el chip viejo no debe reaparecer con la fuente
  // nueva ni viceversa).
  const chip1 = await page
    .waitForFunction(
      (old) => {
        const el = document.querySelector('.swipe .chip.left');
        return el && el.textContent.trim() !== old ? el.textContent.trim() : false;
      },
      chip0,
      { timeout: 30000 }
    )
    .then((h) => h.jsonValue())
    .catch(() => null);
  const reqsNew = reqs.slice(reqCount0);
  const expected = await page.evaluate(() => {
    const c = window.__mjtApp?.nearest;
    if (!c) return null;
    return {
      year: c.year,
      frag: c.source === 'bizkaia' ? `ORTO_BFA_${c.year}` : (c.layer ?? `ORTO_${c.year}`)
    };
  });
  const chipNow = await page.locator('.swipe .chip.left').innerText().catch(() => null);
  results.yearedit = {
    chip_before: chip0,
    chip_after: chipNow?.trim() ?? chip1,
    expected,
    req_new_campaign: expected ? reqsNew.filter((u) => u.includes(expected.frag)).length : 0,
    req_old_campaign: reqsNew.filter((u) => u.includes('ORTO_1989')).length,
    errors: errs
  };
  await page.screenshot({ path: join(OUT, 'swipe-yearedit.png') });
  results.errors.push(...errs);
  await page.close();
}

results.pass =
  results.checks.w1440.mode === 'swipe' &&
  results.checks.w1440.slider_role === 1 &&
  results.checks.w1440.kb.v1 > results.checks.w1440.kb.v0 &&
  results.checks.w1440.kb.v2 === 100 &&
  results.checks.w1440.drag !== null &&
  results.checks.w1440.drag.value < 50 &&
  results.checks.w1440.sync_match === true &&
  results.checks.w1440.req_before > 0 &&
  results.checks.w1440.req_latest > 0 &&
  results.checks.w1440.exit_ortho_off === false &&
  results.deeplink.mode === 'swipe' &&
  results.deeplink.slider === 1 &&
  // G11.3: tras editar el año, el chip muestra la campaña derivada y la
  // fuente pedida es la de ESA campaña (no la anterior).
  results.yearedit.chip_after === String(results.yearedit.expected?.year) &&
  results.yearedit.req_new_campaign > 0 &&
  results.yearedit.errors.length === 0 &&
  results.errors.length === 0;

await writeFile(join(OUT, 'swipe.json'), JSON.stringify(results, null, 2));
console.log(JSON.stringify(results, null, 2));
await browser.close();
server.close();
process.exit(results.pass ? 0 : 1);
