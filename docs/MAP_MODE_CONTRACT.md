# MAP_MODE_CONTRACT — contrato semántico de los cinco modos (G19-R4)

Documento de verdad del producto, escrito desde el código real
(`MapView.svelte`, `ViewSwitch.svelte`, `ResultView.svelte`,
`app.svelte.ts`, `+page.svelte`). Si el código y esta tabla discrepan,
la tabla es el contrato deseado y el código está mal.

Invariante bloqueante de release:

```
tab activa == app.mode == URL view == capas renderizadas == modo del player
```

## Tabla de contrato

| MODE | `map` — **Por antigüedad** | `time` — **Evolución** | `photo` — **Fotos aéreas** | `hist` — **Mapa 1923–25** | `swipe` — **Antes / ahora** |
|---|---|---|---|---|---|
| **Pregunta que responde** | ¿Qué edificios actuales son anteriores o posteriores a mi año? | ¿Qué parte del parque actual ya estaba construida en el año que recorro? | ¿Qué muestra la fotografía aérea oficial de esta campaña? | ¿Qué registraba la cartografía oficial de 1923–25? | ¿Qué cambió entre la imagen histórica y la actual? |
| **Fuentes/layers visibles** | base + `munis-*`/`cells-*`/`b-*-fill/noyear` (según zoom) + `sel-muni-outline` | igual que `map`, pero con filtro temporal | raster `ortho` + `sel-muni-outline` (+ `b-*-line` solo si `overlayBuildings`) | raster `histmap` + `sel-muni-outline` | `ortho` en el lienzo + cortina `SwipeCompare` (antes) |
| **Variable de color** | cuota construida **después de** `year` (`shareAfterParsed`); edificios: bermellón posterior / azul anterior / rayas unknown | cuota construida **hasta** `playYear` (`shareUntilParsed`/`countUntilParsed`); edificios: **clase única «ya construido»** (azul pizarra) + rayas unknown — jamás la rampa binaria por `birthYear` | ninguna (la imagen es la fuente) | ninguna | ninguna |
| **Edificios mostrados** | TODOS los actuales | VALID con `year <= playYear` + no-VALID | solo contorno opt-in | solo contorno opt-in | no |
| **Edificios ocultos** | ninguno | VALID con `year > playYear` (filtro `playCond`) | fills siempre | fills siempre | fills siempre |
| **Year unknown** | clase propia (rayas `noyear`), siempre visible | permanece fuera del orden temporal, visible (`!= VALID` pasa el filtro) | n/a | n/a | n/a |
| **Control temporal** | ninguno | `HistoricalTimePlayer mode="continuous"` | `HistoricalTimePlayer mode="discrete"` (un paso = campaña real) | ninguno | ninguno |
| **Estado inicial** | año personal fijo | cabezal anclado pausado en `year` (o `play=` del URL) | sin raster hasta activar campaña (base limpia — **nunca** heatmap por defecto) | raster si `histMapState !== UNAVAILABLE` | imagen 2 = última campaña; cortina = heurística o `ortho2=` |
| **Estado del raster en lienzo** | n/a | n/a | `orthoRender`: `IDLE`→`LOADING`→`CONTENT`/`EMPTY`/`ERROR` — declarado en el lienzo (`LOADING`/`EMPTY`/`ERROR` muestran aviso; ERROR ofrece reintentar). Nunca canvas blanco mudo | n/a | hereda el veredicto de `ortho` (la cortina tiene su propio estado de carga) |
| **URL state** | `year`, `place`, `lat/lon/z`, `building`, `compare` | `+ view=time`, `play=P` | `+ view=photo`, `ortho=A`, `ortho2=B` (dúo) | `+ view=hist` | `+ view=swipe`, `ortho`(actual), `ortho2`(antes elegida) |
| **Overlays opcionales** | capas contextuales opt-in (ruido/paradas/montes) por ficha | igual | `layers.buildings` (contorno actual) | ninguno | ninguno |

## Reglas derivadas del contrato

1. **`playYear` fuera de `time` es estado guardado, no vista.** Persiste
   al salir de Evolución (restauración al volver, `pausePlayback`), pero
   `app.playActive` (`mode === 'time' && playYear !== null`) gobierna
   todo lo visible: filtro `playCond`, cuota `until`, leyendas `*.play`,
   montaje del player y el param `play=` del URL.
2. **`play=` sin `view=` implica `time`** (un cabezal solo existe dentro
   de Evolución; `?play=1974` solo nunca pinta una lente sobre Edificios).
3. **En los modos de evidencia (`photo`/`hist`/`swipe`) el heatmap de
   edad no es el contenido por defecto, con o sin raster activo.**
   `applyEvidenceVisibility` decide por modo, no por presencia de capa.
   Entrar en Fotos por tab no pide red (opt-in): la espera es la base
   limpia + el player discreto.
4. **Solo `photo` y `time` montan `HistoricalTimePlayer`.** Mismo
   componente, mismo DOM (`Play · ‹ · año · › · rail · ⓘ`); solo difiere
   `data-player-mode` y el contenido del rail (relleno por décadas vs
   ticks de campañas).
5. **Al salir de un modo se retiran sus capas exclusivas**: `orthoVisible`
   se apaga fuera de photo/swipe, `histMapVisible` fuera de hist; el
   raster se desmonta en `updateOrtho`/`setHistMapLayer`.
6. **Evolución nunca afirma "así era Bilbao en P"**: muestra qué
   edificios del stock ACTUAL constan construidos hasta P
   (`CURRENT_BUILDING_STOCK != HISTORICAL_BUILDING_STOCK`).
7. **Evolución tiene una sola variable visual.** Los edificios visibles
   son todos de la misma clase («año de construcción conocido»); el año
   personal solo fija el anclaje inicial del cabezal y vive en la
   barra/sidebar como contexto — nunca como segunda codificación
   cromática (regresión: `time_single_class_fill`, `time_1974_single_class`,
   `time_legend_playyear_only`).
8. **El raster orto declara su estado en el lienzo** (`orthoRender`):
   `IDLE` sin capa, `LOADING` con teselas en vuelo, `CONTENT` con ≥1
   tesela del encuadre pintada, `EMPTY` sin cobertura en el encuadre
   (teselas fallidas + sonda `NOT_COVERED`), `ERROR` fallo recuperable
   (teselas fallidas con la sonda viva, o sonda `SERVICE_ERROR`). La
   verdad de tesela se lee del `tileManager` (`_inViewTiles`) — los
   eventos `error` de MapLibre no emiten `sourceId` para fallos de
   tesela, verificado empíricamente. La falta de cobertura *del punto*
   la declara la sonda (`orthoState = NOT_COVERED` → capa retirada +
   aviso con alternativas en el panel); la del *encuadre* la declara
   `orthoRender` en el lienzo.

## Evidencia

- `evidence/g19r4/mode_isolation.txt` — gate `scripts/mode_isolation.mjs`
  (26/26 tras el cierre visual: +`map_legend_binary`,
  `time_single_class_fill`, `time_legend_playyear_only`,
  `time_1974_single_class`, `map_fill_binary_restored`,
  `photo_render_content`, `photo_notcovered_declared`,
  `photo_render_error_retry`).
- `evidence/g19r4/matrix.json` — contrato observable por modo × zoom.
- `evidence/g19r4/matrix-c.json` + `c-*.png` — las cuatro capturas del
  cierre visual (misma cámara, año 1922): `map/1922`, `time/1922`,
  `time/1945`, `photo/1965` con `orthoRender` resuelto.
- `evidence/g19r4/buildings-map-vs-time.json` — tabla de ids por modo
  (Phase 1: a nivel edificio los modos difieren aunque `playYear ==
  birthYear`).
- `evidence/g19r4/*-{z,b}-*.png` — matriz visual con cámara fija.
