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
const DEFAULT_SITE_URL = 'https://huntsman1756.github.io/mas_joven_que_tu-';
const site = new URL(process.env.SITE_URL || DEFAULT_SITE_URL);
if (site.protocol !== 'https:' || site.username || site.password || site.search || site.hash || /[&<>"']/.test(site.pathname)) {
  throw new Error('SITE_URL debe ser una URL HTTPS pública sin credenciales, query ni fragmento');
}
const ORIGIN = site.href.replace(/\/$/, '');
if (process.env.SITE_URL && site.pathname.replace(/\/$/, '') !== (process.env.BASE_PATH || '')) {
  throw new Error('La ruta de SITE_URL debe coincidir con BASE_PATH (vacío para dominio raíz)');
}

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
    const pageUrl = `${ORIGIN}/${htmlFile === 'index.html' ? '' : 'como-lo-sabemos'}`;
    html = html
      .replace(/(<link rel="canonical" href=")[^"]*/, `$1${pageUrl}`)
      .replace(/(<meta property="og:url" content=")[^"]*/, `$1${pageUrl}`)
      .replace(/(<meta\s+(?:property="og:image"|name="twitter:image")\s+content=")[^"]*/g, `$1${ORIGIN}/og-card.png`);
    if (html.includes('mjt:build')) {
      await writeFile(fp, html);
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

await writeFile(`${BUILD}/robots.txt`, `User-agent: *\nAllow: /\n\nSitemap: ${ORIGIN}/sitemap.xml\n`);
await writeFile(
  `${BUILD}/sitemap.xml`,
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url><loc>${ORIGIN}/</loc></url>\n  <url><loc>${ORIGIN}/como-lo-sabemos</loc></url>\n</urlset>\n`
);
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
