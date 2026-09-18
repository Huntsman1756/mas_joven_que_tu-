/**
 * G1 READJUDICATION — U3 (7 estados de búsqueda, G1-STATE-MODEL §5) y REL4
 * (fallo de NORA recuperable), probado SIN fixture local para el caso de red
 * (el fixture 204 enmascaraba el abort en el harness principal).
 * Uso: node scripts/readj_search_rel4.mjs   (cwd = sandbox/app)
 */
import { chromium } from 'playwright';
import { writeFile, mkdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { createStaticServer } from './static-server.mjs';
import { installLocalFixtures } from './fixtures.mjs';

const BUILD = resolve(process.cwd(), 'build');
const OUT = resolve(process.cwd(), '../out/state');
const PORT = 4192;
const BASE = `http://localhost:${PORT}`;
const NORA_RE = /t17iApiRestWar\/rest\/v1\/municipios/;

const server = await createStaticServer(BUILD, PORT);
await mkdir(OUT, { recursive: true });

let browser;
for (const channel of ['chrome', 'msedge']) {
  try { browser = await chromium.launch({ channel, args: ['--disable-gpu'] }); break; } catch { /* next */ }
}
browser ??= await chromium.launch({ args: ['--disable-gpu'] });

const R = { meta: { candidate: '53b1e8a', utc: new Date().toISOString() }, u3: {}, rel4: {} };

const statusOf = (page) => page.locator('.search .status').first();

async function typeSearch(page, q) {
  const input = page.locator('#place-input');
  await input.click();
  await input.fill('');
  await input.pressSequentially(q, { delay: 20 });
  // esperar a que el estado se resuelva (status cambia o lista aparece)
  await page.waitForTimeout(1600);
  return (await statusOf(page).count()) ? await statusOf(page).innerText() : null;
}

// ── U3 con fixture local (determinista) ──
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await installLocalFixtures(page);
  await page.goto(`${BASE}/`, { waitUntil: 'load' });
  await page.waitForSelector('#place-input', { timeout: 20000 });

  // IDLE: consulta vacía
  R.u3.IDLE = { status_visible: (await statusOf(page).count()) > 0 && (await statusOf(page).isVisible().catch(() => false)), expanded: await page.locator('#place-input').getAttribute('aria-expanded') };

  // TOO_SHORT
  R.u3.TOO_SHORT = { text: await typeSearch(page, 'ab') };

  // SEARCHING: retener la ruta NORA y capturar el estado transitorio
  let release;
  const hold = new Promise((r) => (release = r));
  await page.route(NORA_RE, async (route) => { await hold; return route.fallback(); });
  const input = page.locator('#place-input');
  await input.fill('');
  await input.pressSequentially('Leioa', { delay: 20 });
  await page.waitForTimeout(400); // debounce 180ms + render
  R.u3.SEARCHING = { text: (await statusOf(page).count()) ? await statusOf(page).innerText() : null };
  release();
  await page.unroute(NORA_RE);
  await page.waitForSelector('#place-listbox button', { timeout: 15000 });
  R.u3.RESULTS = { text: await statusOf(page).innerText(), options: await page.locator('#place-listbox button').count() };

  R.u3.NO_RESULTS = { text: await typeSearch(page, 'xqzzk') };
  R.u3.OUT_OF_SCOPE = { text: await typeSearch(page, 'Vitoria') };
  await ctx.close();
}

// ── REL4 sin fixture: NORA abortada de verdad ──
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  let aborted = 0;
  await page.route(NORA_RE, (route) => { aborted++; return route.abort(); });
  await page.goto(`${BASE}/`, { waitUntil: 'load' });
  await page.waitForSelector('#place-input', { timeout: 20000 });

  // sin coincidencia local → NETWORK_ERROR
  R.rel4.nora_down_no_local = { text: await typeSearch(page, 'zzznom'), aborted_requests: aborted };

  // con coincidencia local → fallback local recuperable
  const a0 = aborted;
  const txt2 = await typeSearch(page, 'Leioa');
  R.rel4.nora_down_local_match = { text: txt2, options: await page.locator('#place-listbox button').count(), aborted_requests: aborted - a0 };

  // recovery: quitar el abort → NORA real (o fixture si no hay red)
  await page.unroute(NORA_RE);
  await installLocalFixtures(page); // determinista si el upstream no responde
  const txt3 = await typeSearch(page, 'Bilbao');
  R.rel4.recovery = { text: txt3, options: await page.locator('#place-listbox button').count() };
  await ctx.close();
}

await writeFile(join(OUT, 'search-states-rel4.json'), JSON.stringify(R, null, 1));
console.log(JSON.stringify(R, null, 1).slice(0, 2500));
await browser.close();
server.close();
