/**
 * Destino publicado de la QA. Un solo punto para cambiar entre GitHub Pages,
 * staging en VPS o el dominio definitivo: `QA_BASE_URL=https://… node scripts/…`.
 * Las variables antiguas de cada script (SMOKE_BASE, NAV_BASE…) siguen teniendo
 * prioridad donde existían.
 */
export const PAGES_BASE_URL = 'https://huntsman1756.github.io/mas_joven_que_tu-';

export function publicBase(env = process.env) {
  const raw = env.QA_BASE_URL || PAGES_BASE_URL;
  const url = new URL(raw);
  if (!['https:', 'http:'].includes(url.protocol) || url.search || url.hash) {
    throw new Error('QA_BASE_URL debe ser una URL http(s) sin query ni fragmento');
  }
  return url.href.replace(/\/$/, '');
}

/** Base con barra final, para scripts que concatenan `?query` directamente. */
export const publicBaseSlash = (env = process.env) => `${publicBase(env)}/`;
