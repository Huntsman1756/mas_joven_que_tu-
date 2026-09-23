import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, resolve } from 'node:path';

/**
 * Fixtures locales para tests/harnesses (G1-R, VR4): ningún test puede depender
 * de un servicio vivo. NORA se sirve desde una tabla local determinista; la
 * ortofoto externa se caracteriza aparte (no participa en regresión visual).
 */
export const NORA_FIXTURE = [
  { municipioId: '48020', descMunicipio: 'Bilbao', provinciaId: '48' },
  { municipioId: '48054', descMunicipio: 'Leioa', provinciaId: '48' },
  // fuera de Bizkaia → estado OUT_OF_SCOPE en los tests de búsqueda
  { municipioId: '01059', descMunicipio: 'Vitoria-Gasteiz', provinciaId: '01' },
  { municipioId: '20069', descMunicipio: 'Donostia', provinciaId: '20' }
];

export async function installLocalFixtures(page) {
  await page.route(/t17iApiRestWar\/rest\/v1\/municipios/, (route) => {
    const q = new URL(route.request().url()).searchParams.get('descMunicipio')?.toLowerCase() ?? '';
    const list = NORA_FIXTURE.filter((m) => m.descMunicipio.toLowerCase().includes(q));
    if (list.length === 0) {
      // NORA real responde 204 sin cuerpo cuando no hay resultados
      return route.fulfill({ status: 204, body: '' });
    }
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ list })
    });
  });
}

/**
 * G11.3 — stubs de servicios externos de imagen para CI (CI_STUBS=1).
 *
 * Sirven un PNG 4×4 no uniforme (supera la sonda de contenido: ≥2
 * colores) para todo endpoint raster/WMS externo: teselas ORTO_BFA_* de
 * geo.bizkaia.eus, WMS_ORTOARGAZKIAK, export del mapa 1923-25 y el mapa
 * base KARTOGRAFIA de geo.euskadi.eus. Las peticiones se emiten igual —
 * los tests que cuentan requests o verifican estados AVAILABLE siguen
 * midiendo el comportamiento de la app, no la disponibilidad del
 * servicio. Lo que NO se prueba así es la integración real: eso queda en
 * las sondas dedicadas (g1r_*, probes manuales).
 */
export const STUB_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAIAAAAmkwkpAAAAGElEQVR4nGOQi1pwwkYDQjLAWUCSAacMANhzEiHeJC+aAAAAAElFTkSuQmCC',
  'base64'
);
const EXTERNAL_IMG = /^https:\/\/(geo\.bizkaia|www\.geo\.euskadi)\.eus\//;

const HERE = fileURLToPath(new URL('.', import.meta.url));
const BUILD_DATA = resolve(HERE, '../build/data');
const FIXTURE_DATA = join(HERE, 'fixtures', 'data');

/**
 * PMTiles en CI: `app/static/data/**.pmtiles` no se versiona (artefacto de
 * pipeline), así que en el runner el build no los tiene y el servidor sirve
 * el fallback index.html → los sources vectoriales fallan en silencio y la
 * capa `cells-fill` nunca renderiza. Los fixtures son bytes reales del
 * pipeline (subconjunto: celdas y municipios completos + edificios de los
 * municipios que ejercita la suite: Bilbao 020, Getxo 044, Leioa 054).
 *
 * Regla de precedencia: si el .pmtiles existe en `build/` se delega al
 * servidor real (`route.fallback`) — localmente los tests ejercitan el
 * artefacto fresco y una regresión de pipeline no queda enmascarada.
 * Se sirve con soporte Range (206) como producción; pmtiles-js lo exige.
 */
export async function installPmtilesFixtures(page) {
  await page.route(/\/data\/.+\.pmtiles/, (route) => {
    const rel = new URL(route.request().url()).pathname.replace(/^\/+/, '').slice('data/'.length);
    if (rel.includes('..')) return route.fulfill({ status: 400, body: 'bad request' });
    if (existsSync(join(BUILD_DATA, rel))) return route.fallback();
    const file = join(FIXTURE_DATA, rel);
    if (!existsSync(file)) return route.fulfill({ status: 404, body: 'not found' });
    const buf = readFileSync(file);
    const m = /^bytes=(\d*)-(\d*)$/.exec(route.request().headers()['range'] ?? '');
    if (m) {
      const start =
        m[1] === '' ? Math.max(0, buf.length - parseInt(m[2], 10)) : parseInt(m[1] || '0', 10);
      const end =
        m[2] === '' || m[1] === '' ? buf.length - 1 : Math.min(parseInt(m[2], 10), buf.length - 1);
      if (start > end) {
        return route.fulfill({
          status: 416,
          headers: { 'content-range': `bytes */${buf.length}` }
        });
      }
      return route.fulfill({
        status: 206,
        headers: {
          'content-type': 'application/octet-stream',
          'content-range': `bytes ${start}-${end}/${buf.length}`,
          'accept-ranges': 'bytes'
        },
        body: buf.subarray(start, end + 1)
      });
    }
    return route.fulfill({
      status: 200,
      contentType: 'application/octet-stream',
      headers: { 'accept-ranges': 'bytes' },
      body: buf
    });
  });
}

export async function installExternalStubs(page) {
  await installPmtilesFixtures(page);
  await page.route(EXTERNAL_IMG, (route) => {
    const url = route.request().url();
    // NORA (JSON) tiene su fixture propio; el resto es siempre imagen
    if (url.includes('t17iApiRestWar')) return route.fallback();
    return route.fulfill({
      status: 200,
      contentType: 'image/png',
      body: STUB_PNG
    });
  });
}

/** Fixtures completas: NORA local + imágenes externas stub (CI). */
export async function installCiFixtures(page) {
  await installLocalFixtures(page);
  await installExternalStubs(page);
}
