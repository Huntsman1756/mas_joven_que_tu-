import type { CatalogFile, MetricsFile, MunicipalityCatalogItem } from './types';
import type { PlanningFile, PlanningMuniTable } from './planning';

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

/**
 * Métricas por municipio con deduplicación: el deep-link precarga el JSON del
 * slug (module script) y `resolvePlace` lo vuelve a pedir — sin caché eran dos
 * descargas en la ventana crítica (PERF4/7). En fallo se borra para reintentar.
 */
const metricsCache = new Map<string, Promise<MetricsFile>>();

export function loadMetrics(path: string): Promise<MetricsFile> {
  let p = metricsCache.get(path);
  if (!p) {
    p = fetchJson<MetricsFile>(path, 'metrics');
    p.catch(() => metricsCache.delete(path));
    metricsCache.set(path, p);
  }
  return p;
}

export function warmMetrics(path: string): void {
  void loadMetrics(path);
}

/** Reinicio de estado (tests y `app.reset()`): descarta promesas cacheadas. */
export function clearMetricsCache(): void {
  metricsCache.clear();
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

/**
 * G3-B — tabla municipal de planeamiento (una petición, 112 filas).
 */
const planningMuniCache = new Map<string, Promise<PlanningMuniTable>>();

export function loadPlanningMuni(): Promise<PlanningMuniTable> {
  let p = planningMuniCache.get('muni');
  if (!p) {
    p = fetchJson<PlanningMuniTable>('planning-muni.json', 'planning-muni');
    p.catch(() => planningMuniCache.delete('muni'));
    planningMuniCache.set('muni', p);
  }
  return p;
}

/**
 * G3-B — facets de planeamiento/AE por building_id, por municipio.
 * PIP precalculado en pipeline (ADR-014); caché por cod.
 */
const planningCache = new Map<number, Promise<PlanningFile>>();

export function loadPlanning(cod: number): Promise<PlanningFile> {
  let p = planningCache.get(cod);
  if (!p) {
    p = fetchJson<PlanningFile>(`planning/${String(cod).padStart(3, '0')}.json`, 'planning');
    p.catch(() => planningCache.delete(cod));
    planningCache.set(cod, p);
  }
  return p;
}

/**
 * G3-B — geometría 4326 de ámbitos + espacios AE del municipio, solo para
 * el visual opt-in (resaltar áreas relevantes; nunca capa global).
 */
export function loadPlanningGeom(cod: number): Promise<GeoJSON.FeatureCollection> {
  return fetchJson(`planning-geom/${String(cod).padStart(3, '0')}.json`, 'planning-geom');
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
