import type { MunicipalityCatalogItem } from './types';

/**
 * Búsqueda de lugar (G1 U3). Fuentes: catálogo local (instantáneo, offline)
 * + NORA oficial (todas las provincias, para detectar OUT_OF_SCOPE).
 * Unidad estadística: siempre el municipio.
 */

export type SearchState =
  'IDLE' | 'TOO_SHORT' | 'SEARCHING' | 'RESULTS' | 'NO_RESULTS' | 'OUT_OF_SCOPE' | 'NETWORK_ERROR';

export interface SearchOutcome {
  state: SearchState;
  local: MunicipalityCatalogItem[];
  noraCount: number;
  noraBizkaia: number;
}

const NORA_MUNIS = 'https://www.geo.euskadi.eus/t17iApiRestWar/rest/v1/municipios';
/** Sin límite, un NORA colgado dejaría SEARCHING sin salida (U2). */
const NORA_TIMEOUT_MS = 10_000;

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

export interface NoraOutcome {
  /** todos los municipios que NORA devuelve para la consulta */
  list: NoraMuni[];
  /** subconjunto de Bizkaia (provinciaId 48) */
  bizkaia: NoraMuni[];
}

/**
 * G10-09: NORA como enriquecimiento no bloqueante. Los candidatos locales
 * (`filterLocal`) son síncronos y se muestran al instante; esta función es
 * la fase de red que el componente lanza en paralelo. AbortError se propaga
 * (la consulta quedó obsoleta); cualquier otro fallo también se propaga y
 * quien llama decide cómo degradar.
 */
export async function fetchNora(
  query: string,
  signal?: AbortSignal,
  timeoutMs = NORA_TIMEOUT_MS
): Promise<NoraOutcome> {
  const r = await fetch(`${NORA_MUNIS}?descMunicipio=${encodeURIComponent(query)}`, {
    signal: signal
      ? AbortSignal.any([AbortSignal.timeout(timeoutMs), signal])
      : AbortSignal.timeout(timeoutMs),
    headers: { Accept: 'application/json' }
  });
  if (!r.ok) throw new Error(`nora ${r.status}`);
  // NORA responde 204 (cuerpo vacío) cuando no hay resultados: es NO_RESULTS,
  // no un error. r.json() sobre cuerpo vacío lanzaría → NETWORK_ERROR erróneo.
  let list: NoraMuni[] = [];
  if (r.status !== 204) {
    const j = (await r.json()) as { list?: NoraMuni[] } | NoraMuni[];
    list = Array.isArray(j) ? j : (j.list ?? []);
  }
  return { list, bizkaia: list.filter((m) => String(m.provinciaId) === '48') };
}

/**
 * Búsqueda completa bloqueante (local + NORA). Conservada para tests y
 * usos que no necesitan el flujo incremental; la UI usa filterLocal +
 * fetchNora por separado.
 */
export async function searchPlace(
  query: string,
  catalog: MunicipalityCatalogItem[],
  signal?: AbortSignal,
  timeoutMs = NORA_TIMEOUT_MS
): Promise<SearchOutcome> {
  if (norm(query).length < 3) {
    return { state: 'TOO_SHORT', local: [], noraCount: 0, noraBizkaia: 0 };
  }
  const local = filterLocal(query, catalog);
  try {
    const { list, bizkaia } = await fetchNora(query, signal, timeoutMs);
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
