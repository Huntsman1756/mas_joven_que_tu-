// Diagnóstico de comprensión: capturas del recorrido real (sin stubs).
// Desktop 1440x900 y móvil 390x844. Salida: evidence/comp/
import { chromium } from 'playwright';
import fs from 'node:fs';
import assert from 'node:assert/strict';

const BASE = process.env.BASE_URL || 'http://localhost:4180';
const OUT = process.env.SHOTS_OUT || '../evidence/comp-g12-fix';
fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();

async function run(tag, viewport) {
  const ctx = await browser.newContext({
    viewport,
    locale: 'es',
    hasTouch: tag === 'mob',
    isMobile: tag === 'mob'
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));

  // 1. Portada
  await page.goto(`${BASE}/`, { waitUntil: 'load' });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `${OUT}/${tag}-0-portada.png` });

  // 2. Resultado con año+lugar (deep link real: Getxo 1988)
  await page.goto(`${BASE}/?year=1988&place=getxo`, { waitUntil: 'load' });
  await page.waitForTimeout(4000);
  await page.screenshot({ path: `${OUT}/${tag}-1-result.png`, fullPage: false });

  // 3. Leyenda ampliada
  const legend = page.locator('.legend');
  if (await legend.count()) await legend.screenshot({ path: `${OUT}/${tag}-2-legend.png` });

  // 4. Click en una celda del mapa (centro del lienzo)
  const canvas = page.locator('.mapcell canvas').first();
  const box = await canvas.boundingBox();
  if (box) {
    await page.mouse.click(box.x + box.width * 0.5, box.y + box.height * 0.55);
    await page.waitForTimeout(1200);
    await page.screenshot({ path: `${OUT}/${tag}-3-cell-click.png` });
  }

  // 5. Modo Evolución
  await page.goto(`${BASE}/?year=1988&place=getxo&view=time&play=1988`, { waitUntil: 'load' });
  await page.waitForTimeout(4000);
  await page.screenshot({ path: `${OUT}/${tag}-4-time.png` });

  // 6. Modo Fotos
  await page.goto(`${BASE}/?year=1988&place=getxo&view=photo`, { waitUntil: 'load' });
  await page.waitForTimeout(5000);
  await page.screenshot({ path: `${OUT}/${tag}-5-photo.png` });

  // 7. Modo swipe
  await page.goto(`${BASE}/?year=1988&place=getxo&view=swipe`, { waitUntil: 'load' });
  await page.waitForTimeout(6000);
  await page.screenshot({ path: `${OUT}/${tag}-6-swipe.png` });

  // 8. Zoom a nivel edificio: vamos a ?zoom alto
  await page.goto(`${BASE}/?year=1988&place=getxo&lat=43.3569&lon=-3.0117&z=16`, {
    waitUntil: 'load'
  });
  await page.waitForTimeout(4000);
  await page.waitForFunction(() => window.__mjtApp?.mapLevel === 'EDIFICIO');
  await page.screenshot({ path: `${OUT}/${tag}-7-edificios.png` });

  console.log(tag, 'pageerrors:', errors.length ? errors : 'none');
  await ctx.close();
  assert.equal(errors.length, 0, errors.join('\n'));
}

try {
  await run('dsk', { width: 1440, height: 900 });
  await run('mob', { width: 390, height: 844 });
} finally {
  await browser.close();
}
console.log('done');
