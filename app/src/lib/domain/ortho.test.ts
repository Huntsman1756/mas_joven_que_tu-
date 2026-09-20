import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { nearestCampaign, probeCampaign, type Campaign } from './ortho';

const PREV = {
  url: 'data/ortho-previews/1990.jpg',
  bbox: [-3.45, 42.98, -2.41, 43.46] as [number, number, number, number]
};
const LIST: Campaign[] = [
  { year: 1956, source: 'bizkaia', flightRange: null, verified: true, layer: null, preview: PREV },
  { year: 1983, source: 'bizkaia', flightRange: null, verified: true, layer: null, preview: PREV },
  { year: 1990, source: 'bizkaia', flightRange: null, verified: false, layer: null, preview: PREV },
  { year: 2002, source: 'bizkaia', flightRange: null, verified: true, layer: null, preview: PREV },
  {
    year: 2025,
    source: 'geoeuskadi',
    flightRange: '2025-07-09/2025-08-04',
    verified: true,
    layer: 'ORTO_2025',
    preview: PREV
  }
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

const BIZ: Campaign = {
  year: 2002,
  source: 'bizkaia',
  flightRange: null,
  verified: true,
  layer: null,
  preview: PREV
};

describe('previewSourceDef (G1-R2)', () => {
  it('ImageSource georreferenciado con bbox [w,s,e,n] → esquinas TL,TR,BR,BL', async () => {
    const { previewSourceDef } = await import('./ortho');
    const d = previewSourceDef(BIZ);
    expect(d?.type).toBe('image');
    expect(d?.url).toBe('data/ortho-previews/1990.jpg');
    expect(d?.coordinates).toEqual([
      [-3.45, 43.46],
      [-2.41, 43.46],
      [-2.41, 42.98],
      [-3.45, 42.98]
    ]);
  });
  it('sin preview → null (la capa no se instancia)', async () => {
    const { previewSourceDef } = await import('./ortho');
    expect(previewSourceDef({ ...BIZ, preview: null })).toBeNull();
  });
  it('campaigns() mapea preview desde catalog.json y ordena por año', async () => {
    const { campaigns } = await import('./ortho');
    const list = campaigns({
      snapshot_year: 2026,
      campaigns: [
        {
          year: 1990,
          source: 'bizkaia',
          nominal_year: 1990,
          flight_range: null,
          verified_image: false,
          layer: null,
          preview: PREV
        },
        {
          year: 1956,
          source: 'bizkaia',
          nominal_year: 1956,
          flight_range: null,
          verified_image: true,
          layer: null,
          preview: PREV
        }
      ],
      provenance: { primary: 'x', complementary: 'y' }
    });
    expect(list.map((c) => c.year)).toEqual([1956, 1990]);
    expect(list[0].preview?.url).toBe('data/ortho-previews/1990.jpg');
  });
});

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
