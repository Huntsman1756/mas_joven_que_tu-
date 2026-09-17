import { describe, it, expect } from 'vitest';
import { parseYs, shareAfter, knownFromYs, footprintShareAfter } from './cells';

describe('ys (serie anual serializada)', () => {
  it('parsea pares y:n', () => {
    const m = parseYs('1900:3,1950:7,1987:2');
    expect(m.get(1900)).toBe(3);
    expect(m.get(1950)).toBe(7);
    expect(m.get(1987)).toBe(2);
  });
  it('tolerante con basura', () => {
    expect(parseYs('').size).toBe(0);
    expect(parseYs(null).size).toBe(0);
    expect(parseYs('a:b').size).toBe(0);
  });
  it('shareAfter: cuota sobre año conocido', () => {
    // 10 conocidos; 4 con y > 1987 → 0.4
    expect(shareAfter('1900:6,1990:4', 1987)).toBeCloseTo(0.4);
  });
  it('shareAfter: año en el límite queda «ya existía»', () => {
    expect(shareAfter('1987:5,1988:5', 1987)).toBeCloseTo(0.5);
  });
  it('shareAfter: sin conocidos → null (no 0)', () => {
    expect(shareAfter(null, 1987)).toBeNull();
    expect(shareAfter('', 1987)).toBeNull();
  });
  it('knownFromYs suma', () => {
    expect(knownFromYs('1900:3,1950:7')).toBe(10);
  });
});

describe('ya (huella por año) — C-08 tooltip de celda', () => {
  it('cuota de huella posterior sobre huella con año conocido', () => {
    // 1000 m² en 1900 + 400 m² en 1990 → después de 1987: 400/1400
    expect(footprintShareAfter('1900:1000,1990:400', 1987)).toBeCloseTo(400 / 1400);
  });
  it('año en el límite no cuenta como posterior', () => {
    expect(footprintShareAfter('1987:100,1988:100', 1987)).toBeCloseTo(0.5);
  });
  it('sin huella con año conocido → null (no 0)', () => {
    expect(footprintShareAfter(null, 1987)).toBeNull();
    expect(footprintShareAfter('', 1987)).toBeNull();
  });
  it('tolera áreas decimales serializadas', () => {
    expect(footprintShareAfter('1900:33.33,1990:66.67', 1987)).toBeCloseTo(2 / 3);
  });
});
