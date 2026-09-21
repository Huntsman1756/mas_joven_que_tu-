import { es } from './es';
import { eu } from './eu';
import { locale, type Lang } from './lang.svelte';

type Dict = Record<string, string>;

/** Diccionarios por idioma. El fallback por clave es siempre `es`; una
 *  clave ausente en `eu` cae al castellano (nunca al revés). */
const dicts: Record<Lang, Dict | undefined> = { es, eu };

export function t(key: string, params: Record<string, string | number> = {}): string {
  let s = dicts[locale.lang]?.[key] ?? es[key];
  if (s === undefined) return `⟦${key}⟧`;
  for (const [k, v] of Object.entries(params)) s = s.replaceAll(`{${k}}`, String(v));
  return s;
}
