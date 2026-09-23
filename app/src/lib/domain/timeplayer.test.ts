import { describe, it, expect } from 'vitest';
import { AXIS_MIN, ageAt, clampYear, milestones, playbackTickMs } from './timeplayer';

describe('ageAt', () => {
  it('edad cumplida en un año dado', () => {
    expect(ageAt(1952, 1962)).toBe(10);
    expect(ageAt(1952, 1970)).toBe(18);
    expect(ageAt(1952, 2026)).toBe(74);
  });

  it('negativa antes del nacimiento (el eje permite explorar antes) ', () => {
    expect(ageAt(1952, 1930)).toBe(-22);
  });
});

describe('milestones', () => {
  it('nacimiento 1952 → los seis hitos del relato', () => {
    const ms = milestones(1952, 2026);
    expect(ms.map((m) => m.year)).toEqual([1952, 1962, 1970, 1982, 2002, 2026]);
    expect(ms.map((m) => m.kind)).toEqual(['birth', 'age', 'age', 'age', 'age', 'today']);
    expect(ms.map((m) => m.age)).toEqual([0, 10, 18, 30, 50, 74]);
  });

  it('nacimiento reciente: solo caben los hitos < snapshot', () => {
    const ms = milestones(2010, 2026);
    expect(ms.map((m) => m.year)).toEqual([2010, 2020, 2026]);
    expect(ms[1]).toMatchObject({ kind: 'age', age: 10 });
  });

  it('hito > snapshot nunca se afirma (no hay futuro)', () => {
    const ms = milestones(2010, 2026);
    expect(ms.every((m) => m.year <= 2026)).toBe(true);
    expect(ms.map((m) => m.age)).not.toContain(18);
  });

  it('nacimiento muy reciente: solo nacimiento + actualidad', () => {
    expect(milestones(2020, 2026).map((m) => m.kind)).toEqual(['birth', 'today']);
  });

  it('nacimiento en el año del snapshot: un único hito', () => {
    expect(milestones(2026, 2026)).toEqual([{ year: 2026, kind: 'birth', age: 0 }]);
  });

  it('orden siempre ascendente', () => {
    for (const b of [1900, 1952, 1988, 2001, 2015]) {
      const ys = milestones(b, 2026).map((m) => m.year);
      expect([...ys].sort((a, z) => a - z)).toEqual(ys);
    }
  });
});

describe('playbackTickMs', () => {
  it('vida larga (~74 años): ~140 ms/año → recorrido ≈ 10 s', () => {
    const ms = playbackTickMs(1952, 2026);
    expect(ms).toBeCloseTo(140, 0);
    expect(ms * (2026 - 1952)).toBeGreaterThanOrEqual(6000);
    expect(ms * (2026 - 1952)).toBeLessThanOrEqual(15000);
  });

  it('vida corta: acotado a 6 s mínimos (no parpadea)', () => {
    const ms = playbackTickMs(2020, 2026);
    expect(ms * (2026 - 2020)).toBe(6000);
  });

  it('vida muy larga: acotado a 15 s máximos', () => {
    const ms = playbackTickMs(1900, 2026);
    expect(ms * (2026 - 1900)).toBe(15000);
    expect(ms).toBeCloseTo(15000 / 126, 0);
  });

  it('span degenerado (birth = snapshot) no divide por cero', () => {
    expect(() => playbackTickMs(2026, 2026)).not.toThrow();
    expect(playbackTickMs(2026, 2026)).toBeGreaterThan(0);
  });
});

describe('clampYear', () => {
  it('acota al eje [AXIS_MIN, snapshot]', () => {
    expect(clampYear(1970, 2026)).toBe(1970);
    expect(clampYear(1899, 2026)).toBe(AXIS_MIN);
    expect(clampYear(2030, 2026)).toBe(2026);
    expect(clampYear(1970.6, 2026)).toBe(1971);
  });
});
