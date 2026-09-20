/** Tipos del modelo G1 (contratos DATA_SEMANTICS §11 y ARCHITECTURE §10). */

export type YearState = 'VALID' | 'UNKNOWN' | 'SUSPICIOUS' | 'INVALID';
export type OrthoState = 'UNKNOWN' | 'AVAILABLE' | 'NOT_COVERED' | 'SERVICE_ERROR';

export interface MunicipalityCatalogItem {
  slug: string;
  /** código municipal NORA (número; pmtiles = padStart(3,'0')) */
  cod: number;
  name: string;
  lat: number;
  lon: number;
  /** bbox [w, s, e, n] EPSG:4326 */
  bbox: [number, number, number, number];
  buildings: number;
}

export type Place = MunicipalityCatalogItem;

export interface MetricsConstants {
  c01: number;
  c02: number;
  unknown: number;
  suspicious: number;
  invalid: number;
  invalid_geom: number;
  coverage_pct: number;
  c06: number;
  min_year: number;
  max_year: number;
  heaping_05_pct: number;
  /** G5-R2: padrón municipal Eustat inyectado en el metrics JSON
   *  (pipeline/g5_population_into_metrics.py) — viaja en el fetch que el
   *  resultado ya hace, sin petición nueva en el critical path. */
  population?: { padron: number | null; period: string; source: string } | null;
}

export interface MetricsFile {
  municipality: { codigo_mun: number; slug: string; name: string };
  snapshot_year: number;
  contracts_version: string;
  constants: MetricsConstants;
  /** acumulado hasta y con año válido */
  cum: { y: number; cum_buildings: number; cum_footprint_area: number }[];
  /** distribución anual completa */
  dist: { y: number; n: number }[];
  decades: { bucket: string; n: number }[];
  no_year_count: number;
}

export interface CatalogFile {
  snapshot_year: number;
  campaigns: {
    year: number;
    source: 'bizkaia' | 'geoeuskadi';
    nominal_year: number;
    flight_range: string | null;
    verified_image: boolean;
    /** nombre real de capa cuando difiere de ORTO_{year} (épocas pluri-anuales) */
    layer: string | null;
    /** preview raster derivado de la MISMA campaña (G1-R2); bbox [w,s,e,n] EPSG:4326 */
    preview: { url: string; bbox: [number, number, number, number] } | null;
  }[];
  provenance: { primary: string; complementary: string };
}

export interface BuildingProps {
  id: string;
  mun: number;
  year: number | null;
  state: YearState;
  uso: string;
  alturas: number | null;
  viv: number | null;
  area_m2: number;
}
