/**
 * Contrato HTTP del despliegue publicado (sin navegador): rutas, 404 real,
 * Range de PMTiles con firma, caché y cabeceras. Complementa, no sustituye,
 * la QA en navegador: un 206 correcto no demuestra que el mapa pinte.
 *
 * Uso: [QA_BASE_URL=https://…] [EXPECTED_BUILD=<sha>] node scripts/deploy-check.mjs [--profile=vps|pages]
 *   pages → contrato común (lo que GitHub Pages puede garantizar).
 *   vps   → además cabeceras de deploy/Caddyfile y redirección HTTP→HTTPS.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { publicBase } from './qa-target.mjs';

const RANGE_END = 126;

export async function runDeployChecks({
  base,
  profile = 'pages',
  expectedBuild,
  fetchImpl = fetch
}) {
  const checks = [];
  const info = {};
  const check = (name, pass, detail) => checks.push({ name, pass: Boolean(pass), detail });
  const get = (path, init = {}) =>
    fetchImpl(`${base}${path}`, { signal: AbortSignal.timeout(30000), ...init });
  const header = (response, name) => response.headers.get(name) ?? '';

  const home = await get('/');
  const html = await home.text();
  const build = /name="mjt:build"\s+content="([^"]+)"/.exec(html)?.[1] ?? null;
  info.build = build;
  check(
    'home-200-html',
    home.status === 200 && header(home, 'content-type').startsWith('text/html'),
    {
      status: home.status,
      type: header(home, 'content-type')
    }
  );
  check('home-build-stamp', expectedBuild ? build === expectedBuild : Boolean(build), {
    build,
    expectedBuild: expectedBuild ?? null
  });
  info.homeCacheControl = header(home, 'cache-control');

  const method = await get('/como-lo-sabemos');
  check('methodology-route', method.status === 200 && /Cómo lo sabemos/.test(await method.text()), {
    status: method.status
  });

  const missing = await get('/data/__recurso_inexistente__.json');
  await missing.arrayBuffer();
  check('missing-is-404', missing.status === 404, { status: missing.status });

  // Como un navegador: Fetch añade `Accept-Encoding: identity` a toda petición
  // con Range (https://fetch.spec.whatwg.org/#http-network-or-cache-fetch).
  const range = await get('/data/cells.pmtiles', {
    headers: { Range: `bytes=0-${RANGE_END}`, 'Accept-Encoding': 'identity' }
  });
  const bytes = Buffer.from(await range.arrayBuffer());
  check(
    'pmtiles-range',
    range.status === 206 &&
      new RegExp(`^bytes 0-${RANGE_END}/\\d+$`).test(header(range, 'content-range')) &&
      bytes.length === RANGE_END + 1 &&
      bytes.subarray(0, 7).toString('latin1') === 'PMTiles',
    {
      status: range.status,
      contentRange: header(range, 'content-range'),
      bytes: bytes.length,
      magic: bytes.subarray(0, 7).toString('latin1')
    }
  );
  // Informativo: con gzip aceptado, GitHub Pages sirve un rango del fichero
  // comprimido entero (otro total y ETag débil). Ningún navegador pide Range así.
  const gzipped = await get('/data/cells.pmtiles', {
    headers: { Range: `bytes=0-${RANGE_END}`, 'Accept-Encoding': 'gzip' }
  });
  await gzipped.arrayBuffer();
  info.pmtilesRangeWithGzip = {
    contentEncoding: header(gzipped, 'content-encoding') || null,
    contentRange: header(gzipped, 'content-range')
  };
  info.pmtilesCacheControl = header(range, 'cache-control');

  const asset = /["'](?:\.\/|\/)?((?:[^"']*\/)?_app\/immutable\/[^"']+\.js)["']/.exec(html)?.[1];
  if (asset) {
    const assetPath = `/${asset.replace(/^.*?(_app\/immutable\/)/, '$1')}`;
    const immutable = await get(assetPath);
    await immutable.arrayBuffer();
    info.immutableCacheControl = header(immutable, 'cache-control');
    check(
      'immutable-assets-cached',
      immutable.status === 200 &&
        (profile === 'vps'
          ? /immutable/.test(info.immutableCacheControl)
          : /max-age=\d+/.test(info.immutableCacheControl)),
      { path: assetPath, status: immutable.status, cacheControl: info.immutableCacheControl }
    );
  } else {
    check('immutable-assets-cached', false, { reason: 'Sin recurso _app/immutable en index.html' });
  }

  info.altSvc = header(home, 'alt-svc') || null;

  if (profile === 'vps') {
    // GitHub Pages fija max-age=600; en el VPS el HTML debe revalidar siempre.
    check('home-revalidates', /no-cache|max-age=0/.test(info.homeCacheControl), {
      cacheControl: info.homeCacheControl
    });
    const expected = {
      'x-content-type-options': /^nosniff$/i,
      'x-frame-options': /^deny$/i,
      'referrer-policy': /^strict-origin-when-cross-origin$/i
    };
    if (base.startsWith('https:')) expected['strict-transport-security'] = /max-age=\d{6,}/;
    for (const [name, pattern] of Object.entries(expected)) {
      check(`header-${name}`, pattern.test(header(home, name)), {
        value: header(home, name) || null
      });
    }
    check(
      'data-short-cache',
      /max-age=\d+/.test(info.pmtilesCacheControl) && !/immutable/.test(info.pmtilesCacheControl),
      {
        cacheControl: info.pmtilesCacheControl
      }
    );
    if (base.startsWith('https:')) {
      const plain = await fetchImpl(base.replace(/^https:/, 'http:') + '/', {
        redirect: 'manual',
        signal: AbortSignal.timeout(30000)
      });
      const location = header(plain, 'location');
      check(
        'http-redirects-to-https',
        [301, 308].includes(plain.status) && location.startsWith('https:'),
        { status: plain.status, location: location || null }
      );
    }
  }

  return { base, profile, info, checks, pass: checks.every((c) => c.pass) };
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const profile = process.argv.find((a) => a.startsWith('--profile='))?.split('=')[1] ?? 'pages';
  if (!['pages', 'vps'].includes(profile)) throw new Error('--profile debe ser pages o vps');
  const base = publicBase();
  const report = {
    utc: new Date().toISOString(),
    ...(await runDeployChecks({ base, profile, expectedBuild: process.env.EXPECTED_BUILD }))
  };
  for (const c of report.checks)
    console.log(`${c.pass ? 'PASS' : 'FAIL'} ${c.name} ${JSON.stringify(c.detail)}`);
  const out = fileURLToPath(
    new URL(`../../evidence/deploy-check/${report.utc.replace(/[:.]/g, '-')}/`, import.meta.url)
  );
  await mkdir(out, { recursive: true });
  await writeFile(`${out}report.json`, JSON.stringify(report, null, 2));
  console.log(out);
  process.exitCode = report.pass ? 0 : 1;
}
