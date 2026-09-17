import type { Place } from './types';

/** Serialización del estado en la URL (ARCHITECTURE §6). */
export interface UrlState {
  year: number | null;
  place: string | null;
  lat: number | null;
  lon: number | null;
  z: number | null;
  ortho: number | null;
  building: string | null;
}

export function parseUrl(search: string, snapshotYear = 2026): UrlState {
  const p = new URLSearchParams(search);
  const num = (k: string) => {
    const v = p.get(k);
    if (v === null) return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };
  const y = num('year');
  return {
    year: y !== null && y >= 1900 && y <= snapshotYear ? Math.trunc(y) : null,
    place: p.get('place'),
    lat: num('lat'),
    lon: num('lon'),
    z: num('z'),
    ortho: num('ortho'),
    building: p.get('building')
  };
}

export function serializeUrl(s: UrlState): string {
  const p = new URLSearchParams();
  if (s.year !== null) p.set('year', String(s.year));
  if (s.place) p.set('place', s.place);
  if (s.lat !== null) p.set('lat', s.lat.toFixed(5));
  if (s.lon !== null) p.set('lon', s.lon.toFixed(5));
  if (s.z !== null) p.set('z', s.z.toFixed(2));
  if (s.ortho !== null) p.set('ortho', String(s.ortho));
  if (s.building) p.set('building', s.building);
  const q = p.toString();
  return q ? `?${q}` : '';
}

export function placeFromCatalog(slug: string | null, catalog: Place[]): Place | null {
  if (!slug) return null;
  return catalog.find((m) => m.slug === slug) ?? null;
}
