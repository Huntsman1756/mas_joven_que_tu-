import type { Map as MLMap } from 'maplibre-gl';

/** Resize outside observer delivery so canvas updates cannot feed its layout loop. */
export function observeMapResize(map: MLMap): () => void {
  const container = map.getContainer();
  let frame: number | null = null;
  let width = container.clientWidth;
  let height = container.clientHeight;
  let ratio = map.getPixelRatio();
  const schedule = () => {
    if (frame !== null) return;
    frame = requestAnimationFrame(() => {
      frame = null;
      if (!container.isConnected || !container.clientWidth || !container.clientHeight) return;
      const nextRatio = map.getPixelRatio();
      if (
        width === container.clientWidth &&
        height === container.clientHeight &&
        ratio === nextRatio
      )
        return;
      width = container.clientWidth;
      height = container.clientHeight;
      ratio = nextRatio;
      map.resize();
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
