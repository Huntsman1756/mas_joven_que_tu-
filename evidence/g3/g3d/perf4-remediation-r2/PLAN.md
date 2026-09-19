# PERF4-R2 — plan congelado (remediación dirigida al critical path)

Rama: `perf4-remediation-r2` (desde `8195ca7`, pusheada antes de tocar nada).
Producto bajo evaluación: `a34eadc`. Baseline: `0563d60`.
Resultado previo: baseline p75 3403 PASS / candidato p75 3505 FAIL (+5 ms).

**NO se ejecuta PERF4 timed en esta sesión.** Solo trazas diagnósticas (1
navegación P2 por build) + verificación funcional. Un único candidato
congelado al final.

## Hipótesis primaria (registrada ANTES de decidir la remediación)

`PlanningContext.svelte` se monta en toda página de resultado y ejecuta:

```ts
$effect(() => { if (app.place) app.ensurePlanningMuni(); });
```

El planeamiento municipal está clasificado L4 (G4-R) y muy por debajo del
primer viewport, pero `ensurePlanningMuni()` lanza `GET data/planning-muni.json`
(16,7 KB raw, tabla de 112 municipios) en cuanto existe `app.place` — dentro
de la ventana que PERF4 mide (`headline + canvas + areTilesLoaded + celda`).

Además `app.svelte.ts` importa estáticamente `loadPlanningMuni` de
`catalog.ts`, aunque `catalog.ts` ya es eager por `loadMetrics`/`loadCatalog`
— el coste de *código* eager es probablemente nulo; el coste real es la
**petición + parse** compitiendo por Slow4G en la ventana del mapa.

La hipótesis debe confirmarse o rechazarse con la traza, no asumirse.

## Método

1. Build `a34eadc` y `0563d60`. Una navegación P2 cada uno
   (`?year=1987&place=leioa`, 390×844 DSF3, CPU×4, Slow4G CDP).
2. CDP Network: waterfall (inicio/fin/encodedDataLength) + PerformanceObserver
   longtasks + hitos (headline, canvas, equivalente `t_result_ready`).
3. Clasificar cada ítem candidate-only pre-`t_result_ready`:
   `CORE_REQUIRED | BELOW_FOLD | USER_REQUESTED | ACCIDENTALLY_EAGER`.
4. Elegir remediación por evidencia:
   - A: embeber `planning_summary` en el artefacto metrics (solo si limpio).
   - B: IntersectionObserver near-viewport (señal legítima de demanda).
5. Contrato post-fix: `perf4_critical_path_contract.mjs` — cero requests de
   planeamiento/contexto/address/compare/photo/histmap antes de
   `t_result_ready` en la ruta por defecto.
6. Equivalencia de producto G3-B en Bilbao, Leioa, rural, campo nulo.
7. Verificación completa (sin `g1_gate_perf.mjs`). Un commit producto + un
   commit evidencia.

## Restricciones heredadas

Sin fake-lazy (timeout/idle/post-ready), sin tocar MapLibre/preload,
sin rediseño UX, sin segunda pasada de optimización salvo fallo funcional.
