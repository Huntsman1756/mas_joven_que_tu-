// G13 — regresiones de la ronda UX: marca → portada conserva estado y
// Atrás/Adelante respeta la fase; PlaceSearch sin salto al escribir;
// callejero municipal (tildes, orden «Calle nombre», casi-match sin
// autoselección, edición invalida la calle, número tras calle, Bis
// condicional); reproducción de fotografías (avance real, metadatos,
// pausa, parada por falta de cobertura, navegación manual, reduced-motion).
// Datos locales reales; servicios externos simulados.
// Cada bloque es independiente: una excepción se registra como fallo del
// bloque y no impide ejecutar el resto. finally solo limpia recursos.
import { mkdir } from 'node:fs/promises';
import { createStaticServer } from './static-server.mjs';
import { installExternalStubs, installLocalFixtures } from './fixtures.mjs';
import { chromium } from 'playwright';

const server = await createStaticServer('build', 4295);
const browser = await chromium.launch();
const out = [];
let fails = 0;
const pageErrors = [];
const ok = (name, cond, extra = '') => {
  if (!cond) fails++;
  out.push(`${cond ? 'PASS' : 'FAIL'} ${name}${extra ? ' — ' + extra : ''}`);
};
async function block(name, fn) {
  try {
    await fn();
  } catch (e) {
    fails++;
    out.push(`FAIL ${name}_threw — ${String(e).slice(0, 240)}`);
  }
}
const ctxOpts = { viewport: { width: 1280, height: 800 } };
async function newResultPage(extra = {}) {
  const ctx = await browser.newContext({ ...ctxOpts, ...extra });
  const p = await ctx.newPage();
  p.on('pageerror', (e) => pageErrors.push(e.message.slice(0, 200)));
  await installLocalFixtures(p);
  await installExternalStubs(p);
  await p.goto('http://localhost:4295/?year=1952&place=getxo');
  await p.waitForSelector('.headline-block h1', { timeout: 30000 });
  return { ctx, p };
}
const openAddress = async (p) => {
  await p.evaluate(() => document.querySelector('.lazyview')?.scrollIntoView());
  await p.waitForSelector('.invite .start', { timeout: 30000 });
  await p.click('.invite .start');
  await p.waitForSelector('#addr-street');
};
await mkdir('../evidence/g13', { recursive: true });

// ── 1. Marca → portada conserva año + municipio; Atrás/Adelante coherentes ──
await block('home', async () => {
  const { ctx, p } = await newResultPage();
  const brand = p.locator('header a.brand');
  ok('brand_is_link', (await brand.count()) === 1);
  const href = await brand.getAttribute('href');
  ok('brand_href_root', href !== null && /\/$/.test(href), href ?? 'null');
  await brand.click();
  await p.waitForSelector('.hero', { timeout: 15000 });
  ok('home_intro', await p.evaluate(() => window.__mjtApp?.phase === 'intro'));
  ok('url_clean', !/[?&](year|place)=/.test(p.url()), p.url());
  ok('year_prefilled', (await p.locator('#year-input').inputValue()) === '1952');
  ok('place_prefilled', /getxo/i.test(await p.locator('#place-input').inputValue()));
  // recargar la portada limpia no re-entra al resultado
  await p.reload({ waitUntil: 'load' });
  await p.waitForSelector('.hero', { timeout: 15000 });
  ok('reload_stays_intro', await p.evaluate(() => window.__mjtApp?.phase === 'intro'));

  // historial: resultado → marca → portada → Atrás (resultado) → Adelante
  // (portada): la fase sigue a la URL en ambas direcciones.
  await p.locator('#year-input').fill('1952');
  await p.locator('#place-input').fill('getxo');
  await p.waitForSelector('#place-listbox li button', { timeout: 10000 });
  await p.locator('#place-listbox li button').first().click();
  await p.waitForSelector('.cta:not([disabled])', { timeout: 30000 });
  await p.locator('.cta').click();
  await p.waitForSelector('.headline-block h1', { timeout: 30000 });
  await p.locator('header a.brand').click();
  await p.waitForSelector('.hero');
  await p.goBack();
  await p.waitForSelector('.headline-block h1', { timeout: 15000 });
  ok('back_restores_result', await p.evaluate(() => window.__mjtApp?.phase === 'result'));
  await p.goForward();
  await p.waitForSelector('.hero', { timeout: 15000 });
  ok('forward_shows_intro', await p.evaluate(() => window.__mjtApp?.phase === 'intro'));

  // ── 2. PlaceSearch: el input no se mueve al aparecer sugerencias ──
  await p.locator('#place-input').fill('');
  await p.locator('#place-input').type('get', { delay: 30 });
  const before = await p.locator('#place-input').boundingBox();
  await p.waitForSelector('.pop', { timeout: 10000 });
  const during = await p.locator('#place-input').boundingBox();
  ok(
    'input_stable',
    Math.abs(before.y - during.y) < 1 && Math.abs(before.x - during.x) < 1,
    `y ${before.y}→${during.y}`
  );
  const pop = await p.locator('.pop').boundingBox();
  ok('pop_below_input', pop.y >= before.y + before.height - 1, `pop.y=${pop.y}`);
  await ctx.close();
});

// ── 3. Callejero: tolerancia, orden «Calle nombre», casi-match, invalidación ──
await block('streets', async () => {
  const { ctx, p } = await newResultPage();
  const portalRequests = [];
  p.on('request', (r) => {
    if (/\/calle\/\d+\/portales/.test(r.url())) portalRequests.push(r.url());
  });
  await openAddress(p);

  // El número no se pide hasta confirmar una calle
  ok('number_hidden_until_street', (await p.locator('#addr-num').count()) === 0);

  // tolerancia a tildes/minúsculas: «ogono» → Ogoño (única exacta → fija)
  await p.fill('#addr-street', 'ogono');
  await p.waitForFunction(
    () => document.querySelector('#addr-street')?.value.toLowerCase().includes('ogoño'),
    { timeout: 15000 }
  );
  ok('accent_insensitive', true);
  // Ogoño no tiene portales bis → el campo Bis no debe aparecer
  ok('bis_hidden_when_irrelevant', (await p.locator('#addr-bis').count()) === 0);
  // número pedido ahora, tras la calle
  ok('number_after_street', (await p.locator('#addr-num').count()) === 1);

  // editar el texto invalida la calle confirmada: «zzzzzzzz» + «1» no
  // puede consultar los portales de Ogoño.
  await p.fill('#addr-street', 'zzzzzzzz');
  await p.waitForTimeout(700);
  const portalsBefore = portalRequests.length;
  ok(
    'edit_invalidates_street',
    (await p.locator('#addr-num').count()) === 0 && (await p.locator('.res').count()) === 0
  );
  await p.waitForTimeout(800);
  ok(
    'no_stale_portal_fetch',
    portalRequests.length === portalsBefore,
    `${portalRequests.length} reqs`
  );

  // orden habitual «tipo + nombre»: «calle ogono» resuelve Ogoño
  // (única exacta → se fija y el campo muestra el nombre oficial)
  await p.fill('#addr-street', 'calle ogono');
  await p.waitForFunction(
    () =>
      document.querySelector('#addr-street')?.value.toLowerCase().includes('ogoño') ||
      document.querySelector('#addr-street-list li button'),
    { timeout: 15000 }
  );
  const tipoVal = await p.locator('#addr-street').inputValue();
  const tipoList = (await p.locator('#addr-street-list li button').allInnerTexts()).join(' | ');
  ok(
    'tipo_first_order',
    /ogoñ/i.test(tipoVal) || /ogoñ/i.test(tipoList),
    `input=${tipoVal} list=${tipoList.slice(0, 120)}`
  );

  // casi-match: «ogonoo» → oferta, sin autoselección
  await p.fill('#addr-street', 'ogonoo');
  await p.waitForTimeout(700);
  const nearHint = await p.locator('.near-hint').count();
  const nearOpts = (await p.locator('#addr-street-list li button').allInnerTexts()).join(' | ');
  const inputVal = await p.locator('#addr-street').inputValue();
  ok(
    'near_offered',
    nearHint === 1 && /ogoñ/i.test(nearOpts),
    `hint=${nearHint} ${nearOpts.slice(0, 140)}`
  );
  ok('near_not_autoselected', inputVal === 'ogonoo', inputVal);
  await p.screenshot({ path: '../evidence/g13/address-near-match.png' });
  // selección explícita → el mensaje pide el número
  await p.locator('#addr-street-list li button').first().click();
  await p.waitForFunction(
    () => document.querySelector('.status')?.textContent?.match(/número|portales/i),
    { timeout: 15000 }
  );
  ok('number_asked_after_pick', true);

  // calle con bis real → el campo aparece solo ahora
  await p.fill('#addr-street', 'ganekogorta');
  await p.waitForFunction(
    () => document.querySelector('#addr-street')?.value.toLowerCase().includes('ganekogorta'),
    { timeout: 15000 }
  );
  const bisShown = await p
    .waitForSelector('#addr-bis', { timeout: 5000 })
    .then(() => true)
    .catch(() => false);
  ok('bis_shown_when_relevant', bisShown);
  await ctx.close();
});

// ── 4. Reproducción de fotografías ──
await block('photo', async () => {
  const { ctx, p } = await newResultPage();
  await p.locator('.viewswitch [data-mode="photo"]').click();
  await p.waitForSelector('.photo', { timeout: 15000 });
  const playBtn = p.getByRole('button', { name: /reproducir fotografías/i });
  ok('play_button', (await playBtn.count()) === 1);
  const y0 = await p.evaluate(() => window.__mjtApp?.orthoCampaign?.year ?? null);
  await playBtn.click();
  await p
    .waitForFunction((y) => window.__mjtApp?.orthoCampaign?.year > y, y0, { timeout: 20000 })
    .catch(() => {});
  const y1 = await p.evaluate(() => window.__mjtApp?.orthoCampaign?.year ?? null);
  ok('play_advances', y1 !== null && y1 > y0, `${y0}→${y1}`);
  const src = await p.locator('.photo .src').innerText();
  ok('metadata_visible', /\d{4}/.test(src) && /CC BY 4\.0/.test(src), src.slice(0, 100));
  // navegación manual durante la reproducción toma el control (pausa)
  await p.locator('.photo .p-nav .nav').last().click();
  const yM = await p.evaluate(() => window.__mjtApp?.orthoCampaign?.year);
  await p.waitForTimeout(2500);
  const yM2 = await p.evaluate(() => window.__mjtApp?.orthoCampaign?.year);
  ok('manual_nav_stops_play', yM === yM2, `${yM}→${yM2}`);
  // pausa explícita detiene el avance
  await playBtn.click();
  await p
    .waitForFunction((y) => window.__mjtApp?.orthoCampaign?.year > y, yM2, { timeout: 20000 })
    .catch(() => {});
  await p.getByRole('button', { name: /^pausar$/i }).click();
  const yP = await p.evaluate(() => window.__mjtApp?.orthoCampaign?.year);
  await p.waitForTimeout(2500);
  const yP2 = await p.evaluate(() => window.__mjtApp?.orthoCampaign?.year);
  ok('pause_holds', yP === yP2, `${yP}→${yP2}`);
  await p.locator('.photo').scrollIntoViewIfNeeded();
  await p.screenshot({ path: '../evidence/g13/photo-playback.png' });
  await ctx.close();
});

// ── 4b. Reproducción: falta de cobertura detiene sin sustituir; reduced-motion ──
await block('photo_edge', async () => {
  const { ctx, p } = await newResultPage();
  // 1965 no cubre: la sonda recibe 404 → NOT_COVERED → la reproducción se
  // detiene con el aviso y la campaña 1965 visible (sin sustitución).
  await p.route('**/ORTO_BFA_1965/**', (r) => r.fulfill({ status: 404, body: '' }));
  await p.locator('.viewswitch [data-mode="photo"]').click();
  await p.waitForSelector('.photo', { timeout: 15000 });
  await p.getByRole('button', { name: /reproducir fotografías/i }).click();
  await p.waitForFunction(() => window.__mjtApp?.orthoState === 'NOT_COVERED', {
    timeout: 30000
  });
  const yN = await p.evaluate(() => window.__mjtApp?.orthoCampaign?.year);
  ok('uncovered_stops_at_campaign', yN === 1965, `campaña=${yN}`);
  const stateTxt = await p.locator('.photo .state').innerText();
  ok('uncovered_explained', /no cubre|1965/i.test(stateTxt), stateTxt.slice(0, 120));
  await p.waitForTimeout(2500);
  const yN2 = await p.evaluate(() => window.__mjtApp?.orthoCampaign?.year);
  ok('uncovered_no_silent_substitute', yN2 === 1965, `${yN}→${yN2}`);
  await ctx.close();

  const ctxR = await browser.newContext({ ...ctxOpts, reducedMotion: 'reduce' });
  const pr = await ctxR.newPage();
  pr.on('pageerror', (e) => pageErrors.push(e.message.slice(0, 200)));
  await installLocalFixtures(pr);
  await installExternalStubs(pr);
  await pr.goto('http://localhost:4295/?year=1952&place=getxo');
  await pr.waitForSelector('.headline-block h1', { timeout: 30000 });
  await pr.locator('.viewswitch [data-mode="photo"]').click();
  await pr.waitForSelector('.photo', { timeout: 15000 });
  ok(
    'reduced_motion_no_autoplay_control',
    (await pr.getByRole('button', { name: /reproducir fotografías/i }).count()) === 0
  );
  await ctxR.close();

  // sonda rápida con teselas lentas: al avanzar a una campaña cuyas
  // teselas tardan, la fuente raster y el preview ya son de ESA campaña
  // (nunca queda la imagen anterior bajo una etiqueta nueva).
  const { ctx: ctxS, p: ps } = await newResultPage();
  const STUB =
    'iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAIAAAAmkwkpAAAAGElEQVR4nGOQi1pwwkYDQjLAWUCSAacMANhzEiHeJC+aAAAAAElFTkSuQmCC';
  await ps.route('**/ORTO_BFA_1965/**', async (r) => {
    await new Promise((res) => setTimeout(res, 4000));
    return r.fulfill({ status: 200, contentType: 'image/png', body: Buffer.from(STUB, 'base64') });
  });
  await ps.locator('.viewswitch [data-mode="photo"]').click();
  await ps.waitForSelector('.photo', { timeout: 15000 });
  await ps.getByRole('button', { name: /comprobar desde el aire/i }).click();
  await ps.waitForFunction(() => window.__mjtApp?.orthoState === 'AVAILABLE', { timeout: 30000 });
  // 1956 disponible → paso manual a 1965 con teselas lentas
  await ps.locator('.photo .p-nav .nav').last().click();
  await ps.waitForFunction(() => window.__mjtApp?.orthoCampaign?.year === 1965, { timeout: 10000 });
  const srcUrl = await ps.evaluate(
    () => window.__mjtMap?.getStyle()?.sources?.ortho?.tiles?.[0] ?? null
  );
  ok('slow_tiles_source_matches_label', /ORTO_BFA_1965/.test(srcUrl ?? ''), srcUrl ?? 'null');
  ok(
    'slow_tiles_preview_same_campaign',
    await ps.evaluate(() => !!window.__mjtMap?.getSource('ortho-preview'))
  );
  ok(
    'slow_tiles_label_is_new_campaign',
    (await ps.locator('.photo .p-year').innerText()).includes('1965')
  );
  await ctxS.close();
});

// checks ok() esperados antes de no_pageerrors: 11 (home) + 11 (streets)
// + 5 (photo) + 7 (photo_edge) = 34
const EXPECTED = 34;
const ran = out.filter((l) => /^(PASS|FAIL)/.test(l)).length;
if (ran < EXPECTED) {
  fails++;
  out.push(`FAIL incomplete_run — ${ran}/${EXPECTED} checks ejecutados`);
}
ok('no_pageerrors', pageErrors.length === 0, pageErrors.join(' | ').slice(0, 300));

console.log(out.join('\n'));
console.log(fails === 0 ? 'G13 PASS' : `G13 FAIL (${fails})`);
await browser.close();
server.close();
process.exit(fails === 0 ? 0 : 1);
