const num = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 0 });
const pct = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 1 });

export const fmt = (n: number) => num.format(n);
/** "61,3" — formatea una fracción o un porcentaje ya en 0-100 según opts. */
export const fmtPct = (p: number) => pct.format(p);
/** Hectáreas de huella (m² → ha), una cifra decimal. */
export const fmtHa = (m2: number) => pct.format(m2 / 10_000);
