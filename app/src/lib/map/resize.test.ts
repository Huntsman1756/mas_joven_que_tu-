import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Map as MLMap } from 'maplibre-gl';
import { observeMapResize } from './resize';

afterEach(() => vi.unstubAllGlobals());

function harness() {
  let notify = () => {};
  let pending: FrameRequestCallback | null = null;
  let ratio = 1;
  const container = { clientWidth: 400, clientHeight: 300, isConnected: true };
  const disconnect = vi.fn();
  const add = vi.fn();
  const remove = vi.fn();
  const resize = vi.fn();
  vi.stubGlobal('window', { addEventListener: add, removeEventListener: remove });
  vi.stubGlobal(
    'ResizeObserver',
    class {
      constructor(callback: () => void) {
        notify = callback;
      }
      observe = vi.fn();
      disconnect = disconnect;
    }
  );
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    pending = callback;
    return 1;
  });
  vi.stubGlobal('cancelAnimationFrame', () => {
    pending = null;
  });
  const stop = observeMapResize({
    getContainer: () => container,
    getPixelRatio: () => ratio,
    resize
  } as unknown as MLMap);
  return {
    container,
    resize,
    notify: () => notify(),
    pixelRatio: (value: number) => (ratio = value),
    flush: () => {
      const callback = pending;
      pending = null;
      callback?.(0);
    },
    stop,
    disconnect,
    remove
  };
}

describe('redimensionado del mapa sin eventos de movimiento redundantes', () => {
  it('no redimensiona cuando el contenedor sigue igual', () => {
    const h = harness();
    h.notify();
    h.flush();
    expect(h.resize).not.toHaveBeenCalled();
  });
  it('agrupa cambios y redimensiona fuera de la entrega del observer', () => {
    const h = harness();
    h.container.clientWidth = 390;
    h.notify();
    h.container.clientHeight = 600;
    h.notify();
    expect(h.resize).not.toHaveBeenCalled();
    h.flush();
    expect(h.resize).toHaveBeenCalledTimes(1);
    h.notify();
    h.flush();
    expect(h.resize).toHaveBeenCalledTimes(1);
  });
  it('atiende cambios de densidad y un contenedor que vuelve a ser visible', () => {
    const h = harness();
    h.pixelRatio(2);
    h.notify();
    h.flush();
    expect(h.resize).toHaveBeenCalledTimes(1);
    h.container.clientWidth = 0;
    h.notify();
    h.flush();
    expect(h.resize).toHaveBeenCalledTimes(1);
    h.container.clientWidth = 320;
    h.notify();
    h.flush();
    expect(h.resize).toHaveBeenCalledTimes(2);
  });
  it('no toca un mapa desmontado y cancela trabajo pendiente', () => {
    const h = harness();
    h.container.clientWidth = 320;
    h.notify();
    h.stop();
    h.flush();
    expect(h.resize).not.toHaveBeenCalled();
    expect(h.disconnect).toHaveBeenCalledOnce();
    expect(h.remove).toHaveBeenCalledWith('resize', expect.any(Function));
  });
});
