# G4-R · PERFORMANCE-ARCHITECTURE — forense de bundle (solo documento)

Input de remediación **solo si** la sesión calibrada PERF4 demuestra
regresión real. Nada de esto se implementa aquí.

## Estado medido del build `f869de0`

| Chunk | Raw | gzip | Rol |
|-------|-----|------|-----|
| `chunks/DEoFgcQ-.js` | 1 066 KB | 287 KB (brotli ~237 KB) | MapLibre+deps — **ya es dynamic import** (`preloadMapEngine`) |
| `nodes/2.*.js` (página) | 120,6 KB | 38,7 KB | **TODA la página**: Hero+ResultView+los 16 componentes de profundidad |
| `chunks/B_mMoUu6.js` | 19,3 KB | — | dynamic (engine aux) |
| `chunks/YRuID_rZ.js` | 27,8 KB | — | dynamic (engine aux) |
| `chunks/BByR1_pp.js` | 28,5 KB | — | shared |
| `chunks/IBJAdo4q.js` | 25,8 KB | — | shared |
| `entry/start+app` | ~27 KB | — | SvelteKit runtime |
| **Total JS** | **~1 346 KB** | | raw (`build_js_raw`) |

Hallazgo estructural: el motor de mapa ya está separado y se precarga en
paralelo con métricas. **El único chunk eager de producto es el nodo de
página de 120 KB raw**, que contiene `import` estático de los 16
componentes de `ResultView` + dominio NORA/planning/contexto/histmap.

## Qué necesita `t_result_ready` (L1/L2 congelado)

Necesario: Hero/ResultView shell, headline (metrics domain), MapView +
engine, Timeline, DecadeDistribution, ViewSwitch, topbar/share.
NO necesario antes de `t_result_ready`:

| Candidato lazy | Fuente src | Contenido | Disparador UX | Coste de chunk |
|----------------|-----------|-----------|---------------|----------------|
| AddressSearch | 19,2 KB comp + `address.ts` 7,4 KB + `nora.ts` 2,9 KB | flujo MI EDIFICIO completo | clic «Buscar una dirección» | skeleton en el disclosure |
| PlanningContext + `planning.ts` | 7,7 KB + 3,9 KB | sección planeamiento | `selectedBuilding` o viewport | texto ya montado |
| ContextModules + `context.ts` | 10,5 KB + 5,1 KB | módulos de entorno | `selectedBuilding` | igual |
| HistMapControls + `histmap.ts` | ~2,5 KB + 2,9 KB | control 1923-25 | primer «Ver…» | estado «cargando» ya existe |
| PhotoPanel | 6,0 KB | modo FOTO | `mode==='photo'` | placeholder en panel |
| CompareYear | 6,2 KB | DOS AÑOS | clic invitación | mínimo |
| Contrast | ~3 KB | diagnóstico | viewport (o se queda) | mínimo |
| CellDetail/BuildingCard | ~4 KB | detalle por selección | selección real | mínimo |

Suma estimada extraíble del nodo eager: **~60–75 KB raw** (~50 % del
chunk de página) ≈ **~15–20 KB gzip**. Con el mega-chunk intacto.

## Frontera de seguridad

- NO tocar: MapView (47 KB src), Timeline (11,7 KB), métricas/headline,
  DecadeDistribution — son L1/L2 y definen `t_result_ready`.
- El motor MapLibre (287 KB gzip) es inevitable para L1 — ya lazy +
  preload paralelo; su tamaño no es remediale por split.
- La deuda REAL de perf es el parse/compile del mega-chunk bajo CPU×4 —
  un split de componentes reduce el nodo de página pero no el motor.
  Si la medición calibrada exige más margen, la palanca siguiente es
  evaluar qué submódulos de MapLibre/estilo se importan (fuera de
  alcance sin investigación dedicada).

## Arquitectura de chunks propuesta (documento)

```
entry: runtime + página shell + hero + headline (L1)
chunk-mapa: MapLibre + MapView + Timeline + dist (L1/L2) — ya existe
chunk-personal: AddressSearch + nora + address + BuildingCard +
                PlanningContext + ContextModules + loaders L3
                → se pide al primer opt-in personal o selectedBuilding
chunk-escena: PhotoPanel + OrthoControls + HistMapControls + histmap
              → se pide al primer opt-in de superficie
chunk-historias (G4): story corpus + capítulo → bajo story=/Descúbreme
```

Nota de riesgo: SvelteKit/Vite decide el corte real; el objetivo es que
ningún import estático llegue a L3/L4 desde `ResultView`/`+page`.
