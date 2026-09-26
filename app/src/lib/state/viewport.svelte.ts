/**
 * MOB-R1 §3 — Visual Viewport real.
 *
 * Safari iOS superpone su toolbar flotante sobre el layout viewport:
 * `window.innerHeight` no es la zona visible utilizable. El ancho de banda
 * inferior ocluido es `innerHeight - vv.height - vv.offsetTop` y cambia
 * al aparecer/ocultarse el chrome y con el teclado virtual.
 *
 * Publica CSS custom props en :root (los paneles las consumen con
 * `max(var(--vvb), env(safe-area-inset-bottom))`):
 *   --vvh  alto del visual viewport (px)
 *   --vvt  offsetTop del visual viewport (px)
 *   --vvb  oclusión inferior: franja bajo el viewport visible (px)
 *
 * Y el breakpoint compartido `isMobile` (los overlays «pesados» solo
 * existen en apilado ≤1023 px).
 */
import { browser } from '$app/environment';
import { bottomOcclusion } from '$lib/domain/visualviewport';

/* init eager en cliente: el primer render ya ve el breakpoint real —
   sin flash de la variante desktop en hidratación (MOB-R2) */
export const isMobile = $state({
  on: browser && matchMedia('(max-width: 1023px)').matches
});

let installed = false;

export function installViewport() {
  if (!browser || installed) return;
  installed = true;
  const vv = window.visualViewport;
  const mq = matchMedia('(max-width: 1023px)');
  const root = document.documentElement;

  let raf = 0;
  const apply = () => {
    // throttle a un frame: Safari anima su toolbar y dispara ráfagas
    raf = 0;
    isMobile.on = mq.matches;
    const h = vv ? vv.height : window.innerHeight;
    const top = vv ? vv.offsetTop : 0;
    const bottom = bottomOcclusion(window.innerHeight, h, top);
    root.style.setProperty('--vvh', `${Math.round(h)}px`);
    root.style.setProperty('--vvt', `${Math.round(top)}px`);
    root.style.setProperty('--vvb', `${Math.round(bottom)}px`);
  };
  const queue = () => {
    if (!raf) raf = requestAnimationFrame(apply);
  };

  apply();
  window.addEventListener('resize', queue);
  window.addEventListener('orientationchange', queue);
  vv?.addEventListener('resize', queue);
  vv?.addEventListener('scroll', queue);
  mq.addEventListener?.('change', queue);
}
