import type { Map as MLMap } from 'maplibre-gl';

/** Resize outside observer delivery so canvas updates cannot feed its layout loop. */
export function observeMapResize(map: MLMap): () => void {
  const container = map.getContainer();
  let frame: number | null = null;
  const schedule = () => {
    if (frame !== null) return;
    frame = requestAnimationFrame(() => {
      frame = null;
      if (container.isConnected) map.resize();
    });
  };
  const observer = new ResizeObserver(schedule);
  observer.observe(container);
  window.addEventListener('resize', schedule);
  return () => {
    observer.disconnect();
    window.removeEventListener('resize', schedule);
    if (frame !== null) cancelAnimationFrame(frame);
  };
}
