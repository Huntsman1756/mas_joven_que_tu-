# ADR-025 — Estado explícito del raster en el lienzo (`orthoRender`)

## Contexto

El cierre visual de G19-R4 encontró que Fotos podía mostrar un **canvas
blanco sin explicación**: la capa `ortho` existía pero el encuadre no
tenía imagen (teselas en vuelo, fuera de cobertura o fallo de red). La
sonda existente (`orthoState`) solo clasifica la cobertura de un **punto**
(el centro en el momento de activar, re-sondeado en `moveend` si la
cámara se aleja >500 m — G16b) y la capa se retira cuando esa sonda
devuelve `NOT_COVERED`. Lo que faltaba era el estado del **viewport
pintado**, que es lo que el usuario realmente ve.

Hechos verificados durante la depuración (no asumidos):

- MapLibre GL v6 **no** emite eventos `error` con `sourceId` para fallos
  de tesela raster — un encuadre entero a 404 no produce ningún evento
  observable con origen.
- `map.style.tileManagers[id]._inViewTiles.getAllTiles()` expone las
  teselas del encuadre con `state` ∈ `loading|loaded|errored|…`.
- El gestor retiene teselas fuera de vista (`_outOfViewCache`) y pinta
  ancestros overscalados: contar toda la caché da falsos «CONTENT» tras
  alejarse de la zona cubierta. Solo `_inViewTiles` describe el lienzo.

## Decisión

`app.orthoRender` (`OrthoRender` en `types.ts`) con cinco estados:

| Estado | Significado |
|---|---|
| `IDLE` | sin capa `ortho` montada (modo no-photo/swipe, campaña no activada, sonda `NOT_COVERED`) |
| `LOADING` | capa montada, teselas del encuadre en vuelo (`!isSourceLoaded` o verificación pendiente) |
| `CONTENT` | ≥1 tesela del encuadre en `loaded` — hay imagen pintada, verdad máxima |
| `EMPTY` | 0 teselas cargadas y sonda del centro `NOT_COVERED` — sin cobertura en esta zona |
| `ERROR` | 0 teselas cargadas y sonda `SERVICE_ERROR`, o teselas `errored` con sonda sana — fallo recuperable, ofrece **Reintentar** |

Implementación en `MapView.svelte`: `moveend` invalida el veredicto del
encuadre anterior (`orthoRender=LOADING`), `idle` lanza
`verifyOrthoCanvas()` — `isSourceLoaded` → `_inViewTiles` → sonda
`probeCampaign` del centro. Las respuestas tardías se descartan por
secuencia (`oSeq`), las verificaciones repetidas por dedupe (`oKey`).

UI: overlay `.rstate` centrado en `.mapwrap` solo en `photo` con capa
visible — `LOADING` («Cargando la fotografía de {year}…»),
`EMPTY` («no tiene cobertura en esta zona» + campañas alternativas
verificadas), `ERROR` («No se ha podido cargar» + reintento real que
remonta source y capa). `CONTENT` no pinta nada extra.

Además, en el mismo cierre: **Evolución deja de reutilizar la rampa
binaria de Por antigüedad** — con `playActive` el fill de edificios es
una sola clase «año de construcción conocido» + rayas unknown, y la
leyenda nombra solo `playYear`. El año personal permanece en barra y
sidebar como contexto, nunca como segunda variable cromática.

## Consecuencias

- Nunca hay canvas blanco mudo: todo estado no-`CONTENT` queda
  declarado (overlay en lienzo o aviso del panel cuando la sonda retira
  la capa).
- `EMPTY` a nivel lienzo es un camino defensivo: en la práctica la
  sonda de punto (G16b) declara la falta de cobertura antes — el gate
  demuestra `photo_notcovered_declared` por esa vía y
  `photo_render_error_retry` por la de teselas.
- Internals de MapLibre (`tileManagers`, `_inViewTiles`) se usan en
  lectura defensiva: si la estructura cambia, `orthoTileStats()`
  devuelve `null` y el veredicto cae a la sonda de punto sin romperse.
- Regresión bloqueante en `mode_isolation.mjs`:
  `time_single_class_fill`, `time_legend_playyear_only`,
  `time_1974_single_class`, `map_legend_binary`,
  `map_fill_binary_restored`, `photo_render_content`,
  `photo_notcovered_declared`, `photo_render_error_retry` (26/26).
