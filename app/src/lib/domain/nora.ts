import type { MunicipalityCatalogItem } from './types';

/**
 * Búsqueda de lugar (G1 U3). Fuentes: catálogo local (instantáneo, offline)
 * + NORA oficial (todas las provincias, para detectar OUT_OF_SCOPE).
 * Unidad estadística: siempre el municipio.
 */

export type SearchState =
  | 'IDLE'
  | 'TOO_SHORT'
  | 'SEARCHING'
  | 'RESULTS'
  | 'NO_RESULTS'
  | 'OUT_OF_SCOPE'
  | 'NETWORK_ERROR';

export interface SearchOutcome {
  state: SearchState;
  local: MunicipalityCatalogItem[];
  noraCount: number;
  noraBizkaia: number;
}

const NORA_MUNIS =
  'https://www.geo.euskadi.eus/t17iApiRestWar/rest/v1/municipios';

const norm = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

export function filterLocal(query: string, catalog: MunicipalityCatalogItem[]) {
  const q = norm(query);
  return catalog.filter((m) => norm(m.name).includes(q));
}

interface NoraMuni {
  municipioId?: string;
  descMunicipio?: string;
  provinciaId?: string;
}

export async function searchPlace(
  query: string,
  catalog: MunicipalityCatalogItem[],
  signal?: AbortSignal
): Promise<SearchOutcome> {
  if (norm(query).length < 3) {
    return { state: 'TOO_SHORT', local: [], noraCount: 0, noraBizkaia: 0 };
  }
  const local = filterLocal(query, catalog);
  try {
    const r = await fetch(
      `${NORA_MUNIS}?descMunicipio=${encodeURIComponent(query)}`,
      { signal, headers: { Accept: 'application/json' } }
    );
    if (!r.ok) throw new Error(`nora ${r.status}`);
    const j = (await r.json()) as { list?: NoraMuni[] } | NoraMuni[];
    const list = Array.isArray(j) ? j : (j.list ?? []);
    const bizkaia = list.filter((m) => m.provinciaId === '48' || String(m.provinciaId) === '48');
    if (local.length > 0 || bizkaia.length > 0) {
      return { state: 'RESULTS', local, noraCount: list.length, noraBizkaia: bizkaia.length };
    }
    if (list.length > 0) {
      return { state: 'OUT_OF_SCOPE', local: [], noraCount: list.length, noraBizkaia: 0 };
    }
    return { state: 'NO_RESULTS', local: [], noraCount: 0, noraBizkaia: 0 };
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') throw e;
    if (local.length > 0) {
      // NORA caído pero hay candidatos locales: seguimos en RESULTS.
      return { state: 'RESULTS', local, noraCount: 0, noraBizkaia: local.length };
    }
    return { state: 'NETWORK_ERROR', local: [], noraCount: 0, noraBizkaia: 0 };
  }
}
