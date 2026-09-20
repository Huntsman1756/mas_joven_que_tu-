import type { Map as MLMap } from 'maplibre-gl';

/**
 * Registro del mapa principal para el lienzo de comparación (G5-E).
 * MapView lo publica al cargar; CompareMap lo lee para sincronizar la
 * cámara (una dirección: el lienzo de comparación no es interactivo).
 */
export const mapSync: { main: MLMap | null } = { main: null };
