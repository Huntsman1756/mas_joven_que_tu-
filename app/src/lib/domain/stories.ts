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
  /**
   * Contraste C-05/C-08 del capítulo — valores congelados del story brief
   * (G4-H1: el contraste vive solo en los capítulos cuya señal es la
   * divergencia recuento↔huella; no hay Contrast municipal en el flujo).
   * `ref`: año de corte · `count`: % edificios posteriores (C-05) ·
   * `footprint`: % huella en planta elegible posterior (C-08).
   */
  contrast: { ref: number; count: number; footprint: number } | null;
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
    air: { c1: 1956, c2: 1970 },
    contrast: null
  },
  f4036: {
    id: 'f4036',
    place: 'mungia',
    year: 1979,
    camera: { lat: 43.328, lon: -2.8427, zoom: 16 },
    playYear: null,
    mode: 'map',
    air: { c1: 1970, c2: 1983 },
    contrast: { ref: 1979, count: 85.7, footprint: 1.9 }
  },
  f4233: {
    id: 'f4233',
    place: 'muskiz',
    year: 1979,
    camera: { lat: 43.328, lon: -3.1141, zoom: 15.5 },
    playYear: 1975,
    mode: 'time',
    air: { c1: 1970, c2: 1983 },
    contrast: null
  },
  f4738: {
    id: 'f4738',
    place: 'santurtzi',
    year: 1999,
    camera: { lat: 43.3416, lon: -3.0586, zoom: 15 },
    playYear: null,
    mode: 'map',
    air: { c1: 1990, c2: 2002 },
    contrast: { ref: 1999, count: 11.1, footprint: 94.7 }
  },
  f149: {
    id: 'f149',
    place: 'abanto-y-ciervana-abanto-zierbena',
    year: 2009,
    camera: { lat: 43.3281, lon: -3.0648, zoom: 15.5 },
    playYear: null,
    mode: 'map',
    air: { c1: 2002, c2: 2025 },
    contrast: null
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

/**
 * G4-H2: destino de la acción primaria del capítulo y su etiqueta.
 * Con pulso temporal (`playYear`) la acción lleva a TIEMPO («Ver en el
 * tiempo»); sin él reencuadra el mapa («Ver en el mapa»). Nunca autoplay.
 */
export function moveTarget(def: StoryDef): 'time' | 'map' {
  return def.playYear !== null ? 'time' : 'map';
}

/**
 * G4-H2: modalidad de la última interacción real (teclado/puntero). Vive a
 * nivel de módulo porque el capítulo se desmonta y remonta al cambiar de
 * historia (`enterStory` → `selectPlace` limpia `story`): el indicador de
 * foco del encabezado no puede depender de estado de instancia.
 */
type Modality = 'none' | 'key' | 'pointer';
let modality: Modality = 'none';
if (typeof window !== 'undefined') {
  window.addEventListener('keydown', () => (modality = 'key'), { capture: true });
  window.addEventListener('pointerdown', () => (modality = 'pointer'), { capture: true });
}
export function lastModality(): Modality {
  return modality;
}
