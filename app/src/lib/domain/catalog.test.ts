import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  loadCatalog,
  loadMunicipalities,
  loadMetrics,
  clearMetricsCache,
  checkCatalogFile,
  checkMunicipalityList,
  checkMetricsFile
} from './catalog';

/**
 * RT-20 — HTTP 200 + JSON parseable no prueban contenido. Los artefactos
 * que alimentan la vista pasan validación de frontera con MOTIVO de rechazo
 * (`<label> schema: <motivo>`), igual que el callejero:
 *   - tipos, números finitos y rangos;
 *   - estructura de cada fila de dist/cum (nada de [null]);
 *   - constantes obligatorias + coherencias C-01…C-06 que consume metrics.ts;
 *   - orden ascendente por año (cumAt hace `break`).
 */
const okJson = (body: unknown) =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });

const fetchMock = vi.fn();

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock);
  clearMetricsCache();
  fetchMock.mockReset();
});

afterEach(() => vi.unstubAllGlobals());

const CATALOG = {
  snapshot_year: 2026,
  campaigns: [
    {
      year: 1956,
      source: 'bizkaia',
      nominal_year: 1956,
      flight_range: null,
      verified_image: true,
      layer: null,
      preview: null
    }
  ],
  provenance: { primary: 'Open Data Bizkaia', complementary: 'geoEuskadi' }
};

const MUNIS = {
  municipalities: [
    {
      slug: 'bilbao',
      cod: 20,
      name: 'Bilbao',
      lat: 43.26,
      lon: -2.93,
      bbox: [-2.95, 43.24, -2.9, 43.3],
      buildings: 1000
    }
  ]
};

/** Métricas mínimas COHERENTES: c01 = c02+unknown+susp+inv, Σdist = c02,
 *  último cum = c02, orden ascendente y coverage ≈ c02/c01. */
const METRICS = {
  municipality: { codigo_mun: 20, slug: 'bilbao', name: 'Bilbao' },
  snapshot_year: 2026,
  contracts_version: 'DATA_SEMANTICS.md §11',
  constants: {
    c01: 100,
    c02: 90,
    unknown: 5,
    suspicious: 3,
    invalid: 2,
    invalid_geom: 0,
    coverage_pct: 90,
    c06: 1000,
    min_year: 1900,
    max_year: 2000,
    heaping_05_pct: 10
  },
  dist: [{ y: 1990, n: 90 }],
  cum: [{ y: 1990, cum_buildings: 90, cum_footprint_area: 1000 }],
  decades: [{ bucket: '1990', n: 90 }],
  no_year_count: 10
};

describe('fetchJson con validación de frontera (RT-20)', () => {
  it('catalog válido pasa', async () => {
    fetchMock.mockResolvedValueOnce(okJson(CATALOG));
    await expect(loadCatalog()).resolves.toMatchObject({ snapshot_year: 2026 });
  });

  it('catalog sin campaigns → schema', async () => {
    fetchMock.mockResolvedValueOnce(okJson({ snapshot_year: 2026 }));
    await expect(loadCatalog()).rejects.toThrow('catalog schema');
  });

  it('catalog con campaña sin source válida → schema', async () => {
    fetchMock.mockResolvedValueOnce(
      okJson({ ...CATALOG, campaigns: [{ ...CATALOG.campaigns[0], source: 'x' }] })
    );
    await expect(loadCatalog()).rejects.toThrow('catalog schema');
  });

  it('municipalities válido pasa', async () => {
    fetchMock.mockResolvedValueOnce(okJson(MUNIS));
    await expect(loadMunicipalities()).resolves.toHaveLength(1);
  });

  it('municipalities sin array → schema', async () => {
    fetchMock.mockResolvedValueOnce(okJson({ municipalities: 'no' }));
    await expect(loadMunicipalities()).rejects.toThrow('municipalities schema');
  });

  it('municipality sin bbox/buildings → schema', async () => {
    fetchMock.mockResolvedValueOnce(
      okJson({ municipalities: [{ slug: 'x', cod: 1, name: 'X', lat: 1, lon: 1 }] })
    );
    await expect(loadMunicipalities()).rejects.toThrow('municipalities schema');
  });

  it('metrics válido pasa', async () => {
    fetchMock.mockResolvedValueOnce(okJson(METRICS));
    await expect(loadMetrics('metrics/x.json')).resolves.toMatchObject({ snapshot_year: 2026 });
  });

  it('metrics sin constants → schema', async () => {
    fetchMock.mockResolvedValueOnce(okJson({ snapshot_year: 2026 }));
    await expect(loadMetrics('metrics/x.json')).rejects.toThrow('metrics schema');
  });

  it('HTTP error sigue siendo error etiquetado', async () => {
    fetchMock.mockResolvedValueOnce(new Response('', { status: 404 }));
    await expect(loadCatalog()).rejects.toThrow('catalog 404');
  });
});

describe('RT-20 · contraejemplos de la revisión (deben rechazarse)', () => {
  it('contraejemplo 1: constants incompleto + dist/cum con null → rechazado', () => {
    const bad = { snapshot_year: 2026, constants: { c02: 90 }, dist: [null], cum: [null] };
    const why = checkMetricsFile(bad);
    expect(why).toBeTruthy();
    expect(why).toMatch(/constants|dist\[0\]|contracts_version|municipality/);
  });

  it('fila null aislada (resto válido) → rechazado por dist[0]', () => {
    const why = checkMetricsFile({ ...METRICS, dist: [null], cum: [{ ...METRICS.cum[0] }] });
    expect(why).toMatch(/dist\[0\]/);
  });

  it('contraejemplo 2: constants incompletas + arrays vacíos con c02>0 → rechazado', () => {
    const why = checkMetricsFile({ ...METRICS, constants: { c02: 90 }, dist: [], cum: [] });
    expect(why).toBeTruthy();
  });

  it('tipos incorrectos: y de texto y n null → rechazado', () => {
    expect(checkMetricsFile({ ...METRICS, dist: [{ y: 'x', n: null }] })).toMatch(
      /dist\[0\]\.y|dist\[0\]\.n/
    );
  });

  it('constante no numérica (NaN disfrazado) → rechazado', () => {
    const m = JSON.parse(JSON.stringify(METRICS));
    m.constants.c02 = NaN;
    expect(checkMetricsFile(m)).toMatch(/constants\.c02|c01 ≠|suma/);
  });

  it('orden descendente en cum → rechazado (cumAt hace break)', () => {
    const why = checkMetricsFile({
      ...METRICS,
      dist: [
        { y: 1980, n: 40 },
        { y: 1990, n: 50 }
      ],
      cum: [
        { y: 1990, cum_buildings: 90, cum_footprint_area: 1000 },
        { y: 1980, cum_buildings: 40, cum_footprint_area: 500 }
      ]
    });
    expect(why).toMatch(/fuera de orden/);
  });

  it('coherencia rota: Σdist ≠ c02 → rechazado', () => {
    const why = checkMetricsFile({ ...METRICS, dist: [{ y: 1990, n: 3 }] });
    expect(why).toMatch(/suma\(dist\.n\)/);
  });

  it('coherencia rota: último cum ≠ c02 → rechazado', () => {
    const why = checkMetricsFile({
      ...METRICS,
      cum: [{ y: 1990, cum_buildings: 89, cum_footprint_area: 1000 }]
    });
    expect(why).toMatch(/cum\.cum_buildings/);
  });

  it('coherencia rota: c01 ≠ c02+unknown+suspicious+invalid → rechazado', () => {
    const m = JSON.parse(JSON.stringify(METRICS));
    m.constants.c01 = 999;
    expect(checkMetricsFile(m)).toMatch(/c01 ≠/);
  });
});

describe('RT-20 · recuperación tras respuesta inválida', () => {
  it('metrics: la caché no se envenena y la siguiente carga válida pasa', async () => {
    fetchMock
      .mockResolvedValueOnce(okJson({ garbage: true }))
      .mockResolvedValueOnce(okJson(METRICS));
    await expect(loadMetrics('metrics/rec.json')).rejects.toThrow(/metrics schema/);
    await expect(loadMetrics('metrics/rec.json')).resolves.toMatchObject({ snapshot_year: 2026 });
  });

  it('catálogo: tras un cuerpo inválido, la siguiente carga válida pasa', async () => {
    fetchMock
      .mockResolvedValueOnce(okJson({ snapshot_year: 2026 }))
      .mockResolvedValueOnce(okJson(CATALOG));
    await expect(loadCatalog()).rejects.toThrow(/catalog schema/);
    await expect(loadCatalog()).resolves.toMatchObject({ snapshot_year: 2026 });
  });
});

describe('RT-20 · barrido de los artefactos reales del snapshot', () => {
  const DATA = fileURLToPath(new URL('../../../static/data', import.meta.url));
  const read = (rel: string) => JSON.parse(readFileSync(`${DATA}/${rel}`, 'utf8'));

  it('catálogo real (37 campañas) pasa la frontera', () => {
    expect(checkCatalogFile(read('catalog.json'))).toBeNull();
  });

  it('los 112 municipios reales pasan la frontera', () => {
    const j = read('municipalities.json');
    expect(j.municipalities).toHaveLength(112);
    expect(checkMunicipalityList(j)).toBeNull();
  });

  it('las 112 métricas reales pasan la frontera', () => {
    const files = readdirSync(`${DATA}/metrics`).filter((f) => f.endsWith('.json'));
    expect(files).toHaveLength(112);
    const bad: Record<string, string> = {};
    for (const f of files) {
      const why = checkMetricsFile(read(`metrics/${f}`));
      if (why) bad[f] = why;
    }
    expect(bad).toEqual({});
  });

  it('fixture RT-04 (c02=0) es aceptado por la frontera: universo vacío válido', () => {
    const fixture = JSON.parse(
      readFileSync(
        fileURLToPath(new URL('../../../scripts/fixtures/rt04-metrics-zero.json', import.meta.url)),
        'utf8'
      )
    );
    expect(checkMetricsFile(fixture)).toBeNull();
    expect(fixture.constants.c02).toBe(0);
  });
});
