import { describe, expect, it } from 'vitest';
import { es } from './es';

const dictionaries = import.meta.glob<{ eu: Record<string, string> }>('./eu.ts', {
  eager: true
});
const eu = dictionaries['./eu.ts']?.eu;
const tokens = (value: string) => [...value.matchAll(/\{([^{}]+)\}/g)].map((m) => m[1]).sort();

describe('contrato automático de traducción (no certificación lingüística)', () => {
  it('el gate EU exige un diccionario real, sin aprobar el fallback ES', () => {
    if (process.env.REQUIRE_EU === '1')
      expect(eu, 'EU_MISSING: no hay traducción que revisar').toBeDefined();
  });

  it('cada diccionario EU existente conserva claves, variables y texto íntegro', () => {
    if (!eu) return; // La ausencia solo se admite fuera del gate específico EU.
    expect(Object.keys(eu).sort()).toEqual(Object.keys(es).sort());
    for (const [key, original] of Object.entries(es)) {
      expect(typeof eu[key], key).toBe('string');
      expect(eu[key].trim().length, key).toBeGreaterThan(0);
      expect(eu[key], key).not.toContain('\uFFFD');
      expect(tokens(eu[key]), key).toEqual(tokens(original));
    }
  });
});
