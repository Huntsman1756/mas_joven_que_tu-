/**
 * Genera app/static/og-card.png (1200×630) — tarjeta social propia.
 * Diseño: ficha catastral (docs/PRODUCT.md §7). Solo copy real del
 * diccionario; sin cifras inventadas ni datos personales.
 * Reproducible: node scripts/build-social-card.mjs
 */
import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';

const OUT = fileURLToPath(new URL('../static/og-card.png', import.meta.url));

const WINE_CELLS = [2, 5, 9, 13, 14, 16, 19, 20, 22];
const cells = Array.from({ length: 24 }, (_, i) => {
  const c = WINE_CELLS.includes(i) ? '#c63b4f' : '#d8d5cd';
  return `<div style="background:${c}"></div>`;
}).join('');

const html = `<!doctype html><html><body style="margin:0">
<div style="width:1200px;height:630px;background:#f2f0ec;color:#1c1a17;
  font-family:'Source Sans 3','Segoe UI',system-ui,sans-serif;
  display:flex;flex-direction:column;justify-content:space-between;
  padding:64px 72px;box-sizing:border-box;position:relative;overflow:hidden">
  <div style="position:absolute;right:-40px;top:-60px;display:grid;
    grid-template-columns:repeat(6,84px);grid-auto-rows:84px;gap:10px;opacity:.5">
    ${cells}
  </div>
  <div style="font-size:22px;letter-spacing:.14em;font-weight:600;
    color:#8e2f4c;text-transform:uppercase;position:relative">
    Más joven que tú · 70 años construyendo Bizkaia
  </div>
  <div style="position:relative;max-width:820px">
    <div style="font-size:74px;line-height:1.04;font-weight:700;letter-spacing:-.01em">
      ¿Qué parte de la Bizkaia que ves hoy apareció después que tú?
    </div>
    <div style="margin-top:28px;font-size:30px;line-height:1.35;color:#44423c">
      Edificios actuales por año de construcción (Catastro) y ortofotos
      oficiales de cada época.
    </div>
  </div>
  <div style="display:flex;justify-content:space-between;align-items:baseline;
    border-top:2px solid #1c1a17;padding-top:20px;position:relative">
    <span style="font-size:20px;font-weight:600">Open Data Bizkaia · Catastro · Ortofotos BFA</span>
    <span style="font-size:20px;color:#44423c">CC BY 4.0</span>
  </div>
</div></body></html>`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
await page.setContent(html, { waitUntil: 'load' });
await page.screenshot({ path: OUT, type: 'png' });
await browser.close();
console.log('og-card.png →', OUT);
