/**
 * Precarga del motor de mapa. En RESULT el mayor coste de red es el chunk de
 * MapLibre (~231 KB br) y su worker (~118 KB br); sin precarga la cascada es
 * serie: métricas → montar MapView → chunk maplibre → worker → teselas.
 * `preloadMapEngine` se dispara al resolver el lugar para solapar esas fases.
 */
let enginePromise: Promise<
  [typeof import('maplibre-gl'), typeof import('pmtiles')]
> | null = null;

export function preloadMapEngine() {
  if (!enginePromise) {
    const base = import.meta.env.BASE_URL;
    const css: Promise<unknown> = import('maplibre-gl/dist/maplibre-gl.css');
    enginePromise = Promise.all([
      import('maplibre-gl'),
      import('pmtiles'),
      css,
    ]).then(([ml, pm]) => [ml, pm]);
    // El worker lo instancia MapLibre por ruta fija (setWorkerUrl); calentar
    // la caché aquí evita la espera serie worker→teselas vista en P2.
    void fetch(`${base}vendor/maplibre-gl-worker.mjs`).catch(() => {});
    void fetch(`${base}vendor/maplibre-gl-shared.mjs`).catch(() => {});
  }
  return enginePromise;
}
