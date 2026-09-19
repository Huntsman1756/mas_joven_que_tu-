// G4-R: verificación focal de dos anomalías del bug hunt (research-only)
import { chromium } from 'playwright';
import { resolve } from 'node:path';
import { createStaticServer } from './static-server.mjs';

const BUILD = resolve(process.cwd(), 'build');
const PORT = 4192;
const server = await createStaticServer(BUILD, PORT);
const browser = await chromium.launch({ args: ['--disable-gpu'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.setDefaultTimeout(12000);
const U = (q) => `http://localhost:${PORT}/?${q}`;
const ready = async () => {
  await page.waitForSelector('.mapband canvas', { timeout: 25000 }).catch(() => {});
  await page.waitForTimeout(800);
};

// V1: ¿el botón .ctx button.geom activa overlay? (contexto Abadiño ruido)
await page.goto(U('year=1975&place=abadino&building=1-1017-2001-1-1'));
await ready();
await page.waitForTimeout(3000);
const nGeom = await page.locator('.ctx button.geom').count();
const ctxVisible = await page.locator('.ctx').count();
await page.locator('.ctx button.geom').first().click().catch((e) => console.log('click fail', String(e).slice(0, 80)));
await page.waitForTimeout(3000);
const ov1 = await page.evaluate(() => window.__mjtApp.contextOverlay?.mod ?? null);
console.log('V1 geom buttons:', nGeom, 'ctx sections:', ctxVisible, 'overlay tras 1 click:', ov1);
// resize con overlay activo
await page.setViewportSize({ width: 390, height: 844 });
await page.waitForTimeout(1200);
const ov2 = await page.evaluate(() => window.__mjtApp.contextOverlay?.mod ?? null);
console.log('V1 overlay tras resize a 390:', ov2);
await page.setViewportSize({ width: 1440, height: 900 });

// V2: cambiar lugar desde el formulario «Cambiar año o lugar» — ¿Enter resuelve?
await page.goto(U('year=1975&place=abadino&building=1-1017-2001-1-1&compare=1960'));
await ready();
await page.waitForTimeout(2000);
const topButtons = await page.locator('button, a').allTextContents();
console.log('V2 topbar texts:', topButtons.slice(0, 8).join(' | '));
await page.click('text=Cambiar').catch(() => {});
await page.waitForTimeout(600);
const inputs = await page.locator('input').all();
console.log('V2 inputs tras Cambiar:', inputs.length);
for (const inp of inputs) {
  const id = await inp.getAttribute('id');
  const ph = await inp.getAttribute('placeholder');
  console.log('  input', id, ph);
}
const pi = page.locator('#place-input').last();
if (await pi.count()) {
  await pi.click();
  await pi.fill('getx');
  await page.waitForTimeout(1000);
  const opts = await page.locator('[role="option"]').count();
  console.log('V2 options tras getx:', opts);
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(3000);
}
const s = await page.evaluate(() => ({
  place: window.__mjtApp.place?.name,
  building: window.__mjtApp.selectedBuilding?.id,
  compare: window.__mjtApp.compareYear,
  url: location.search
}));
console.log('V2 tras Enter:', JSON.stringify(s));
// intento alternativo: click directo en la opción
if (s.place !== 'Getxo') {
  await pi.click();
  await pi.fill('getx');
  await page.waitForTimeout(1000);
  await page.locator('[role="option"]').first().click().catch(() => {});
  await page.waitForTimeout(3000);
  const s2 = await page.evaluate(() => ({
    place: window.__mjtApp.place?.name,
    building: window.__mjtApp.selectedBuilding?.id,
    compare: window.__mjtApp.compareYear
  }));
  console.log('V2 tras click opción:', JSON.stringify(s2));
}
await browser.close();
server.close();
