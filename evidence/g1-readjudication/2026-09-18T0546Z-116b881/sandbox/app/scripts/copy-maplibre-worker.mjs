/**
 * Copia el Web Worker de MapLibre GL JS a `static/vendor/`.
 *
 * MapLibre v6 resuelve el worker como `new URL('./maplibre-gl-worker.mjs',
 * import.meta.url)`. Dentro de un chunk de Vite esa URL apunta a
 * `_app/immutable/chunks/` → 404 → el worker muere en silencio y las teselas
 * vectoriales quedan en estado `loading` para siempre (sin error visible).
 * La app fija `setWorkerUrl('<base>/vendor/maplibre-gl-worker.mjs')`; este
 * script emite el worker empaquetado (con `maplibre-gl-shared.mjs` en línea)
 * en la versión exacta instalada en node_modules.
 */
import { mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildSync } from 'esbuild';

const root = fileURLToPath(new URL('..', import.meta.url));
const dist = join(root, 'node_modules', 'maplibre-gl', 'dist');
const out = join(root, 'static', 'vendor');

const version = JSON.parse(
  readFileSync(join(root, 'node_modules', 'maplibre-gl', 'package.json'), 'utf8')
).version;

mkdirSync(out, { recursive: true });
// Worker en UN solo fichero: el split worker.mjs → shared.mjs obliga a una
// segunda descarga serie (worker no comparte la caché HTTP del documento,
// medido: 2×118 KB). Bundle ESM vía esbuild (ya presente con vite).
buildSync({
  entryPoints: [join(dist, 'maplibre-gl-worker.mjs')],
  bundle: true,
  format: 'esm',
  minify: true,
  outfile: join(out, 'maplibre-gl-worker.mjs')
});
console.log(`maplibre-gl worker ${version} copiado a static/vendor/ (bundle único)`);
