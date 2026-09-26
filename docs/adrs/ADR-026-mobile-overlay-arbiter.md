# ADR-026 — Árbitro de overlays móvil + contrato de visual viewport

## Contexto

El gate MOB-05b sobre iPhone Safari **físico** falló
(`MOBILE_OVERLAY_COLLISION`, `evidence/mobile-physical/MOB-R1.md`): el
chrome flotante de Safari tapaba controles primarios («Solo A/B» del
comparador), convivían a la vez formulario de edición + selectores de
campaña + swipe + controles de mapa, la ficha «En esta zona» ocupaba
gran parte del lienzo compitiendo con el reproductor temporal, y el
editor «Cambiar» mostraba dos acciones «Cancelar».

Causa raíz: cada componente se había hecho responsive por separado y el
layout móvil no modelaba el **visual viewport real** de Safari
(`window.innerHeight` ≠ zona utilizable; la toolbar flotante y el
teclado ocluyen la franja inferior).

## Decisión

1. **Un solo overlay pesado** en apilado (≤1023 px). `app.mobileOverlay`
   (`domain/overlay.ts`) con `edit | cell | campaigns | layers | info |
   null`; abrir uno repliega el resto. Controles ligeros (zoom, play,
   handle, chips compactos) no participan.
2. **Visual viewport real** publicado en `:root` por
   `state/viewport.svelte.ts` (`installViewport`): `--vvh`, `--vvt`,
   `--vvb` (oclusión inferior = `innerHeight − vv.height − vv.offsetTop`,
   cálculo puro en `domain/visualviewport.ts`). Listeners en
   `vv.resize`, `vv.scroll`, `resize` y `orientationchange`, throttle a
   un frame. Nada de «Safari = 100 px» hardcodeado.
3. **Borde inferior real**: todo control crítico anclado abajo usa
   `bottom: max(var(--vvb), env(safe-area-inset-bottom))` — `--vvb`
   cubre la toolbar flotante/teclado (fuera del vv), `safe-area` el
   gesto home/toolbar expandida (dentro del vv).
4. **Chrome inferior del lienzo unificado**: `--cbh` en `.mapcell`
   reserva el alto del chrome del modo (player temporal 60 px en
   `tcb`; fila «Solo A/B» 2.9 rem en `swipemode`). Ficha de zona, chip,
   escala y atribución se anclan sobre `var(--cbh) + oclusión`.
5. **Patrones por componente**: ficha de zona = chip de una línea →
   sheet ≤42 % vv anclado sobre el chrome (nunca lo tapa); comparador =
   chip `antes ↔ después · Cambiar` → sheet de campañas bajo demanda
   con backdrop y un solo «Cancelar»; editor = sheet exclusivo con
   backdrop; leyenda móvil = `<details>` colapsado con el título como
   summary; menú de modo `.vmenu` elevado sobre la oclusión.
6. **Contrato z-index** en `app.css`: `--z-canvas` 0, `--z-canvas-ui` 5,
   `--z-ctrl` 12, `--z-inspect` 13, `--z-backdrop` 45, `--z-sheet` 50,
   `--z-modal` 60. Los paneles dentro de `.tclayer` (`pointer-events:
   none`) deben reactivar `pointer-events` explícitamente.

## Consecuencias

- Desktop intacto: toda la política es `isMobile`/media ≤1023; smoke
  desktop sin regresión.
- `openOverlay`/`closeOverlay` son la única vía de abrir paneles
  pesados en móvil; `selectPlace`, `commitSearch`, `reset` y el cambio
  de modo (`ResultView`) devuelven el árbitro a `null`.
- Tests: árbitro puro (`overlay.test.ts`), estado (`app.svelte.test.ts`)
  y oclusión (`visualviewport.test.ts`); smoke estructural móvil
  (`scripts/_mob_r1_shots.mjs`, 17 asertos) y desktop
  (`_mob_r1_desktop.mjs`).
- El oráculo del gate sigue siendo **iPhone Safari físico**: la
  emulación no reproduce la toolbar dinámica ni el teclado real.
