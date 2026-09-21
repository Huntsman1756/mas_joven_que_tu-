/**
 * G0 — evidencia de integración en navegador (sin capturas): comprueba que
 * PMTiles y las ortofotos se piden y responden, y captura el resumen textual.
 *
 * El servidor de prueba implementa HTTP Range (PMTiles lo exige).
 * Uso: node scripts/g0_browser_evidence.mjs
 */
import { chromium } from 'playwright';
import { writeFile, mkdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { createStaticServer } from './static-server.mjs';

const ROOT = resolve(process.cwd(), '..');
const BUILD = resolve(process.cwd(), 'build');
const OUT = join(ROOT, 'evidence/g0/06-frontend');
const PORT = 4174;

const server = await createStaticServer(BUILD, PORT);
await mkdir(OUT, { recursive: true });

async function pickBrowser() {
  for (const channel of ['chrome', 'msedge']) {
    try {
      return await chromium.launch({ channel, args: ['--disable-gpu'] });
    } catch {
      /* canal no disponible: probar el siguiente */
    }
  }
  return await chromium.launch({ args: ['--disable-gpu'] });
}

const browser = await pickBrowser();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();

const net = { pmtiles: [], ortho: [], total: 0 };
const consoleErrors = [];
page.on('response', (r) => {
  const url = r.url();
  net.total++;
  const rec = { url: url.slice(0, 160), status: r.status() };
  if (url.includes('.pmtiles')) net.pmtiles.push(rec);
  if (url.includes('ORTO_BFA_') || url.includes('WMS_ORTOARGAZKIAK')) net.ortho.push(rec);
});
page.on('console', (m) => {
  if (m.type() === 'error') consoleErrors.push(m.text().slice(0, 200));
});
page.on('pageerror', (e) => consoleErrors.push(String(e).slice(0, 200)));

await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'load' });
await page.waitForSelector('#map canvas', { timeout: 30000 });
await page.waitForTimeout(6000);

async function summarize(tag) {
  const s = await page.evaluate(() => {
    const q = (sel) => document.querySelector(sel)?.textContent?.trim() ?? null;
    return {
      headline: q('.headline'),
      coverage: q('.coverage'),
      ortho: q('.ortho p'),
      warning: q('.warn'),
      legend: Array.from(document.querySelectorAll('.legend span')).map((n) =>
        n.textContent?.trim()
      ),
      canvases: document.querySelectorAll('#map canvas').length,
      attribution: q('.maplibregl-ctrl-attrib-inner'),
      rangeValue: document.querySelector('#year')?.value ?? null
    };
  });
  return { tag, ...s };
}

const out = {
  states: [],
  nora: null,
  ortho_failure: null,
  ortho_recovery: null,
  net,
  consoleErrors
};

out.states.push(await summarize('leioa-1987'));

// NORA: búsqueda real en la app (éxito, sin resultado, consulta mal formada, error de red)
async function noraStep(q) {
  await page.fill('#place', q);
  await page.waitForTimeout(2500);
  return await page.evaluate(() => {
    const el = document.querySelector('.place');
    return { message: el?.textContent?.replace(/\s+/g, ' ').trim() ?? null };
  });
}
out.nora = {
  success: await noraStep('Leioa'),
  no_result: await noraStep('Xyzabc'),
  malformed: await noraStep('Le')
};
// Error de red: interceptar la API de NORA y forzar fallo
await page.route('**/t17iApiRestWar/**', (r) => r.abort());
out.nora.network_error = await noraStep('Bilbao');
await page.unroute('**/t17iApiRestWar/**');

// Fallo del servicio de ortofoto: se abortan las teselas y debe aparecer el aviso
await page.route(/ORTO_BFA_/, (r) => r.abort());
await page.selectOption('#campaign', '1999');
await page.waitForTimeout(6000);
out.ortho_failure = await page.evaluate(() => ({
  warning: document.querySelector('.warn')?.textContent?.trim() ?? null,
  headlineStillRendered: (document.querySelector('.headline')?.textContent ?? '').includes(
    'de cada 100'
  ),
  legendStillRendered: document.querySelectorAll('.legend span').length,
  mapErrors: globalThis.__mapErrors ?? []
}));
await page.unroute(/ORTO_BFA_/);
// Recuperación: al volver a una campaña disponible el aviso desaparece
await page.selectOption('#campaign', '1956');
await page.waitForTimeout(6000);
out.ortho_recovery = await page.evaluate(() => ({
  warning: document.querySelector('.warn')?.textContent?.trim() ?? null
}));

await page.selectOption('#muni', '20');
await page.waitForTimeout(3000);
await page.$eval('#year', (el) => {
  el.value = '1975';
  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
});
await page.waitForTimeout(3000);
out.states.push(await summarize('bilbao-1975'));

await page.selectOption('#muni', '908');
await page.waitForTimeout(3000);
await page.selectOption('#campaign', '1956');
await page.waitForTimeout(4000);
out.states.push(await summarize('murueta-1956'));

const okPm =
  net.pmtiles.filter((r) => r.status === 200).length +
  net.pmtiles.filter((r) => r.status === 206).length;
const okOrtho = net.ortho.filter((r) => r.status === 200).length;
out.summary = {
  pmtiles_requests: net.pmtiles.length,
  pmtiles_bytes_ok: okPm,
  pmtiles_statuses: [...new Set(net.pmtiles.map((r) => r.status))],
  ortho_requests: net.ortho.length,
  ortho_200: okOrtho,
  ortho_non_200_by_campaign: net.ortho
    .filter((r) => r.status !== 200)
    .reduce((acc, r) => {
      const m = /ORTO_BFA_(\d+)/.exec(r.url);
      const k = m ? m[1] : 'wms';
      acc[k] = (acc[k] || 0) + 1;
      return acc;
    }, {}),
  total_requests: net.total,
  console_errors_unique: [...new Set(consoleErrors)]
};
await writeFile(join(OUT, 'browser-evidence.json'), JSON.stringify(out, null, 1), 'utf8');

console.log(JSON.stringify(out.summary, null, 1));
console.log('states:');
for (const s of out.states) console.log(' -', JSON.stringify(s));

await browser.close();
server.close();
