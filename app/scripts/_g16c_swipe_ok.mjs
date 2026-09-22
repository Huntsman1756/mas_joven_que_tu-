// Captura del comparador con AMBAS imágenes verificadas — viewport móvil
// 393×722 con servicios stub (fixtures): prueba la PRESENTACIÓN del estado
// sano, no la disponibilidad real del servicio (en el emulador solo la
// tesela BFA 1956 tiene contenido real en Getxo; el resto falla).
import { createStaticServer } from './static-server.mjs';
import { installLocalFixtures, installExternalStubs } from './fixtures.mjs';
import { chromium } from 'playwright';

const EV = 'F:/_CONCURSOS/mas_joven_que_tu/evidence/g16c/';
const server = await createStaticServer('build', 4299);
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 393, height: 722 } });
const p = await ctx.newPage();
await installLocalFixtures(p);
await installExternalStubs(p);
await p.goto('http://localhost:4299/?year=1952&place=getxo&view=swipe&ortho=2025&ortho2=1956');
await p.waitForSelector('.swipectl select', { timeout: 30000 });
await p.waitForFunction(() => window.__mjtApp?.orthoState === 'AVAILABLE', null, {
  timeout: 30000
});
await p.waitForFunction(() => window.__mjtApp?.swipeBeforeState === 'ready', null, {
  timeout: 30000
});
await p.waitForTimeout(2500); // teselas stub cargadas
await p.evaluate(() => document.querySelector('.mapcell')?.scrollIntoView({ block: 'center' }));
await p.waitForTimeout(600);
const chips = await p.evaluate(() => ({
  left: document.querySelector('.swipe .chip.left')?.textContent ?? null,
  right: document.querySelector('.swipe .chip.right')?.textContent ?? null
}));
console.log('chips', JSON.stringify(chips));
await p.screenshot({ path: `${EV}stub-06-comparador-ambas-dom.png`, fullPage: false });
await browser.close();
server.close();
