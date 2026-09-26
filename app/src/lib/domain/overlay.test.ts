import { describe, expect, it } from 'vitest';
import { nextOverlay, type MobileOverlay } from './overlay';

describe('mobile overlay arbiter (MOB-R1)', () => {
  it('abre un overlay cuando no hay ninguno', () => {
    expect(nextOverlay(null, 'cell')).toBe('cell');
  });
  it('abrir uno distinto cierra el anterior — nunca dos a la vez', () => {
    const states: MobileOverlay[] = ['edit', 'cell', 'campaigns', 'layers', 'info'];
    for (const a of states) for (const b of states) if (a !== b) expect(nextOverlay(a, b)).toBe(b);
  });
  it('reabrir el mismo lo cierra (toggle)', () => {
    expect(nextOverlay('edit', 'edit')).toBe(null);
  });
  it('cerrar explícito deja null', () => {
    expect(nextOverlay('campaigns', null)).toBe(null);
  });
});
