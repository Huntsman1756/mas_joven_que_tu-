/**
 * Huella del candidato mientras el working tree está sucio (FASE B.1).
 *
 * El SHA de HEAD NO identifica por sí solo el código probado cuando hay
 * cambios sin commitear; `+dirty(n)` solo cuenta entradas. Esta huella
 * identifica el conjunto real:
 *   - source_sha256: SHA-256 sobre «ruta\0sha256(contenido)» de las FUENTES
 *     que definen el candidato (src, scripts de app, static, pipeline,
 *     scripts raíz, workflows y configuración) — sin evidence/ ni docs/
 *     (no afectan al build);
 *   - build_sha256: ídem sobre app/build/** (el artefacto servido);
 *   - build_stamp: el meta mjt:build del HTML (debe ser `sha` limpio para
 *     ser publicable; `+dirty(n)` = NO publicable).
 *
 * Salida: evidence/red-team-2026/fingerprint.json (o LAUNCH/FINGERPRINT_OUT)
 * Uso: node scripts/fingerprint_candidate.mjs [--root DIR] [--build DIR] [--out FILE]
 *      (--build/--out permiten huellar un artefacto arbitrario, p. ej. el
 *      build sintético del ensayo de publicación)
 */
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve, relative, sep } from 'node:path';

const arg = (flag) => {
  const i = process.argv.indexOf(flag);
  return i > 0 ? process.argv[i + 1] : null;
};
const ROOT = resolve(arg('--root') || resolve(import.meta.dirname, '..'));
const BUILD_DIR = resolve(arg('--build') || join(ROOT, 'app/build'));
const OUT =
  process.env.FINGERPRINT_OUT ||
  arg('--out') ||
  join(ROOT, 'evidence/red-team-2026/fingerprint.json');

const SOURCE_ROOTS = [
  'app/src',
  'app/scripts',
  'app/static',
  'app/package.json',
  'app/package-lock.json',
  'app/svelte.config.js',
  'app/vite.config.ts',
  'app/tsconfig.json',
  'app/eslint.config.js',
  'pipeline',
  'scripts',
  '.github',
  'AGENTS.md',
  'README.md'
];

function walk(abs) {
  const st = statSync(abs, { throwIfNoEntry: false });
  if (!st) return [];
  if (st.isFile()) return [abs];
  const out = [];
  for (const name of readdirSync(abs)) {
    if (name === 'node_modules' || name === '.svelte-kit' || name === '__pycache__') continue;
    out.push(...walk(join(abs, name)));
  }
  return out;
}

function treeHash(absFiles, base) {
  const lines = [];
  const sorted = absFiles.map((f) => relative(base, f)).sort();
  for (const rel of sorted) {
    const h = createHash('sha256').update(readFileSync(join(base, rel))).digest('hex');
    lines.push(`${rel.replace(/\\/g, '/')}\0${h}`);
  }
  const digest = createHash('sha256').update(lines.join('\n')).digest('hex');
  return { sha256: digest, files: lines.length };
}

const sourceFiles = SOURCE_ROOTS.flatMap((r) => walk(join(ROOT, r)));
const buildFiles = walk(BUILD_DIR);

const source = treeHash(sourceFiles, ROOT);
const build = treeHash(buildFiles, BUILD_DIR);

let stamp = 'unknown';
try {
  stamp =
    /mjt:build"\s+content="([^"]+)"/.exec(readFileSync(join(BUILD_DIR, 'index.html'), 'utf8'))
      ?.[1] ?? 'unknown';
} catch {
  /* sin build */
}

const report = {
  utc: new Date().toISOString(),
  what:
    'Huella del candidato con working tree sucio: fuente real (no HEAD) + artefacto servido. Un build con sello `+dirty` o `unknown` NO es publicable.',
  source: { ...source, roots: SOURCE_ROOTS },
  build: { ...build, root: BUILD_DIR },
  build_stamp: stamp,
  publishable_stamp: /^\b[0-9a-f]{40}$/.test(stamp),
  note: 'source_sha256 identifica los ficheros de fuentes incluidos en la huella; build_sha256 identifica los BYTES del artefacto presente. La correspondencia fuente→build NO la demuestra este script: depende del proceso de construcción/verificación registrado (VERIFICATION.md). publishable_stamp solo acredita el FORMATO del sello (sha limpio), no la aprobación completa del candidato.'
};

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(report, null, 1));
console.log(`source: ${source.sha256.slice(0, 16)}… (${source.files} ficheros)`);
console.log(`build : ${build.sha256.slice(0, 16)}… (${build.files} ficheros)`);
console.log(`stamp : ${stamp} publicable=${report.publishable_stamp}`);
console.log('→', OUT);
