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
const STUB_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAIAAAAmkwkpAAAAGElEQVR4nGOQi1pwwkYDQjLAWUCSAacMANhzEiHeJC+aAAAAAElFTkSuQmCC',
  'base64'
);
const EXTERNAL_IMG = /^https:\/\/(geo\.bizkaia|www\.geo\.euskadi)\.eus\//;

export async function installExternalStubs(page) {
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
