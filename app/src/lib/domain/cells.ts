/** Proyección de la propiedad `ys` (serie anual serializada) de celdas y municipios. */

export function parseYs(ys: string | null | undefined): Map<number, number> {
  const out = new Map<number, number>();
  if (!ys) return out;
  for (const part of ys.split(',')) {
    const [y, n] = part.split(':');
    const yi = Number(y);
    const ni = Number(n);
    if (Number.isFinite(yi) && Number.isFinite(ni)) out.set(yi, (out.get(yi) ?? 0) + ni);
  }
  return out;
}

/**
 * Cuota de edificios con año válido terminados después de `year`
 * (0–1 sobre el denominador de año conocido; null si la celda no tiene
 * edificios con año conocido).
 */
export function shareAfter(ys: string | null | undefined, year: number): number | null {
  const m = parseYs(ys);
  let known = 0;
  let after = 0;
  for (const [y, n] of m) {
    known += n;
    if (y > year) after += n;
  }
  if (known === 0) return null;
  return after / known;
}

/**
 * C-08 en tooltip de celda: cuota de **huella en planta** posterior a `year`
 * sobre la huella de edificios con año conocido (universo C-06).
 * `ya` se serializa igual que `ys` pero con m² en lugar de conteos.
 */
export function footprintShareAfter(ya: string | null | undefined, year: number): number | null {
  const m = parseYs(ya);
  let total = 0;
  let after = 0;
  for (const [y, a] of m) {
    total += a;
    if (y > year) after += a;
  }
  if (total === 0) return null;
  return after / total;
}

export const CELL_SMALL_DENOMINATOR = 15;

export function knownFromYs(ys: string | null | undefined): number {
  let k = 0;
  for (const n of parseYs(ys).values()) k += n;
  return k;
}
