/**
 * Post-build SEO: ajusta canonical + og:url + og:title por página en el
 * HTML estático. Con ssr=false el svelte:head no llega al HTML servido:
 * app.html lleva el bloque canónico de la home y este script diferencia
 * las demás páginas. Determinista: se ejecuta dentro de `npm run build`.
 */
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const BUILD = fileURLToPath(new URL('../build', import.meta.url));
const ORIGIN = 'https://huntsman1756.github.io/mas_joven_que_tu-';

const PAGES = [
  {
    file: 'como-lo-sabemos.html',
    url: `${ORIGIN}/como-lo-sabemos`,
    title: 'Cómo lo sabemos — Más joven que tú'
  }
];

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
