import type { BuildingProps, Place } from './types';
import { timeoutSignal } from './fetch';

/**
 * Búsqueda de dirección exacta (G3-A, gate §1–§4). Cadena NORA:
 *   calles -> calle/{id}/portales -> portal/{id}/edificios -> edificios/{id}
 * Contratos congelados:
 *   R1 `descMunicipio` no filtra por municipio: la desambiguación es local
 *      sobre localidad[0].entidad.municipio (id 3 dígitos + idProvincia 48).
 *   R2 `portalNum` es prefijo: el matching exacto se hace en cliente y las
 *      variantes restantes se muestran (nunca autoelegir).
 *   R3 HTTP 204 = sin resultados, no error.
 *   R4 privacidad: la dirección nunca sale del estado de sesión ni a la URL.
 */

const NORA = 'https://www.geo.euskadi.eus/t17iApiRestWar/rest/v1';
const TIMEOUT_MS = 10_000;

// ── tipos NORA (campos observados, ver spec evidence/g3/nora_spec.json) ──

export interface NoraMunicipioRef {
  id: string; // '054' — código municipal de 3 dígitos
  idProvincia: string; // '48' = Bizkaia
  descripcionOficial: string;
}

export interface NoraCalle {
  id: string;
  calleCod: string;
  descripcionCastellano: string;
  descripcionEuskera: string;
  descripcionBilingue: string;
  localidad?: {
    id: string;
    descripcionOficial: string;
    entidad?: { municipio?: NoraMunicipioRef };
  }[];
}

export interface NoraPortal {
  id: string;
  numero: string | null;
  bis: string | null;
  acepcion: string | null; // nombre del edificio cuando lo tiene
  bloque: string | null;
  codigoPostal: string | null;
  latETRS89: string | null;
  lonETRS89: string | null;
}

export interface NoraEdificio {
  id: string;
  tipo: string | null;
  estado: string | null;
  /** '1972-12-31 00:00:00' — observación NORA independiente de Ano_Constr */
  fechaConstr: string | null;
  portal?: NoraPortal;
}

// ── estados de la máquina ──

export type AddressStep =
  | 'IDLE'
  | 'TOO_SHORT'
  | 'SEARCHING'
  | 'STREETS' // >=1 calle del municipio canónico
  | 'NO_STREETS'
  | 'OUT_OF_SCOPE' // NORA conoce calles pero ninguna en Bizkaia/el municipio
  | 'PORTALS' // >=1 portal candidato tras matching exacto local
  | 'NO_PORTALS'
  | 'RESOLVING' // edificios del portal + identidad Catastro en curso
  | 'RESOLVED'
  | 'NOT_FOUND'
  | 'NETWORK_ERROR';

/** Identidad Catastro del punto del portal (gate §2, fail-closed). */
export type CatastroIdentity = 'EXACT' | 'MULTIPLE' | 'NORA_ONLY' | 'NOT_FOUND' | 'PENDING';

/** Discrepancia entre fuentes (gate §3). */
export type YearAgreement =
  'BOTH_EQUAL' | 'BOTH_DIFFER' | 'CATASTRO_ONLY' | 'NORA_ONLY' | 'BOTH_UNKNOWN';

export interface PortalPick {
  portal: NoraPortal;
  /** variantes del mismo número base (2, 2A, 2B…) que el usuario puede distinguir */
  siblings: NoraPortal[];
}

export interface AddressResult {
  calle: NoraCalle;
  portal: NoraPortal;
  edificios: NoraEdificio[];
  /** identidad Catastro resuelta geométricamente por el punto del portal */
  identity: CatastroIdentity;
  /** candidatos Catastro cuando identity = MULTIPLE (el usuario elige) */
  catastroCandidates: BuildingProps[];
  /** edificio Catastro vinculado cuando identity = EXACT (o elegido) */
  catastroBuilding: BuildingProps | null;
  agreement: YearAgreement;
}

// ── helpers puros ──

export function municipioRef(c: NoraCalle): NoraMunicipioRef | null {
  return c.localidad?.[0]?.entidad?.municipio ?? null;
}

/** R1: la calle pertenece al municipio canónico seleccionado (cod 3 dígitos, prov 48). */
export function isMunicipio(c: NoraCalle, cod: number): boolean {
  const m = municipioRef(c);
  if (!m) return false;
  return m.idProvincia === '48' && m.id === String(cod).padStart(3, '0');
}

export function isBizkaia(c: NoraCalle): boolean {
  return municipioRef(c)?.idProvincia === '48';
}

/** R2: matching exacto local sobre la lista (portalNum devuelve prefijos). */
export function matchPortalExact(
  portales: NoraPortal[],
  numero: string,
  bis: string | null = null
): { exact: NoraPortal[]; siblings: NoraPortal[] } {
  const num = numero.trim();
  const exact = portales.filter(
    (p) => String(p.numero ?? '') === num && (bis === null || (p.bis ?? '') === bis)
  );
  const siblings = portales.filter((p) => String(p.numero ?? '') === num && !exact.includes(p));
  return { exact, siblings };
}

/** '1972-12-31 00:00:00' -> 1972 (o null). */
export function noraYear(fechaConstr: string | null | undefined): number | null {
  const y = Number((fechaConstr ?? '').slice(0, 4));
  return Number.isInteger(y) && y >= 1000 && y <= 2100 ? y : null;
}

/** Punto oficial del portal para la identidad Catastro, o null si las
 *  coordenadas no son utilizables. `Number(null) === 0` y `Number('') === 0`
 *  fabricarían un punto (0,0) — ausencia ≠ cero. El rango es el encuadre de
 *  Bizkaia con margen: coordenadas fuera son dato corrupto, no un portal. */
export function portalPoint(p: NoraPortal): { lon: number; lat: number } | null {
  if (p.lonETRS89 == null || p.latETRS89 == null) return null;
  const lon = Number(p.lonETRS89);
  const lat = Number(p.latETRS89);
  if (!Number.isFinite(lon) || !Number.isFinite(lat)) return null;
  if (lon < -3.7 || lon > -2.2 || lat < 42.8 || lat > 43.55) return null;
  return { lon, lat };
}

/** Discrepancia NORA vs Catastro sin elegir ganador (gate §3). */
export function yearAgreement(
  catastroYear: number | null,
  catastroState: string | null,
  nora: number | null
): YearAgreement {
  const c = catastroState === 'VALID' ? catastroYear : null;
  if (c !== null && nora !== null) return c === nora ? 'BOTH_EQUAL' : 'BOTH_DIFFER';
  if (c !== null) return 'CATASTRO_ONLY';
  if (nora !== null) return 'NORA_ONLY';
  return 'BOTH_UNKNOWN';
}

// ── acceso NORA (demand-driven, caché de sesión) ──

const streetCache = new Map<string, NoraCalle[]>();
const portalCache = new Map<string, NoraPortal[]>();
const edificioCache = new Map<string, NoraEdificio[]>();

async function get<T>(path: string, signal?: AbortSignal): Promise<T | null> {
  const r = await fetch(`${NORA}${path}`, {
    signal: timeoutSignal(TIMEOUT_MS, signal),
    headers: { Accept: 'application/json' }
  });
  if (r.status === 204) return null; // R3: sin resultados
  if (!r.ok) throw new Error(`nora ${r.status}`);
  const j = (await r.json()) as T | T[];
  return (Array.isArray(j) ? j : j === null ? null : j) as T;
}

function asList<T>(v: T | T[] | null): T[] {
  if (v === null) return [];
  return Array.isArray(v) ? v : [v];
}

/** Calles por descripción, ya desambiguadas al municipio canónico (R1). */
export async function searchStreets(
  query: string,
  place: Place,
  signal?: AbortSignal
): Promise<{ mine: NoraCalle[]; bizkaia: number; outside: number }> {
  const key = `${place.cod}|${query.trim().toLowerCase()}`;
  let all = streetCache.get(key);
  if (!all) {
    const q = `descCalle=${encodeURIComponent(query)}&descMunicipio=${encodeURIComponent(place.name)}&withParents=true`;
    all = asList(await get<NoraCalle[]>(`/calles?${q}`, signal));
    streetCache.set(key, all);
  }
  const mine = all.filter((c) => isMunicipio(c, place.cod));
  const bizkaia = all.filter(isBizkaia).length;
  return { mine, bizkaia, outside: all.length - bizkaia };
}

/** Portales de una calle (prefetch sin portalNum: la lista completa sirve
 *  para el matching exacto local de cualquier número). */
export async function listPortals(calleId: string, signal?: AbortSignal): Promise<NoraPortal[]> {
  let all = portalCache.get(calleId);
  if (!all) {
    all = asList(await get<NoraPortal[]>(`/calle/${calleId}/portales?withParents=false`, signal));
    portalCache.set(calleId, all);
  }
  return all;
}

/** Edificios NORA de un portal (normaliza objeto único -> lista). */
export async function portalBuildings(
  portalId: string,
  signal?: AbortSignal
): Promise<NoraEdificio[]> {
  let all = edificioCache.get(portalId);
  if (!all) {
    all = asList(
      await get<NoraEdificio[]>(`/portal/${portalId}/edificios?withParents=false`, signal)
    );
    edificioCache.set(portalId, all);
  }
  return all;
}
