import type { CatalogFile, MetricsFile, MunicipalityCatalogItem } from './types';

const DATA = 'data/';
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

/** GeoJSON ligero de municipios para PIP en cliente (verificación de la celda). */
export function loadMunicipalitiesLight(): Promise<GeoJSON.FeatureCollection> {
  return fetchJson('municipalities-light.geojson', 'municipalities-light');
}
