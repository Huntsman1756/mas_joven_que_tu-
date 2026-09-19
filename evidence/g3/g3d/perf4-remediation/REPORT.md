# PERF4-R · REPORT — remediación estructural lazy-loading

Fecha: 2026-09-19 · Rama: `perf4-remediation`
Pregunta del candidato: *¿el lazy-loading arquitectónico elimina la
regresión PERF4 sin cambiar el producto?*
**No se ejecutó el harness timed PERF4 durante el desarrollo** — el
candidato se congela por topología de bundle + contratos funcionales.

## A. Baseline de producto

`f869de0` (producto candidato bajo remediación; docs posteriores no
cambian el producto). Medición estática desde build limpio en esta sesión
(mismo método que la adjudicación: manifiesto Vite + tamaños en disco).

## B. Candidato de remediación

`a34eadc` (tres commits de producto: `57e00ff` fronteras, `cfbb8d1`
HistMapInvite sin anidamiento + probe, `a34eadc` foco de sonda).

## C. Fronteras lazy implementadas

| Frontera | Eager (visible) | Trigger | Chunk lazy |
|---|---|---|---|
| MI EDIFICIO | `AddressInvite` — misma `.invite`, copia y posición | clic «Buscar una dirección» | `AddressSearch` + dominio address/NORA |
| Profundidad edificio | — (nada visible sin edificio) | `selectedBuilding` real o `building=` restaurado | `lazy/depth.ts` → `BuildingCard`, `PlanningLocal`, `ContextModules`, `CellDetail` (este último con `selectedCell\|cellInspectNone`) |
| Planeamiento local | parte municipal queda en `PlanningContext` (eager, siempre visible) | edificio resuelto | `PlanningLocal` (facets + geometría opt-in) |
| DOS AÑOS | `CompareInvite` — mismo `.compare .invite` | clic invitación o `?compare=` | `CompareYear` (`initialEditing` según origen) |
| FOTO | — (modo condicional) | `mode==='photo'` o `?view=photo` | `PhotoPanel` |
| 1923–25 | `HistMapInvite` — misma propuesta+botón | clic «Ver el mapa histórico» | `HistMapControls` (sondea al montar) |
| Dominios | — | dentro de `ensurePlanningLocal`/`ensureContextLocal` | `import('$lib/domain/planning')`, `import('$lib/domain/context')` — con guards de identidad intactos |

`Lazy.svelte` (genérico, ~30 líneas): `import()` solo al montar —
sin idle/viewport/timeout/modulepreload de L3/L4.

## D. Chunk de página antes/después

| | f869de0 | a34eadc |
|---|---|---|
| `nodes/2` | 120.652 B raw / 38,9 KB gz | 66 B (stub) + chunk de página 89.172 B |

El nodo de ruta quedó como stub porque Vite extrajo el código compartido
con los chunks lazy a un chunk aparte; la medida honesta es el cierre
transitivo (E/F).

## E. JS inicial pedido (ruta resultado) antes/después

`node2 + imports transitivos` según manifiesto:

| | f869de0 | a34eadc | Δ |
|---|---|---|---|
| raw | 200.201 B | 170.349 B | **−29.852 B (−14,9 %)** |
| gzip | ~64 KB | 61.756 B | ≈ −2,5 KB |

Contenido extraído del grafo eager (verificado por sondeo del chunk de
página: `searchStreets`/`listPortals`/`noraYear`/`probeHistMap`/
`twoYearPartition`/`loadPlanning`/`loadContext` ausentes):

| Chunk lazy | raw | gzip |
|---|---|---|
| AddressSearch + dominio address/NORA | 13.768 B | 5.015 B |
| depth barrel (CellDetail+BuildingCard+PlanningLocal+ContextModules) | 12.642 B | 4.349 B |
| CompareYear | 3.901 B | 1.601 B |
| PhotoPanel | 3.930 B | 1.675 B |
| HistMapControls | 2.119 B | 975 B |
| domain/planning | 1.336 B | 677 B |
| domain/context | 904 B | 472 B |

## F. build_js_raw antes/después

| f869de0 | a34eadc | Δ |
|---|---|---|
| 1.346.152 B | 1.354.570 B | +8.418 B |

El total crece ligeramente: el split multiplica cabeceras/glue de chunks.
Es esperado y no penaliza la ruta inicial.

## G. transfer_hero / transfer_result

`transfer_hero`: la landing comparte el mismo `nodes/2`; el JS pedido en
hero baja en la misma proporción (−30 KB raw del cierre transitivo).
`transfer_result`: −29,9 KB raw ≈ −2,5 KB gzip de JS inicial respecto a
f869de0. El motor MapLibre (289 KB gz, ya dynamic+preload) no se toca.

## H. Prueba de red del resultado por defecto

`evidence/g3/g3d/perf4-remediation/lazy-contract.json` —
journey `default` (`?year=1987&place=leioa`, ready + 5 s idle):
**0 chunks L3/L4, 0 requests `data/context*`, 0 errores.** PASS.

## I. Prueba por disparador

Mismo archivo, journeys A–E (nombres resueltos desde el manifiesto):

| Trigger | Chunk pedido | Resultado |
|---|---|---|
| clic «Buscar una dirección» | `AddressSearch` ×1, nada más | PASS |
| `?building=…` deep link | `depth` + `domain/planning` + `domain/context`; **sin** `AddressSearch` | PASS |
| `?compare=1960` | `CompareYear` ×1 | PASS |
| `?view=photo` | `PhotoPanel` ×1 | PASS |
| clic «Ver el mapa histórico» | `HistMapControls` ×1; **0 requests raster antes del clic** | PASS |

## J. Matriz de restauración de deep links

`deeplink-race.json` → `deeplink`: `year_place`, `camera`, `building`,
`compare`, `view_photo`, `play` — **6/6 PASS incl. `reload_same`**.
`building=` resuelve identidad vía `pendingBuildingId` en estado (eager),
sin depender del flujo de dirección.

## K. Matriz de carreras/fallos

`deeplink-race.json` → `race`: doble clic dirección (1 panel), MAPA→FOTO
→MAPA durante la carga (queda en `map`), cambio de municipio por la UI
mientras resuelve el chunk de dirección, swap de edificio durante
profundidad (guards `*Bid` consistentes), histórico con raster abortado
(UNAVAILABLE, fail-closed), back durante carga FOTO — **6/6 PASS, 0
pageerror/unhandled rejection**.

## L. Accesibilidad

- `Lazy` muestra `role="status"` + «Cargando…» (única string nueva:
  `ui.loading`).
- axe: `g1_a11y` (intro+resultado, 0 violaciones), `g2b` (axe por modo
  MAPA/TIEMPO/FOTO + no-cobertura + error), `g3a`/`g3b`/`g3c`/`g3d --axe`
  — todos 0 violaciones.
- Foco: fix dedicado (`a34eadc`) — la sonda de teclado espera al nodo
  lazy antes de enfocar `#cell-detail` (g1r `keyboard_probe_focus` PASS).
- Reduced-motion PASS (`g1_a11y`, `g2a`); 320 px y zoom 400 % PASS
  (`launch_browser_smoke --reflow/--zoom400`, `g3*` `--reflow`).

## M. Matriz de regresión funcional

| Verificación | Resultado |
|---|---|
| `npm run check` | 0 errores (2 warnings intencionales: props de captura inicial) |
| `npm run lint` | limpio |
| `npm run format:check` | limpio |
| `npm run test` (vitest) | 15/15 |
| `npm run build` | OK, engine-preload = 3 chunks (idéntico a f869de0) |
| `pytest tests/data` | 38/38 |
| lazy-contract probe | 6/6 |
| deeplink+race probe | 12/12 |
| launch smoke chromium/firefox/webkit | PASS |
| g3d_context (main/reflow/axe/engines) | PASS |
| g3c_histmap (main/reflow/axe) | PASS |
| g3b_planning (main/reflow/axe) | PASS |
| g3a_flow ×3 (+reflow/axe) | PASS |
| g2a_play | PASS (todas las aserciones) |
| g2b_views | PASS (todas las aserciones) |
| g1r_cell_detail | PASS (incl. foco teclado) |
| g1r_ortho_preview | 6/6 PASS |

El harness timed PERF4 (`g1_gate_perf.mjs`) **no se ejecutó** — adjudicación
pendiente en sesión calibrada aparte.

## N. Archivos de producto cambiados

- Nuevos: `Lazy.svelte`, `AddressInvite.svelte`, `CompareInvite.svelte`,
  `HistMapInvite.svelte`, `PlanningLocal.svelte`, `lib/lazy/depth.ts`
- Modificados: `ResultView.svelte` (imports + montajes), `PlanningContext.svelte`
  (split municipal/local + limpieza eager), `app.svelte.ts` (import type +
  resolvers dinámicos), `AddressSearch.svelte` (`initialOpen`),
  `CompareYear.svelte` (`initialEditing`), `HistMapControls.svelte`
  (sonda al montar), `MapView.svelte` (espera al nodo lazy para foco),
  `es.ts` (`ui.loading`), `gen-engine-preload.mjs` (preload por manifiesto,
  mismo conjunto: maplibre+pmtiles+swipe).

## O. Diferencias semánticas/UX

**Ninguna intencional.** Las invitaciones conservan copia, posición y
estilos (mismas clases CSS). Los estados de carga lazy usan `role=status`
textual. La sección histórica deja de anidar dos `.histmap` (bug
introducido y corregido en `cfbb8d1`). Ningún bug G4-R corregido, ninguna
feature añadida/eliminada, sin cambios de datos ni gates.

## P. Valoración estática de la remediación

- JS inicial de la ruta resultado: **−29,9 KB raw (−14,9 %)** sobre
  f869de0 — por debajo del objetivo de ingeniería de ≥50 KB. La cota
  teórica de G4-R (60–75 KB) incluía código que el contrato mantiene
  eager (municipal planning, OrthoControls, DecadeDistribution,
  Contrast) y glue compartido que Vite no separa.
- La regresión medida era +128 ms p75 bajo CPU×4; ~30 KB raw menos de
  JS inicial es una reducción material y coherente con esa magnitud.
- **El veredicto real corresponde a la adjudicación calibrada posterior**
  (baseline `0563d60` → candidato, mismo protocolo congelado). Este
  documento no anticipa PASS/FAIL.

Candidato congelado: `a34eadc` + este commit de evidencia.
