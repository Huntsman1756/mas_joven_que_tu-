/**
 * G1 READJUDICATION — A7 (combobox APG), U2 (salida de estados), A4 (alternativa
 * textual), C4 (heaping), PROV2/PROV3 (atribución + snapshot), U6 (layout móvil),
 * share. Replica los probes del run 1340Z sobre el candidato 53b1e8a.
 * Uso: node scripts/readj_a7_misc.mjs   (cwd = sandbox/app)
 */
import { chromium } from 'playwright';
import { writeFile, mkdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { createStaticServer } from './static-server.mjs';
import { installLocalFixtures } from './fixtures.mjs';

const BUILD = resolve(process.cwd(), 'build');
const OUT = resolve(process.cwd(), '../out/state');
const PORT = 4193;
const BASE = `http://localhost:${PORT}`;

const server = await createStaticServer(BUILD, PORT);
await mkdir(OUT, { recursive: true });

let browser;
for (const channel of ['chrome', 'msedge']) {
  try { browser = await chromium.launch({ channel, args: ['--disable-gpu'] }); break; } catch { /* next */ }
}
browser ??= await chromium.launch({ args: ['--disable-gpu'] });

const R = { meta: { candidate: '53b1e8a', utc: new Date().toISOString() } };

// ── A7 + U2 ──
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await installLocalFixtures(page);
  const t0 = Date.now();
  await page.goto(`${BASE}/`, { waitUntil: 'load' });
  await page.waitForSelector('#place-input', { timeout: 20000 });
  R.boot_intro_ms = Date.now() - t0;

  const input = page.locator('#place-input');
  await input.click();
  await input.pressSequentially('Leio', { delay: 30 });
  await page.waitForSelector('#place-listbox [role=option]', { timeout: 15000 });
  R.a7 = {};
  R.a7.before = {
    expanded: await input.getAttribute('aria-expanded'),
    options: await page.locator('#place-listbox [role=option]').count(),
    activeDesc: await input.getAttribute('aria-activedescendant'),
    role: await input.getAttribute('role'),
    controls: await input.getAttribute('aria-controls'),
  };
  await input.press('ArrowDown');
  await page.waitForTimeout(150);
  R.a7.afterDown = {
    activeDesc: await input.getAttribute('aria-activedescendant'),
    highlighted: await page.locator('#place-listbox [role=option].active').first().getAttribute('id'),
  };
  await input.press('Escape');
  await page.waitForTimeout(150);
  R.a7.afterEsc = {
    expanded: await input.getAttribute('aria-expanded'),
    listboxVisible: await page.locator('#place-listbox').isVisible().catch(() => false),
  };
  R.a7.apg_ok = R.a7.before.role === 'combobox' && R.a7.before.expanded === 'true'
    && R.a7.afterDown.activeDesc === 'place-opt-0' && R.a7.afterEsc.expanded === 'false';

  // U2: searching visible → resuelve (fixture)
  await input.fill('');
  await input.pressSequentially('Bilbao', { delay: 15 });
  const searchingSeen = await page.waitForFunction(
    () => document.querySelector('.search .status')?.textContent?.includes('Buscando'), null, { timeout: 3000 }
  ).then(() => true).catch(() => false);
  await page.waitForSelector('#place-listbox button', { timeout: 15000 });
  R.u2_searching_visible_then_resolves = searchingSeen;
  R.u2_searching_resolved = true;

  // boot de RESULT por deep link < 20 s
  const t1 = Date.now();
  await page.goto(`${BASE}/?year=1987&place=leioa`, { waitUntil: 'load' });
  await page.waitForSelector('.headline-block h1', { timeout: 20000 });
  R.boot_result_ms = Date.now() - t1;
  R.boot_result_within_20s = R.boot_result_ms < 20000;
  await ctx.close();
}

// ── misc (A4, C4, PROV2/3, share, footer) — desktop ──
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await installLocalFixtures(page);
  await page.goto(`${BASE}/?year=1987&place=leioa`, { waitUntil: 'load' });
  await page.waitForSelector('.headline-block h1', { timeout: 25000 });
  await page.waitForSelector('.mapband canvas', { timeout: 30000 });

  R.a4 = await page.evaluate(() => ({
    map_aria_label: document.querySelector('.mapband canvas')?.getAttribute('aria-label')
      ?? document.querySelector('.mapband')?.getAttribute('aria-label')
      ?? document.querySelector('[role=application]')?.getAttribute('aria-label') ?? null,
    map_text_alternative: !!document.querySelector('.sr-only, .mapalt, [class*=sr-only]')
      && (document.body.innerText.includes('celda colorea') || document.querySelector('.legend-title') !== null),
    legend_text: document.querySelector('.legend-title')?.textContent ?? null,
    dist_sr_table: !!document.querySelector('.dist table'),
    dist_caption: (document.querySelector('.dist figcaption')?.textContent ?? document.querySelector('.dist')?.textContent ?? '').slice(0, 400),
  }));

  R.c4_heaping = await page.evaluate(() => {
    const dist = document.querySelector('.dist');
    const txt = dist?.textContent ?? '';
    return {
      dist_found: !!dist,
      has_heaping_note: /redondead|heaping|acabad/i.test(txt),
      excerpt: txt.slice(0, 400),
    };
  });

  // share
  const shareBtn = page.locator('button', { hasText: /Compartir/i }).first();
  R.share = { button_found: (await shareBtn.count()) > 0 };
  if (R.share.button_found) {
    await shareBtn.click();
    await page.waitForTimeout(400);
    R.share.after_click_text = await page.evaluate(() =>
      [...document.querySelectorAll('[role=status], .ok, .share')].map((e) => e.textContent?.trim()).filter(Boolean).slice(0, 3));
  }

  R.footer = (await page.locator('footer').first().innerText().catch(() => null))?.slice(0, 500) ?? null;

  // /como-lo-sabemos
  await page.goto(`${BASE}/como-lo-sabemos`, { waitUntil: 'load' });
  await page.waitForSelector('main, article, body', { timeout: 15000 });
  const howTxt = await page.evaluate(() => document.body.innerText);
  R.how = {
    len: howTxt.length,
    attribution_odb: /Open Data Bizkaia/i.test(howTxt),
    attribution_geoeuskadi: /geoEuskadi|geo\.euskadi/i.test(howTxt),
    license_ccby: /CC BY/i.test(howTxt),
    snapshot_line: (howTxt.match(/Snapshot[^\n]*/i) ?? [null])[0],
    snapshot_value: (howTxt.match(/Snapshot[^\n:]*[:\s]+(\d{4})/i) ?? [])[1] ?? null,
  };
  await page.screenshot({ path: join(OUT, 'como-lo-sabemos.png'), fullPage: false });
  await ctx.close();
}

// ── U6 mobile layout ──
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  await installLocalFixtures(page);
  await page.goto(`${BASE}/?year=1987&place=leioa`, { waitUntil: 'load' });
  await page.waitForSelector('.headline-block h1', { timeout: 25000 });
  R.u6_mobile_layout = await page.evaluate(() => {
    const fixed = [...document.querySelectorAll('aside, [class*=panel], [class*=sidebar]')]
      .filter((e) => getComputedStyle(e).position === 'fixed');
    const headline = document.querySelector('.headline-block');
    const r = headline?.getBoundingClientRect();
    return {
      fixed_side_panels: fixed.length,
      headline_in_flow: !!r && r.width > 0,
      bodyScrollW: document.documentElement.scrollWidth,
      vw: innerWidth,
      sheet_present: !!document.querySelector('.sheet'),
    };
  });
  await ctx.close();
}

await writeFile(join(OUT, 'a7-u2-misc.json'), JSON.stringify(R, null, 1));
console.log(JSON.stringify(R, null, 1).slice(0, 3000));
await browser.close();
server.close();
