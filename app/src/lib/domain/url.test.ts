import { describe, it, expect } from 'vitest';
import { parseUrl, serializeUrl } from './url';

describe('URL state', () => {
  it('round-trip completo', () => {
    const s = {
      year: 1987,
      place: 'leioa',
      lat: 43.326,
      lon: -2.989,
      z: 13.8,
      ortho: 1990,
      building: 'abc123',
    };
    const parsed = parseUrl(serializeUrl(s));
    expect(parsed.year).toBe(1987);
    expect(parsed.place).toBe('leioa');
    expect(parsed.ortho).toBe(1990);
    expect(parsed.building).toBe('abc123');
    expect(parsed.lat).toBeCloseTo(43.326, 4);
    expect(parsed.lon).toBeCloseTo(-2.989, 4);
    expect(parsed.z).toBeCloseTo(13.8, 1);
  });

  it('año fuera de rango → null', () => {
    expect(parseUrl('?year=1899').year).toBeNull();
    expect(parseUrl('?year=2027', 2026).year).toBeNull();
    expect(parseUrl('?year=abc').year).toBeNull();
    expect(parseUrl('?year=1987').year).toBe(1987);
  });

  it('URL vacía → todo null', () => {
    const s = parseUrl('');
    expect(s).toEqual({
      year: null,
      place: null,
      lat: null,
      lon: null,
      z: null,
      ortho: null,
      building: null,
    });
  });

  it('serialización vacía → sin query', () => {
    expect(
      serializeUrl({
        year: null,
        place: null,
        lat: null,
        lon: null,
        z: null,
        ortho: null,
        building: null,
      })
    ).toBe('');
  });
});
