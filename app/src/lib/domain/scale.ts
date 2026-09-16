/** Umbrales prerregistrados (docs/gates/G1.md §Escala): z<9 municipio, 9–13.5 celda, ≥13.5 edificio. */
export type ScaleLevel = 'BIZKAIA' | 'CELDA' | 'EDIFICIO';

export function scaleLevel(zoom: number): ScaleLevel {
  if (zoom < 9) return 'BIZKAIA';
  if (zoom < 13.5) return 'CELDA';
  return 'EDIFICIO';
}
