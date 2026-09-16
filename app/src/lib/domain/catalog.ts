import type { CatalogFile, MetricsFile, MunicipalityCatalogItem } from './types';

const DATA = 'data/';

export async function loadCatalog(): Promise<CatalogFile> {
  const r = await fetch(`${DATA}catalog.json`);
  if (!r.ok) throw new Error(`catalog ${r.status}`);
  return r.json();
}

export async function loadMunicipalities(): Promise<MunicipalityCatalogItem[]> {
  const r = await fetch(`${DATA}municipalities.json`);
  if (!r.ok) throw new Error(`municipalities ${r.status}`);
  const j = await r.json();
  return j.municipalities;
}

export async function loadMetrics(path: string): Promise<MetricsFile> {
  const r = await fetch(`${DATA}${path}`);
  if (!r.ok) throw new Error(`metrics ${r.status}`);
  return r.json();
}

/** GeoJSON ligero de municipios para PIP en cliente (verificación de la celda). */
export async function loadMunicipalitiesLight(): Promise<GeoJSON.FeatureCollection> {
  const r = await fetch(`${DATA}municipalities-light.geojson`);
  if (!r.ok) throw new Error(`municipalities-light ${r.status}`);
  return r.json();
}
