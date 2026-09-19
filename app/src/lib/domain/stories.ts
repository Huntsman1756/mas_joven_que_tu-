/**
 * G4 — historias editoriales (frozen SELECT, evidence/g2/story-briefs).
 * Módulo EAGER y mínimo: solo la configuración de escena de cada capítulo
 * (lugar, año, cámara, cabezal, modo y campañas «desde el aire»). El
 * componente capítulo y su copy viven en un chunk perezoso — nada de esto
 * se pide en el resultado por defecto.
 *
 * Cada def usa solo hechos del evidence pack: municipio ancla, año de
 * referencia, centroide/zoom del componente y campañas reales del catálogo.
 * `air`: campañas pre/post reales — `c2` alimenta el comparador (`ortho2=`).
 */

export interface StoryDef {
  id: string;
  /** slug del municipio ancla (municipalities catalog) */
  place: string;
  /** año de referencia del caso (tiñe mapa y titular) */
  year: number;
  camera: { lat: number; lon: number; zoom: number };
  /** cabezal temporal pausado — nunca autoplay */
  playYear: number | null;
  mode: 'map' | 'time' | 'photo' | 'hist';
  /** «Míralo desde el aire»: campañas reales pre/post del catálogo */
  air: { c1: number; c2: number | null } | null;
}

export const STORY_ORDER = ['c2803', 'f4036', 'f4233', 'f4738', 'f149'] as const;
export type StoryId = (typeof STORY_ORDER)[number];

export const STORIES: Record<StoryId, StoryDef> = {
  c2803: {
    id: 'c2803',
    place: 'portugalete',
    year: 1969,
    camera: { lat: 43.3146, lon: -3.0154, zoom: 13.5 },
    playYear: 1969,
    mode: 'map',
    air: { c1: 1956, c2: 1970 }
  },
  f4036: {
    id: 'f4036',
    place: 'mungia',
    year: 1979,
    camera: { lat: 43.328, lon: -2.8427, zoom: 16 },
    playYear: null,
    mode: 'map',
    air: { c1: 1970, c2: 1983 }
  },
  f4233: {
    id: 'f4233',
    place: 'muskiz',
    year: 1979,
    camera: { lat: 43.328, lon: -3.1141, zoom: 15.5 },
    playYear: 1975,
    mode: 'time',
    air: { c1: 1970, c2: 1983 }
  },
  f4738: {
    id: 'f4738',
    place: 'santurtzi',
    year: 1999,
    camera: { lat: 43.3416, lon: -3.0586, zoom: 15 },
    playYear: null,
    mode: 'map',
    air: { c1: 1990, c2: 2002 }
  },
  f149: {
    id: 'f149',
    place: 'abanto-y-ciervana-abanto-zierbena',
    year: 2009,
    camera: { lat: 43.3281, lon: -3.0648, zoom: 15.5 },
    playYear: null,
    mode: 'map',
    air: { c1: 2002, c2: 2025 }
  }
};

export function storyDef(id: string | null): StoryDef | null {
  if (!id) return null;
  return (STORIES as Record<string, StoryDef>)[id] ?? null;
}

/** Rotación determinista de Descúbreme (orden editorial congelado). */
export function nextStory(current: string | null): StoryId {
  if (!current) return STORY_ORDER[0];
  const i = STORY_ORDER.indexOf(current as StoryId);
  return STORY_ORDER[(i + 1) % STORY_ORDER.length];
}
