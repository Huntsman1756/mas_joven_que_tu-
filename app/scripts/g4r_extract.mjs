// G4-R research: extrae strings i18n + forense de chunks del build (solo lectura)
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const src = readFileSync('src/lib/i18n/es.ts', 'utf8');
const re = /^\s*'([^']+)':\s*'((?:[^'\\]|\\.)*)'[,]?\s*$/gm;
const rows = [];
let m;
while ((m = re.exec(src))) {
  rows.push({ key: m[1], len: m[2].length, val: m[2].replace(/\s+/g, ' ').slice(0, 120) });
}
// multilinea: capturar claves con valor en la línea siguiente
const re2 = /^\s*'([^']+)':\s*$/gm;
const keys1 = new Set(rows.map((r) => r.key));
while ((m = re2.exec(src))) {
  if (!keys1.has(m[1])) {
    const after = src.slice(m.index).split('\n').slice(1, 4).join(' ');
    const mm = after.match(/^\s*'((?:[^'\\]|\\.)*)'/);
    rows.push({
      key: m[1],
      len: mm ? mm[1].length : 0,
      val: (mm?.[1] ?? '…multilínea').slice(0, 120)
    });
  }
}
writeFileSync(
  '../evidence/g4/research/copy-strings.json',
  JSON.stringify(
    rows.sort((a, b) => a.key.localeCompare(b.key)),
    null,
    1
  )
);
console.log('strings:', rows.length, '| >80c:', rows.filter((r) => r.len > 80).length);

// chunks del build
const dirs = [
  'build/_app/immutable/chunks',
  'build/_app/immutable/entry',
  'build/_app/immutable/nodes'
];
const chunks = [];
for (const d of dirs) {
  try {
    for (const f of readdirSync(d)) {
      const s = statSync(join(d, f));
      chunks.push({ dir: d.split('/').pop(), file: f, bytes: s.size });
    }
  } catch {
    // directorio ausente: el chunk simplemente no se contabiliza
  }
}
chunks.sort((a, b) => b.bytes - a.bytes);
writeFileSync('../evidence/g4/research/build-chunks.json', JSON.stringify(chunks, null, 1));
console.log(
  'chunks:',
  chunks.length,
  '| top:',
  chunks
    .slice(0, 5)
    .map((c) => `${c.file}:${(c.bytes / 1024).toFixed(0)}K`)
    .join(' ')
);
