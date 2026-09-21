/**
 * Callejero municipal (G13): sugerencias locales desde
 * `data/streets/<slug>.json` — generado por pipeline/g6_streets.py desde
 * la capa oficial de portales (EUSTAT/NORA, CC BY 4.0).
 *
 * Contratos:
 *   C1 `i` es el `calle.id` del REST de NORA (Kalea-gakoa): encadena
 *      directo con listPortals sin búsqueda previa.
 *   C2 Tolerancia: mayúsculas y tildes se normalizan; los casi-matches
 *      (distancia ≤2) se OFRECEN, nunca se seleccionan solos.
 *   C3 El fichero nace del callejero oficial: no se inventan nombres.
 */

export interface StreetEntry {
  /** Kalea-gakoa = calle.id de NORA (C1) */
  i: string;
  /** nombre extendido en castellano, p. ej. «Torresolo (Calle)» */
  e: string;
  /** nombre extendido en euskera, p. ej. «Torresolo (Kalea)» */
  u: string;
  /** la calle tiene portales con bis → el campo Bis es pertinente */
  bis: boolean;
  /** portales oficiales en la calle */
  n: number;
  /** núcleo(s) de población cuando el nombre se repite en el municipio */
  nuc?: string | string[];
}

interface StreetsFile {
  v: number;
  mun: string;
  streets: StreetEntry[];
}

const DATA = `${import.meta.env.BASE_URL}data/`;
const cache = new Map<string, Promise<StreetEntry[]>>();

/** HTTP 200 no basta: un cuerpo `{}` o una entrada mal formada no es un
 *  callejero. Se valida en la frontera (fetch) — quien recibe
 *  `StreetEntry[]` puede confiar en el contrato. */
export function isStreetsFile(j: unknown): j is StreetsFile {
  if (!j || typeof j !== 'object') return false;
  const f = j as StreetsFile;
  return (
    typeof f.mun === 'string' &&
    Array.isArray(f.streets) &&
    f.streets.every(
      (s) =>
        s &&
        typeof s === 'object' &&
        typeof s.i === 'string' &&
        typeof s.e === 'string' &&
        typeof s.u === 'string' &&
        typeof s.bis === 'boolean' &&
        typeof s.n === 'number'
    )
  );
}

export function loadStreets(slug: string): Promise<StreetEntry[]> {
  let p = cache.get(slug);
  if (!p) {
    p = fetch(`${DATA}streets/${slug}.json`, { signal: AbortSignal.timeout(15_000) })
      .then((r) => {
        if (!r.ok) throw new Error(`streets ${r.status}`);
        return r.json() as Promise<unknown>;
      })
      .then((j) => {
        if (!isStreetsFile(j)) throw new Error('streets schema');
        return j.streets;
      });
    // un fallo no se cachea: el siguiente intento reintenta la descarga
    p.catch(() => cache.delete(slug));
    cache.set(slug, p);
  }
  return p;
}

const norm = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();

/** Nombre sin el sufijo de tipo de vía: «Torresolo (Calle)» → «torresolo». */
const base = (s: string) => norm(s).replace(/\s*\([^)]*\)\s*$/, '');

/** Tipo de vía del sufijo: «Ogoño (Calle)» → «calle». */
const tipo = (s: string) => norm(s).match(/\(([^)]*)\)\s*$/)?.[1] ?? null;

/**
 * Quita el tipo de vía si el usuario lo escribió delante o detrás del
 * nombre («Calle Ogoño» → «ogono», «Ogoño kalea» → «ogono»). El conjunto
 * de tipos se extrae del propio callejero oficial del municipio — nada
 * inventado. Un tipo solo («calle») deja la consulta vacía: no es nombre.
 */
function stripTipo(q: string, tipos: string[]): string {
  for (const tp of tipos) {
    if (q === tp) return '';
    if (q.startsWith(`${tp} `)) return q.slice(tp.length + 1);
    if (q.endsWith(` ${tp}`)) return q.slice(0, -(tp.length + 1));
  }
  return q;
}

/** Levenshtein acotado: corta en cuanto supera `max` (devuelve max+1). */
export function editDistance(a: string, b: string, max = 2): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let prev = [...Array(b.length + 1).keys()];
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    let rowMin = i;
    for (let j = 1; j <= b.length; j++) {
      const v = Math.min(
        prev[j] + 1,
        cur[j - 1] + 1,
        prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
      cur.push(v);
      if (v < rowMin) rowMin = v;
    }
    if (rowMin > max) return max + 1;
    prev = cur;
  }
  return prev[b.length];
}

export interface StreetMatch {
  entry: StreetEntry;
  /** 'exact' = contiene/empieza por la consulta; 'near' = casi-match */
  kind: 'exact' | 'near';
}

const MAX_RESULTS = 8;

/**
 * Sugerencias ordenadas: primero empieza-por, luego contiene, y solo si
 * no hay coincidencias exactas se ofrecen casi-matches (C2).
 */
export function matchStreets(query: string, streets: StreetEntry[]): StreetMatch[] {
  // tipos oficiales del municipio, el más largo primero («de la» > «de»)
  const tipos = [
    ...new Set(streets.flatMap((s) => [tipo(s.e), tipo(s.u)]).filter((x): x is string => !!x))
  ].sort((a, b) => b.length - a.length);
  // quitar paréntesis de la consulta permite teclear el nombre oficial
  // tal cual («Ogoño (Calle)») sin que el sufijo rompa la comparación
  const q = norm(stripTipo(norm(norm(query).replace(/[()]/g, ' ')), tipos));
  if (q.length < 3) return [];
  const starts: StreetMatch[] = [];
  const contains: StreetMatch[] = [];
  for (const s of streets) {
    const names = [base(s.e), base(s.u)];
    if (names.some((n) => n.startsWith(q))) starts.push({ entry: s, kind: 'exact' });
    else if (names.some((n) => n.includes(q))) contains.push({ entry: s, kind: 'exact' });
  }
  const exact = [...starts, ...contains];
  if (exact.length > 0) return exact.slice(0, MAX_RESULTS);
  // casi-match solo con consultas suficientemente largas — un «xyz»
  // de 3 letras distaría ≤2 de medio callejero.
  if (q.length < 4) return [];
  const near = streets
    .map((s) => ({
      entry: s,
      kind: 'near' as const,
      d: Math.min(editDistance(q, base(s.e)), editDistance(q, base(s.u)))
    }))
    .filter((m) => m.d <= 2)
    .sort((a, b) => a.d - b.d);
  return near.slice(0, MAX_RESULTS);
}
