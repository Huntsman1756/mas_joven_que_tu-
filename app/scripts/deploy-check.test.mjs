import test from 'node:test';
import assert from 'node:assert/strict';
import { runDeployChecks } from './deploy-check.mjs';
import { publicBase, PAGES_BASE_URL } from './qa-target.mjs';

const BASE = 'https://mjt.example';
const PMTILES = Buffer.concat([Buffer.from('PMTiles'), Buffer.alloc(120, 3)]);
const VPS_HEADERS = {
  'x-content-type-options': 'nosniff',
  'x-frame-options': 'DENY',
  'referrer-policy': 'strict-origin-when-cross-origin',
  'strict-transport-security': 'max-age=31536000',
  'cache-control': 'no-cache'
};

function fakeServer(overrides = {}) {
  return async (url, init = {}) => {
    const { pathname, protocol } = new URL(url);
    const reply = (status, body, headers = {}) =>
      new Response(body, { status, headers: { ...VPS_HEADERS, ...headers } });
    if (protocol === 'http:') return reply(308, null, { location: `${BASE}/` });
    if (overrides[pathname]) return overrides[pathname](init);
    if (pathname === '/')
      return reply(
        200,
        '<meta name="mjt:build" content="abc"><link href="./_app/immutable/entry/start.X.js">',
        { 'content-type': 'text/html; charset=utf-8' }
      );
    if (pathname === '/como-lo-sabemos')
      return reply(200, '<title>Cómo lo sabemos — Más joven que tú</title>', {
        'content-type': 'text/html'
      });
    if (pathname === '/_app/immutable/entry/start.X.js')
      return reply(200, 'x', { 'cache-control': 'public, max-age=31536000, immutable' });
    if (pathname === '/data/cells.pmtiles')
      return reply(206, PMTILES, {
        'content-range': `bytes 0-126/1681173`,
        'cache-control': 'public, max-age=3600'
      });
    return reply(404, 'not found');
  };
}

test('perfil vps: un despliegue conforme pasa todos los checks', async () => {
  const report = await runDeployChecks({
    base: BASE,
    profile: 'vps',
    expectedBuild: 'abc',
    fetchImpl: fakeServer()
  });
  assert.deepEqual(
    report.checks.filter((c) => !c.pass),
    []
  );
});

test('PMTiles recomprimido o sin firma falla aunque devuelva 206', async () => {
  const report = await runDeployChecks({
    base: BASE,
    profile: 'pages',
    fetchImpl: fakeServer({
      '/data/cells.pmtiles': () =>
        new Response(Buffer.alloc(127), {
          status: 206,
          headers: { 'content-range': 'bytes 0-126/9', 'content-encoding': 'gzip' }
        })
    })
  });
  const failed = report.checks.filter((c) => !c.pass).map((c) => c.name);
  assert.deepEqual(failed, ['pmtiles-range', 'pmtiles-not-reencoded']);
});

test('una ruta ausente servida como 200 (fallback SPA) se detecta', async () => {
  const report = await runDeployChecks({
    base: BASE,
    fetchImpl: fakeServer({
      '/data/__recurso_inexistente__.json': () => new Response('<html>', { status: 200 })
    })
  });
  assert.equal(report.checks.find((c) => c.name === 'missing-is-404').pass, false);
});

test('build distinto del esperado falla', async () => {
  const report = await runDeployChecks({
    base: BASE,
    expectedBuild: 'otro',
    fetchImpl: fakeServer()
  });
  assert.equal(report.checks.find((c) => c.name === 'home-build-stamp').pass, false);
});

test('QA_BASE_URL normaliza la barra final y Pages es el valor por defecto', () => {
  assert.equal(publicBase({}), PAGES_BASE_URL);
  assert.equal(publicBase({ QA_BASE_URL: 'https://mjt.example/' }), 'https://mjt.example');
  assert.throws(() => publicBase({ QA_BASE_URL: 'https://mjt.example/?x=1' }));
});
