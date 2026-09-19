# G4-R · BUGS — defectos reproducibles encontrados (sin arreglar)

Harness: `app/scripts/g4r_bughunt.mjs` + `g4r_verify.mjs` + `g4r_v3.mjs`
(build `f869de0`, Chromium 153, servidor estático del repo).
Datos: `bugs.json`. 15 escenarios, **0 errores JS** acumulados en toda la
batería.

## BUG-01 · MAJOR — `building=` sin `lat/lon/z` falla en silencio

Repro: `?year=1975&place=abadino&building=1-1017-2001-1-1` (sin cámara).
Esperado: edificio restaurado o aviso al usuario.
Observado: `pendingBuildingId` se consume, `restorePendingBuilding()`
escanea solo teselas de la cámara actual (centro municipal), el edificio
no está → fail-closed → **`building=` desaparece de la URL** y el usuario
ve el municipio sin edificio ni mensaje. Con `lat/lon/z` cercanos el mismo
link resuelve en ~2 s (verificado).
Causa: `MapView.svelte:404` — el restore depende de `querySourceFeatures`
sobre teselas ya cargadas; sin cámara no hay teselas del edificio.
Impacto: cualquier deep link al que se le quiten params de cámara pierde
el edificio silenciosamente. Contrato URL acoplado y no documentado.

## BUG-02 · MINOR — el histórico 1923–25 no es compartible ni restaurable

Repro: activar «Ver el mapa histórico» → URL no cambia → reload → capa
desaparece. `histMapVisible` no está en `serializeUrl` ni `parseUrl`.
Observado: visible antes=true, url sin param, tras reload=false.
Decisión G4: ¿`hist=1` o por diseño opt-in efímero? Hoy es inconsistencia
con `ortho=` que sí se serializa.

## BUG-03 · MINOR — Escape no cierra MI EDIFICIO

Repro: abrir «Buscar una dirección» → Escape → el formulario sigue
abierto. La convención de disclosures/dialogs espera cierre con Esc.

## BUG-04 · MINOR — Enter sin opción seleccionada no compromete el lugar

Repro: «Cambiar año o lugar» → escribir `Getxo` completo → Enter.
Esperado: selecciona la única candidata. Observado: nada; hay que bajar
con flecha y Enter. El combobox exige navegación explícita aunque haya
una sola candidata.

## BUG-05 · POLISH — `compare == year` aceptado (partición degenerada)

`?year=1987&compare=1987` → la partición «entre los dos años» queda vacía
por construcción. La UI no lo advierte. Opción: rechazar `compare == year`
en `parseUrl`/validación de CompareYear.

## Verificados OK (no-bugs)

- B1: deep link con los 9 params combinados resuelve coherente.
- B3: switching rápido MAPA/TIEMPO/FOTO ×6 en ~120 ms → 0 errores, modo
  final coherente.
- B4: back/forward entre vistas restaura `view=` correctamente.
- B6: `selectPlace()` limpia toda la profundidad (verificado con
  ArrowDown+Enter — el B6 inicial del harness era artefacto de sonda).
- B7: carrera de métricas (delay 3 s en `bilbao.json`) → last-write-wins
  correcto (`place === metrics.municipality`).
- B8: doble submit del hero → un solo resultado.
- B10/B12: overlay contextual sobrevive resize; toggles pares = off
  (consistente). La «anomalía» inicial era BUG-01 (sin cámara no hay
  `.ctx` que clicar).
- B11: `ortho=9999` ignorado limpio.
- B13: `year=1800` → intro limpio.
- B15: **0 pageerror / console.error** en toda la sesión.
