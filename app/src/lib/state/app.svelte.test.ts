import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { app } from './app.svelte';
import type { MetricsFile, Place } from '../domain/types';

const P_LEIOA: Place = {
  slug: 'leioa',
  cod: 54,
  name: 'Leioa',
  lat: 43.22,
  lon: -2.99,
  bbox: [-3.05, 43.19, -2.95, 43.25],
  buildings: 100,
};
const P_GETXO: Place = {
  slug: 'getxo',
  cod: 44,
  name: 'Getxo',
  lat: 43.35,
  lon: -3.01,
  bbox: [-3.08, 43.31, -2.97, 43.39],
  buildings: 200,
};

function metricsFor(slug: string): MetricsFile {
  return {
    municipality: { codigo_mun: 1, slug, name: slug },
    snapshot_year: 2026,
    contracts_version: 'test',
    constants: {
      c01: 10,
      c02: 9,
      unknown: 1,
      suspicious: 0,
      invalid: 0,
      invalid_geom: 0,
      coverage_pct: 90,
      c06: 1000,
      min_year: 1900,
      max_year: 2020,
      heaping_05_pct: 0,
    },
    cum: [{ y: 2000, cum_buildings: 5, cum_footprint_area: 500 }],
    dist: [],
    decades: [],
    no_year_count: 1,
  };
}

function okJson(body: unknown) {
  return { ok: true, status: 200, json: async () => body } as Response;
}

describe('AppState — máquina de fases (G1-R I-3/I-5)', () => {
  beforeEach(() => {
    app.reset();
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        const slug = url.match(/metrics\/([a-z-]+)\.json/)?.[1];
        if (!slug) return { ok: false, status: 404 } as Response;
        return okJson(metricsFor(slug));
      })
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('seleccionar otro lugar desde RESULT no rebota a intro', async () => {
    app.year = 1990;
    await app.resolvePlace(P_LEIOA);
    app.phase = 'result';
    await app.resolvePlace(P_GETXO);
    expect(app.phase).toBe('result');
    expect(app.place?.slug).toBe('getxo');
    expect(app.metrics?.municipality.slug).toBe('getxo');
  });

  it('resolvePlace deja métricas en null mientras carga pero conserva la fase', async () => {
    let release!: (r: Response) => void;
    vi.stubGlobal(
      'fetch',
      vi.fn(
        () =>
          new Promise<Response>((res) => {
            release = res;
          })
      )
    );
    app.year = 1990;
    app.phase = 'result';
    const p = app.resolvePlace(P_GETXO);
    expect(app.phase).toBe('result');
    expect(app.metrics).toBeNull();
    release(okJson(metricsFor('getxo')));
    await p;
    expect(app.metrics?.municipality.slug).toBe('getxo');
  });

  it('last-write-wins: una respuesta antigua no sobrescribe el lugar nuevo', async () => {
    const resolvers: Record<string, (r: Response) => void> = {};
    vi.stubGlobal(
      'fetch',
      vi.fn(
        (input: RequestInfo | URL) =>
          new Promise<Response>((res) => {
            const slug = String(input).match(/metrics\/([a-z-]+)\.json/)?.[1] ?? 'x';
            resolvers[slug] = res;
          })
      )
    );
    const pA = app.resolvePlace(P_LEIOA);
    const pB = app.resolvePlace(P_GETXO);
    resolvers.getxo(okJson(metricsFor('getxo')));
    await pB;
    resolvers.leioa(okJson(metricsFor('leioa')));
    await pA;
    expect(app.place?.slug).toBe('getxo');
    expect(app.metrics?.municipality.slug).toBe('getxo');
  });

  it('fallo de carga → metricsError; ensureMetrics reintenta', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: false, status: 500 }) as Response)
    );
    await app.resolvePlace(P_LEIOA);
    expect(app.metrics).toBeNull();
    expect(app.metricsError).toBe(true);

    vi.stubGlobal(
      'fetch',
      vi.fn(async () => okJson(metricsFor('leioa')))
    );
    await app.ensureMetrics();
    expect(app.metrics?.municipality.slug).toBe('leioa');
    expect(app.metricsError).toBe(false);
  });

  it('reset vuelve a intro e invalida cargas en vuelo', async () => {
    let release!: (r: Response) => void;
    vi.stubGlobal(
      'fetch',
      vi.fn(
        () =>
          new Promise<Response>((res) => {
            release = res;
          })
      )
    );
    app.phase = 'result';
    const p = app.resolvePlace(P_LEIOA);
    app.reset();
    release(okJson(metricsFor('leioa')));
    await p;
    expect(app.phase).toBe('intro');
    expect(app.metrics).toBeNull();
  });
});
