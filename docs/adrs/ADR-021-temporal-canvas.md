# ADR-021 — Lienzo temporal: los modos de visor son mapa + chrome, no página + mapa (G19)

- **Estado:** aceptado
- **Fecha:** 2026-10
- **Contexto:** la adjudicación visual de G18-R (`00ca924`, baseline no
  desplegado) mostró que los controles temporales funcionaban pero la
  jerarquía seguía siendo «página editorial + navegación + reproductor +
  explicaciones + acciones + mapa»: sidebar permanente ~400 px, varias
  filas de página antes del lienzo y controles físicamente fuera del
  mapa. El objetivo de referencia (patrón de visores temporales
  cartográficos tipo «imágenes históricas») es **mapa a pantalla casi
  completa + reproductor temporal superpuesto**. La diferencia debía ser
  obvia incluso desenfocando la captura: G18 = página + controles +
  mapa; G19 = mapa + control temporal.

## Decisión

1. **El lienzo es el producto en los modos de visor** (`time`, `photo`,
   `hist`, `swipe`): `ResultView` no monta el `.sidebar` editorial en
   esos modos (`{#if !viewer}`) y `.stage.viewer` llena la primera
   pantalla. El alto no se calcula con constantes mágicas: `.result` es
   columna flex pero crece con los capítulos `.below`, así que el stage
   mide su propio `offsetTop` y fija `min-height = viewport − top` (se
   recalcula en `resize`). El panel narrativo no se elimina: vuelve con
   `‹ Resultado · lugar · año` (ViewSwitch) o el modo `Edificios`.

2. **El chrome temporal vive DENTRO del lienzo**: `MapView` renderiza el
   snippet `overlay` dentro de `.mapwrap`; allí se monta `.tclayer`
   (`position:absolute; inset:0; pointer-events:none`) con el control del
   modo y la ficha de selección (`.sel-float`). El contrato E2E lo fija:
   `.timeband`/`.photo` son descendientes de `.mapwrap` y su caja se
   superpone geométricamente a la del lienzo (`_audit_nav` C,
   `g18_timeplayer` `g19_overlay_in_canvas`).

3. **`TemporalChrome.svelte` compartido** (ADR-012/019 evolucionado): una
   sola superficie oscura flotante (`rgba(24,38,49,.94)`, `--ink` del
   proyecto — no azul ajeno) con Play/Pausa, año grande, rail, ⓘ y meta
   opcional. Evolución la usa en modo **continuo** (años, ticks de
   década, marcador sutil del año personal, `rmSteps` ±1 bajo
   `prefers-reduced-motion`); Fotos aéreas en modo **discreto**
   (campañas reales con snap, ◀ ▶ compactos, prev/next deshabilitados
   nombrados). Desktop: anclada arriba (`tcp-tl`); ≤1023 px: barra
   inferior sobre el borde del lienzo, con `--tcbh` elevando la
   atribución/escala de MapLibre para que nunca queden tapadas.

4. **Año activo = fuente de verdad visual única**: el año/campaña se
   muestra grande una vez (`.tc-year`). En el rail de campañas la marca
   activa no repite etiqueta; las etiquetas del rail son
   densidad-adaptativas: extremos siempre, luego por orden cronológico
   solo si su distancia en píxeles a cada etiqueta retenida es
   `≥ LABEL_GAP_PX` (42) — así `1989`/`1990` coexisten como ticks sin
   intentar dibujar dos textos solapados.

5. **Los controles primarios redundantes salen del chrome**: selector de
   velocidad (cadencia fija ~1,8 s), «Comparar con {año}» (ya existe el
   modo `Antes / ahora`), «Ocultar la foto» y «Contorno de edificios»
   ya no compiten con la timeline. La visibilidad de ortofoto y el
   contorno pasan a `LayerToggles.svelte`, popover cartográfico junto al
   zoom (`layers.*`). Metadata de campaña (editor + vuelo real) va tras
   `ⓘ Fuente y detalles`.

6. **El dúo de fotos se conserva como capacidad, no como chrome**:
   `orthoCompare`/`CompareMap`/`ortho2=` siguen sirviendo a historias
   (`air.c2`) y deep links; en pantalla estrecha el selector A/B es un
   chip flotante (`.pvfloat`) que solo aparece cuando el dúo está activo.

7. **Leyenda compacta en visor**: en modos ≠ `map` la leyenda muestra
   título + escala; universo, denominador, «Ver datos de la zona
   centrada» y notas metodológicas van tras `<details class="legend-more">`.
   `.mapintro` solo se renderiza en `map` (la misma explicación del modo
   temporal vive tras el ⓘ del chrome). `explore-tail` no aparece en
   modos de visor.

8. **Controles de modo no temporales también son overlay**:
   `HistMapControls` y `SwipeControls` se convirtieron en tarjetas
   flotantes dentro de `.tclayer`, mismo lenguaje visual.

## Consecuencias

- Contrato URL intacto (`year/place/view/ortho/ortho2/play/compare/
  story`); reload, back/forward y compartir enlace no cambian.
- `app.photoSpeed` eliminado del estado (cadencia fija).
- Selectores E2E migrados: `.tc-play/.tc-year/.tc-rail/.tc-scrub/
  .tc-nav/.tc-info/.tc-meta`, `.epoch` (marcas de campaña), `.decade`
  (ticks Evolución), `.layerbox`, `.sel-float`, `.legend-more`.
- Scripts actualizados: `g18_timeplayer`, `_audit_nav` (overlay dentro
  del lienzo + dominancia del mapa), `g16_product` (siguiente/anterior
  derivado del catálogo), `g2b_views`, `g2a_play`, `g1r_ortho`,
  `g1r_ortho_preview` (ocultar vía capas; comparación vía `ortho2=`),
  `g14_eu_qa`, `g16c_android`, `g17_ux` (intro tras ⓘ; aria-label del
  play de iconos), `layout-continuity`, `ux-navigation-regression`,
  `g10_hardening`.
- Evidencia: `evidence/g19/` (6 capturas de adjudicación). Medida:
  mapa ≈734/736 px de alto útil en 1440×900 (~82 % del viewport);
  móvil 390: lienzo llena la primera pantalla con barra inferior
  superpuesta.

## Alternativas descartadas

- **Fix local de `1989/1990` + deploy de G18-R**: trataba el síntoma;
  la estructura «página + mapa incrustado» seguía siendo el problema.
- **`flex:1` puro para llenar el viewport**: `.result` crece con los
  capítulos below-fold, así que no hay espacio libre que repartir — por
  eso el stage mide su posición y fija `min-height` real.
- **Eliminar el dúo de fotos**: rompía `air.c2` de las historias y los
  deep links `ortho2=`; se conserva como capacidad secundaria.
- **Copiar el branding/controles de Google Earth**: se adopta el patrón
  (map-first, chrome superpuesto, mínimo texto) con la identidad propia.
