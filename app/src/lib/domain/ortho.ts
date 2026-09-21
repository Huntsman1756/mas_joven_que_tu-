import type { CatalogFile, OrthoState } from './types';

/**
 * Ortofotos oficiales (opt-in). Evidencia visual, no fuente de métricas.
 * Campañas Bizkaia (ArcGIS tile) y geoEuskadi (WMS 1.3.0), según catalog.json.
 */

const BIZKAIA_TILE =
  'https://geo.bizkaia.eus/arcgisserverinspire/rest/services/Kartografia_Cartografia/ORTO_BFA_{Y}/MapServer/tile/{z}/{y}/{x}';

export interface Campaign {
  year: number;
  source: 'bizkaia' | 'geoeuskadi';
  flightRange: string | null;
  verified: boolean;
  /** capa raster real si difiere de ORTO_{year} (épocas pluri-anuales, G6) */
  layer: string | null;
  /** preview first-party derivado de la MISMA campaña (G1-R2) */
  preview: { url: string; bbox: [number, number, number, number] } | null;
  /** zonas sin imagen en el mosaico oficial (causa de origen no confirmada) */
  coverageGaps: boolean;
}

export function campaigns(cat: CatalogFile): Campaign[] {
  return cat.campaigns
    .map((c) => ({
      year: c.year,
      source: c.source,
      flightRange: c.flight_range,
      verified: c.verified_image,
      layer: c.layer ?? null,
      preview: c.preview ?? null,
      coverageGaps: c.coverage_gaps ?? false
    }))
    .sort((a, b) => a.year - b.year);
}

/**
 * ImageSource del preview: la MISMA ortofoto oficial a menor resolución,
 * georreferenciada por el bbox real del parque edificado (EPSG:4326).
 * Solo se instancia tras opt-in explícito (P5: 0 requests de imagen antes).
 */
export function previewSourceDef(c: Campaign) {
  if (!c.preview) return null;
  const [w, s, e, n] = c.preview.bbox;
  return {
    type: 'image' as const,
    url: c.preview.url,
    coordinates: [
      [w, n],
      [e, n],
      [e, s],
      [w, s]
    ] as [[number, number], [number, number], [number, number], [number, number]]
  };
}

/** Sufijo « (vuelo …)» cuando la campaña declara fecha real de vuelo. */
export function flightSuffix(
  c: Campaign,
  tr: (key: string, params: Record<string, string | number>) => string
): string {
  return c.flightRange ? tr('ortho.flight_range', { flight_range: c.flightRange }) : '';
}

/** Campaña más próxima a `year` (empate → la anterior, como en el pipeline). */
export function nearestCampaign(list: Campaign[], year: number): Campaign | null {
  let best: Campaign | null = null;
  for (const c of list) {
    if (best === null || Math.abs(c.year - year) < Math.abs(best.year - year)) best = c;
  }
  return best;
}

/** Estilo de teselas raster para MapLibre según la fuente. */
export function rasterSourceDef(c: Campaign) {
  if (c.source === 'bizkaia') {
    return {
      type: 'raster' as const,
      tiles: [BIZKAIA_TILE.replace('{Y}', String(c.year))],
      tileSize: 256,
      attribution: `Open Data Bizkaia — Diputación Foral de Bizkaia · Campaña ${c.year} · CC BY 4.0`
    };
  }
  return {
    type: 'raster' as const,
    tiles: [
      'https://www.geo.euskadi.eus/WMS_ORTOARGAZKIAK?service=WMS&version=1.3.0&request=GetMap&layers=' +
        (c.layer ?? `ORTO_${c.year}`) +
        '&styles=&crs=EPSG:3857&bbox={bbox-epsg-3857}&width=256&height=256&format=image/jpeg'
    ],
    tileSize: 256,
    attribution: `geoEuskadi — Gobierno Vasco · Campaña ${c.year} · CC BY 4.0`
  };
}

function lonLatToWebMercator(lon: number, lat: number) {
  const x = (lon * 20037508.34) / 180;
  const y =
    (Math.log(Math.tan(((90 + lat) * Math.PI) / 360)) / (Math.PI / 180)) * (20037508.34 / 180);
  return { x, y };
}

function lonLatToTile(lon: number, lat: number, z: number) {
  const n = 2 ** z;
  const x = Math.floor(((lon + 180) / 360) * n);
  const y = Math.floor(
    ((1 -
      Math.log(Math.tan((lat * Math.PI) / 180) + 1 / Math.cos((lat * Math.PI) / 180)) / Math.PI) /
      2) *
      n
  );
  return { x, y };
}

const PROBE_TIMEOUT_MS = 8_000;

/**
 * Una imagen solo prueba cobertura si decodifica y contiene >1 color.
 * Una tesela blanca/monocroma no es evidencia visual (spec §3).
 */
async function imageHasContent(blob: Blob): Promise<boolean> {
  const bmp = await createImageBitmap(blob);
  try {
    const s = 32;
    const canvas = document.createElement('canvas');
    canvas.width = s;
    canvas.height = s;
    const ctx = canvas.getContext('2d');
    if (!ctx) return false;
    ctx.drawImage(bmp, 0, 0, s, s);
    const d = ctx.getImageData(0, 0, s, s).data;
    const seen = new Set<number>();
    for (let i = 0; i < d.length; i += 4) {
      seen.add((d[i] << 16) | (d[i + 1] << 8) | d[i + 2]);
      if (seen.size > 1) return true;
    }
    return false;
  } finally {
    bmp.close();
  }
}

/**
 * Sondeo de una campaña en un punto (lon, lat WGS84).
 * Clasifica por contenido: XML ServiceException, imagen en blanco o timeout ≠ éxito.
 * `signal` permite cancelación externa (AbortError propaga; no es SERVICE_ERROR).
 */
export async function probeCampaign(
  c: Campaign,
  lon: number,
  lat: number,
  opts?: { signal?: AbortSignal; timeoutMs?: number }
): Promise<OrthoState> {
  try {
    let url: string;
    if (c.source === 'bizkaia') {
      const t = lonLatToTile(lon, lat, 15);
      url = BIZKAIA_TILE.replace('{Y}', String(c.year))
        .replace('{z}', '15')
        .replace('{y}', String(t.y))
        .replace('{x}', String(t.x));
    } else {
      const { x, y } = lonLatToWebMercator(lon, lat);
      const h = 200; // ~200 m alrededor del punto
      url =
        'https://www.geo.euskadi.eus/WMS_ORTOARGAZKIAK?service=WMS&version=1.3.0&request=GetMap&layers=' +
        (c.layer ?? `ORTO_${c.year}`) +
        `&styles=&crs=EPSG:3857&bbox=${x - h},${y - h},${x + h},${y + h}&width=256&height=256&format=image/jpeg`;
    }
    const timeout = AbortSignal.timeout(opts?.timeoutMs ?? PROBE_TIMEOUT_MS);
    const signal = opts?.signal ? AbortSignal.any([timeout, opts.signal]) : timeout;
    const r = await fetch(url, { signal });
    if (r.status === 404) return 'NOT_COVERED';
    if (!r.ok) return 'SERVICE_ERROR';
    const type = r.headers.get('content-type') ?? '';
    if (!type.startsWith('image/')) return 'SERVICE_ERROR';
    const blob = await r.blob();
    return (await imageHasContent(blob)) ? 'AVAILABLE' : 'SERVICE_ERROR';
  } catch (e) {
    if (opts?.signal?.aborted) throw e;
    return 'SERVICE_ERROR';
  }
}
