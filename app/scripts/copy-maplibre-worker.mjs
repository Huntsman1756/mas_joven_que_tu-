/**
 * Copia el Web Worker de MapLibre GL JS a `static/vendor/`.
 *
 * MapLibre v6 resuelve el worker como `new URL('./maplibre-gl-worker.mjs',
 * import.meta.url)`. Dentro de un chunk de Vite esa URL apunta a
 * `_app/immutable/chunks/` → 404 → el worker muere en silencio y las teselas
 * vectoriales quedan en estado `loading` para siempre (sin error visible).
 * La app fija `setWorkerUrl('<base>/vendor/maplibre-gl-worker.mjs')`; este
 * script garantiza que el fichero (y su dependencia `maplibre-gl-shared.mjs`,
 * que el worker importa con ruta relativa) existen en la versión exacta
 * instalada en node_modules.
 */
import { copyFileSync, mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const dist = join(root, 'node_modules', 'maplibre-gl', 'dist');
const out = join(root, 'static', 'vendor');

const version = JSON.parse(
  readFileSync(join(root, 'node_modules', 'maplibre-gl', 'package.json'), 'utf8')
).version;

mkdirSync(out, { recursive: true });
for (const f of ['maplibre-gl-worker.mjs', 'maplibre-gl-shared.mjs']) {
  copyFileSync(join(dist, f), join(out, f));
}
console.log(`maplibre-gl worker ${version} copiado a static/vendor/`);
