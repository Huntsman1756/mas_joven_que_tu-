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
      ortho2: 2002,
      play: 2003,
      view: 'photo' as const,
      compare: 1960,
      story: 'f4036'
    };
    const parsed = parseUrl(serializeUrl(s));
    expect(parsed.year).toBe(1987);
    expect(parsed.place).toBe('leioa');
    expect(parsed.ortho).toBe(1990);
    expect(parsed.ortho2).toBe(2002);
    expect(parsed.building).toBe('abc123');
    expect(parsed.play).toBe(2003);
    expect(parsed.view).toBe('photo');
    expect(parsed.compare).toBe(1960);
    expect(parsed.story).toBe('f4036');
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

  it('compare fuera de rango → null (GA6: nunca muta year)', () => {
    expect(parseUrl('?year=1987&compare=1899').compare).toBeNull();
    expect(parseUrl('?year=1987&compare=2027', 2026).compare).toBeNull();
    expect(parseUrl('?year=1987&compare=abc').compare).toBeNull();
    expect(parseUrl('?compare=1960').compare).toBe(1960);
    // truncado entero, mismo contrato que year/play
    expect(parseUrl('?compare=1960.7').compare).toBe(1960);
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
      ortho2: null,
      building: null,
      play: null,
      view: null,
      compare: null,
      story: null
    });
  });

  it('view=hist serializa y parsea (G4: modo 1923-25)', () => {
    expect(parseUrl('?view=hist').view).toBe('hist');
    expect(parseUrl('?view=photo').view).toBe('photo');
    expect(parseUrl('?view=bogus').view).toBeNull();
  });

  it('story malformado → null (fail-closed)', () => {
    expect(parseUrl('?story=f4036').story).toBe('f4036');
    expect(parseUrl('?story=<script>').story).toBeNull();
    expect(parseUrl('?story=../etc').story).toBeNull();
    // el id parsea aunque no exista; la validación contra STORIES es de applyUrl
    expect(parseUrl('?story=zz999').story).toBe('zz999');
  });

  it('ortho2 fuera de rango → null', () => {
    expect(parseUrl('?ortho2=2025').ortho2).toBe(2025);
    expect(parseUrl('?ortho2=1899').ortho2).toBeNull();
    expect(parseUrl('?ortho2=abc').ortho2).toBeNull();
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
        ortho2: null,
        building: null,
        play: null,
        view: null,
        compare: null,
        story: null
      })
    ).toBe('');
  });
});
