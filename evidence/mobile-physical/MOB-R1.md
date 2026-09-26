# MOB-R1 — Mobile overlay collision (iPhone Safari físico)

**Fecha:** 2026-09-27 · **Build evaluado:** `gh-pages df842fb` (producto `1848c74`)
**Oráculo:** iPhone físico + Safari móvil (capturas del usuario, descritas — los
ficheros de captura no se adjuntaron al repo; los hallazgos se registran
literalmente del informe físico).

MOB-05b = **FAIL** · razón: `MOBILE_OVERLAY_COLLISION`

## Findings

| ID | Sev | Repro | Descripción |
|---|---|---|---|
| MOB-01 | MAJOR | determinista | Antes/ahora: el chrome flotante de Safari tapa los controles inferiores («Solo 1970 / Solo 2025» y zona baja del comparador). Bloqueante: acciones primarias fuera del Visual Viewport real. |
| MOB-02 | MAJOR | determinista | Múltiples overlays simultáneos: formulario Cambiar + selector de campañas + swipe + controles de mapa + UI del navegador. Sin política de «un panel pesado». |
| MOB-03 | MAJOR | determinista | Evolución: la ficha «En esta zona» ocupa gran parte del canvas y compite con el player temporal; se apilan mapa+player+leyenda+ficha+zoom. |
| MOB-04 | MINOR | determinista | El editor Cambiar muestra dos acciones «Cancelar» (botón de topbar que conmuta a Cancelar + `.cf-cancel` dentro del form). |
| MOB-05 | subyacente | — | El layout móvil no modela el Visual Viewport real de Safari (chrome dinámico, safe-area, teclado). Cada componente se hizo responsive por separado. |

## Causa raíz común

Los controles anclados a `bottom` dentro del lienzo y los paneles `fixed`
usan el layout viewport; Safari móvil superpone su toolbar sobre esa zona.
No existe ni utilidad compartida de visual viewport ni árbitro de overlays.

## Plan aplicado (MOB-R1)

1. `timeoutSignal`-independiente: utilidad `viewport.svelte.ts` → CSS vars
   `--vvh`, `--vvt`, `--vvb` (oclusión inferior real) en `:root`.
2. Árbitro de overlay único `app.mobileOverlay` (domain puro
   `overlay.ts` + tests): edit / cell / campaigns / layers / info.
3. Controles críticos siempre dentro del visual viewport
   (`bottom: max(var(--vvb), env(safe-area-inset-bottom))`).
4. Ficha de zona en apilado: chip colapsado → sheet ≤~42 % vv, anclado
   sobre el player, nunca tapándolo.
5. Antes/ahora móvil: selector de campañas compacto `1970 ↔ 2025 · Cambiar`
   → sheet bajo demanda; Solo A/B elevados sobre la zona del navegador.
6. Editor Cambiar en móvil: sheet exclusivo, UN solo Cancelar (la topbar
   pasa a icono ✕ con aria-label), backdrop.
7. Tokens z-index documentados en `app.css`.

## Segunda pasada (2026-09-26) — huecos detectados al verificar

Además del plan inicial, la comprobación sobre `build/` + emulación
iPhone 13 (Playwright, `scripts/_mob_r1_shots.mjs`, asertos A1–A6) sacó y
corrigió:

| Fix | Motivo |
|---|---|
| `.sw-sheet`/`.sw-backdrop` sin `pointer-events` | están dentro de `.tclayer` (`pointer-events:none`) → el clic ATRAVESABA el sheet hasta «Solo …». Colisión MOB-02 real, detectada por el smoke. |
| Chip de campañas centrado arriba | `top/left 0.6rem` coincidía con `.chip.left` (año «antes»). |
| `.sw-statuses` centrada y ≤64 % | la fila completa podía pisar el aviso de huecos (izda) y el chip «después» (dcha). |
| `.gaps` baja a `top:5.6rem` en ≤1023 | quedaba bajo el chip de campañas. |
| `.hint` a `3.1rem + oclusión` | rozaba la fila «Solo A/B» en móvil. |
| `--cbh` = chrome inferior del lienzo | contrato único (§12): player temporal (`.tcb`, 60 px) o fila «Solo A/B» (`.swipemode`, 2.9rem); ficha/chip/atribución/escala se anclan sobre él — sin offsets dispersos. |
| Leyenda móvil = `<details>` colapsado | §7: nace cerrada («Leyenda · título»), nada eliminado. |
| `CellDetail.clear()` cierra el overlay | sin ello el árbitro quedaba en `'cell'` y el chip tenía un tap muerto. |
| `closeOverlay()` al cambiar de modo | un sheet abierto no sobrevive a otro modo. |
| `installViewport` + `fit()` del stage | listeners `visualViewport.resize/scroll` + `orientationchange`, throttle rAF (§3/§15). |
| `.vmenu` (selector de modo móvil) | `bottom:0` fijo quedaba bajo la toolbar de Safari → `max(--vvb, safe-area)` + token `--z-modal`. |
| Foco | sheet campañas: foco al diálogo al abrir, vuelve al chip al cerrar (Escape incluido); ficha de zona: foco entra en la tarjeta al expandir y vuelve al chip/sonda al cerrar. |
| i18n | textos del chip (`map.cell.chip.*`) en `es`/`eu` — el copylint C1 pillaba «· de ·» literal. |

## Estado de verificación

- `npm run check`: 0 errores (2 warnings preexistentes ajenos).
- `npm run lint`: 0 errores (warnings preexistentes en scripts).
- `vitest`: 244 tests verdes — incluidos `overlay.test.ts`,
  `visualviewport.test.ts` (oclusión: toolbar/teclado/offsetTop/no
  negativa) y el árbitro en `app.svelte.test.ts`.
- Smoke emulado iPhone 13 (`scripts/_mob_r1_shots.mjs`): 17/17 asertos;
  capturas en `mobr1-local/mobr1-*.png`.
- Smoke desktop (`scripts/_mob_r1_desktop.mjs`): panel de campañas clásico,
  sin chip móvil, leyenda tarjeta — sin regresión (§21).

**MOB-05b sigue = FAIL — MOBILE_OVERLAY_COLLISION** hasta la re-evaluación
en iPhone Safari físico (§22/§23): emulación no es oráculo. Matriz física
pendiente: Evolución idle/playing, ficha colapsada/expandida, toolbar
visible/oculta, Antes/ahora default + sheet + Solo A/B + swipe medio,
Cambiar con teclado, font-size aumentado, landscape.
