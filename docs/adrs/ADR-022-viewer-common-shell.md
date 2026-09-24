# ADR-022 — Shell común del visor y barra temporal integrada (G19-R2)

- **Estado:** aceptado — revisado parcialmente por
  [ADR-023](ADR-023-single-timeplayer-shared-geometry.md) (la franja
  `.mapintro` pasa a existir en los cinco modos con altura estructural
  común y el player se unifica como `HistoricalTimePlayer`).
- **Fecha:** 2026-09
- **Revisa:** ADR-021 (puntos 1 y 3)

## Contexto

La adjudicación visual de G19 resolvió «mapa demasiado secundario»
pero creó otro problema: al desmontar el `.sidebar` en los modos de
visor, `Edificios → Evolución → Fotos aéreas` cambiaba la arquitectura
completa de la página — cada modo parecía otra aplicación. Además el
chrome temporal era una cápsula oscura flotante grande (~80–100 px)
con un `input[range]` visualmente estándar: no alcanzaba la gramática
de navegación temporal del patrón «imágenes históricas» (una barra
cartográfica fina de ~50 px con puntos de disponibilidad reales).

## Decisión

1. **Shell común en desktop**: los cinco modos comparten la misma
   geometría — columna de resultado compacta (`minmax(300,340)px`) +
   visor. `.sidebar` ya no se desmonta por modo; `showSidebar =
   !viewer || !stacked`. La ficha de selección vive en la columna como
   en `Edificios` (`.sel-float` solo se monta en apilado). El alto del
   lienzo en modos de visor es `clamp(560px, 68svh, 760px)`: el mapa
   manda sin devorar la página (queda below-fold a la vista).

2. **Pantalla apilada (≤1023 px) sin cambios**: lienzo a primera
   pantalla completa, barra temporal anclada al borde inferior,
   `‹ Resultado` recupera la narrativa.

3. **«‹ Resultado» solo existe donde recupera algo**: en desktop la
   columna está visible y `Edificios` ya vuelve — `.vback` se oculta
   ≥1024 px y la cabecera del visor (`vtitle` + `vctx`) es idéntica en
   los cinco modos. Cambiar de modo cambia el contenido/control del
   mapa, no la composición global.

4. **`TemporalChrome` = barra integrada, no cápsula**: `tcp-tl` pasa de
   tarjeta flotante con `border-radius` a franja pegada al borde
   superior del lienzo (`top:0; left:0; right:3.4rem` — deja libres los
   controles de zoom), ~49 px de alto. Sin `.tc-meta` en la barra: la
   procedencia (editor, vuelo real, licencia, nodata) va entera tras
   `ⓘ`. El año baja a ~20 px (`1.25rem`): es estado del control, no
   titular. Play mantiene hitbox 44 px con círculo visual de 32 px.

5. **Rail fino con marcas reales**: la línea base del rail es de 2 px;
   Evolución dibuja relleno en acento hasta el cabezal, thumb de 13 px
   y ticks de década; Fotos aéreas dibuja un tick por campaña real con
   etiquetas densidad-adaptativas (la regla `LABEL_GAP_PX` de ADR-021
   se conserva). El `<input type=range>` sigue siendo la mecánica
   accesible (≥44 px de hitbox, flechas/Home/End), pero su
   presentación es de instrumento cartográfico.

## Consecuencias

- Geometría del lienzo medida en 1440×900 (`evidence/g19r2/
  geometry.json`): `x=340, w=1100` en los cinco modos; `h=611` en
  visor vs `h=557` en `map` — la única diferencia es la fila
  `.mapintro` (G12 la exige en flujo solo en `map`). El contrato R2 es
  que el cambio de modo no reorganiza la página.
- Selectores `.tcpanel`/`.tcp-tl` se conservan (mismo contrato E2E de
  overlay dentro de `.mapwrap`); `.tc-meta` eliminado.
- Claves i18n retiradas: `ortho.publisher.short.*` (la meta corta ya no
  existe; la procedencia completa vive tras `ⓘ`).
- `vback`/`vback-ctx` solo visibles en apilado; la cabecera del visor
  no cambia entre modos en desktop.
- Evidencia: `evidence/g19r2/` (6 capturas + `geometry.json`).
- **No desplegado**: pendiente de adjudicación visual.

## Alternativas descartadas

- **Mantener la decisión G19 (sin columna en visor)**: era la causa del
  salto de arquitectura entre modos — el patrón «visor a pantalla
  completa» convertía la app en otra cosa.
- **Mover `.mapintro` dentro del lienzo o a la columna**: G12 exige la
  explicación en flujo antes del lienzo (legible, no oculta); la
  diferencia de ~54–99 px que introduce es el coste aceptado del
  control contextual del modo `map`.
- **Copiar el time-slider de Google Earth literalmente**: se adopta la
  gramática (barra fina, puntos de disponibilidad, mínimo texto) sin
  branding ni colores ajenos.
