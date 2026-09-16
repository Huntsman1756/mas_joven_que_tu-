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
  { municipioId: '20069', descMunicipio: 'Donostia', provinciaId: '20' },
];

export async function installLocalFixtures(page) {
  await page.route(/t17iApiRestWar\/rest\/v1\/municipios/, (route) => {
    const q =
      new URL(route.request().url()).searchParams.get('descMunicipio')?.toLowerCase() ?? '';
    const list = NORA_FIXTURE.filter((m) =>
      m.descMunicipio.toLowerCase().includes(q)
    );
    if (list.length === 0) {
      // NORA real responde 204 sin cuerpo cuando no hay resultados
      return route.fulfill({ status: 204, body: '' });
    }
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ list }),
    });
  });
}
