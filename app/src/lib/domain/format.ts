/**
 * Formato editorial compartido (docs/EDITORIAL_STYLE.md): ningún
 * componente improvisa fechas, números ni rangos — todo sale de aquí.
 * ISO solo en metadata/manifests; en copy público, «4 de agosto de 2026».
 */
// useGrouping 'always': CLDR no agrupa enteros de 4 cifras en es-ES, pero el
// contrato editorial sí («4.472 edificios»). Los años no pasan por aquí.
const num = new Intl.NumberFormat('es-ES', {
  maximumFractionDigits: 0,
  useGrouping: 'always'
});
const dec = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 1 });
const dateLong = new Intl.DateTimeFormat('es-ES', {
  day: 'numeric',
  month: 'long',
  year: 'numeric'
});
const dateShort = new Intl.DateTimeFormat('es-ES', {
  day: 'numeric',
  month: 'short',
  year: 'numeric'
});
const monthYear = new Intl.DateTimeFormat('es-ES', { month: 'long', year: 'numeric' });

export const fmt = (n: number) => num.format(n);
/** "80,5" — decimal español (coma). */
export const fmtDec = (n: number) => dec.format(n);
/** "61,3" — fracción o porcentaje ya en 0-100; el « %» lo añade el copy. */
export const fmtPct = (p: number) => dec.format(p);
/** Hectáreas de huella (m² → ha), una cifra decimal. */
export const fmtHa = (m2: number) => dec.format(m2 / 10_000);

/** '2026-08-04' o '20260804' → Date UTC; null si no es fecha literal. */
function parseIsoish(s: string): Date | null {
  const m = /^(\d{4})-?(\d{2})-?(\d{2})$/.exec(s.trim());
  if (!m) return null;
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  return Number.isNaN(d.getTime()) ? null : d;
}

/** '2026-08-04' / '20260804' → '4 de agosto de 2026'. */
export function fmtDateEs(iso: string): string {
  const d = parseIsoish(iso);
  return d ? dateLong.format(d) : iso;
}

/** '2025-01-01' / '20250101' → '1 ene 2025'. */
export function fmtDateShortEs(iso: string): string {
  const d = parseIsoish(iso);
  return d ? dateShort.format(d) : iso;
}

/** 2000..2009 → '2000–2009' (en dash, año completo — nunca «2000–9»). */
export function fmtYearRange(from: number, to: number): string {
  return `${from}–${to}`;
}

/** Década de un bucket ('2000' | 2000) → '2000–2009'. */
export function fmtDecade(d: number | string): string {
  const y = Number(String(d).slice(0, 4));
  return fmtYearRange(y, y + 9);
}

/** Década en copy narrativo: 2000 → 'años 2000'. */
export function decadeName(d: number | string): string {
  return `años ${Number(String(d).slice(0, 4))}`;
}

/**
 * Distancia de una observación al año personal ('1977' vs 1979 →
 * '2 años antes de que nacieras'). Devuelve la clave i18n lista o null
 * si falta alguno de los dos años.
 */
export function relYearLabel(
  refYear: number,
  birthYear: number | null,
  tr: (k: string, p?: Record<string, string | number>) => string
): string | null {
  if (birthYear === null) return null;
  const d = refYear - birthYear;
  const n = `${Math.abs(d)} ${Math.abs(d) === 1 ? 'año' : 'años'}`;
  if (d === 0) return tr('photo.rel_exact');
  return tr(d < 0 ? 'photo.rel_before' : 'photo.rel_after', { n });
}

/** Variante corta para cards: '2 años antes' / 'tu año'. */
export function relYearShort(
  refYear: number,
  birthYear: number | null,
  tr: (k: string, p?: Record<string, string | number>) => string
): string | null {
  if (birthYear === null) return null;
  const d = refYear - birthYear;
  const n = `${Math.abs(d)} ${Math.abs(d) === 1 ? 'año' : 'años'}`;
  if (d === 0) return tr('rel.short.exact');
  return tr(d < 0 ? 'rel.short.before' : 'rel.short.after', { n });
}

/**
 * Nombre editorial de una observación Eustat (sale del diccionario, C1):
 *   censo '1950'          → 'el censo de 1950'
 *   padrón '20250101'     → 'el padrón de 2025'
 *   padrón '20220701'     → 'el padrón de julio de 2022'
 */
export function obsLabel(
  family: 'censo' | 'padron',
  period: string,
  tr: (k: string, p?: Record<string, string | number>) => string
): string {
  if (family === 'censo') return tr('place.obs.censo', { year: period.slice(0, 4) });
  const p = period.trim();
  if (/^\d{8}$/.test(p) && p.slice(4) !== '0101') {
    const d = parseIsoish(p);
    if (d) return tr('place.obs.padron_month', { month_year: monthYear.format(d) });
  }
  return tr('place.obs.padron', { year: p.slice(0, 4) });
}

/** Une partes de una enumeración: ['a','b','c'] → 'a, b y c'. */
export function joinEs(parts: string[]): string {
  if (parts.length < 2) return parts.join('');
  return `${parts.slice(0, -1).join(', ')} y ${parts[parts.length - 1]}`;
}
