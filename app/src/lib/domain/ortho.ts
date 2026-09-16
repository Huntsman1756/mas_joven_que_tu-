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
}

export function campaigns(cat: CatalogFile): Campaign[] {
  return cat.campaigns
    .map((c) => ({
      year: c.year,
      source: c.source,
      flightRange: c.flight_range,
      verified: c.verified_image,
    }))
    .sort((a, b) => a.year - b.year);
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
      attribution: `Open Data Bizkaia — Diputación Foral de Bizkaia · Campaña ${c.year} · CC BY 4.0`,
    };
  }
  return {
    type: 'raster' as const,
    tiles: [
      'https://www.geo.euskadi.eus/WMS_ORTOARGAZKIAK?service=WMS&version=1.3.0&request=GetMap&layers=ORTO_' +
        c.year +
        '&styles=&crs=EPSG:3857&bbox={bbox-epsg-3857}&width=256&height=256&format=image/jpeg',
    ],
    tileSize: 256,
    attribution: `geoEuskadi — Gobierno Vasco · Campaña ${c.year} · CC BY 4.0`,
  };
}

function lonLatToWebMercator(lon: number, lat: number) {
  const x = (lon * 20037508.34) / 180;
  const y =
    Math.log(Math.tan(((90 + lat) * Math.PI) / 360)) / (Math.PI / 180) *
    (20037508.34 / 180);
  return { x, y };
}

function lonLatToTile(lon: number, lat: number, z: number) {
  const n = 2 ** z;
  const x = Math.floor(((lon + 180) / 360) * n);
  const y = Math.floor(
    ((1 -
      Math.log(Math.tan((lat * Math.PI) / 180) + 1 / Math.cos((lat * Math.PI) / 180)) /
        Math.PI) /
      2) *
      n
  );
  return { x, y };
}

/**
 * Sondeo de una campaña en un punto (lon, lat WGS84).
 * Clasifica por contenido: XML ServiceException o imagen vacía ≠ éxito.
 */
export async function probeCampaign(
  c: Campaign,
  lon: number,
  lat: number
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
        'https://www.geo.euskadi.eus/WMS_ORTOARGAZKIAK?service=WMS&version=1.3.0&request=GetMap&layers=ORTO_' +
        c.year +
        `&styles=&crs=EPSG:3857&bbox=${x - h},${y - h},${x + h},${y + h}&width=256&height=256&format=image/jpeg`;
    }
    const r = await fetch(url);
    if (r.status === 404) return 'NOT_COVERED';
    if (!r.ok) return 'SERVICE_ERROR';
    const type = r.headers.get('content-type') ?? '';
    if (!type.startsWith('image/')) {
      const text = (await r.text()).slice(0, 2048);
      return text.includes('Exception') ? 'SERVICE_ERROR' : 'SERVICE_ERROR';
    }
    const blob = await r.blob();
    if (blob.size < 800) return 'NOT_COVERED'; // imagen vacía / transparente
    return 'AVAILABLE';
  } catch {
    return 'SERVICE_ERROR';
  }
}
