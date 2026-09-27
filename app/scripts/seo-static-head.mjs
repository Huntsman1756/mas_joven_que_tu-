/**
 * Post-build SEO: ajusta canonical + og:url + og:title por página en el
 * HTML estático. Con ssr=false el svelte:head no llega al HTML servido:
 * app.html lleva el bloque canónico de la home y este script diferencia
 * las demás páginas. Determinista: se ejecuta dentro de `npm run build`.
 */
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const BUILD = fileURLToPath(new URL('../build', import.meta.url));
const ORIGIN = 'https://huntsman1756.github.io/mas_joven_que_tu-';

const PAGES = [
  {
    file: 'como-lo-sabemos.html',
    url: `${ORIGIN}/como-lo-sabemos`,
    title: 'Cómo lo sabemos — Más joven que tú'
  }
];

// Identidad del artefacto (RT-01): el HTML servido declara el SHA del
// árbol fuente que lo generó — la atribución build↔commit deja de depender
// del mensaje del commit de gh-pages. Un árbol con cambios sin commitar se
// marca `+dirty(n)`: el SHA solo NO describe entonces el código que corrió.
// Sin .git (tarball) queda 'unknown', nunca un valor fingido.
let BUILD_SHA = 'unknown';
try {
  BUILD_SHA = execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
  const porcelain = execSync('git status --porcelain', { encoding: 'utf8' }).trim();
  if (porcelain) {
    const n = porcelain.split('\n').length;
    BUILD_SHA = `${BUILD_SHA}+dirty(${n})`;
    console.warn(`seo-static-head: ¡árbol sucio! ${n} entradas sin commitear`);
  }
} catch {
  /* tarball/CI sin .git: el meta queda 'unknown', nunca un valor fingido */
}
const STAMP = `<meta name="mjt:build" content="${BUILD_SHA}" />`;

for (const htmlFile of ['index.html', 'como-lo-sabemos.html']) {
  const fp = `${BUILD}/${htmlFile}`;
  try {
    let html = await readFile(fp, 'utf8');
    if (html.includes('mjt:build')) {
      console.log(`seo-static-head: ${htmlFile} ya lleva sello`);
      continue;
    }
    html = html.replace('</head>', `  ${STAMP}
</head>`);
    await writeFile(fp, html);
  } catch {
    /* el archivo puede no existir en builds parciales */
  }
}
console.log(`seo-static-head: build ${BUILD_SHA}`);

for (const p of PAGES) {
  const path = `${BUILD}/${p.file}`;
  let html = await readFile(path, 'utf8');
  html = html
    .replace(/<link rel="canonical" href="[^"]*" \/>/, `<link rel="canonical" href="${p.url}" />`)
    .replace(
      /<meta property="og:url" content="[^"]*" \/>/,
      `<meta property="og:url" content="${p.url}" />`
    )
    .replace(
      /<meta property="og:title" content="[^"]*" \/>/,
      `<meta property="og:title" content="${p.title}" />`
    )
    .replace(
      /<meta name="twitter:title" content="[^"]*" \/>/,
      `<meta name="twitter:title" content="${p.title}" />`
    );
  await writeFile(path, html);
  console.log(`seo-static-head: ${p.file} → canonical ${p.url}`);
}
