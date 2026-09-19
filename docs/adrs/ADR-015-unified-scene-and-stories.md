# ADR-015 — Escena unificada MAPA·TIEMPO·FOTO·1923–25 e historias editoriales

- **Estado:** aceptado
- **Fecha:** 2026-10-02

## Contexto

G3-D dejó la evidencia óptica y la cartografía histórica como secciones
independientes bajo el mapa (`OrthoControls`, `HistMapInvite`): tres caminos
percibidos a la ortofoto (marcas del eje, sección propia, vista FOTO), un CTA
duplicado para el mapa 1923–25 y ~10 acciones en el primer viewport
(`docs/g4/CONTROL-AUDIT.md`). La investigación de producto (G4-R) concluyó que
el mayor defecto era la planitud: una `.sheet` que mezclaba once piezas de
niveles distintos.

Además se detectó BUG-01: un deep link `?building=<id>` sin cámara no podía
localizar el edificio — el escaneo por teselas solo ve lo cargado en vista — y
el id se consumía sin aviso.

## Decisión

**1. Un solo modelo de escena con cuatro modos** (`app.mode`):

    map · time · photo · hist

- `view=` serializa el modo (`map` es el default omitido). No existe `hist=`
  aparte: `view=hist` representa el estado completo.
- Los opt-ins de evidencia son *modos*: entrar en FOTO o 1923–25 desde el
  `ViewSwitch` es la acción que habilita su panel (lazy) y su red. Las marcas
  de campaña del Timeline son la entrada principal a FOTO y activan la campaña
  exacta — `activateOrtho` fija `mode='photo'` y retira la capa histórica
  (mutuamente excluyentes).
- `OrthoControls` y `HistMapInvite` dejan de existir como secciones; el
  comparador de ortofoto vive dentro de FOTO y serializa `ortho2=`.
- `ortho=` sin `view=` implica `view=photo` (compatibilidad de deep links).

**2. Historias editoriales** (G4 §13–16): cinco capítulos congelados
(`c2803`, `f4036`, `f4233`, `f4738`, `f149`) dentro de `/`, sin rutas nuevas.

- `domain/stories.ts` es eager y mínimo (solo configuración de escena);
  `StoryChapter` es un chunk perezoso que nunca se pide en el resultado por
  defecto — `story=` en URL es la otra vía de demanda.
- Cada capítulo configura: municipio ancla, año de referencia, cámara,
  cabezal pausado, modo y campañas «desde el aire» (c1/c2 → `ortho`/`ortho2`).
- Estado personal congelado en `storySnapshot` al entrar desde un resultado;
  «Volver a mi Bizkaia» lo restaura. Deep link directo `?story=` sin snapshot:
  el estado serializado queda como personal (default documentado, GH3).
- Rotación determinista de «Descúbreme un cambio» / «Otro» en el orden
  editorial congelado; `story=` es compartible y correcto bajo back/forward.

**3. BUG-01 — índice de edificios.** `pipeline/g4_building_index.py` deriva de
los geojson fuente de los pmtiles un índice `buildings-index/<cod>.json`
(id catastral → centroide). `MapView` lo usa para localizar `building=` de
forma determinista; si ni índice ni teselas lo sirven, el id se consume con
aviso visible (`building.restore_failed`) — nunca desaparece en silencio.

## Consecuencias

- Un solo camino a ortofoto y a histórico; la escena es el único opt-in.
- El critical path no carga: historias, profundidad, planeamiento, contexto,
  índice de edificios ni implementación de foto/histórico — todo demanda.
- `PersonalSnapshot` añade superficie de estado: los efectos de limpieza
  viven en `selectPlace`/`reset`/`closeStory`, auditados en la matriz G4.
