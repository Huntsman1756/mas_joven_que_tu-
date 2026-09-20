// Post-build: genera build/engine-preload.js con los chunks perezosos
// (import() dinámico) del bundle cliente. En deep links a RESULT (?place=…)
// el mapa es inevitable: modulepreload adelanta la descarga de MapLibre al
// parseo del HTML en vez de esperar a la evaluación del módulo de ruta
// (PERF4/PERF7). En el hero no se ejecuta nada (PERF1/PERF2 intactos).
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

// PERF4-R: tras el lazy-loading de L3/L4, el manifiesto contiene entradas
// dinámicas que NO son el motor de mapa (depth, dominios de profundidad…).
// Preloadar esas sería modulepreload encubierto de profundidad: prohibido.
// La precarga se limita a las entradas dinámicas del motor de mapa — el
// mismo conjunto que encontraba el escaneo de nodes/ en f869de0.
const ENGINE_SRCS = new Set([
  'node_modules/maplibre-gl/dist/maplibre-gl.mjs',
  'node_modules/pmtiles/dist/esm/index.js'
]);

const manifestPath = join('.svelte-kit', 'output', 'client', '.vite', 'manifest.json');
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));

const lazy = new Set();
for (const [key, entry] of Object.entries(manifest)) {
  if (!entry.isDynamicEntry) continue;
  const src = entry.src ?? key;
  if (ENGINE_SRCS.has(src)) lazy.add(entry.file.split('/').pop());
}

if (lazy.size === 0) {
  console.error('gen-engine-preload: no se encontraron chunks perezosos');
  process.exit(1);
}

const body = `// Generado por scripts/gen-engine-preload.mjs — no editar.
try {
  if (new URLSearchParams(location.search).has('place')) {
    for (const f of ${JSON.stringify([...lazy])}) {
      const l = document.createElement('link');
      l.rel = 'modulepreload';
      l.fetchPriority = 'high';
      l.href = new URL('./_app/immutable/chunks/' + f, location.href);
      document.head.appendChild(l);
    }
  }
} catch (e) { /* la precarga es oportunista; nunca debe romper el boot */ }
`;

writeFileSync(join('build', 'engine-preload.js'), body);
console.log(`engine-preload.js: ${lazy.size} chunks perezosos → ${[...lazy].join(', ')}`);
