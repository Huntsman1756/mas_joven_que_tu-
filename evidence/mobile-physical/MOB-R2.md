# MOB-R2 — Before/After above-the-fold en iPhone Safari

## Finding registrado (iPhone físico, candidato `239933c`)

**MOB-06 MAJOR** — al entrar en «Antes / ahora» la comparación no aparece
en el primer viewport: cabecera + selector de vista + título/explicación
+ panel de campañas consumen el pliegue y el usuario debe hacer scroll
para descubrir el swipe. Fallo de jerarquía: la portada del modo debe
ser la comparación, no su configuración.

Evolución, Fotos aéreas y Por antigüedad mejoraron claramente con
MOB-R1 — no se tocan.

## Fix aplicado

1. **`scrollIntoView` del stage en cambio explícito de modo** (§10):
   `app.modeNavSeq` → `stageEl.scrollIntoView({block:'start'})` en
   apilado+visor; `smooth`/`auto` según `prefers-reduced-motion`.
   Nunca en reload ni deep-link.
2. **Presentación chip/tarjeta decidida por CSS** (§3): `.sw-compact` y
   `.sw-statuses` `display:none` ≥1024 px; `.swipectl` `display:none`
   ≤1023 px — mismo breakpoint que el layout apilado, sin depender de
   estado JS ni hidratación. La tarjeta «Primera/Segunda imagen» ya no
   puede aparecer en móvil por carrera de montaje (`isMobile` arrancaba
   `false` hasta `onMount`).
3. **`isMobile` init eager**: `matchMedia` evaluado al importar el
   módulo — el primer render del cliente ya ve el breakpoint real.
4. Sheet de campañas: cerrado SIEMPRE al entrar (§11), solo se abre con
   «Cambiar»; el menú de vistas se cierra en `pick()` (§15).

## Verificación

- `check` 0 errores · `lint` 0 errores · `vitest` 244 verdes.
- Smoke iPhone 13 (`_mob_r1_shots.mjs`): **21/21** asertos. Nuevos:
  - `R2.canvas-above-fold` — entrada por el selector tras scroll
    profundo: `wrapTop≈108 px`, imagen visible 587 px = **70 %** del vv.
  - `R2.grip-in-vv` — grip centrado `[379–423]` dentro `[0–844]`.
  - `R2.sheet-closed-entry`, `R2.no-menu-left`.
- Desktop (`_mob_r1_desktop.mjs`): tarjeta clásica, sin chip — sin
  regresión.
- Captura: `mobr1-local/mobr2-swipe-entry.png`.

## Pendiente

Retest físico iPhone Safari (§16): entrar en Antes/ahora sin scroll →
imagen+handle; Cambiar→sheet→Cancelar/Aplicar; swipe; Solo A/B;
toolbar visible↔colapsada; landscape. Tras eso se adjudica `MOB-05b`.
