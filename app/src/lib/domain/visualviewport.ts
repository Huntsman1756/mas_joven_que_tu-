/**
 * MOB-R1 §3 — cálculo puro del Visual Viewport.
 *
 * Safari iOS superpone su toolbar flotante sobre el layout viewport:
 * `window.innerHeight` NO es la zona visible utilizable. La franja
 * inferior ocluida (chrome del navegador, teclado virtual) es:
 *
 *   bottomOcclusion = innerHeight − vv.height − vv.offsetTop
 *
 * Nunca negativa: si el visual viewport cubre todo (o más, por zoom),
 * no hay oclusión. Los paneles anclados abajo usan
 * `max(oclusión, env(safe-area-inset-bottom))` — la safe-area sigue
 * contando dentro del visual viewport (gesto home / toolbar expandida).
 */
export function bottomOcclusion(innerHeight: number, vvHeight: number, vvTop: number): number {
  return Math.max(0, Math.round(innerHeight - vvHeight - vvTop));
}
