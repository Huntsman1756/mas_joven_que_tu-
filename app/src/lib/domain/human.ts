/**
 * Aproximación humana de un porcentaje (GC5): «casi 6 de cada 10».
 * Determinista y siempre acompañada del porcentaje exacto en pantalla.
 * Reglas: cuantiza a décimas de «de cada 10»; dentro de cada décima los
 * umbrales congelados son 0.15 / 0.50 / 0.70. Por encima del 95 % se lee
 * «casi todos»; por debajo del 5 %, «menos de 1 de cada 10».
 *
 * `lang` produce la variante euskera («10etik 6», «ia denak»), pensada
 * para encajar en la plantilla `result.lead.some` del diccionario `eu`.
 */
export function approxOfTen(pct: number, lang: 'es' | 'eu' = 'es'): string {
  const p = Math.max(0, Math.min(100, pct));
  if (lang === 'eu') {
    if (p === 0) return 'bat ere ez';
    if (p >= 95) return 'ia denak';
    if (p < 5) return '10etik 1 baino gutxiago';
    const tenths = p / 10;
    const lo = Math.floor(tenths);
    const frac = tenths - lo;
    if (frac < 0.15) return `10etik ${lo}`;
    if (frac >= 0.7) return `ia 10etik ${lo + 1}`;
    if (frac < 0.5) return `10etik ${lo} baino zerbait gehiago`;
    return `10etik ${lo + 1} baino zerbait gutxiago`;
  }
  if (p === 0) return 'ninguno';
  if (p >= 95) return 'casi todos';
  if (p < 5) return 'menos de 1 de cada 10';
  const tenths = p / 10;
  const lo = Math.floor(tenths);
  const frac = tenths - lo;
  if (frac < 0.15) return `${lo} de cada 10`;
  if (frac >= 0.7) return `casi ${lo + 1} de cada 10`;
  if (frac < 0.5) return `algo más de ${lo} de cada 10`;
  return `algo menos de ${lo + 1} de cada 10`;
}

/**
 * G5-R2: clase gramatical de la aproximación para elegir la plantilla de
 * la frase directa («es decir: … son más jóvenes que tú»). Los bordes
 * «ninguno» y «casi todos» necesitan frase propia (concordancia).
 */
export function approxKind(pct: number): 'none' | 'all' | 'some' {
  const p = Math.max(0, Math.min(100, pct));
  if (p === 0) return 'none';
  if (p >= 95) return 'all';
  return 'some';
}
