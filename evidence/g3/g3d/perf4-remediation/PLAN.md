# PERF4-R · PLAN — remediación estructural lazy-loading

Rama: `perf4-remediation` desde `f7ca204` (g3d-context-modules).
Producto bajo remediación: `f869de0` (= `26705c2` + docs).
**No se mide PERF4 timed durante el desarrollo.** El candidato se congela
por bundle + contratos funcionales; la adjudicación calibrada va después.

## Topología medida del build actual (pre-cambio, build limpio)

| Chunk | Raw | gzip | Rol |
|-------|-----|------|-----|
| `nodes/2.DFXk8Hsh.js` | **120,65 KB** | 38,88 KB | página completa: Hero + ResultView + 16 componentes + dominios L3/L4 |
| `chunks/DEoFgcQ-.js` | 1 066,49 KB | 289,23 KB | motor MapLibre — ya dynamic (`preloadMapEngine`), L1, no se toca |
| `chunks/BByR1_pp.js` | 28,50 KB | 10,88 KB | shared |
| `chunks/YRuID_rZ.js` | 27,82 KB | 6,77 KB | dynamic engine aux |
| `chunks/C9TC4tBP.js` | 25,81 KB | 8,84 KB | shared |
| `chunks/B_mMoUu6.js` | 19,29 KB | 7,57 KB | dynamic engine aux |
| entry start+app | ~26,6 KB | ~10,5 KB | runtime SvelteKit |
| **build_js_raw** | **1 345 861 B** | | medido en adjudicación |

Transitive imports que entran en `nodes/2` vía `ResultView`/`app.svelte.ts`:

- `AddressSearch` (19,2 KB src) + `domain/address` (7,4) + `domain/nora` (2,9)
- `CompareYear` (6,2) · `Contrast` (2,0)
- `CellDetail` (1,9) + `CellData` · `BuildingCard` (1,8)
- `PlanningContext` (7,7) + `domain/planning` (3,9 vía `resolveFacets` en state)
- `ContextModules` (10,5) + `domain/context` (5,1 vía `resolveContext` en state)
- `HistMapControls` (2,4) + `domain/histmap` (2,9; `histMapSourceDef` lo usa MapView eager — se queda)
- `PhotoPanel` (6,0)

## Fronteras (disparador → chunk)

| Frontera | Eager shell | Trigger | Contenido lazy |
|----------|-------------|---------|----------------|
| A · MI EDIFICIO | `AddressInvite` (misma `.invite`, copia y posición) | clic «Buscar una dirección» | `AddressSearch` + address domain |
| B · profundidad | `{#if selectedBuilding}` / `{#if selectedCell\|\|cellInspectNone}` | selección real o `building=` restaurado | `lazy/depth.ts` barrel: `CellDetail` + `BuildingCard` + `PlanningLocal` + `ContextModules` |
| C · DOS AÑOS | `CompareInvite` (mismo `.compare .invite`) | clic invitación o `?compare=` | `CompareYear` |
| D · FOTO | — (modo ya condicional) | `app.mode === 'photo'` | `PhotoPanel` |
| E · 1923-25 | `HistMapInvite` (misma propuesta+botón) | clic «Ver el mapa histórico» | `HistMapControls` + sonda |

## Decisiones explícitas

- **PlanningContext se parte**: la tabla **municipal es contenido siempre
  visible** → queda eager. Solo el bloque local (`local.facets`, geometría
  opt-in) pasa a `PlanningLocal` (lazy). Mover la sección entera tras
  `selectedBuilding` cambiaría el producto.
- **OrthoControls se queda eager** (§8 del encargo: rediseñar las tres
  entradas ortofoto es G4; son 4 KB y comparten `ortho-probe` con
  Timeline, ya eager).
- **Contrast/DecadeDistribution/Timeline/MapView eager** (L1/L2).
- **`resolveFacets`/`resolveContext` salen del grafo eager**: `import()`
  dentro de `ensurePlanningLocal`/`ensureContextLocal` — las funciones
  solo se invocan con edificio resuelto.
- **Efectos de limpieza eager en PlanningContext**: al deseleccionar el
  componente lazy se desmonta y su `$effect` no correría; sin el efecto
  eager quedarían `contextLocal`/`contextOverlay`/`planningLocal`
  residuales pintados en el mapa — eso sería un cambio visible.
- `import type` para todos los tipos L3/L4 en `app.svelte.ts`.
- Estados de carga: `Lazy.svelte` con `role="status"` + `ui.loading`
  («Cargando…», única string nueva).

## Sin carga perezosa falsa

Nada de preload en idle/viewport/timeout: cada chunk se pide solo por
acción explícita del usuario o restauración de deep link.

## Objetivo de ingeniería (no es el gate)

≥ 50 KB raw fuera del chunk inicial de página vs `f869de0`
(estimación G4-R: 60–75 KB extraíbles).
