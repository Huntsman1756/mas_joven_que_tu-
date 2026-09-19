import type { Place } from './types';

/** Serialización del estado en la URL (ARCHITECTURE §6, G4 §17). */
export interface UrlState {
  year: number | null;
  place: string | null;
  lat: number | null;
  lon: number | null;
  z: number | null;
  ortho: number | null;
  /** G4: segunda campaña del comparador dentro de FOTO */
  ortho2: number | null;
  building: string | null;
  /** G2: cabezal temporal en pausa (se serializa solo en eventos discretos) */
  play: number | null;
  /** G2-B/G4: vista MAPA·TIEMPO·FOTO·1923-25 (null = 'map', la vista por defecto) */
  view: 'map' | 'time' | 'photo' | 'hist' | null;
  /** G3-A: segundo ancla temporal (DOS AÑOS) */
  compare: number | null;
  /** G4: capítulo editorial activo (lazy) */
  story: string | null;
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
  const pl = num('play');
  const cy = num('compare');
  const o = num('ortho');
  const o2 = num('ortho2');
  const v = p.get('view');
  const st = p.get('story');
  return {
    year: y !== null && y >= 1900 && y <= snapshotYear ? Math.trunc(y) : null,
    place: p.get('place'),
    lat: num('lat'),
    lon: num('lon'),
    z: num('z'),
    ortho: o !== null && o >= 1900 && o <= snapshotYear ? Math.trunc(o) : null,
    ortho2: o2 !== null && o2 >= 1900 && o2 <= snapshotYear ? Math.trunc(o2) : null,
    building: p.get('building'),
    play: pl !== null && pl >= 1900 && pl <= snapshotYear ? Math.trunc(pl) : null,
    view: v === 'time' || v === 'photo' || v === 'hist' ? v : v === 'map' ? 'map' : null,
    compare: cy !== null && cy >= 1900 && cy <= snapshotYear ? Math.trunc(cy) : null,
    story: st && /^[a-z0-9-]+$/.test(st) ? st : null
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
  if (s.ortho2 !== null) p.set('ortho2', String(s.ortho2));
  if (s.building) p.set('building', s.building);
  if (s.play !== null) p.set('play', String(s.play));
  if (s.view && s.view !== 'map') p.set('view', s.view);
  if (s.compare !== null) p.set('compare', String(s.compare));
  if (s.story) p.set('story', s.story);
  const q = p.toString();
  return q ? `?${q}` : '';
}

export function placeFromCatalog(slug: string | null, catalog: Place[]): Place | null {
  if (!slug) return null;
  return catalog.find((m) => m.slug === slug) ?? null;
}
