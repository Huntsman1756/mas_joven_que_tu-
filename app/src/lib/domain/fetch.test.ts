import { describe, expect, it, vi } from 'vitest';
import { timeoutSignal } from './fetch';

// Regresión ANDROID-01: `AbortSignal.any` no existe en Chrome ≤116 —
// el fallback debe comportarse igual en ambas ramas.
describe('timeoutSignal', () => {
  it('sin señal externa → solo timeout (rama de una señal)', () => {
    const s = timeoutSignal(60_000);
    expect(s).toBeInstanceOf(AbortSignal);
    expect(s.aborted).toBe(false);
  });

  it('timeout dispara abort con reason TimeoutError', async () => {
    const s = timeoutSignal(10);
    await vi.waitFor(() => expect(s.aborted).toBe(true), { timeout: 2000 });
    expect((s.reason as DOMException).name).toBe('TimeoutError');
  });

  it('la señal externa propaga su abort (rama nativa)', () => {
    const src = new AbortController();
    const s = timeoutSignal(60_000, src.signal);
    src.abort('stop');
    expect(s.aborted).toBe(true);
  });

  describe('fallback (sin AbortSignal.any, Chrome ≤116)', () => {
    it('timeout y señal externa abortan', async () => {
      const orig = AbortSignal.any;
      // @ts-expect-error — simular navegador sin AbortSignal.any
      AbortSignal.any = undefined;
      try {
        const src = new AbortController();
        const s = timeoutSignal(60_000, src.signal);
        src.abort('ext');
        expect(s.aborted).toBe(true);
        expect(s.reason).toBe('ext');

        const s2 = timeoutSignal(10);
        await vi.waitFor(() => expect(s2.aborted).toBe(true), { timeout: 2000 });
      } finally {
        AbortSignal.any = orig;
      }
    });

    it('señal ya abortada antes de componer → aborta inmediato', () => {
      const orig = AbortSignal.any;
      // @ts-expect-error — rama fallback
      AbortSignal.any = undefined;
      try {
        const src = new AbortController();
        src.abort('ya');
        const s = timeoutSignal(60_000, src.signal);
        expect(s.aborted).toBe(true);
      } finally {
        AbortSignal.any = orig;
      }
    });
  });
});
