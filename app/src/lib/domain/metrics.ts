import type { MetricsFile } from './types';

/**
 * Lectores canónicos de las métricas. El frontend proyecta, no recalcula
 * denominadores: todo se deriva de `dist`/`cum` ya auditados por el pipeline.
 */

export interface Headline {
  after: number;
  known: number;
  total: number;
  unknown: number;
  suspicious: number;
  /** 0–100 */
  sharePct: number;
  coveragePct: number;
  /** m² de huella de los edificios posteriores */
  footprintAfterM2: number;
}

/** acumulado de edificios con año válido y y <= year (y huella) */
export function cumAt(m: MetricsFile, year: number): { c: number; fp: number } {
  let c = 0;
  let fp = 0;
  for (const row of m.cum) {
    if (row.y <= year) {
      c = row.cum_buildings;
      fp = row.cum_footprint_area;
    } else break;
  }
  return { c, fp };
}

/** Proyección canónica C-04/C-05/C-07/C-08 para un año arbitrario. */
export function headlineForYear(m: MetricsFile, year: number): Headline {
  const { c: upToYear, fp: fpUpToYear } = cumAt(m, year);
  const k = m.constants;
  const after = k.c02 - upToYear;
  return {
    after,
    known: k.c02,
    total: k.c01,
    unknown: k.unknown,
    suspicious: k.suspicious + k.invalid,
    sharePct: k.c02 > 0 ? (after / k.c02) * 100 : 0,
    coveragePct: k.coverage_pct,
    footprintAfterM2: Math.max(0, k.c06 - fpUpToYear)
  };
}

export interface DistBucket {
  /** 'pre1900' | '1900'..'2020' | 'none' */
  id: string;
  label: string;
  n: number;
  /** edificios del bucket con y > year (parte «posterior» del bucket que lo cruza) */
  nAfter: number;
  /** 0-100 sobre known (excepto 'none', que va sobre total) */
  sharePct: number;
  inTemporalAxis: boolean;
}

const DECADES = [1900, 1910, 1920, 1930, 1940, 1950, 1960, 1970, 1980, 1990, 2000, 2010, 2020];

/**
 * Buckets de la distribución: <1900 + 13 décadas + «sin año» (fuera del eje).
 * El bucket que cruza el año seleccionado se divide con los datos anuales
 * reales (dist), nunca interpolando.
 */
export function bucketsForYear(m: MetricsFile, year: number): DistBucket[] {
  const k = m.constants;
  const unknown = k.unknown + k.suspicious + k.invalid;
  const byDecade = new Map<number, { n: number; nAfter: number }>();
  const pre = { n: 0, nAfter: 0 };
  for (const d of DECADES) byDecade.set(d, { n: 0, nAfter: 0 });
  for (const row of m.dist) {
    const target = row.y < 1900 ? pre : byDecade.get(Math.floor(row.y / 10) * 10)!;
    target.n += row.n;
    if (row.y > year) target.nAfter += row.n;
  }
  const share = (n: number) => (k.c02 > 0 ? (n / k.c02) * 100 : 0);
  const out: DistBucket[] = [
    {
      id: 'pre1900',
      label: '<1900',
      n: pre.n,
      nAfter: pre.nAfter,
      sharePct: share(pre.n),
      inTemporalAxis: true
    },
    ...DECADES.map((d) => {
      const b = byDecade.get(d)!;
      return {
        id: String(d),
        label: `${d}s`,
        n: b.n,
        nAfter: b.nAfter,
        sharePct: share(b.n),
        inTemporalAxis: true
      };
    }),
    {
      id: 'none',
      label: 'sin año',
      n: unknown,
      nAfter: 0,
      sharePct: k.c01 > 0 ? (unknown / k.c01) * 100 : 0,
      inTemporalAxis: false
    }
  ];
  return out;
}

/** Posición continua del marcador de año en el eje temporal (en unidades de bucket). */
export function markerPosition(year: number): number {
  const idx = DECADES.findIndex((d) => year >= d && year < d + 10);
  if (idx === -1) return year < 1900 ? 0.5 : DECADES.length + 0.5;
  return idx + 1 + (year - DECADES[idx]) / 10; // +1 por el bucket pre1900
}

// ── DOS AÑOS (G3-A §5): partición del mismo universo con dos anclas ──

export interface TwoYearPartition {
  earlier: number;
  later: number;
  /** y <= earlier */
  leEarlier: { n: number; fp: number };
  /** earlier < y <= later */
  between: { n: number; fp: number };
  /** y > later */
  gtLater: { n: number; fp: number };
  /** estado no VALID (unknown+suspicious+invalid) — fuera del orden temporal */
  nonValid: { n: number };
  /** denominador temporal explícito: edificios actuales con año conocido (C-02) */
  known: number;
  /** denominador huella: m² de edificios con año conocido y geom válida (C-06) */
  knownFp: number;
}

/**
 * Partición del stock actual por dos años de referencia (earlier < later).
 * Misma serie canónica `cum` y mismas reglas de validez que la métrica
 * principal: la suma leEarlier+between+gtLater = c02 (known) exactamente.
 */
export function twoYearPartition(m: MetricsFile, a: number, b: number): TwoYearPartition {
  const earlier = Math.min(a, b);
  const later = Math.max(a, b);
  const e = cumAt(m, earlier);
  const l = cumAt(m, later);
  const k = m.constants;
  const nonValid = k.unknown + k.suspicious + k.invalid;
  return {
    earlier,
    later,
    leEarlier: { n: e.c, fp: e.fp },
    between: { n: l.c - e.c, fp: l.fp - e.fp },
    gtLater: { n: k.c02 - l.c, fp: Math.max(0, k.c06 - l.fp) },
    nonValid: { n: nonValid },
    known: k.c02,
    knownFp: k.c06
  };
}
