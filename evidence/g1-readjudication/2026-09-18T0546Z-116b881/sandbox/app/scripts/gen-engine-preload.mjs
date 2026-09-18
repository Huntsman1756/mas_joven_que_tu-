// Post-build: genera build/engine-preload.js con los chunks perezosos
// (import() dinámico) del bundle cliente. En deep links a RESULT (?place=…)
// el mapa es inevitable: modulepreload adelanta la descarga de MapLibre al
// parseo del HTML en vez de esperar a la evaluación del módulo de ruta
// (PERF4/PERF7). En el hero no se ejecuta nada (PERF1/PERF2 intactos).
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const immutable = join('build', '_app', 'immutable');
const nodesDir = join(immutable, 'nodes');

const lazy = new Set();
for (const f of readdirSync(nodesDir)) {
  if (!f.endsWith('.js')) continue;
  const src = readFileSync(join(nodesDir, f), 'utf8');
  for (const m of src.matchAll(/import\("\.\.\/chunks\/([A-Za-z0-9_-]+\.js)"\)/g)) {
    lazy.add(m[1]);
  }
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
