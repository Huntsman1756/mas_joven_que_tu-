import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { headlineForYear } from './metrics';
import type { MetricsFile } from './types';

/**
 * Invariante «editorial only» (G9): los valores de dominio congelados no
 * cambian entre candidatos. Cualquier refactor de copy/formato debe pasar
 * este test sin tocar las cifras — si cambian, la fase dejó de ser solo
 * editorial o los datos se regeneraron sin manifest.
 */
function metrics(slug: string): MetricsFile {
  const p = fileURLToPath(new URL(`../../../static/data/metrics/${slug}.json`, import.meta.url));
  return JSON.parse(readFileSync(p, 'utf8')) as MetricsFile;
}

describe('valores congelados (G8 ≡ G9 ≡ posteriores)', () => {
  it('Bilbao / 1952 — titular del caso de validación', () => {
    const h = headlineForYear(metrics('bilbao'), 1952);
    expect(h.total).toBe(13750);
    expect(h.known).toBe(13738);
    expect(h.after).toBe(9289);
    expect(h.unknown).toBe(9);
    expect(h.suspicious).toBe(3);
    expect(Math.round(h.sharePct * 10) / 10).toBe(67.6);
    expect(h.coveragePct).toBe(99.91);
  });

  it('Mungia / 1979 — municipio medio', () => {
    const h = headlineForYear(metrics('mungia'), 1979);
    expect(h.total).toBe(4483);
    expect(h.known).toBe(4472);
    expect(h.after).toBe(2679);
    expect(h.unknown).toBe(0);
    expect(h.suspicious).toBe(11);
    expect(Math.round(h.sharePct * 10) / 10).toBe(59.9);
  });

  it('Arakaldo / 1987 — municipio pequeño (109 edificios)', () => {
    const h = headlineForYear(metrics('arakaldo'), 1987);
    expect(h.total).toBe(109);
    expect(h.known).toBe(109);
    expect(h.after).toBe(28);
    expect(h.unknown).toBe(0);
    expect(h.suspicious).toBe(0);
    expect(h.coveragePct).toBe(100);
  });

  it('Bilbao / 2015 — año reciente', () => {
    const h = headlineForYear(metrics('bilbao'), 2015);
    expect(h.known).toBe(13738);
    expect(h.after).toBe(262);
    expect(Math.round(h.sharePct * 10) / 10).toBe(1.9);
  });
});
