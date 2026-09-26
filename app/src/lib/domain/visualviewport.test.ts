import { describe, expect, it } from 'vitest';
import { bottomOcclusion } from './visualviewport';

describe('bottomOcclusion — visual viewport real (MOB-R1 §3/§20)', () => {
  it('Safari con toolbar visible: la franja inferior queda ocluida', () => {
    // iPhone: innerHeight 844, visualViewport 761 → 83 px bajo el chrome
    expect(bottomOcclusion(844, 761, 0)).toBe(83);
  });
  it('toolbar oculta (scroll): no hay oclusión', () => {
    expect(bottomOcclusion(844, 844, 0)).toBe(0);
  });
  it('teclado virtual abierto: la oclusión es el teclado', () => {
    expect(bottomOcclusion(844, 450, 0)).toBe(394);
  });
  it('respeta offsetTop (vv desplazado)', () => {
    expect(bottomOcclusion(844, 700, 20)).toBe(124);
  });
  it('nunca negativa: zoom/pinch puede hacer vv ≥ innerHeight', () => {
    expect(bottomOcclusion(844, 900, 0)).toBe(0);
  });
});
