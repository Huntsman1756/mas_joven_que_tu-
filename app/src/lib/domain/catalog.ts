import type { CatalogFile, MetricsFile, MunicipalityCatalogItem } from './types';

const DATA = `${import.meta.env.BASE_URL}data/`;
/** Toda carga acotada: un loader sin fin viola U2 («0 indicadores sin salida»). */
const LOAD_TIMEOUT_MS = 15_000;

async function fetchJson<T>(path: string, label: string): Promise<T> {
  const r = await fetch(`${DATA}${path}`, { signal: AbortSignal.timeout(LOAD_TIMEOUT_MS) });
  if (!r.ok) throw new Error(`${label} ${r.status}`);
  return r.json();
}

export function loadCatalog(): Promise<CatalogFile> {
  return fetchJson('catalog.json', 'catalog');
}

export async function loadMunicipalities(): Promise<MunicipalityCatalogItem[]> {
  const j = await fetchJson<{ municipalities: MunicipalityCatalogItem[] }>(
    'municipalities.json',
    'municipalities'
  );
  return j.municipalities;
}

export function loadMetrics(path: string): Promise<MetricsFile> {
  return fetchJson(path, 'metrics');
}

/** GeoJSON ligero de municipios: PIP en cliente y contorno del seleccionado a zoom de celdas. */
export function loadMunicipalitiesLight(): Promise<GeoJSON.FeatureCollection> {
  return fetchJson('municipalities-light.geojson', 'municipalities-light');
}

/**
 * Series por año de cada celda (fid → [ys, ya]). Fuera de las teselas por
 * transferencia (PERF5): ~600 B/celda de propiedades dominaban cells.pmtiles.
 * Caché de promesas por municipio; las peticiones repetidas deduplican.
 */
const cellSeriesCache = new Map<number, Promise<Map<number, CellSeriesEntry>>>();

export interface CellSeriesEntry {
  ys: string | null;
  ya: string | null;
}

export function ensureCellSeries(cod: number): Promise<Map<number, CellSeriesEntry>> {
  let p = cellSeriesCache.get(cod);
  if (!p) {
    p = fetchJson<Record<string, [string | null, string | null]>>(
      `cells/${String(cod).padStart(3, '0')}.json`,
      'cell-series'
    ).then((j) => {
      const m = new Map<number, CellSeriesEntry>();
      for (const [fid, [ys, ya]] of Object.entries(j)) m.set(Number(fid), { ys, ya });
      return m;
    });
    p.catch(() => cellSeriesCache.delete(cod)); // no envenenar la caché en fallo
    cellSeriesCache.set(cod, p);
  }
  return p;
}
