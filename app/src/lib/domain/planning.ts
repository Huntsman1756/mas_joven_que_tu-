/**
 * G3-B — planeamiento + contexto de actividad económica.
 *
 * Contratos: docs/DATA_SEMANTICS.md §17 (P-01..P-09).
 * Artefactos (ADR-014): PIP precalculado en pipeline, precisión completa;
 * el runtime solo proyecta facets por building_id — nunca recalcula.
 *
 * Estados explícitos: INSIDE_PLANNING_AREA · OUTSIDE_KNOWN_AREA ·
 * MULTIPLE_OVERLAP (ámbitos/AE se listan, nunca se elige) ·
 * GEOMETRY_UNAVAILABLE · NOT_COVERED · DATA_UNAVAILABLE · METRIC_MISSING.
 */

export interface MuniPlanning {
  /** ejercicio del corte vigente */
  ej: number;
  mes: number;
  /** fecha de extracción oficial visible junto a cada cifra */
  ext: string;
  censo: number | null;
  /** m² suelo residencial total SUB+SUZ (P-02) */
  res_t: number | null;
  /** m² suelo residencial vacante SUB+SUZ (P-03) */
  res_v: number | null;
  /** m² suelo AE total SUB+SUZ (P-04) */
  ae_t: number | null;
  /** m² suelo AE vacante SUB+SUZ (P-05) */
  ae_v: number | null;
  /** viviendas pendientes de ejecución SUB+SUZ+NR (P-06) */
  viv_ej: number | null;
}

export interface PlanningMuniTable {
  v: string;
  muni: Record<string, MuniPlanning>;
}

export interface AmbitoRef {
  n: string | null;
  t: string;
  c: string | null;
}

export interface AeRef {
  id: number;
  n: string;
}

/** [clasif_code, clasif_share, usos, ambitos, ae] */
export type Facet = [number, number, [number, number][], [number, number][], [number, number][]];

export interface PlanningFile {
  cod: number;
  v: string;
  muni: MuniPlanning | null;
  ambitos: Record<string, AmbitoRef>;
  ae: Record<string, AeRef>;
  b: Record<string, Facet>;
}

export const CLASIF_LABEL: Record<number, string> = {
  1: 'clasif.urbano',
  2: 'clasif.urbanizable',
  3: 'clasif.no_urbanizable',
  4: 'clasif.suspendidos'
};

export const USO_LABEL: Record<number, string> = {
  1: 'uso.residencial',
  2: 'uso.act_economicas',
  3: 'uso.sistemas_generales',
  4: 'uso.no_urbanizable',
  5: 'uso.suspendidos'
};

export const AMBITO_T_LABEL: Record<string, string> = {
  ru: 'ambito.resid_urbano',
  au: 'ambito.ae_urbano',
  pr: 'ambito.pe_resid',
  pa: 'ambito.pe_ae',
  rz: 'ambito.resid_urbanizable',
  az: 'ambito.ae_urbanizable'
};

export interface UsoHit {
  uso: number;
  share: number;
}

export interface AmbitoHit {
  ref: AmbitoRef;
  share: number;
}

export interface AeHit {
  ref: AeRef;
  share: number;
}

export type PlanningLocal =
  | {
      kind: 'inside';
      clasif: number;
      clasifShare: number;
      usos: UsoHit[];
      ambitos: AmbitoHit[];
      ae: AeHit[];
    }
  | { kind: 'outside' }
  | { kind: 'multiple_ambito'; clasif: number; clasifShare: number; ambitos: AmbitoHit[] }
  | { kind: 'not_covered' }
  | { kind: 'unavailable' };

/** Decodifica facets de un building_id contra el fichero municipal. */
export function resolveFacets(file: PlanningFile, buildingId: string): PlanningLocal {
  const f = file.b[buildingId];
  if (!f) return { kind: 'not_covered' };
  const [c, cs, usos, ambs, aes] = f;
  const ambHits: AmbitoHit[] = ambs
    .map(([i, s]) => ({ ref: file.ambitos[String(i)], share: s }))
    .filter((h): h is AmbitoHit => h.ref != null);
  const aeHits: AeHit[] = aes
    .map(([i, s]) => ({ ref: file.ae[String(i)], share: s }))
    .filter((h): h is AeHit => h.ref != null);
  const usoHits: UsoHit[] = usos.map(([u, s]) => ({ uso: u, share: s }));
  if (c === 0 && !usoHits.length && !ambHits.length && !aeHits.length) {
    return { kind: 'outside' };
  }
  if (ambHits.length > 1) {
    return { kind: 'multiple_ambito', clasif: c, clasifShare: cs, ambitos: ambHits };
  }
  return {
    kind: 'inside',
    clasif: c,
    clasifShare: cs,
    usos: usoHits,
    ambitos: ambHits,
    ae: aeHits
  };
}

export async function loadPlanningGeom(cod: number): Promise<GeoJSON.FeatureCollection> {
  const { loadPlanningGeom: load } = await import('./catalog');
  return load(cod);
}
