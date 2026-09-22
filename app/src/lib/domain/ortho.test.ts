import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  nearestCampaign,
  probeCampaign,
  milestoneCampaigns,
  milestoneCaption,
  flightSuffix,
  defaultSwipeBefore,
  type Campaign
} from './ortho';
import { es } from '../i18n/es';
import { eu } from '../i18n/eu';

const PREV = {
  url: 'data/ortho-previews/1990.jpg',
  bbox: [-3.45, 42.98, -2.41, 43.46] as [number, number, number, number]
};
const LIST: Campaign[] = [
  {
    year: 1956,
    source: 'bizkaia',
    flightRange: null,
    verified: true,
    layer: null,
    preview: PREV,
    coverageGaps: true
  },
  {
    year: 1983,
    source: 'bizkaia',
    flightRange: null,
    verified: true,
    layer: null,
    preview: PREV,
    coverageGaps: false
  },
  {
    year: 1990,
    source: 'bizkaia',
    flightRange: null,
    verified: false,
    layer: null,
    preview: PREV,
    coverageGaps: false
  },
  {
    year: 2002,
    source: 'bizkaia',
    flightRange: null,
    verified: true,
    layer: null,
    preview: PREV,
    coverageGaps: false
  },
  {
    year: 2025,
    source: 'geoeuskadi',
    flightRange: '2025-07-09/2025-08-04',
    verified: true,
    layer: 'ORTO_2025',
    preview: PREV,
    coverageGaps: false
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
  preview: PREV,
  coverageGaps: false
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

describe('milestoneCampaigns (G16)', () => {
  // LIST: 1956, 1983, 1990, 2002, 2025
  it('hitos → campaña real más cercana, siempre con «latest»', () => {
    const ms = milestoneCampaigns(LIST, 1980);
    // birth 1980→1983 · ten 1990→1990 · twenty 2000→2002 · latest 2025
    expect(ms.map((m) => m.id)).toEqual(['birth', 'ten', 'twenty', 'latest']);
    expect(ms.map((m) => m.c.year)).toEqual([1983, 1990, 2002, 2025]);
  });

  it('sin hitos futuros: el objetivo no puede superar la última campaña', () => {
    const ms = milestoneCampaigns(LIST, 2010);
    // birth→2002; ten 2020→2025; twenty 2030 > 2025 → fuera;
    // «latest» cae en 2025, ya cubierto por «ten» → dedup
    expect(ms.map((m) => m.id)).toEqual(['birth', 'ten']);
    expect(ms.map((m) => m.c.year)).toEqual([2002, 2025]);
  });

  it('dedup por campaña: el mismo año no aparece dos veces', () => {
    const ms = milestoneCampaigns(LIST, 2010);
    const years = ms.map((m) => m.c.year);
    expect(new Set(years).size).toBe(years.length);
    // «ten» ya cogió 2025 → «latest» no se repite
    expect(ms.filter((m) => m.c.year === 2025)).toHaveLength(1);
  });

  it('nacido justo en la última campaña → todo colapsa en una', () => {
    const ms = milestoneCampaigns(LIST, 2025);
    expect(ms).toHaveLength(1);
    expect(ms[0].id).toBe('birth');
  });

  it('sin año o sin catálogo → sin hitos', () => {
    expect(milestoneCampaigns(LIST, null)).toEqual([]);
    expect(milestoneCampaigns([], 1980)).toEqual([]);
  });
});

describe('defaultSwipeBefore (G16)', () => {
  const after2025 = LIST[LIST.length - 1];
  it('con año personal → la más cercana que no sea la «después»', () => {
    expect(defaultSwipeBefore(LIST, 1980, after2025)?.year).toBe(1983);
  });
  it('año personal = «después» → la inmediatamente anterior', () => {
    expect(defaultSwipeBefore(LIST, 2025, after2025)?.year).toBe(2002);
  });
  it('sin año personal → la anterior a la «después»', () => {
    expect(defaultSwipeBefore(LIST, null, after2025)?.year).toBe(2002);
  });
  it('«después» distinta de la última → excluida de los candidatos', () => {
    const after1983 = LIST[1];
    // nearest a 1990 sería 1990; la anterior a 1983 es 1956; la regla da
    // la más cercana al año personal excluyendo el «después»
    expect(defaultSwipeBefore(LIST, 1990, after1983)?.year).toBe(1990);
    expect(defaultSwipeBefore(LIST, null, after1983)?.year).toBe(1956);
  });
  it('nunca devuelve la misma campaña que «después»', () => {
    for (const c of LIST) {
      const b = defaultSwipeBefore(LIST, c.year, c);
      expect(b === null || b.year !== c.year).toBe(true);
    }
  });
});

// G16b — subtítulo de hito: año nominal de campaña ≠ fecha de vuelo.
// Si la fuente publica fecha real se muestra el intervalo; sin ella, la
// distancia al hito se calcula sobre el año nominal y se marca como tal.
describe('milestoneCaption (G16b)', () => {
  const C = (year: number, flightRange: string | null): Campaign => ({
    year,
    source: 'bizkaia',
    flightRange,
    verified: true,
    layer: null,
    preview: null,
    coverageGaps: false
  });
  const trOf = (d: Record<string, string>) => {
    return (k: string, p: Record<string, string | number> = {}) => {
      let s = d[k] ?? es[k] ?? `⟦${k}⟧`;
      for (const [kk, v] of Object.entries(p)) s = s.replaceAll(`{${kk}}`, String(v));
      return s;
    };
  };
  const trEs = trOf(es);
  const trEu = trOf(eu);

  it('caso real G16: nominal 1956, vuelo 1953–1955, nacimiento 1952 → intervalo, no «4 años después»', () => {
    const s = milestoneCaption(C(1956, 'entre 1953 y 1955, fecha exacta desconocida'), 1952, trEs);
    expect(s).toBe('Campaña 1956 (vuelo entre 1953 y 1955, fecha exacta desconocida)');
    expect(s).not.toMatch(/años? despu[eé]s|antes de tu nacimiento/);
  });

  it('intervalo de vuelo anterior al nacimiento → el intervalo, sin edad única', () => {
    const s = milestoneCaption(C(1945, '1945–1946 (vuelo americano)'), 1952, trEs);
    expect(s).toBe('Campaña 1945 (1945–1946 · vuelo americano)');
    expect(s).not.toMatch(/años/);
  });

  it('intervalo de vuelo posterior al nacimiento → el intervalo, sin edad única', () => {
    const s = milestoneCaption(C(2002, '2002-05-15/2002-09-30'), 1980, trEs);
    expect(s).toContain('vuelo');
    expect(s).not.toMatch(/años despu[eé]s/);
  });

  it('intervalo que cruza el nacimiento → se muestra el intervalo tal cual (no «antes» ni «después»)', () => {
    const s = milestoneCaption(C(1952, '1951–1953'), 1952, trEs);
    expect(s).toBe('Campaña 1952 (vuelo 1951–1953)');
  });

  it('sin fecha de vuelo → distancia al año NOMINAL marcada como nominal', () => {
    const s = milestoneCaption(C(1970, null), 1952, trEs);
    expect(s).toBe('Campaña 1970 · aprox. 18 años después de tu nacimiento · año nominal');
  });

  it('campaña muy alejada sin fecha → distancia grande, aún nominal', () => {
    const s = milestoneCaption(C(2025, null), 1952, trEs);
    expect(s).toContain('73 años');
    expect(s).toContain('año nominal');
  });

  it('sin año personal → solo nominal; con vuelo → solo el intervalo', () => {
    expect(milestoneCaption(C(1970, null), null, trEs)).toBe('Campaña 1970 · año nominal');
    expect(
      milestoneCaption(C(1956, 'entre 1953 y 1955, fecha exacta desconocida'), null, trEs)
    ).toBe('Campaña 1956 (vuelo entre 1953 y 1955, fecha exacta desconocida)');
  });

  it('EU: intervalo de vuelo localizado, sin edad', () => {
    const s = milestoneCaption(
      C(1956, 'entre 1953 y 1955, fecha exacta desconocida'),
      1952,
      trEu,
      'eu'
    );
    expect(s).toContain('kanpaina');
    expect(s).toContain('hegaldia');
    expect(s).not.toMatch(/urte .*g(?:ero|eroztik)/);
  });

  it('EU: sin fecha → nominal marcado', () => {
    const s = milestoneCaption(C(1970, null), 1952, trEu, 'eu');
    expect(s).toContain('urte nominala');
  });
});

describe('flightSuffix (formatos del catálogo)', () => {
  const trEs = (k: string, p: Record<string, string | number> = {}) => {
    let s = es[k] ?? `⟦${k}⟧`;
    for (const [kk, v] of Object.entries(p)) s = s.replaceAll(`{${kk}}`, String(v));
    return s;
  };
  const mk = (flightRange: string | null): Campaign => ({
    year: 2000,
    source: 'bizkaia',
    flightRange,
    verified: true,
    layer: null,
    preview: null,
    coverageGaps: false
  });
  it('sin fecha → sin sufijo', () => {
    expect(flightSuffix(mk(null), trEs)).toBe('');
  });
  it('«entre A y B, fecha exacta desconocida» → clave dedicada', () => {
    expect(flightSuffix(mk('entre 1953 y 1955, fecha exacta desconocida'), trEs)).toBe(
      ' (vuelo entre 1953 y 1955, fecha exacta desconocida)'
    );
  });
  it('rango ISO → fechas cortas localizadas', () => {
    expect(flightSuffix(mk('2023-04-10/2023-06-02'), trEs)).toMatch(/vuelo .+–.+/);
  });
  it('nota en prosa desconocida → verbatim (dato de fuente, no copy)', () => {
    expect(flightSuffix(mk('vuelo parcial primavera'), trEs)).toContain('vuelo parcial primavera');
  });
});
