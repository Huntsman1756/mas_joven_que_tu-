import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { searchPlace } from './nora';
import type { MunicipalityCatalogItem } from './types';

const LEIOA: MunicipalityCatalogItem = {
  slug: 'leioa',
  cod: 54,
  name: 'Leioa',
  lat: 43.22,
  lon: -2.99,
  bbox: [-3.05, 43.19, -2.95, 43.25],
  buildings: 100
};
const CATALOG = [LEIOA];

function noraRes(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body
  } as Response;
}

describe('searchPlace — estados NORA (G1-R U3/I-4)', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('HTTP 204 (sin resultados) → NO_RESULTS, no NETWORK_ERROR', async () => {
    vi.mocked(fetch).mockResolvedValue(noraRes(null, 204));
    const r = await searchPlace('zzzzz', CATALOG);
    expect(r.state).toBe('NO_RESULTS');
  });

  it('HTTP 204 con candidato local → RESULTS (el catálogo local manda)', async () => {
    vi.mocked(fetch).mockResolvedValue(noraRes(null, 204));
    const r = await searchPlace('leioa', CATALOG);
    expect(r.state).toBe('RESULTS');
    expect(r.local).toHaveLength(1);
  });

  it('200 con lista vacía → NO_RESULTS', async () => {
    vi.mocked(fetch).mockResolvedValue(noraRes({ list: [] }));
    const r = await searchPlace('zzzzz', CATALOG);
    expect(r.state).toBe('NO_RESULTS');
  });

  it('200 con solo resultados fuera de Bizkaia → OUT_OF_SCOPE', async () => {
    vi.mocked(fetch).mockResolvedValue(
      noraRes({ list: [{ municipioId: '1', descMunicipio: 'X', provinciaId: '20' }] })
    );
    const r = await searchPlace('zzzzz', CATALOG);
    expect(r.state).toBe('OUT_OF_SCOPE');
    expect(r.noraCount).toBe(1);
  });

  it('200 con resultado de Bizkaia → RESULTS', async () => {
    vi.mocked(fetch).mockResolvedValue(
      noraRes({ list: [{ municipioId: '54', descMunicipio: 'Leioa', provinciaId: '48' }] })
    );
    const r = await searchPlace('zzzzz', CATALOG);
    expect(r.state).toBe('RESULTS');
    expect(r.noraBizkaia).toBe(1);
  });

  it('200 con payload malformado → NETWORK_ERROR (no NO_RESULTS)', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => {
        throw new SyntaxError('bad json');
      }
    } as unknown as Response);
    const r = await searchPlace('zzzzz', CATALOG);
    expect(r.state).toBe('NETWORK_ERROR');
  });

  it('HTTP 5xx → NETWORK_ERROR', async () => {
    vi.mocked(fetch).mockResolvedValue(noraRes(null, 500));
    const r = await searchPlace('zzzzz', CATALOG);
    expect(r.state).toBe('NETWORK_ERROR');
  });

  it('error de transporte → NETWORK_ERROR', async () => {
    vi.mocked(fetch).mockRejectedValue(new TypeError('fetch failed'));
    const r = await searchPlace('zzzzz', CATALOG);
    expect(r.state).toBe('NETWORK_ERROR');
  });

  it('error de transporte con candidato local → RESULTS (degradado)', async () => {
    vi.mocked(fetch).mockRejectedValue(new TypeError('fetch failed'));
    const r = await searchPlace('leioa', CATALOG);
    expect(r.state).toBe('RESULTS');
  });

  it('abort propaga (no se convierte en NETWORK_ERROR)', async () => {
    vi.mocked(fetch).mockRejectedValue(new DOMException('aborted', 'AbortError'));
    await expect(searchPlace('zzzzz', CATALOG)).rejects.toThrow('aborted');
  });

  it('<3 caracteres → TOO_SHORT sin red', async () => {
    const r = await searchPlace('le', CATALOG);
    expect(r.state).toBe('TOO_SHORT');
    expect(fetch).not.toHaveBeenCalled();
  });

  it('timeout de NORA → NETWORK_ERROR (SEARCHING no es eterno, U2)', async () => {
    vi.mocked(fetch).mockImplementation((_u, init) => {
      return new Promise((_res, rej) => {
        init?.signal?.addEventListener('abort', () =>
          rej(new DOMException('timed out', 'TimeoutError'))
        );
      }) as Promise<Response>;
    });
    const r = await searchPlace('zzzzz', CATALOG, undefined, 20);
    expect(r.state).toBe('NETWORK_ERROR');
  });

  it('timeout de NORA con candidato local → RESULTS degradado', async () => {
    vi.mocked(fetch).mockImplementation((_u, init) => {
      return new Promise((_res, rej) => {
        init?.signal?.addEventListener('abort', () =>
          rej(new DOMException('timed out', 'TimeoutError'))
        );
      }) as Promise<Response>;
    });
    const r = await searchPlace('leioa', CATALOG, undefined, 20);
    expect(r.state).toBe('RESULTS');
  });
});
