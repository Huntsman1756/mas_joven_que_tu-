# G4-R · Interaction graph — el mapa real de acciones

Fuente: `app.svelte.ts` + `url.ts` + `+page.svelte` + sondas en navegador.
JSON navegable: `evidence/g4/research/interaction-graph.json`.

## Contrato URL actual

`year place lat lon z ortho building play view compare` — 9 params.

**No serializado** (se pierde al compartir/recargar):
- `histMapVisible` — el histórico 1923–25 **no es compartible** (BUG B5).
- `orthoCompare` — la segunda campaña del comparador se pierde.
- `contextOverlay` / `planningHighlight` — overlays activas.
- `selectedCell` — detalle de celda.
- Texto de dirección — nunca en URL (correcto: privacidad GA4).

## Rutas duplicadas al mismo resultado

| Resultado | Camino A | Camino B | Camino C |
|-----------|----------|----------|----------|
| Ortofoto | marca de campaña en timeline → propuesta | OrthoControls «Ver la foto» | ViewSwitch → FOTO |
| Edificio seleccionado | tap en polígono | flujo MI EDIFICIO | deep link `building=` |
| Año en mapa | `year` (ancla) | `playYear` (cabezal) | `compare` (partición) |

Tres años conviven (`year`, `playYear`, `compareYear`) — correcto por
contrato T1, pero el usuario tiene tres formas de «mover el año» y ninguna
se explica en pantalla hasta usarla.

## Puntos frágiles verificados

1. **`building=` sin `lat/lon/z` falla en silencio** (BUG-01): el restore
   escanea teselas cargadas en la cámara actual; sin cámara cercana el
   edificio no está → fail-closed → param consumido y eliminado de la URL
   sin aviso. Con cámara: resuelve en ~2 s y dispara planning+contexto.
2. **`selectPlace()` destruye 20+ campos**: cambiar de lugar borra
   edificio, compare, ortofoto, histórico, contexto. Diseñado, pero el
   cambio de lugar es irreversible desde la UI (Back sí restaura por URL).
3. **`ortho=` con campaña inexistente se ignora sin aviso** (graceful,
   aceptable).
4. **Enter sin seleccionar opción no compromete el lugar** en el
   formulario «Cambiar año o lugar» (BUG-04): el usuario escribe el nombre
   exacto, pulsa Enter y no pasa nada.
5. **Escape no cierra el flujo MI EDIFICIO** (BUG-03).
6. Overlay exclusividad: `setContextOverlay` limpia `planningHighlight` —
   verificado en estado y en UI. Correcto.
7. `placeSeq` last-write-wins protege carreras de lugar — verificado B7.
8. `compare == year` se acepta y produce partición degenerada
   (todo «antes o en», nada «entre») — POLISH.

## Callejones sin salida (dead ends)

- `metricsError` — retry implícito solo por `ensureMetrics`; sin botón.
- Celda sin edificios conocidos — tooltip lo dice y no ofrece siguiente
  paso (correcto pero mudo).
- FOTO `not_covered` — ofrece alternativas (buen patrón, extensible).

## Acciones con efectos laterales sorprendentes

- Cambiar campaña en FOTO muta `ortho=` en URL (compartible) pero la
  comparación activa no (asimetría).
- Activar histórico no muta URL en absoluto.
- Scrub del timeline muta `play=` solo en eventos discretos — una URL
  compartida mid-play captura el cabezal, no la animación (documentado).
