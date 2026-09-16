/**
 * Contratos compartidos del slice G0.
 * La lógica de métricas NO se reimplementa aquí: se leen los agregados canónicos
 * generados por `pipeline/g0_aggregates.py` a partir de `pipeline/metrics.py`.
 */

export type Campaign = {
  year: number;
  source: 'bizkaia' | 'geoeuskadi';
  nominal_year: number;
  flight_range: string | null;
  verified_image: boolean;
};

export type MetricsFile = {
  municipality: { codigo_mun: number; name: string };
  snapshot_year: number;
  contracts_version: string;
  constants: {
    c01: number;
    c02: number;
    c03_unknown_year_count: number;
    suspicious: number;
    invalid_geom: number;
    coverage_pct: number | null;
    c06_footprint_area_known_year: number | null;
    min_year: number | null;
    max_year: number | null;
  };
  cum: { y: number; cum_buildings: number; cum_footprint_area: number }[];
  campaigns: Campaign[];
};

export const MUNICIPALITIES = [
  { codigo_mun: 20, name: 'Bilbao', profile: 'gran ciudad' },
  { codigo_mun: 54, name: 'Leioa', profile: 'metropolitano' },
  { codigo_mun: 908, name: 'Murueta', profile: 'menos urbanizado' }
] as const;

/** Busca el mayor `y <= year` en la curva acumulada (lectura, no recálculo). */
export function cumAt(m: MetricsFile, year: number) {
  let lo = 0;
  let hi = m.cum.length - 1;
  let best: { y: number; cum_buildings: number; cum_footprint_area: number } | null = null;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (m.cum[mid].y <= year) {
      best = m.cum[mid];
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return best ?? { y: 0, cum_buildings: 0, cum_footprint_area: 0 };
}

/**
 * C-04/C-05 sobre agregados canónicos (lookup, sin recalcular el denominador).
 * C-02 es el denominador congelado (`constants.c02`).
 */
export function postSelectedYear(m: MetricsFile, year: number) {
  const known = m.constants.c02;
  const before = cumAt(m, year).cum_buildings;
  const after = known - before;
  return {
    c02_known: known,
    c01_total: m.constants.c01,
    before,
    after,
    share: known > 0 ? (100 * after) / known : null
  };
}

/** C-11: campaña más próxima. Implementación exacta del contrato (empate → la más antigua). */
export function nearestOrtho(campaigns: Campaign[], selectedYear: number) {
  let best = campaigns[0];
  for (const c of campaigns) {
    const d = Math.abs(c.year - selectedYear);
    const bd = Math.abs(best.year - selectedYear);
    if (d < bd || (d === bd && c.year < best.year)) best = c;
  }
  return { campaign: best, delta: Math.abs(best.year - selectedYear), isExact: best.year === selectedYear };
}

/** Fuente raster del slice para una campaña. */
export function orthoTiles(c: Campaign): { tiles: string[]; tileSize: number; scheme: 'xyz' } {
  if (c.source === 'bizkaia') {
    return {
      tiles: [
        `https://geo.bizkaia.eus/arcgisserverinspire/rest/services/Kartografia_Cartografia/ORTO_BFA_${c.year}/MapServer/tile/{z}/{y}/{x}`
      ],
      tileSize: 256,
      scheme: 'xyz'
    };
  }
  return {
    tiles: [
      `https://www.geo.euskadi.eus/WMS_ORTOARGAZKIAK?service=WMS&version=1.3.0&request=GetMap&layers=ORTO_${c.year}&styles=&crs=EPSG:3857&bbox={bbox-epsg-3857}&width=256&height=256&format=image/jpeg`
    ],
    tileSize: 256,
    scheme: 'xyz'
  };
}

export function attributionOf(c: Campaign): string {
  return c.source === 'bizkaia'
    ? 'Ortofotos: Open Data Bizkaia — Diputación Foral de Bizkaia (CC BY 4.0)'
    : 'Ortofotos: Eusko Jaurlaritza / Gobierno Vasco — geoEuskadi (CC BY 4.0)';
}

export const BUILDINGS_ATTRIBUTION =
  'Edificios: Catastro de Bizkaia — Open Data Bizkaia (CC BY 4.0). Licencia del código: MIT.';

/** Geocodificador oficial (NORA, geoEuskadi). Sin proveedores comerciales. */
export type NoraPlace = { id: string; name: string; lat: number | null; lon: number | null };

export async function searchMunicipalities(query: string, signal?: AbortSignal): Promise<NoraPlace[]> {
  const q = query.trim();
  if (q.length < 3) {
    throw Object.assign(new Error('Consulta demasiado corta (mínimo 3 caracteres).'), { kind: 'MALFORMED' });
  }
  const url = `https://www.geo.euskadi.eus/t17iApiRestWar/rest/v1/municipios?provinciaId=48&descMunicipio=${encodeURIComponent(q)}`;
  let res: Response;
  try {
    res = await fetch(url, { signal });
  } catch (e) {
    if ((e as Error).name === 'AbortError') throw e;
    throw Object.assign(new Error('No hay conexión con el geocodificador oficial (NORA).'), { kind: 'NETWORK' });
  }
  if (!res.ok) {
    throw Object.assign(new Error(`El geocodificador oficial respondió ${res.status}.`), { kind: 'NETWORK' });
  }
  // NORA puede devolver 200 con cuerpo vacío o no-JSON cuando no hay coincidencias.
  const text = (await res.text()).trim();
  if (text === '') return [];
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw Object.assign(new Error('Respuesta no interpretable del geocodificador oficial.'), { kind: 'NETWORK' });
  }
  if (!Array.isArray(data)) {
    throw Object.assign(new Error('Respuesta inesperada del geocodificador oficial.'), { kind: 'NETWORK' });
  }
  return (data as Array<Record<string, unknown>>).map((m) => ({
    id: String(m.id ?? ''),
    name: String(m.descripcionOficial ?? ''),
    lat: m.latETRS89 != null ? Number(m.latETRS89) : null,
    lon: m.lonETRS89 != null ? Number(m.lonETRS89) : null
  }));
}
