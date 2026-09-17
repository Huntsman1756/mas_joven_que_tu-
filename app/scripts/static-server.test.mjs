/**
 * Tests de regresión del servidor estático de verificación.
 *
 * Cubre los defectos corregidos en la auditoría: path traversal (literal,
 * percent-encoded y con separador Windows), URIs malformadas y el contrato
 * HTTP Range que PMTiles exige (bytes=a-b, bytes=a-, bytes=-n, rangos
 * insatisfacibles/malformados/múltiples).
 *
 * Uso:  node --test scripts/static-server.test.mjs
 * Para re-correr contra una implementación anterior (RED):
 *   MJT_SERVER_IMPL=/ruta/al/static-server.mjs node --test scripts/static-server.test.mjs
 */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { get } from 'node:http';

const { createStaticServer } = await import(
  process.env.MJT_SERVER_IMPL
    ? pathToFileURL(process.env.MJT_SERVER_IMPL).href
    : './static-server.mjs'
);

let server;
let INDEX_HTML;
let BODY; // 1000 bytes deterministas
const SECRET = 'SENTINEL-FUERA-DEL-ROOT';

/** GET con path crudo (sin normalización del cliente). */
function rawGet(path, headers = {}) {
  return new Promise((resolveP, reject) => {
    const req = get(
      { host: 'localhost', port: server.address().port, path, headers },
      (res) => {
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () =>
          resolveP({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks) })
        );
      }
    );
    req.on('error', reject);
  });
}

before(async () => {
  const tmp = await mkdtemp(join(tmpdir(), 'mjt-srv-'));
  const root = join(tmp, 'build');
  await mkdir(join(root, 'data'), { recursive: true });
  INDEX_HTML = '<!doctype html><html><body>INDEX</body></html>';
  BODY = Buffer.alloc(1000);
  for (let i = 0; i < 1000; i++) BODY[i] = i % 256;
  await writeFile(join(root, 'index.html'), INDEX_HTML);
  await writeFile(join(root, 'data', 'test.json'), BODY);
  // Sentinel fuera del árbol servido: si un traversal lo alcanza, el test falla.
  await writeFile(join(tmp, 'secret.txt'), SECRET);
  server = await createStaticServer(root, 0);
});

after(() => server?.close());

// ------------------------------------------------------------------ archivos
test('sirve un archivo normal (200 + cuerpo íntegro)', async () => {
  const r = await rawGet('/data/test.json');
  assert.equal(r.status, 200);
  assert.deepEqual(r.body, BODY);
  assert.equal(r.headers['content-type'], 'application/json');
  assert.equal(r.headers['accept-ranges'], 'bytes');
});

test('SPA fallback: ruta desconocida devuelve index.html', async () => {
  const r = await rawGet('/no/existe/esto');
  assert.equal(r.status, 200);
  assert.equal(r.body.toString(), INDEX_HTML);
});

// ---------------------------------------------------------------- traversal
for (const [name, path] of [
  ['traversal literal /../', '/../secret.txt'],
  ['traversal codificado %2e%2e%2f', '/%2e%2e%2fsecret.txt'],
  ['traversal anidado', '/data/../../secret.txt'],
]) {
  test(`rechaza ${name}`, async () => {
    const r = await rawGet(path);
    assert.equal(r.status, 403);
    assert.notEqual(r.body.toString(), SECRET);
  });
}

test('traversal doble codificado: se decodifica una vez, no escapa', async () => {
  // %252e → "%2e" literal: correcto NO decodificar dos veces; el nombre de
  // archivo no existe → fallback a index.html. Lo que importa: nunca el sentinel.
  const r = await rawGet('/%252e%252e%252fsecret.txt');
  assert.notEqual(r.body.toString(), SECRET);
  assert.equal(r.body.toString(), INDEX_HTML);
});

test('traversal con separador Windows %5c no escapa del root', async () => {
  const r = await rawGet('/%5c..%5csecret.txt');
  if (process.platform === 'win32') {
    assert.equal(r.status, 403);
  }
  // En cualquier plataforma: jamás el contenido del sentinel.
  assert.notEqual(r.body.toString(), SECRET);
});

test('sibling-prefix: ../build-evil no se acepta como dentro de build/', async () => {
  // El chequeo es root + sep, no startsWith(root): 'build-evil' no es 'build/'.
  const r = await rawGet('/../build-evil/secret.txt');
  assert.equal(r.status, 403);
  assert.notEqual(r.body.toString(), SECRET);
});

test('URI con percent-encoding malformado devuelve 400 (no crash)', async () => {
  for (const p of ['/%', '/%zz', '/data/test.json%']) {
    const r = await rawGet(p);
    assert.equal(r.status, 400, `path ${p}`);
  }
});

// --------------------------------------------------------------------- Range
test('bytes=0-9 → 206 con 10 bytes y Content-Range correcto', async () => {
  const r = await rawGet('/data/test.json', { range: 'bytes=0-9' });
  assert.equal(r.status, 206);
  assert.equal(r.headers['content-range'], 'bytes 0-9/1000');
  assert.deepEqual(r.body, BODY.subarray(0, 10));
});

test('bytes=990- → 206 hasta el final', async () => {
  const r = await rawGet('/data/test.json', { range: 'bytes=990-' });
  assert.equal(r.status, 206);
  assert.equal(r.headers['content-range'], 'bytes 990-999/1000');
  assert.deepEqual(r.body, BODY.subarray(990));
});

test('bytes=-10 → 206 con los ÚLTIMOS 10 bytes', async () => {
  const r = await rawGet('/data/test.json', { range: 'bytes=-10' });
  assert.equal(r.status, 206);
  assert.equal(r.headers['content-range'], 'bytes 990-999/1000');
  assert.deepEqual(r.body, BODY.subarray(990));
});

test('bytes=2000- → 416 con Content-Range */size', async () => {
  const r = await rawGet('/data/test.json', { range: 'bytes=2000-' });
  assert.equal(r.status, 416);
  assert.equal(r.headers['content-range'], 'bytes */1000');
});

test('range malformado se ignora → 200 cuerpo completo', async () => {
  for (const range of ['bytes=abc', 'items=0-9', 'bytes=5-3x']) {
    const r = await rawGet('/data/test.json', { range });
    assert.equal(r.status, 200, `range ${range}`);
    assert.deepEqual(r.body, BODY);
  }
});

test('multi-range se ignora → 200 cuerpo completo', async () => {
  const r = await rawGet('/data/test.json', { range: 'bytes=0-1,5-6' });
  assert.equal(r.status, 200);
  assert.deepEqual(r.body, BODY);
});
