import { es } from './es';

export function t(key: string, params: Record<string, string | number> = {}): string {
  let s = es[key];
  if (s === undefined) return `⟦${key}⟧`;
  for (const [k, v] of Object.entries(params)) s = s.replaceAll(`{${k}}`, String(v));
  return s;
}
