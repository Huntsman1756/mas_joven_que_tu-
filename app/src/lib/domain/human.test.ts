import { describe, it, expect } from 'vitest';
import { approxOfTen, approxKind } from './human';

describe('approxOfTen — aproximación humana determinista (GC5)', () => {
  it('décimas exactas', () => {
    expect(approxOfTen(0)).toBe('ninguno');
    expect(approxOfTen(20)).toBe('2 de cada 10');
    expect(approxOfTen(50)).toBe('5 de cada 10');
    expect(approxOfTen(100)).toBe('casi todos');
  });

  it('fracciones intermedias se declaran, no se redondean', () => {
    expect(approxOfTen(58.3)).toBe('casi 6 de cada 10');
    expect(approxOfTen(32)).toBe('algo más de 3 de cada 10');
    expect(approxOfTen(84.6)).toBe('algo más de 8 de cada 10');
  });

  it('bordes: x.45 / x.55 son deterministas', () => {
    // 54.9 → 5.49 → «algo más de 5»; 55.1 → «algo menos de 6»
    expect(approxOfTen(54.9)).toBe('algo más de 5 de cada 10');
    expect(approxOfTen(55.1)).toBe('algo menos de 6 de cada 10');
    // 64.9 → «algo más de 6»; 65.1 → «algo menos de 7»
    expect(approxOfTen(64.9)).toBe('algo más de 6 de cada 10');
    expect(approxOfTen(65.1)).toBe('algo menos de 7 de cada 10');
    // 57.5 (frac .75) → «casi 6»
    expect(approxOfTen(57.5)).toBe('casi 6 de cada 10');
  });

  it('extremos bajos y altos', () => {
    expect(approxOfTen(2)).toBe('menos de 1 de cada 10');
    expect(approxOfTen(97)).toBe('casi todos');
    expect(approxOfTen(95.0)).toBe('casi todos');
    expect(approxOfTen(94.9)).toBe('algo más de 9 de cada 10');
  });

  it('determinista y acotada', () => {
    for (const p of [0, 7.5, 44.4, 45.0, 55.5, 61.7, 74.9, 95, 100]) {
      const s = approxOfTen(p);
      expect(typeof s).toBe('string');
      expect(s.length).toBeGreaterThan(0);
    }
  });
});

describe('approxKind — clase gramatical para la frase directa (G5-R2)', () => {
  it('bordes: none / all / some', () => {
    expect(approxKind(0)).toBe('none');
    expect(approxKind(95)).toBe('all');
    expect(approxKind(100)).toBe('all');
    expect(approxKind(4.4)).toBe('some');
    expect(approxKind(47.6)).toBe('some');
    expect(approxKind(94.9)).toBe('some');
  });
  it('clamp fuera de rango', () => {
    expect(approxKind(-3)).toBe('none');
    expect(approxKind(120)).toBe('all');
  });
});
