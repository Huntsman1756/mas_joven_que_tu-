// G14 — QA visual del borrador EU. Recorre las superficies reales con el
// selector ES→EU en escritorio (1440×900) y móvil táctil real (390×844,
// isMobile+hasTouch como opciones de CONTEXTO — dentro de `viewport`
// Playwright las ignora y se prueba un «escritorio estrecho»).
//
// Matriz de cobertura explícita: cada escenario declara su precondición
// (`need`, selector requerido) y su postcondición (`expect`). Si falta
// un control o el resultado no aparece, el escenario FALLA — nunca se
// omite la interacción en silencio.
//
// Checks por superficie:
//   - html lang = 'eu' tras conmutar
//   - sin overflow horizontal (scrollWidth ≤ innerWidth + 1)
//   - «fugas conocidas»: NO es garantía de ausencia de castellano.
//     Cubre (a) fragmentos ≥15 chars de es.ts que difieren de eu.ts,
//     (b) etiquetas cortas ES (4–14 chars) con borde de palabra Unicode,
//     (c) literales ES conocidos de datos (notas de catálogo) — todo ello
//     en texto visible Y en aria-label/title/placeholder/alt/title-tag
//   - sin placeholders sin resolver ({clave})
//   - porcentajes en convención vasca: '% 79,3', nunca '79,3 %'
//   - cero pageerrors
// Capturas en ../evidence/eu/qa/. Exit 1 si hay fallos.
import { chromium } from 'playwright';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { createStaticServer } from './static-server.mjs';
import { installCiFixtures, installLocalFixtures } from './fixtures.mjs';

// CI_STUBS=1: servicios externos de imagen stubbados (la suite mide la
// app, no la disponibilidad de terceros).
const installFixtures = process.env.CI_STUBS === '1' ? installCiFixtures : installLocalFixtures;

const BUILD = resolve('build');
const OUT = join(resolve('..'), 'evidence/eu/qa');
const PORT = 4314;
const BASE = `http://localhost:${PORT}`;
await mkdir(OUT, { recursive: true });

const loadDict = async (f) => {
  const src = await readFile(`src/lib/i18n/${f}.ts`, 'utf8');
  return new Function(`return ${src.slice(src.indexOf('= {') + 2, src.lastIndexOf('};') + 1)}`)();
};
const es = await loadDict('es');
const eu = await loadDict('eu');
const norm = (s) => s.replace(/\s+/g, ' ');

// (a) fragmentos largos: cada frase ES (≥15 chars, ≠ eu) partida por
// placeholders — detecta fallback y literales largos
const ES_FRAGS = Object.entries(es)
  .filter(([k, v]) => v.length >= 15 && eu[k] && eu[k] !== v)
  .flatMap(([k, v]) =>
    v
      .replace(/\{[^}]+\}/g, '§')
      .split('§')
      .map((f) => norm(f).trim())
      .filter((f) => f.length >= 15)
      .map((f) => ({ k, f }))
  );
// (b) etiquetas cortas (4–14 chars, ≠ eu): coincidencia con borde de
// palabra Unicode para no comerse palabras EU que las contengan
const ES_SHORT = Object.entries(es)
  .filter(([k, v]) => v.length >= 4 && v.length < 15 && eu[k] && eu[k] !== v)
  .map(([k, v]) => ({
    k,
    re: new RegExp(
      `(?<![\\p{L}\\p{M}])${v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\p{L}\\p{M}])`,
      'u'
    )
  }));
// (c) literales ES conocidos que viven en DATOS (catálogo), no en es.ts
const DATA_ES = [
  'fecha exacta desconocida',
  'vuelo americano',
  'Diputación Foral',
  'Gobierno Vasco'
];

const checks = [];
const ok = (name, pass, detail = '') => {
  checks.push({ name, pass, detail });
  console.log(`${pass ? 'PASS' : 'FAIL'} ${name}${detail ? ` — ${detail}` : ''}`);
};

async function audit(page, tag) {
  const r = await page.evaluate(() => {
    const vw = window.innerWidth;
    const attrs = [];
    for (const el of document.querySelectorAll('[aria-label],[title],[placeholder],[alt]'))
      for (const a of ['aria-label', 'title', 'placeholder', 'alt']) {
        const v = el.getAttribute(a);
        if (v) attrs.push(v);
      }
    return {
      lang: document.documentElement.lang,
      scrollW: document.documentElement.scrollWidth,
      vw,
      text: document.body.innerText,
      attrs: attrs.join(' · ') + ' · ' + document.title,
      placeholders: (document.body.innerText.match(/\{[a-z_]+\}/gi) || []).slice(0, 5),
      esPct: (document.body.innerText.match(/\d[.,\d]*\s+%/g) || []).slice(0, 5)
    };
  });
  ok(`${tag}/lang`, r.lang === 'eu', r.lang);
  ok(`${tag}/no_hoverflow`, r.scrollW <= r.vw + 1, `scrollW=${r.scrollW} vw=${r.vw}`);
  ok(`${tag}/no_placeholders`, r.placeholders.length === 0, r.placeholders.join(','));
  ok(`${tag}/pct_eu_style`, r.esPct.length === 0, r.esPct.join(','));
  const all = `${norm(r.text)} · ${norm(r.attrs)}`;
  const leaks = ES_FRAGS.filter(({ f }) => all.includes(norm(f))).map((x) => x.k);
  const shortLeaks = ES_SHORT.filter(({ re }) => re.test(all)).map((x) => x.k);
  const dataLeaks = DATA_ES.filter((f) => all.includes(f));
  ok(
    `${tag}/no_es_leak`,
    leaks.length + shortLeaks.length + dataLeaks.length === 0,
    [...new Set([...leaks, ...shortLeaks, ...dataLeaks])].slice(0, 6).join(',')
  );
  await page.screenshot({ path: join(OUT, `${tag}.png`), fullPage: false });
  return r;
}

const server = await createStaticServer(BUILD, PORT);
const browser = await chromium.launch();
const pageerrors = [];

const VP = {
  d: { viewport: { width: 1440, height: 900 } },
  m: {
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 2
  }
};
const Q = 'year=1952&place=getxo&lat=43.3569&lon=-3.0117';

async function scenario(id, vp, url, { need, expect, scroll = false, extra } = {}) {
  const tag = `eu-${id}-${vp}`;
  const ctx = await browser.newContext(VP[vp]);
  const page = await ctx.newPage();
  page.on('pageerror', (e) => pageerrors.push(`${tag}: ${e.message}`));
  await installFixtures(page);
  try {
    await page.goto(`${BASE}/${url}`, { waitUntil: 'load' });
    await page.click('.langs button:has-text("EU")');
    await page.waitForFunction(() => document.documentElement.lang === 'eu');
    if (need) await page.waitForSelector(need, { timeout: 30000 });
    await page.waitForTimeout(1200);
    if (scroll) {
      await page.evaluate(async () => {
        for (let y = 0; y <= document.body.scrollHeight; y += 500) {
          scrollTo(0, y);
          await new Promise((r) => setTimeout(r, 140));
        }
      });
      await page.waitForTimeout(1500);
      await page.evaluate(() => scrollTo(0, 0));
    }
    if (extra) await extra(page);
    if (expect) await page.waitForSelector(expect, { timeout: 20000 });
    await audit(page, tag);
  } catch (e) {
    ok(`${tag}/surface`, false, String(e).slice(0, 200));
  }
  await ctx.close();
}

// ── Matriz de cobertura ────────────────────────────────────────────────
// Cada escenario corre en d y m. `need` = precondición dura; `expect` =
// resultado exigible tras la interacción. Los `extra` lanzan si falta el
// control — sin «if (await count())» que omita la comprobación.
const clickBuilding = async (page) => {
  // Escanea puntos de pantalla contra queryRenderedFeatures: el punto
  // devuelto tiene un feature REAL debajo (el centroide de un polígono
  // cóncavo puede caer fuera). getBoundingClientRect traduce las coords
  // del contenedor del mapa al viewport — project() solo da las primeras.
  await page.waitForFunction(
    () => {
      const m = window.__mjtMap;
      if (!m || !m.getStyle()) return false;
      const ids = m
        .getStyle()
        .layers.map((l) => l.id)
        .filter((id) => /^b-.+-fill$/.test(id));
      if (!ids.length) return false;
      const c = m.getCanvas();
      const w = c.clientWidth,
        h = c.clientHeight;
      for (let yy = h * 0.25; yy <= h * 0.75; yy += 16)
        for (let xx = w * 0.25; xx <= w * 0.75; xx += 16)
          if (m.queryRenderedFeatures([xx, yy], { layers: ids }).length) {
            window.__mjtBpt = { x: xx, y: yy };
            return true;
          }
      return false;
    },
    { timeout: 30000 }
  );
  const pt = await page.evaluate(() => {
    const r = window.__mjtMap.getCanvas().getBoundingClientRect();
    const p = window.__mjtBpt;
    delete window.__mjtBpt;
    return { x: r.left + p.x, y: r.top + p.y };
  });
  await page.mouse.click(pt.x, pt.y);
};

const emptySearch = async (page) => {
  const inp = page.locator('#place-input, input[type=text]').first();
  if (!(await inp.count())) throw new Error('falta el campo de municipio');
  await inp.fill('xyzzyqw');
  await page.waitForFunction(
    () => document.querySelector('.status')?.textContent?.includes('xyzzyqw'),
    { timeout: 8000 }
  );
};

const openAddress = async (page) => {
  const btn = page.locator('button.start').first();
  if (!(await btn.count())) throw new Error('falta el botón de búsqueda de dirección');
  await btn.scrollIntoViewIfNeeded();
  await btn.click();
  await page.waitForSelector('#addr-street', { timeout: 15000 });
  await page.fill('#addr-street', 'ogono');
  // «ogono» es match exacto único → se confirma la calle y aparece Número
  await page.waitForSelector('#addr-num', { timeout: 15000 });
};

const SCENARIOS = [
  { id: 'home', url: '', need: '.langs', expect: '#place-input, input[type=text]' },
  { id: 'result', url: `?${Q}&z=13`, need: '.headline-block h1', scroll: true },
  {
    id: 'time',
    url: `?${Q}&z=13&view=time&play=1970`,
    need: '.headline-block h1',
    expect: '.timeband'
  },
  { id: 'photo', url: `?${Q}&z=13&view=photo`, need: '.headline-block h1', expect: '.p-year' },
  {
    id: 'swipe',
    url: `?${Q}&z=13&view=swipe`,
    need: '.headline-block h1',
    expect: '.presets, .swipe-msg'
  },
  {
    id: 'hist',
    url: `?${Q}&z=13&view=hist`,
    need: '.headline-block h1',
    expect: 'section.histmap'
  },
  {
    id: 'building',
    url: `?${Q}&z=17`,
    need: '.headline-block h1',
    // BuildingCard y CellDetail son ambas aside.card — :not(#cell-detail)
    // exige que sea la ficha de EDIFICIO la que responde al click
    expect: 'aside.card:not(#cell-detail)',
    extra: clickBuilding
  },
  { id: 'how', url: 'como-lo-sabemos', need: 'main.how h1', expect: '.langs', scroll: true },
  {
    id: 'search-empty',
    url: '',
    need: '#place-input, input[type=text]',
    expect: '.status',
    extra: emptySearch
  },
  {
    id: 'address',
    url: `?${Q}&z=13`,
    need: '.headline-block h1',
    expect: '#addr-num',
    scroll: true,
    extra: openAddress
  }
];

for (const s of SCENARIOS) {
  await scenario(s.id, 'd', s.url, s);
  await scenario(s.id, 'm', s.url, s);
}

ok('no_pageerrors', pageerrors.length === 0, pageerrors.slice(0, 3).join(' | '));

await browser.close();
server.close();
const fails = checks.filter((c) => !c.pass);
await writeFile(
  join(OUT, 'report.json'),
  JSON.stringify({ utc: new Date().toISOString(), checks, pageerrors }, null, 2)
);
console.log(
  fails.length === 0 ? `G14 EU PASS (${checks.length} checks)` : `G14 EU FAIL (${fails.length})`
);
process.exit(fails.length === 0 ? 0 : 1);
