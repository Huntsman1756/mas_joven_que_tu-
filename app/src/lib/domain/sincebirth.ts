/**
 * G6-F/G6-G — «Tu municipio cuando naciste»: resolución determinista de la
 * observación oficial más cercana al año del usuario.
 *
 * Familias metodológicas (no se mezclan en una comparación):
 *   - `censo`    : población de hecho, censos 1900–2001 (ep31).
 *   - `padron`   : habitantes empadronados a fecha de referencia (ep06b,
 *                  2001–2025; la EMH mezcla refs 0101/0701 — se conserva
 *                  el periodo literal, no solo el año).
 *   - vivienda   : viviendas familiares por censo 1991–2021 (v02a),
 *                  solo comparable dentro de la misma familia censal.
 *
 * Reglas congeladas:
 *   - nunca se interpola: se elige la observación real más próxima;
 *   - empate de distancia → la observación anterior (misma regla que las
 *     campañas de ortofoto, C-11);
 *   - mismo año en censo y padrón → gana `padron` (registro continuo es la
 *     familia viva; el censo 2001 es población de hecho a otra fecha);
 *   - `null` en la fuente = ausencia de dato, jamás 0.
 */

export interface PopulationObservation {
  /** periodo literal de la fuente ('1986' censo · '20030101' padrón) */
  period: string;
  year: number;
  population: number;
  family: 'censo' | 'padron';
  exact: boolean;
  delta_years: number;
}

export interface HousingObservation {
  year: number;
  total: number;
  principal: number | null;
  exact: boolean;
  delta_years: number;
}

export interface PopulationEntry {
  census?: Record<string, number | null>;
  padron_series?: Record<string, number | null>;
  housing?: Record<string, Record<string, number | null>>;
}

function padronYear(period: string): number {
  // '20010101' → 2001
  return Math.floor(Number(period) / 10000);
}

export function resolvePopulationObs(
  entry: PopulationEntry,
  censusPeriods: string[],
  padronPeriods: string[],
  year: number
): PopulationObservation | null {
  let best: PopulationObservation | null = null;
  const consider = (o: PopulationObservation) => {
    if (
      best === null ||
      o.delta_years < best.delta_years ||
      // mismo año en ambas familias → padrón (registro continuo)
      (o.delta_years === best.delta_years && o.family === 'padron') ||
      // empate de distancia → la observación anterior
      (o.delta_years === best.delta_years && o.year < best.year)
    ) {
      best = o;
    }
  };
  for (const p of censusPeriods) {
    const v = entry.census?.[p];
    if (v === null || v === undefined) continue;
    const y = Number(p);
    consider({
      period: p,
      year: y,
      population: v,
      family: 'censo',
      exact: y === year,
      delta_years: Math.abs(y - year)
    });
  }
  for (const p of padronPeriods) {
    const v = entry.padron_series?.[p];
    if (v === null || v === undefined) continue;
    const y = padronYear(p);
    consider({
      period: p,
      year: y,
      population: v,
      family: 'padron',
      exact: y === year,
      delta_years: Math.abs(y - year)
    });
  }
  return best;
}

/**
 * G6-I — hotspots de transformación: celdas de 500 m del municipio con más
 * edificios **actuales** construidos después de `year`.
 *
 * Etiqueta honesta: «celdas con mayor concentración de edificios actuales
 * construidos después de Y» — nunca «zonas que más crecieron» (el catastro
 * actual no recoge lo demolido).
 *
 * Reglas congeladas:
 *   - universo = serie `ys` (años VALID); `null` = sin dato, no 0;
 *   - mínimo `minCount` edificios posteriores a Y para no proponer ruido;
 *   - orden: count desc, área posterior desc, fid asc (estable);
 *   - dedup por proximidad: se funde con el hotspot previo si su centro está
 *     a menos de `mergeM` metros (celdas vecinas = una sola zona).
 */
export interface Hotspot {
  fid: number;
  count: number;
  areaM2: number;
  lon: number;
  lat: number;
}

const HOTSPOT_MIN_COUNT = 2;
const HOTSPOT_MERGE_M = 800;

export function distM(a: { lon: number; lat: number }, b: { lon: number; lat: number }): number {
  const k = Math.cos((a.lat * Math.PI) / 180);
  return Math.hypot((a.lon - b.lon) * 111320 * k, (a.lat - b.lat) * 110540);
}

export function cellHotspots(
  series: Map<
    number,
    { ys: string | null; ya: string | null; lon: number | null; lat: number | null }
  >,
  year: number,
  limit = 3
): Hotspot[] {
  const ranked: Hotspot[] = [];
  for (const [fid, s] of series) {
    if (s.lon === null || s.lat === null || !s.ys) continue;
    let count = 0;
    for (const part of s.ys.split(',')) {
      const [y, n] = part.split(':');
      const yi = Number(y);
      const ni = Number(n);
      if (!Number.isFinite(yi) || !Number.isFinite(ni)) continue;
      if (yi > year) count += ni;
    }
    if (count < HOTSPOT_MIN_COUNT) continue;
    let areaM2 = 0;
    if (s.ya) {
      for (const part of s.ya.split(',')) {
        const [y, a] = part.split(':');
        if (Number(y) > year) areaM2 += Number(a) || 0;
      }
    }
    ranked.push({ fid, count, areaM2, lon: s.lon, lat: s.lat });
  }
  ranked.sort((a, b) => b.count - a.count || b.areaM2 - a.areaM2 || a.fid - b.fid);

  const out: Hotspot[] = [];
  for (const h of ranked) {
    if (out.some((o) => distM(o, h) < HOTSPOT_MERGE_M)) continue;
    out.push(h);
    if (out.length >= limit) break;
  }
  return out;
}

/**
 * Referencia territorial neutral para una zona sin nombre oficial (las
 * celdas de 500 m no tienen topónimo): distancia en km y punto cardinal
 * desde el centro del municipio. Se calcula de las coordenadas — nunca
 * se inventa un barrio. <0,3 km → 'center' (la zona es el centro).
 */
export type Cardinal = 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | 'nw' | 'center';

export function zoneRef(
  from: { lon: number; lat: number },
  to: { lon: number; lat: number }
): { km: number; dir: Cardinal } {
  const km = distM(from, to) / 1000;
  if (km < 0.3) return { km, dir: 'center' };
  const k = Math.cos((from.lat * Math.PI) / 180);
  const dx = (to.lon - from.lon) * k;
  const dy = to.lat - from.lat;
  // bearing: 0=N, 90=E → sector de 45°
  const brg = (Math.atan2(dx, dy) * 180) / Math.PI;
  const dirs: Cardinal[] = ['n', 'ne', 'e', 'se', 's', 'sw', 'w', 'nw'];
  return { km, dir: dirs[Math.round((((brg % 360) + 360) % 360) / 45) % 8] };
}

/** Vivienda más cercana al año — solo dentro de la familia censal v02a. */
export function resolveHousingObs(
  entry: PopulationEntry,
  housingPeriods: string[],
  year: number
): HousingObservation | null {
  let best: HousingObservation | null = null;
  for (const p of housingPeriods) {
    const v = entry.housing?.total?.[p];
    if (v === null || v === undefined) continue;
    const y = Number(p);
    const o: HousingObservation = {
      year: y,
      total: v,
      principal: entry.housing?.principal?.[p] ?? null,
      exact: y === year,
      delta_years: Math.abs(y - year)
    };
    if (
      best === null ||
      o.delta_years < best.delta_years ||
      (o.delta_years === best.delta_years && o.year < best.year)
    ) {
      best = o;
    }
  }
  return best;
}
