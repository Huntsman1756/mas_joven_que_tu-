import { describe, it, expect } from 'vitest';
import { headlineForYear, bucketsForYear, markerPosition, twoYearPartition } from './metrics';
import type { MetricsFile } from './types';

const M: MetricsFile = {
  municipality: { codigo_mun: 54, slug: 'leioa', name: 'Leioa' },
  snapshot_year: 2026,
  contracts_version: 'test',
  constants: {
    c01: 100,
    c02: 90,
    unknown: 8,
    suspicious: 2,
    invalid: 0,
    invalid_geom: 0,
    coverage_pct: 90,
    c06: 100_000,
    min_year: 1900,
    max_year: 2020,
    heaping_05_pct: 30
  },
  cum: [
    { y: 1950, cum_buildings: 30, cum_footprint_area: 40_000 },
    { y: 1987, cum_buildings: 50, cum_footprint_area: 60_000 },
    { y: 2000, cum_buildings: 80, cum_footprint_area: 90_000 },
    { y: 2020, cum_buildings: 90, cum_footprint_area: 100_000 }
  ],
  dist: [
    { y: 1935, n: 10 },
    { y: 1950, n: 20 },
    { y: 1980, n: 10 },
    { y: 1987, n: 10 },
    { y: 1988, n: 10 },
    { y: 1990, n: 10 },
    { y: 2000, n: 10 },
    { y: 2010, n: 10 }
  ],
  decades: [],
  no_year_count: 10
};

describe('proyección canónica C-04/C-05', () => {
  it('share = after/known ×100 sobre año conocido', () => {
    const h = headlineForYear(M, 1987);
    // cum(1987)=50 → after = 90-50 = 40 → 40/90*100 = 44.44
    expect(h.after).toBe(40);
    expect(h.sharePct).toBeCloseTo(44.444, 2);
    expect(h.known).toBe(90);
    expect(h.total).toBe(100);
  });
  it('el año del propio límite cuenta como «ya existía»', () => {
    const h = headlineForYear(M, 2000);
    expect(h.after).toBe(10);
  });
  it('denominador nunca cambia con el año', () => {
    expect(headlineForYear(M, 1900).known).toBe(90);
    expect(headlineForYear(M, 2025).known).toBe(90);
  });
  it('huella posterior = c06 - cum_fp(year)', () => {
    expect(headlineForYear(M, 1987).footprintAfterM2).toBeCloseTo(40_000);
  });
});

describe('bucketsForYear', () => {
  it('16 buckets: <1900 + 13 décadas + 2020s + sin año = 15…16', () => {
    const b = bucketsForYear(M, 1987);
    expect(b.length).toBe(15); // pre1900 + 13 décadas + none
    expect(b[0].id).toBe('pre1900');
    expect(b.at(-1)!.id).toBe('none');
    expect(b.at(-1)!.inTemporalAxis).toBe(false);
  });
  it('el bucket que cruza el año se divide exacto por datos anuales', () => {
    const b = bucketsForYear(M, 1987);
    const d80 = b.find((x) => x.id === '1980')!;
    // 1980s: 10+10+10 = 30; con y>1987: solo 1988 → 10
    expect(d80.n).toBe(30);
    expect(d80.nAfter).toBe(10);
  });
  it('sin año nunca aparece en el eje temporal', () => {
    const b = bucketsForYear(M, 1987);
    const none = b.find((x) => x.id === 'none')!;
    expect(none.n).toBe(10);
    expect(none.inTemporalAxis).toBe(false);
    // share del bucket none es sobre total, no sobre known
    expect(none.sharePct).toBeCloseTo(10);
  });
  it('totales: suma de buckets temporales = c02', () => {
    const b = bucketsForYear(M, 1987);
    const sum = b.filter((x) => x.inTemporalAxis).reduce((a, x) => a + x.n, 0);
    expect(sum).toBe(90);
  });
});

describe('markerPosition', () => {
  it('año a mitad de década → fracción', () => {
    // 1987 → bucket idx de 1980 = 8 (0-based en DECADES) +1 por pre1900 → 9.x
    expect(markerPosition(1987)).toBeCloseTo(9.7, 5);
  });
  it('1900 → inicio del segundo bucket', () => {
    expect(markerPosition(1900)).toBeCloseTo(1.0, 5);
  });
});

describe('twoYearPartition (G3-A DOS AÑOS, gate §5)', () => {
  it('partición exacta sobre la misma fuente cum: suma = c02', () => {
    const p = twoYearPartition(M, 1960, 1987);
    expect(p.earlier).toBe(1960);
    expect(p.later).toBe(1987);
    // cum(1960)=30 · cum(1987)=50 · c02=90
    expect(p.leEarlier.n).toBe(30);
    expect(p.between.n).toBe(20);
    expect(p.gtLater.n).toBe(40);
    expect(p.leEarlier.n + p.between.n + p.gtLater.n).toBe(p.known);
    expect(p.known).toBe(90);
  });
  it('denominador de huella separado (c06) y coherente', () => {
    const p = twoYearPartition(M, 1960, 1987);
    expect(p.leEarlier.fp).toBe(40_000);
    expect(p.between.fp).toBe(20_000);
    expect(p.gtLater.fp).toBe(40_000);
    expect(p.leEarlier.fp + p.between.fp + p.gtLater.fp).toBe(p.knownFp);
  });
  it('años invertidos se normalizan a earlier/later', () => {
    const p = twoYearPartition(M, 1987, 1960);
    expect(p.earlier).toBe(1960);
    expect(p.later).toBe(1987);
    expect(p.leEarlier.n).toBe(30);
    expect(p.between.n).toBe(20);
  });
  it('años iguales → intervalo degenerado (between = 0)', () => {
    const p = twoYearPartition(M, 1987, 1987);
    expect(p.earlier).toBe(1987);
    expect(p.later).toBe(1987);
    expect(p.between.n).toBe(0);
    expect(p.leEarlier.n + p.gtLater.n).toBe(p.known);
  });
  it('non-VALID fuera de la ordenación temporal, nunca en los buckets', () => {
    const p = twoYearPartition(M, 1960, 1987);
    // unknown 8 + suspicious 2 + invalid 0 = 10 = c01 - c02
    expect(p.nonValid.n).toBe(10);
    expect(p.nonValid.n + p.known).toBe(100);
  });
});
