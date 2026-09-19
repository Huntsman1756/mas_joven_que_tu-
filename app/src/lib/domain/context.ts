/**
 * G3-D — contexto actual condicional (ruido, movilidad, monte público).
 *
 * Contratos: docs/DATA_SEMANTICS.md §18 (R-01..R-03). Artefactos: PIP y
 * distancias precalculados en pipeline (`pipeline/g3d_build_artifacts.py`,
 * R=400 m / N=5 congelados en gate §4); el runtime solo proyecta facets
 * por building_id — nunca recalcula geometría.
 *
 * Tres módulos independientes: un fallo de uno no suprime a los demás.
 * No existe magnitud combinada (score, ranking, «peor caso»).
 */

export interface StopRef {
  /** CodigoReducidoParada oficial */
  id: string;
  /** Denominacion oficial */
  n: string;
  /** códigos de ruta extraídos de CodificacionRuta (prefijo antes de «_») */
  r: string[];
}

export interface MonteRef {
  n: string;
  /** Propietario; «null» de la fuente normalizado a null */
  p: string | null;
  /** FechaDeslinde | FechaCatalogacion | FechaAmojonamiento — «no consta» = null */
  fd: string | null;
  fc: string | null;
  fa: string | null;
}

export interface ContextFile {
  cod: number;
  /** id del snapshot congelado (context_YYYYMMDD) */
  v: string;
  stops: Record<string, StopRef>;
  montes: Record<string, MonteRef>;
  /** facets por building_id: [bandas D, bandas T, bandas N, stops, montes] */
  b: Record<string, ContextFacet>;
}

export type ContextFacet = [
  [number, number][],
  [number, number][],
  [number, number][],
  [number, number][],
  number[]
];

export interface NoisePeriodBands {
  /** todas las bandas oficiales del periodo; >1 = MULTIPLE (se listan todas) */
  bands: [number, number][];
}

export interface NoiseResult {
  /**
   * mapped = ≥1 banda en algún periodo · not_mapped = el punto queda fuera
   * de la cobertura del mapa (nunca 0 dB ni «sin ruido») · no_coverage =
   * el municipio no tiene isófonas referenciadas → el módulo se omite.
   */
  state: 'mapped' | 'not_mapped' | 'no_coverage';
  d: NoisePeriodBands;
  t: NoisePeriodBands;
  n: NoisePeriodBands;
}

export interface MobilityResult {
  /**
   * available = ≥1 parada ≤ R=400 m · no_nearby_stop = negativo oficial ·
   * no_coverage = el municipio no tiene paradas referenciadas → omitir.
   */
  state: 'available' | 'no_nearby_stop' | 'no_coverage';
  /** ordenadas por distancia ascendente, máx. N=5; `i` = índice en la capa
   *  congelada (filtra la overlay opt-in sin depender del nombre). */
  stops: { i: number; ref: StopRef; dist_m: number }[];
}

export interface MountainResult {
  /**
   * inside = 1 monte · multiple = >1 monte (se listan todos, nunca se
   * elige) · outside = negativo oficial · no_coverage = sin montes
   * referenciados en el municipio → omitir.
   */
  state: 'inside' | 'multiple' | 'outside' | 'no_coverage';
  montes: { i: number; ref: MonteRef }[];
}

/**
 * `resolved` = proyección disponible (cada módulo lleva su propio estado;
 * los negativos son datos). `unavailable` = fichero ausente/error — la
 * sección entera se omite (fail-soft, gate §13).
 */
export type ContextLocal =
  | { kind: 'resolved'; noise: NoiseResult; mobility: MobilityResult; mountain: MountainResult }
  | { kind: 'unavailable' };

/** La fuente serializa fechas ausentes como literal "null" (§18 R-03). */
function nn(v: string | null | undefined): string | null {
  return v == null || v === 'null' || v === '' ? null : v;
}

/** Proyecta el facet de un building_id contra el fichero municipal. */
export function resolveContext(file: ContextFile, buildingId: string): ContextLocal {
  const f = file.b[buildingId] ?? [[], [], [], [], []];
  const [d, tp, n, stops, montes] = f;

  const anyBand = d.length + tp.length + n.length > 0;
  const munHasNoise =
    anyBand || Object.values(file.b).some((ff) => ff[0].length + ff[1].length + ff[2].length > 0);
  const noise: NoiseResult = {
    state: anyBand ? 'mapped' : munHasNoise ? 'not_mapped' : 'no_coverage',
    d: { bands: d.map((b) => [b[0], b[1]]) },
    t: { bands: tp.map((b) => [b[0], b[1]]) },
    n: { bands: n.map((b) => [b[0], b[1]]) }
  };

  const stopHits = stops
    .map(([i, dist]) => ({ i, ref: file.stops[String(i)], dist_m: dist }))
    .filter((h): h is { i: number; ref: StopRef; dist_m: number } => h.ref != null);
  const mobility: MobilityResult = {
    state: stopHits.length
      ? 'available'
      : Object.keys(file.stops).length
        ? 'no_nearby_stop'
        : 'no_coverage',
    stops: stopHits
  };

  const monteHits = montes
    .map((i) => ({ i, ref: file.montes[String(i)] }))
    .filter((h): h is { i: number; ref: MonteRef } => h.ref != null)
    .map((h) => ({
      i: h.i,
      ref: {
        n: h.ref.n,
        p: nn(h.ref.p),
        fd: nn(h.ref.fd),
        fc: nn(h.ref.fc),
        fa: nn(h.ref.fa)
      }
    }));
  const mountain: MountainResult = {
    state:
      monteHits.length > 1
        ? 'multiple'
        : monteHits.length === 1
          ? 'inside'
          : Object.keys(file.montes).length
            ? 'outside'
            : 'no_coverage',
    montes: monteHits
  };

  return { kind: 'resolved', noise, mobility, mountain };
}
