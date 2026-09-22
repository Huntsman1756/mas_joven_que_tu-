# ADR-019 — Controlador único de modo del visor (G8)

- **Estado:** aceptado
- **Fecha:** 2026-09-21
- **Contexto:** revisión del candidato G7 (`295d01c`) sobre capturas reales:
  la navegación de la escena mezclaba tres niveles conceptuales
  (`EL DATO`/`Mapa`/`En el tiempo` + `VER CÓMO ERA`/`Fotos aéreas`/
  `Mapa 1923–25`/`1956-hoy`) y `VER CÓMO ERA` era un `span` decorativo con
  apariencia de tab — un no-op silencioso. Además se observó un rectángulo
  negro en ortofoto sobre Bilbao.

## Decisión

1. **Una sola jerarquía de modo** (`ViewSwitch.svelte`):
   `Edificios | Evolución | Fotos aéreas | Mapa 1923–25 | Antes / ahora`
   (`view=map|time|photo|hist|swipe`, sin cambios en el esquema de URL de
   ADR-013/015/016). Prohibidos los grupos `EL DATO`/`VER CÓMO ERA` como
   pseudo-tabs.

2. **`Ver cómo era` sobrevive solo como CTA narrativo** (`view.cta_era`,
   en `ResultView`): activa la campaña más cercana al año del usuario,
   entra en `photo`, hace scroll y mueve el foco al panel (que es lazy —
   el CTA espera a que monte antes de enfocar).

3. **Controles contextuales por modo**: entre la toolbar y el lienzo solo
   se monta el control del modo activo (`Timeline`, `PhotoPanel`,
   `HistMapControls`, `SwipeCompare`, leyenda). Nada de controles de otros
   modos residentes. En pantalla apilada (≤1023 px) el orden cambia:
   toolbar → explicación (`.mapintro`) → lienzo → control contextual.
   El reorden se hace en el **marcado** (`{#snippet modeControls}`
   montado antes o después del lienzo según `stacked`), no con `order`
   CSS: así el recorrido de Tab y de lectores de pantalla coincide con
   el orden visual (G15). El mapa entra en la primera pantalla y los
   controles quedan inmediatamente debajo en la misma posición relativa
   en los cinco modos. Consecuencia del remontaje (G15b): el intervalo
   del `Timeline` es local al componente, así que al montar se reconcilia
   con el estado global — `app.playing === true` reanuda el temporizador
   desde `playYear` actual; con `prefers-reduced-motion` o sin cabezal
   queda pausado explícitamente (nunca `playing` sin avance). En
   `PhotoPanel` la reproducción es local y se pausa explícitamente al
   remontar; la velocidad sobrevive en `app.photoSpeed`. El foco se
   anota antes de voltear `stacked` (en `onDestroy` ya es `body`) y se
   devuelve tras el montaje a la **misma acción** identificada por
   `data-action` (+`data-year` en campañas/alternativas) — nunca por
   clase compartida ni texto traducido; si la acción ya no existe, se
   enfoca el primer control del panel, y si el usuario ya movió el foco
   no se le pisa (G15c). Cambio de `prefers-reduced-motion` **en
   sesión**: `Timeline` detiene el temporizador y deja `playing=false`
   con el año conservado (pasos manuales disponibles); desactivar la
   preferencia no reanuda solo. `PhotoPanel` ya pausaba en ese cambio —
   verificado que su intervalo se limpia.

4. **Móvil**: el selector se colapsa en `Vista · [modo]` + menú/bottom
   sheet (`role="menu"`/`menuitemradio`, `aria-checked`, Escape,
   flechas/Home/Fin, retorno de foco). No se comprimen 5 tabs.

5. **Historial explícito**: `app.modeNavSeq` se incrementa solo en
   cambios de modo **intencionados por el usuario** (selector, CTA, salida
   de hist). `+page.svelte` lo observa y hace `pushState`; `popstate` y
   restores usan `suppressSync` (sin bucles). Clic en el modo ya activo =
   no-op sin entrada de historial (`setMode` corta si `app.mode === m`).
   Misma regla para búsquedas confirmadas desde el editor de resultado:
   `app.searchNavSeq` sube una vez por commit (`commitSearch` escribe
   año + lugar en el mismo turno → una entrada lógica; G15). Los
   borradores del editor y los restores de URL nunca lo tocan, y
   confirmar sin cambios no crea entrada.

6. **No-data ≠ error de carga**: la investigación del rectángulo negro
   concluyó cobertura real ausente en el borde provincial, no tiles
   fallidos. `pipeline/build_ortho_previews.py` post-procesa píxeles
   transparentes/no-data a un neutro (`--paper-2`) en los previews; la UI
   muestra `photo.nodata` + alternativas, nunca negro puro ni no-op.

7. **Estado activo con superficie**: fondo `--paper-2` + borde + icono de
   acento en desktop; check + `aria-checked` en el menú móvil. Nunca solo
   underline.

## Consecuencias

- La toolbar es sticky sobre el lienzo (`z-index: 30`, bajo el rail de
  historias y overlays de mapa).
- `CompareMap` expone `window.__mjtMapB` para QA (patrón `__mjtMap`).
- Scripts actualizados a la realidad del selector:
  `g5_swipe.mjs` (helper `setMode` desktop/móvil + scroll al handle) y
  `g1r_ortho_preview.mjs` (ids `ortho-b*` y referencia `sel-muni-outline`,
  obsoletos desde G5 — `24bc834`).
- Contrato E2E nuevo: `scripts/g8_viewer.mjs` (28 checks: secuencia de
  modos Bilbao/1952, deep links, back/forward, reload, axe por modo,
  menú móvil) y `scripts/g8_shots.mjs` (capturas desktop+móvil por modo).
- PERF4 intacto: paneles de modo siguen lazy; el menú no añade bundle.

## Alternativas descartadas

- Mantener `VER CÓMO ERA` como encabezado de grupo accesible: promete
  acción y no la ejecuta — se mueve a CTA explícito.
- Router paralelo para modos: el esquema `?view=` ya era deep-linkable;
  solo faltaba historial explícito (`modeNavSeq`).
- Negro como no-data: visualmente indistinguible de tile fallido.
