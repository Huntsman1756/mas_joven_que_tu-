/**
 * Cartografía histórica 1:25.000 (1923–1925), Open Data Bizkaia.
 * Es un MAPA, nunca una ortofoto: no entra en el catálogo de campañas.
 *
 * El WMTS nativo es EPSG:25830 → inutilizable como tesela Web Mercator.
 * Runtime: ArcGIS REST `export` con reproyección server-side a 3857
 * (manifest `bizkaia.cartografia.historica.1923-1925.yaml`, evidencia
 * `evidence/g3/g3x/export_3857_*.jpg`). Opt-in: 0 requests antes de acción.
 */

const EXPORT_BASE =
  'https://geo.bizkaia.eus/arcgisserver/rest/services/ORTOARGAZKIAK/ORTO_EJ_CARTO_1925/MapServer/export';

export const HISTMAP_ATTRIBUTION =
  'Open Data Bizkaia — Diputación Foral de Bizkaia · Cartografía histórica 1:25.000 (1923–1925) · CC BY 4.0';

/** Plantilla {bbox-epsg-3857}: MapLibre sustituye el bbox de cada tesela. */
export function histMapTileUrl(): string {
  const p = new URLSearchParams({
    bbox: '{bbox-epsg-3857}',
    bboxSR: '3857',
    imageSR: '3857',
    size: '256,256',
    format: 'jpg',
    transparent: 'false',
    f: 'image'
  });
  return `${EXPORT_BASE}?${p.toString().replace('%7Bbbox-epsg-3857%7D', '{bbox-epsg-3857}')}`;
}

export function histMapSourceDef() {
  return {
    type: 'raster' as const,
    tiles: [histMapTileUrl()],
    tileSize: 256,
    attribution: HISTMAP_ATTRIBUTION
  };
}

/** lon/lat (4326) → Web Mercator (3857). */
export function toMercator(lon: number, lat: number): [number, number] {
  const x = (lon * 20037508.34) / 180;
  const y =
    (Math.log(Math.tan(((90 + lat) * Math.PI) / 360)) / (Math.PI / 180)) * (20037508.34 / 180);
  return [x, y];
}

export type HistMapState = 'UNKNOWN' | 'AVAILABLE' | 'UNAVAILABLE';

/**
 * Sonda de servicio: una export mínima (~1 km) centrada en el punto.
 * AVAILABLE = 200 + imagen decodable; cualquier fallo → UNAVAILABLE.
 * No distingue cobertura: la serie cubre toda Bizkaia (fullExtent 25830
 * verificado en G3-X); fuera de ella la tesela sale en blanco, lo cual es
 * representación honesta del límite territorial del dataset.
 */
export async function probeHistMap(
  lon: number,
  lat: number,
  opts: { signal?: AbortSignal } = {}
): Promise<Exclude<HistMapState, 'UNKNOWN'>> {
  try {
    const [x, y] = toMercator(lon, lat);
    const r = 500;
    const p = new URLSearchParams({
      bbox: `${x - r},${y - r},${x + r},${y + r}`,
      bboxSR: '3857',
      imageSR: '3857',
      size: '64,64',
      format: 'jpg',
      transparent: 'false',
      f: 'image'
    });
    const res = await fetch(`${EXPORT_BASE}?${p}`, { signal: opts.signal ?? null });
    if (!res.ok) return 'UNAVAILABLE';
    const ct = res.headers.get('content-type') ?? '';
    if (!ct.startsWith('image/')) return 'UNAVAILABLE';
    const buf = await res.arrayBuffer();
    if (buf.byteLength === 0) return 'UNAVAILABLE';
    await createImageBitmap(new Blob([buf], { type: ct }));
    return 'AVAILABLE';
  } catch {
    return 'UNAVAILABLE';
  }
}
