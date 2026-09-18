import { describe, expect, it } from 'vitest';
import { histMapSourceDef, histMapTileUrl, toMercator } from './histmap';

describe('histmap source', () => {
  it('usa export ArcGIS con bbox-epsg-3857, nunca la matriz WMTS 25830', () => {
    const url = histMapTileUrl();
    expect(url).toContain('/ORTO_EJ_CARTO_1925/MapServer/export');
    expect(url).toContain('{bbox-epsg-3857}');
    expect(url).toContain('imageSR=3857');
    expect(url).not.toContain('WMTS');
    const def = histMapSourceDef();
    expect(def.type).toBe('raster');
    expect(def.tileSize).toBe(256);
    expect(def.attribution).toContain('1923');
  });

  it('toMercator proyecta el centro de Bizkaia dentro del extent 3857', () => {
    const [x, y] = toMercator(-2.93, 43.26);
    expect(x).toBeCloseTo(-326211, -2);
    expect(y).toBeCloseTo(5351631, -2);
  });
});
