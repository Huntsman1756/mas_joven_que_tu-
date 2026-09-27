/**
 * RT-01 — el artefacto servido en el SUBPATH REAL de GitHub Pages
 * (`/mas_joven_que_tu-/`) arranca, carga datos y pinta PMTiles.
 *
 * GitHub Pages publica el repo bajo un prefijo; un build probado solo en `/`
 * no prueba ese subpath. Este script:
 *   1. sirve `build/` en el puerto interno (mismo servidor estático de CI,
 *      con HTTP Range — PMTiles lo exige);
 *   2. publica un proxy que expone ese build bajo `/mas_joven_que_tu-/…`
 *      (equivalente al mapeo servidor de Pages: el origen ve la raíz,
 *      el navegador ve el prefijo);
 *   3. comprueba por HTTP: HTML, chunks, `data/` y Range sobre `.pmtiles`;
 *   4. arranca Chromium contra el prefijo y exige: titular, mapa con
 *      canvas, cero respuestas >=400 y peticiones de datos bajo el prefijo.
 *
 * Uso: node <ruta>/app/scripts/rt_pages_prefix.mjs
 *      (resuelve sus rutas desde el propio script: el cwd es irrelevante)
 * Salida: <repo>/evidence/red-team-2026/pages-prefix.json
 */
import { chromium } from 'playwright';
import { createServer, request as httpRequest } from 'node:http';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { createStaticServer } from './static-server.mjs';
import { STUB_PNG } from './fixtures.mjs';

const APP_DIR = resolve(import.meta.dirname, '..');
const ROOT = resolve(APP_DIR, '..');
const BUILD = join(APP_DIR, 'build');
const OUT = join(ROOT, 'evidence/red-team-2026');
const PREFIX = '/mas_joven_que_tu-';
const ORIGIN_PORT = 4441; // build servido en raíz (interno)
const PAGE_PORT = 4442; // expuesto con el prefijo de Pages
const STUBS = process.env.CI_STUBS === '1';

await mkdir(OUT, { recursive: true });
const origin = await createStaticServer(BUILD, ORIGIN_PORT);

/** Proxy con prefijo: /mas_joven_que_tu-/x → origin /x (cabeceras intactas). */
const proxy = createServer((req, res) => {
  const url = req.url || '/';
  if (!url.startsWith(PREFIX)) {
    res.writeHead(404).end('fuera del prefijo');
    return;
  }
  const stripped = url.slice(PREFIX.length) || '/';
  const opts = {
    host: '127.0.0.1',
    port: ORIGIN_PORT,
    path: stripped,
    method: req.method,
    headers: { ...req.headers, host: `127.0.0.1:${ORIGIN_PORT}` }
  };
  const up = httpRequest(opts, (r) => {
    res.writeHead(r.statusCode || 502, r.headers);
    r.pipe(res);
  });
  up.on('error', () => {
    res.writeHead(502).end('proxy error');
  });
  req.pipe(up);
});
await new Promise((r) => proxy.listen(PAGE_PORT, r));

const checks = {};
const notes = [];
const ok = (k, v, detail = '') => {
  checks[k] = !!v;
  console.log(`${v ? 'PASS' : 'FAIL'} ${k}${detail ? ` — ${detail}` : ''}`);
};
const BASE = `http://127.0.0.1:${PAGE_PORT}${PREFIX}`;
/** 'relative' | 'absolute' — se detecta del HTML servido (se informa al final). */
let assets;

/* ── HTTP ─────────────────────────────────────────────────────────────── */
async function head(path, headers = {}) {
  const r = await fetch(`http://127.0.0.1:${PAGE_PORT}${PREFIX}${path}`, { headers });
  return { status: r.status, type: r.headers.get('content-type') || '', body: r };
}
{
  const home = await head('/');
  const html = await home.body.text();
  ok('pages_home_200', home.status === 200, String(home.status));
  ok('pages_home_es_sello', /mjt:build/.test(html), 'meta mjt:build presente');
  const assetsDetected = /\.\/_app\//.test(html) ? 'relative' : 'absolute';
  assets = assetsDetected;
  notes.push(`assets=${assetsDetected}`);
  ok('pages_home_rel_or_abs', /\.\/_app\/|\/mas_joven_que_tu-\/_app\//.test(html));
  const chunk = html.match(/(?:href|src)="([^"]*_app\/immutable\/entry\/[^"]+\.js)"/)?.[1];
  if (chunk) {
    const rel = chunk.startsWith(PREFIX) ? chunk.slice(PREFIX.length) : chunk.replace(/^\.\//, '/');
    const c = await head(rel);
    ok('pages_chunk_200', c.status === 200 && /javascript/.test(c.type), `${c.status} ${c.type}`);
    notes.push(`chunk: ${chunk}`);
  } else {
    ok('pages_chunk_200', false, 'no se encontró entry chunk en el HTML');
  }
  const data = await head('/data/catalog.json');
  ok(
    'pages_data_200',
    data.status === 200 && data.type.includes('json'),
    `${data.status} ${data.type}`
  );
  const range = await head('/data/cells.pmtiles', { Range: 'bytes=0-99' });
  const buf = new Uint8Array(await range.body.arrayBuffer());
  ok(
    'pages_pmtiles_range_206',
    range.status === 206 &&
      /bytes 0-99\/\d+/.test(range.body.headers.get('content-range') || '') &&
      buf.length === 100 &&
      (range.type.includes('octet-stream') || range.type === 'application/octet-stream'),
    `${range.status} len=${buf.length} ${range.type}`
  );
  const how = await head('/como-lo-sabemos');
  ok('pages_how_200', how.status === 200, String(how.status));
}

/* ── Navegador ────────────────────────────────────────────────────────── */
{
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  if (STUBS) {
    // Solo imagen externa stubbada (como CI). NO se usa installCiFixtures:
    // su ruta de PMTiles calcula la relativa desde la raíz y bajo el
    // prefijo de Pages resolvería mal (aquí los .pmtiles del build son
    // reales y deben probarse a través del prefijo).
    await page.route(/^https:\/\/(geo\.bizkaia|www\.geo\.euskadi)\.eus\//, (route) => {
      const u = route.request().url();
      if (u.includes('t17iApiRestWar')) return route.fallback();
      return route.fulfill({ status: 200, contentType: 'image/png', body: STUB_PNG });
    });
  }
  const bad = [];
  const dataUrls = [];
  const pageerrors = [];
  page.on('response', (r) => {
    const u = r.url();
    if (r.status() >= 400) bad.push(`${r.status()} ${u.slice(0, 120)}`);
    if (u.includes('/data/')) dataUrls.push(u);
  });
  page.on('pageerror', (e) => pageerrors.push(String(e.message).slice(0, 160)));

  await page.goto(`${BASE}/?year=1987&place=leioa`, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__mjtApp?.headline != null, null, { timeout: 30000 });
  ok('pages_boot_headline', true);
  const canvas = await page
    .waitForSelector('.mapband canvas', { timeout: 30000 })
    .then(() => true)
    .catch(() => false);
  ok('pages_map_canvas', canvas);
  await page.waitForTimeout(1200);
  const prefijadas = dataUrls.filter((u) => u.includes(`${PREFIX}/data/`)).length;
  ok(
    'pages_data_bajo_prefijo',
    dataUrls.length > 0 && prefijadas === dataUrls.length,
    `${prefijadas}/${dataUrls.length}`
  );
  ok('pages_sin_404', bad.length === 0, bad.slice(0, 3).join(' | '));
  ok('pages_sin_pageerrors', pageerrors.length === 0, pageerrors.join(' | '));
  await page.screenshot({ path: join(OUT, 'pages-prefix.png') });

  // recarga y back/forward bajo el prefijo
  await page.goto(`${BASE}/?year=1952&place=getxo&view=photo`, { waitUntil: 'load' });
  await page.waitForSelector('.photo', { timeout: 20000 }).catch(() => null);
  ok('pages_deeplink_photo', (await page.locator('.photo').count()) === 1);
  ok('pages_deeplink_sin_404', bad.length === 0, bad.slice(0, 3).join(' | '));

  await ctx.close();
  await browser.close();
}

const buildIdentity = (await (await fetch(`http://127.0.0.1:${ORIGIN_PORT}/`)).text()).match(
  /mjt:build" content="([^"]+)"/
)?.[1];

proxy.close();
origin.close();

const fails = Object.entries(checks)
  .filter(([, v]) => !v)
  .map(([k]) => k);
await writeFile(
  join(OUT, 'pages-prefix.json'),
  JSON.stringify(
    {
      utc: new Date().toISOString(),
      prefix: PREFIX,
      stubs: STUBS,
      build_identity: buildIdentity,
      assets,
      checks,
      notes
    },
    null,
    2
  )
);
console.log(
  fails.length === 0
    ? `PAGES PREFIX PASS (${Object.keys(checks).length} checks)`
    : `PAGES PREFIX FAIL: ${fails.join(', ')}`
);
process.exit(fails.length === 0 ? 0 : 1);
