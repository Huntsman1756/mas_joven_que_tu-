/**
 * Servidor estático con soporte de HTTP Range (Byte Serving).
 *
 * PMTiles REQUIERE `Range`. Un servidor que no lo implemente hace fallar el
 * source `pmtiles://` en el navegador (hallazgo de G0). En producción basta
 * cualquier hosting que sirva `Accept-Ranges: bytes`.
 */
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { extname, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { gzipSync, brotliCompressSync } from 'node:zlib';

const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
  '.pmtiles': 'application/octet-stream', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.map': 'application/json', '.ico': 'image/x-icon'
};

/** Tipos que se benefician de compresión (pmtiles/png/jpg/woff2 ya van comprimidos). */
const COMPRESSIBLE = new Set(['.html', '.js', '.mjs', '.css', '.json', '.svg', '.map']);

function pickEncoding(req) {
  const ae = req.headers['accept-encoding'] ?? '';
  if (/\bbr\b/.test(ae)) return 'br';
  if (/\bgzip\b/.test(ae)) return 'gzip';
  return null;
}

export function createStaticServer(buildDir, port) {
  const server = createServer(async (req, res) => {
    let p = decodeURIComponent((req.url || '/').split('?')[0]);
    if (p === '/') p = '/index.html';
    let file = join(buildDir, p);
    if (!existsSync(file) || statSync(file).isDirectory()) file = join(buildDir, 'index.html');

    const ext = extname(file);
    const type = MIME[ext] ?? 'application/octet-stream';
    const st = await stat(file);
    const range = req.headers.range;

    if (range) {
      const m = /bytes=(\d*)-(\d*)/.exec(range);
      let start = m && m[1] ? parseInt(m[1], 10) : 0;
      let end = m && m[2] ? parseInt(m[2], 10) : st.size - 1;
      if (Number.isNaN(start) || start < 0) start = 0;
      if (Number.isNaN(end) || end >= st.size) end = st.size - 1;
      if (start > end) {
        res.writeHead(416, { 'content-range': `bytes */${st.size}` }).end();
        return;
      }
      res.writeHead(206, {
        'content-type': type,
        'content-length': end - start + 1,
        'content-range': `bytes ${start}-${end}/${st.size}`,
        'accept-ranges': 'bytes',
        'cache-control': 'public, max-age=60'
      });
      createReadStream(file, { start, end }).pipe(res);
      return;
    }

    const enc = COMPRESSIBLE.has(ext) ? pickEncoding(req) : null;
    if (enc) {
      const raw = await readFile(file);
      const body = enc === 'br' ? brotliCompressSync(raw) : gzipSync(raw);
      res.writeHead(200, {
        'content-type': type,
        'content-encoding': enc,
        'content-length': body.length,
        'vary': 'accept-encoding',
        'accept-ranges': 'bytes',
        'cache-control': 'public, max-age=60'
      });
      res.end(body);
      return;
    }

    res.writeHead(200, {
      'content-type': type,
      'content-length': st.size,
      'accept-ranges': 'bytes',
      'cache-control': 'public, max-age=60'
    });
    res.end(await readFile(file));
  });
  return new Promise((resolve) => server.listen(port, () => resolve(server)));
}

// Ejecución directa: `node scripts/static-server.mjs [port] [dir]`
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const port = Number(process.argv[2]) || 4173;
  const dir = process.argv[3] || 'build';
  await createStaticServer(dir, port);
  console.log(`serving ${dir}/ on http://localhost:${port}`);
}
