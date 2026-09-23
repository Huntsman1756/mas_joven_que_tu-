import { describe, it, expect } from 'vitest';
import { AXIS_MIN, clampYear, playbackTickMs } from './timeplayer';

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
