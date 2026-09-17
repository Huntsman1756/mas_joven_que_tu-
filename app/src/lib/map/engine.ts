/**
 * Precarga del motor de mapa. En RESULT el mayor coste de red es el chunk de
 * MapLibre (~231 KB br) y su worker (~118 KB br); sin precarga la cascada es
 * serie: métricas → montar MapView → chunk maplibre → worker → teselas.
 * `preloadMapEngine` se dispara al resolver el lugar para solapar esas fases.
 * El worker NO se prefetcha a mano: el contexto del worker no reutiliza la
 * respuesta del fetch principal (medido: 2×118 KB transferidos).
 */
let enginePromise: Promise<[typeof import('maplibre-gl'), typeof import('pmtiles')]> | null = null;

export function preloadMapEngine() {
  if (!enginePromise) {
    enginePromise = Promise.all([import('maplibre-gl'), import('pmtiles')]).then(([ml, pm]) => [
      ml,
      pm
    ]);
    // La CSS no bloquea la construcción del mapa: solo estiliza controles y
    // se carga en paralelo sin formar parte del camino crítico (PERF4/7).
    void import('maplibre-gl/dist/maplibre-gl.css');
  }
  return enginePromise;
}
