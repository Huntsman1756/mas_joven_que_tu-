import type { CatalogFile, MetricsFile, MunicipalityCatalogItem } from './types';
import type { PlanningFile, PlanningMuniTable } from './planning';
import type { ContextFile } from './context';
import { timeoutSignal } from './fetch';

const DATA = `${import.meta.env.BASE_URL}data/`;
/** Toda carga acotada: un loader sin fin viola U2 («0 indicadores sin salida»). */
const LOAD_TIMEOUT_MS = 15_000;

async function fetchJson<T>(
  path: string,
  label: string,
  check?: (j: unknown) => string | null
): Promise<T> {
  const r = await fetch(`${DATA}${path}`, { signal: timeoutSignal(LOAD_TIMEOUT_MS) });
  if (!r.ok) throw new Error(`${label} ${r.status}`);
  const j: unknown = await r.json();
  // HTTP 200 + JSON parseable no prueban contenido: los artefactos que
  // alimentan la vista pasan validación de FRONTERA (RT-20) — un despliegue
  // incompleto o un cuerpo malformado es un error explícito con motivo,
  // nunca una vista rota en silencio ni un NaN aguas abajo. Mismo contrato
  // que streets.ts. El motivo viaja en el error para poder diagnosticarlo.
  if (check) {
    const why = check(j);
    if (why) throw new Error(`${label} schema: ${why}`);
  }
  return j as T;
}

const isObj = (j: unknown): j is Record<string, unknown> =>
  typeof j === 'object' && j !== null && !Array.isArray(j);
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const isInt = (v: unknown): v is number => isNum(v) && Number.isInteger(v);
const isStr = (v: unknown): v is string => typeof v === 'string' && v.length > 0;
/** bbox [w, s, e, n] en EPSG:4326 coherente */
const isBbox = (v: unknown): v is [number, number, number, number] =>
  Array.isArray(v) &&
  v.length === 4 &&
  v.every((n) => isNum(n)) &&
  (v as number[])[0] <= (v as number[])[2] &&
  (v as number[])[1] <= (v as number[])[3];

/**
 * Catálogo de campañas: campos que consume `ortho.ts campaigns()` +
 * `PhotoPanel` (year, source, nominal_year, flight_range, verified_image,
 * layer, preview, coverage_gaps) y la procedencia.
 * Devuelve `null` si es válido o el motivo del rechazo.
 */
export function checkCatalogFile(j: unknown): string | null {
  if (!isObj(j)) return 'no es un objeto';
  if (!isInt(j.snapshot_year) || j.snapshot_year < 1900 || j.snapshot_year > 2100)
    return `snapshot_year inválido (${String(j.snapshot_year)})`;
  if (!Array.isArray(j.campaigns) || j.campaigns.length === 0) return 'campaigns ausente o vacío';
  for (let i = 0; i < j.campaigns.length; i++) {
    const c = j.campaigns[i];
    const at = `campaigns[${i}]`;
    if (!isObj(c)) return `${at} no es un objeto (¿null?)`;
    if (!isInt(c.year)) return `${at}.year inválido`;
    if (c.source !== 'bizkaia' && c.source !== 'geoeuskadi') return `${at}.source desconocido`;
    if (!isInt(c.nominal_year)) return `${at}.nominal_year inválido`;
    if (!(c.flight_range === null || typeof c.flight_range === 'string'))
      return `${at}.flight_range inválido`;
    if (typeof c.verified_image !== 'boolean') return `${at}.verified_image inválido`;
    if (!(c.layer === null || typeof c.layer === 'string')) return `${at}.layer inválido`;
    if (!(
      c.preview === null ||
      (isObj(c.preview) && isStr(c.preview.url) && isBbox(c.preview.bbox))
    ))
      return `${at}.preview inválido`;
    if (c.coverage_gaps !== undefined && typeof c.coverage_gaps !== 'boolean')
      return `${at}.coverage_gaps inválido`;
  }
  if (!isObj(j.provenance) || !isStr(j.provenance.primary) || !isStr(j.provenance.complementary))
    return 'provenance incompleto';
  return null;
}

/** Municipios: campos que consume la app (slug/cod/name/lat/lon/bbox/buildings). */
export function checkMunicipalityList(j: unknown): string | null {
  if (!isObj(j) || !Array.isArray(j.municipalities)) return 'municipalities ausente';
  if (j.municipalities.length === 0) return 'municipalities vacío';
  for (let i = 0; i < j.municipalities.length; i++) {
    const m = j.municipalities[i];
    const at = `municipalities[${i}]`;
    if (!isObj(m)) return `${at} no es un objeto`;
    if (!isStr(m.slug)) return `${at}.slug inválido`;
    if (!isInt(m.cod) || (m.cod as number) < 0) return `${at}.cod inválido`;
    if (!isStr(m.name)) return `${at}.name inválido`;
    if (!isNum(m.lat) || (m.lat as number) < -90 || (m.lat as number) > 90)
      return `${at}.lat inválido`;
    if (!isNum(m.lon) || (m.lon as number) < -180 || (m.lon as number) > 180)
      return `${at}.lon inválido`;
    if (!isBbox(m.bbox)) return `${at}.bbox inválido`;
    if (!isInt(m.buildings) || (m.buildings as number) < 0) return `${at}.buildings inválido`;
  }
  return null;
}

/**
 * Métricas municipales: tipos + coherencia de los contratos C-01…C-06 que
 * consumen `metrics.ts` (headline, buckets, partición) — todo lo que aguas
 * abajo daría `TypeError`/`NaN` si se aceptara un cuerpo malformado.
 *
 * Coherencias exigidas (verificadas sobre los 112 reales):
 *  - `sum(dist.n) === c02` (invariante C-02),
 *  - `c01 === c02 + unknown + suspicious + invalid`,
 *  - `coverage_pct ≈ c02/c01·100` (±0,02),
 *  - último `cum.cum_buildings === c02`,
 *  - `dist`/`cum` ordenados por año estrictamente ascendente
 *    (`cumAt` hace `break`: sin orden el acumulado se lee mal),
 *  - `cum_buildings` y `cum_footprint_area` no decrecientes.
 *
 * `dist`/`cum` vacíos solo son válidos con `c02 === 0` (municipio sin año
 * conocido — escenario RT-04, no observado en el snapshot).
 */
export function checkMetricsFile(j: unknown): string | null {
  if (!isObj(j)) return 'no es un objeto';
  if (!isInt(j.snapshot_year) || j.snapshot_year < 1900 || j.snapshot_year > 2100)
    return `snapshot_year inválido (${String(j.snapshot_year)})`;
  if (!isStr(j.contracts_version)) return 'contracts_version ausente';
  if (
    !isObj(j.municipality) ||
    !isInt(j.municipality.codigo_mun) ||
    !isStr(j.municipality.slug) ||
    !isStr(j.municipality.name)
  )
    return 'municipality incompleto';

  const c = j.constants;
  if (!isObj(c)) return 'constants ausente';
  for (const k of [
    'c01',
    'c02',
    'unknown',
    'suspicious',
    'invalid',
    'invalid_geom',
    'c06',
    'min_year',
    'max_year',
    'heaping_05_pct'
  ]) {
    if (!isNum(c[k]) || (c[k] as number) < 0) return `constants.${k} inválido`;
  }
  if (!isNum(c.coverage_pct) || (c.coverage_pct as number) < 0 || (c.coverage_pct as number) > 100)
    return 'constants.coverage_pct inválido';
  if ((c.heaping_05_pct as number) > 100) return 'constants.heaping_05_pct fuera de 0-100';
  if ((c.min_year as number) > (c.max_year as number)) return 'constants.min_year > max_year';
  if (c.population !== undefined && c.population !== null) {
    const p = c.population;
    if (!isObj(p)) return 'constants.population inválido';
    if (!(p.padron === null || isNum(p.padron))) return 'constants.population.padron inválido';
    if (!isStr(p.period) || !isStr(p.source)) return 'constants.population incompleto';
  }
  const c02 = c.c02 as number;
  const c01 = c.c01 as number;
  if (c01 !== c02 + (c.unknown as number) + (c.suspicious as number) + (c.invalid as number))
    return `c01 ≠ c02+unknown+suspicious+invalid (${c01} vs ${c02})`;

  if (!Array.isArray(j.dist)) return 'dist ausente';
  let sum = 0;
  let prevY = -Infinity;
  for (let i = 0; i < j.dist.length; i++) {
    const r = j.dist[i];
    const at = `dist[${i}]`;
    if (!isObj(r)) return `${at} no es un objeto (¿null?)`;
    if (!isInt(r.y)) return `${at}.y inválido (${String(r.y)})`;
    if (!isInt(r.n) || (r.n as number) < 0) return `${at}.n inválido (${String(r.n)})`;
    if ((r.y as number) <= prevY) return `${at}.y fuera de orden (${String(r.y)} ≤ ${prevY})`;
    prevY = r.y as number;
    sum += r.n as number;
  }
  if (sum !== c02) return `suma(dist.n)=${sum} ≠ c02=${c02}`;

  if (!Array.isArray(j.cum)) return 'cum ausente';
  let prevCy = -Infinity;
  let prevB = -Infinity;
  let prevFp = -Infinity;
  for (let i = 0; i < j.cum.length; i++) {
    const r = j.cum[i];
    const at = `cum[${i}]`;
    if (!isObj(r)) return `${at} no es un objeto (¿null?)`;
    if (!isInt(r.y)) return `${at}.y inválido`;
    if (!isInt(r.cum_buildings) || (r.cum_buildings as number) < 0)
      return `${at}.cum_buildings inválido`;
    if (!isNum(r.cum_footprint_area) || (r.cum_footprint_area as number) < 0)
      return `${at}.cum_footprint_area inválido`;
    if ((r.y as number) <= prevCy) return `${at}.y fuera de orden`;
    if ((r.cum_buildings as number) < prevB) return `${at}.cum_buildings decreciente`;
    if ((r.cum_footprint_area as number) < prevFp - 1e-6)
      return `${at}.cum_footprint_area decreciente`;
    prevCy = r.y as number;
    prevB = r.cum_buildings as number;
    prevFp = r.cum_footprint_area as number;
  }
  if (j.cum.length > 0) {
    const last = j.cum[j.cum.length - 1] as { cum_buildings: number; y: number };
    if (last.cum_buildings !== c02)
      return `último cum.cum_buildings=${last.cum_buildings} ≠ c02=${c02}`;
    if (j.dist.length > 0) {
      const minY = (j.dist[0] as { y: number }).y;
      const maxY = last.y;
      if (minY < (c.min_year as number) || maxY > (c.max_year as number))
        return `años fuera de constants.min/max (${minY}..${maxY})`;
    }
  } else if (c02 !== 0) {
    return `cum vacío con c02=${c02}`;
  }
  if (c01 > 0) {
    const cov = Math.round((c02 / c01) * 10000) / 100;
    if (Math.abs(cov - (c.coverage_pct as number)) > 0.02)
      return `coverage_pct=${String(c.coverage_pct)} ≠ c02/c01=${cov}`;
  } else if (c02 !== 0) {
    return 'c01=0 con c02>0';
  }

  if (!Array.isArray(j.decades)) return 'decades ausente';
  for (let i = 0; i < j.decades.length; i++) {
    const d = j.decades[i];
    const at = `decades[${i}]`;
    if (!isObj(d)) return `${at} no es un objeto`;
    if (!isStr(d.bucket)) return `${at}.bucket inválido`;
    if (!isInt(d.n) || (d.n as number) < 0) return `${at}.n inválido`;
  }
  if (!isInt(j.no_year_count) || (j.no_year_count as number) < 0) return 'no_year_count inválido';
  return null;
}

export function loadCatalog(): Promise<CatalogFile> {
  return fetchJson('catalog.json', 'catalog', checkCatalogFile);
}

export async function loadMunicipalities(): Promise<MunicipalityCatalogItem[]> {
  const j = await fetchJson<{ municipalities: MunicipalityCatalogItem[] }>(
    'municipalities.json',
    'municipalities',
    checkMunicipalityList
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
    p = fetchJson<MetricsFile>(path, 'metrics', checkMetricsFile);
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
 * Series por año de cada celda (fid → [ys, ya, lon, lat]). Fuera de las
 * teselas por transferencia (PERF5): ~600 B/celda de propiedades dominaban
 * cells.pmtiles. El centroide (centro de la celda de 500 m, G6-I) se añadió
 * como posiciones 3-4 para posicionar hotspots sin tesela cargada.
 * Caché de promesas por municipio; las peticiones repetidas deduplican.
 */
const cellSeriesCache = new Map<number, Promise<Map<number, CellSeriesEntry>>>();

export interface CellSeriesEntry {
  ys: string | null;
  ya: string | null;
  /** centro de la celda 500 m (OGC:CRS84); null en datos previos a G6-I */
  lon: number | null;
  lat: number | null;
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

/**
 * G3-D — facets de contexto (ruido/paradas/montes) por building_id, por
 * municipio. PIP/k-NN precalculado en pipeline (gate §3); caché por cod.
 */
const contextCache = new Map<number, Promise<ContextFile>>();

export function loadContext(cod: number): Promise<ContextFile> {
  let p = contextCache.get(cod);
  if (!p) {
    p = fetchJson<ContextFile>(`context/${String(cod).padStart(3, '0')}.json`, 'context');
    p.catch(() => contextCache.delete(cod));
    contextCache.set(cod, p);
  }
  return p;
}

/**
 * G3-D — geometría 4326 de UN módulo (ruido|paradas|montes) del municipio,
 * solo para el visual opt-in. Un fichero por módulo: la overlay activa
 * descarga solo su evidencia (gate §15: una overlay contextual a la vez).
 */
export function loadContextGeom(
  cod: number,
  mod: 'ruido' | 'paradas' | 'montes'
): Promise<GeoJSON.FeatureCollection> {
  return fetchJson(
    `context-geom/${String(cod).padStart(3, '0')}-${mod}.json`,
    `context-geom-${mod}`
  );
}

/**
 * G4/BUG-01 — índice id catastral → centroide [lon, lat] por municipio.
 * Solo se pide con un `building=` pendiente de restaurar (demanda explícita;
 * nunca en el critical path). Derivado del mismo geojson que alimenta los
 * pmtiles (pipeline/g4_building_index.py; QA en data/qa/g4_building_index.json).
 */
const buildingIndexCache = new Map<number, Promise<Record<string, [number, number]>>>();

export function loadBuildingIndex(cod: number): Promise<Record<string, [number, number]>> {
  let p = buildingIndexCache.get(cod);
  if (!p) {
    p = fetchJson<Record<string, [number, number]>>(
      `buildings-index/${String(cod).padStart(3, '0')}.json`,
      'buildings-index'
    );
    p.catch(() => buildingIndexCache.delete(cod));
    buildingIndexCache.set(cod, p);
  }
  return p;
}

/**
 * G5 — población municipal (Eustat). Snapshot propio
 * (pipeline/g5_eustat_population.py; manifest data/manifests/eustat.poblacion.yaml).
 * L4/below-fold: solo se pide al entrar en «Qué más sabemos del lugar».
 * `padron`: habitantes a 1-ene del último periodo · `census`: serie de
 * población de hecho 1900–2001 (huecos = ausente en fuente, nunca 0).
 */
export interface PopulationFile {
  attribution: string;
  padron_period: string;
  census_periods: string[];
  /** G6-F: refs de padrón literales `YYYYMMDD` (2001–2025) */
  padron_periods?: string[];
  /** G6-G: periodos censales de vivienda (1991–2021, familia v02a) */
  housing_periods?: string[];
  munis: Record<
    string,
    {
      name: string;
      padron: number | null;
      census: Record<string, number | null>;
      padron_series?: Record<string, number | null>;
      housing?: Record<'total' | 'principal' | 'desocupada', Record<string, number | null>>;
    }
  >;
}

let populationCache: Promise<PopulationFile> | null = null;

export function loadPopulation(): Promise<PopulationFile> {
  if (!populationCache) {
    populationCache = fetchJson('eustat-population.json', 'eustat-population');
    populationCache.catch(() => (populationCache = null));
  }
  return populationCache;
}

export function ensureCellSeries(cod: number): Promise<Map<number, CellSeriesEntry>> {
  let p = cellSeriesCache.get(cod);
  if (!p) {
    p = fetchJson<Record<string, [string | null, string | null, string?, string?]>>(
      `cells/${String(cod).padStart(3, '0')}.json`,
      'cell-series'
    ).then((j) => {
      const m = new Map<number, CellSeriesEntry>();
      for (const [fid, [ys, ya, lon, lat]] of Object.entries(j)) {
        m.set(Number(fid), {
          ys,
          ya,
          lon: lon !== undefined ? Number(lon) : null,
          lat: lat !== undefined ? Number(lat) : null
        });
      }
      return m;
    });
    p.catch(() => cellSeriesCache.delete(cod)); // no envenenar la caché en fallo
    cellSeriesCache.set(cod, p);
  }
  return p;
}
