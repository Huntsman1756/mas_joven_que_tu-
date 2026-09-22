// Verificación en producción del comparador con los PROVEEDORES REALES
// (sin stubs): entra en swipe con una pareja de campañas y espera los
// veredictos de sonda reales — orthoState (después) y swipeBeforeState
// (antes). Demuestra si ambas imágenes verifican con datos vivos.
import { chromium } from 'playwright';

const BASE = 'https://huntsman1756.github.io/mas_joven_que_tu-/';
const EV = 'F:/_CONCURSOS/mas_joven_que_tu/evidence/g16c/';
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 393, height: 722 } });
const p = await ctx.newPage();

await p.goto(`${BASE}?year=1952&place=getxo&view=swipe&ortho=2025&ortho2=1956`, {
  waitUntil: 'domcontentloaded'
});
await p.waitForSelector('.swipe', { timeout: 60000 });

const wait = (expr) =>
  p
    .waitForFunction(expr, null, { timeout: 90000 })
    .then(() => true)
    .catch(() => false);

// Espera a que ambas sondas reales resuelvan (no solo UNKNOWN/probing).
await wait(
  () =>
    ['AVAILABLE', 'NOT_COVERED', 'SERVICE_ERROR'].includes(window.__mjtApp?.orthoState) &&
    ['ready', 'error'].includes(window.__mjtApp?.swipeBeforeState)
);

const st = await p.evaluate(() => ({
  after: window.__mjtApp?.orthoCampaign?.year,
  afterState: window.__mjtApp?.orthoState,
  before: window.__mjtApp?.swipeBefore?.year,
  beforeState: window.__mjtApp?.swipeBeforeState,
  chipL: document.querySelector('.swipe .chip.left')?.textContent ?? null,
  chipR: document.querySelector('.swipe .chip.right')?.textContent ?? null,
  miss: !!document.querySelector('.swipe .chip.right.miss'),
  divider: !!document.querySelector('.swipe .divider')
}));
console.log('STATE', JSON.stringify(st));
await p.waitForTimeout(2500);
await p.screenshot({ path: `${EV}prod-06e-comparador-real-dom.png` });
await browser.close();

const bothReal = st.afterState === 'AVAILABLE' && st.beforeState === 'ready';
console.log(bothReal ? 'AMBAS REALES: disponibles' : 'NO AMBAS: ver STATE');
process.exit(bothReal ? 0 : 1);
