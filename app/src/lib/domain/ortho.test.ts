import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { nearestCampaign, probeCampaign, type Campaign } from './ortho';

const LIST: Campaign[] = [
  { year: 1956, source: 'bizkaia', flightRange: '1956-1957', verified: true },
  { year: 1983, source: 'bizkaia', flightRange: null, verified: true },
  { year: 1990, source: 'bizkaia', flightRange: null, verified: false },
  { year: 2002, source: 'bizkaia', flightRange: null, verified: true },
  { year: 2025, source: 'geoeuskadi', flightRange: '2025', verified: true }
];

describe('nearestCampaign (C-11)', () => {
  it('1987 → 1990 (no 1983)', () => {
    expect(nearestCampaign(LIST, 1987)?.year).toBe(1990);
  });
  it('empate → campaña anterior', () => {
    // 1986.5 empataría; usamos 1987 → 1990 (3) vs 1983 (4): gana 1990
    expect(nearestCampaign(LIST, 1986)?.year).toBe(1983);
  });
  it('extremos', () => {
    expect(nearestCampaign(LIST, 1900)?.year).toBe(1956);
    expect(nearestCampaign(LIST, 2026)?.year).toBe(2025);
  });
});

const BIZ: Campaign = { year: 2002, source: 'bizkaia', flightRange: null, verified: true };

function imgRes(body: Uint8Array | string, status = 200, type = 'image/jpeg') {
  const bytes = typeof body === 'string' ? new TextEncoder().encode(body) : body;
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (k: string) => (k.toLowerCase() === 'content-type' ? type : null) },
    blob: async () => new Blob([bytes as BlobPart], { type }),
    text: async () => (typeof body === 'string' ? body : new TextDecoder().decode(bytes))
  } as unknown as Response;
}

/** Stub mínimo del pipeline de decodificación: `pixels` es RGBA plano. */
function stubImageDecoder(pixels: number[]) {
  vi.stubGlobal(
    'createImageBitmap',
    vi.fn(async () => ({ width: 8, height: 8, close() {} }))
  );
  vi.stubGlobal('document', {
    createElement: () => ({
      width: 0,
      height: 0,
      getContext: () => ({
        drawImage() {},
        getImageData: () => ({ data: new Uint8ClampedArray(pixels) })
      })
    })
  });
}

describe('probeCampaign — ciclo de vida acotado (G1-R U2/I-6/I-8/I-13)', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('HTTP 404 → NOT_COVERED', async () => {
    vi.mocked(fetch).mockResolvedValue(imgRes('', 404, 'text/plain'));
    expect(await probeCampaign(BIZ, -2.99, 43.22)).toBe('NOT_COVERED');
  });

  it('HTTP 5xx → SERVICE_ERROR', async () => {
    vi.mocked(fetch).mockResolvedValue(imgRes('', 503, 'text/plain'));
    expect(await probeCampaign(BIZ, -2.99, 43.22)).toBe('SERVICE_ERROR');
  });

  it('200 con XML ServiceException → SERVICE_ERROR', async () => {
    vi.mocked(fetch).mockResolvedValue(
      imgRes(
        '<?xml version="1.0"?><ServiceExceptionReport><ServiceException>bad layer</ServiceException>',
        200,
        'text/xml'
      )
    );
    expect(await probeCampaign(BIZ, -2.99, 43.22)).toBe('SERVICE_ERROR');
  });

  it('timeout → SERVICE_ERROR (no spinner infinito)', async () => {
    vi.mocked(fetch).mockImplementation((_u, init) => {
      return new Promise((_res, rej) => {
        init?.signal?.addEventListener('abort', () =>
          rej(new DOMException('timed out', 'TimeoutError'))
        );
      }) as Promise<Response>;
    });
    expect(await probeCampaign(BIZ, -2.99, 43.22, { timeoutMs: 20 })).toBe('SERVICE_ERROR');
  });

  it('abort externo propaga AbortError', async () => {
    const ctl = new AbortController();
    vi.mocked(fetch).mockImplementation((_u, init) => {
      return new Promise((_res, rej) => {
        init?.signal?.addEventListener('abort', () =>
          rej(new DOMException('aborted', 'AbortError'))
        );
      }) as Promise<Response>;
    });
    const p = probeCampaign(BIZ, -2.99, 43.22, { signal: ctl.signal });
    ctl.abort();
    await expect(p).rejects.toThrow('aborted');
  });

  it('imagen con >1 color → AVAILABLE', async () => {
    stubImageDecoder([10, 10, 10, 255, 200, 30, 30, 255]);
    vi.mocked(fetch).mockResolvedValue(imgRes(new Uint8Array(5000).fill(7)));
    expect(await probeCampaign(BIZ, -2.99, 43.22)).toBe('AVAILABLE');
  });

  it('imagen blanca/monocroma → SERVICE_ERROR (no es cobertura real)', async () => {
    stubImageDecoder([255, 255, 255, 255, 255, 255, 255, 255]);
    vi.mocked(fetch).mockResolvedValue(imgRes(new Uint8Array(5000).fill(7)));
    expect(await probeCampaign(BIZ, -2.99, 43.22)).toBe('SERVICE_ERROR');
  });

  it('imagen grande pero monocroma → SERVICE_ERROR (tamaño no prueba contenido)', async () => {
    stubImageDecoder([0, 0, 0, 255, 0, 0, 0, 255]);
    vi.mocked(fetch).mockResolvedValue(imgRes(new Uint8Array(50000).fill(7)));
    expect(await probeCampaign(BIZ, -2.99, 43.22)).toBe('SERVICE_ERROR');
  });
});
