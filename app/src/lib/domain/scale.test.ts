import { describe, it, expect } from 'vitest';
import { scaleLevel } from './scale';

describe('scaleLevel — umbrales prerregistrados', () => {
  it('z < 9 → BIZKAIA', () => {
    for (const z of [0, 5, 8.9, 8.99]) expect(scaleLevel(z)).toBe('BIZKAIA');
  });
  it('9 ≤ z < 13.5 → CELDA', () => {
    for (const z of [9, 9.0, 11, 13.49]) expect(scaleLevel(z)).toBe('CELDA');
  });
  it('z ≥ 13.5 → EDIFICIO', () => {
    for (const z of [13.5, 14, 17]) expect(scaleLevel(z)).toBe('EDIFICIO');
  });
  it('barrido de 60 zooms: transición exacta en los umbrales', () => {
    const zs = Array.from({ length: 60 }, (_, i) => 6 + i * 0.2);
    for (const z of zs) {
      const lv = scaleLevel(z);
      if (z < 9) expect(lv).toBe('BIZKAIA');
      else if (z < 13.5) expect(lv).toBe('CELDA');
      else expect(lv).toBe('EDIFICIO');
    }
  });
});
