import { describe, it, expect } from 'vitest';
import { parseYs, shareAfter, knownFromYs } from './cells';

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
