# PERF4-R2 — critical path trace (diagnóstico, no timing)

Una navegación P2 por build (`?year=1987&place=leioa`, 390×844 DSF3, CPU×4,
Slow4G CDP). Traza completa: `critical-path-baseline.json`,
`critical-path-current.json`. Harness: `app/scripts/perf4_critical_path_trace.mjs`.

## Hitos (ms desde commit)

| hito | baseline 0563d60 | candidato a34eadc |
|---|---:|---:|
| headline | 4072 | 4081 |
| lead2 | 4102 | 4117 |
| map_canvas | 9099 | 9245 |
| t_result_ready equiv. | 13018 | 13154 |

Long tasks: 7 vs 6, posiciones equivalentes (no hay trabajo de parse
diferencial dominante).

## Única petición candidate-only de datos en la ventana

```
/data/planning-muni.json   inicio 3875 ms · fin 4452 ms · 3 286 B enc
```

En baseline **no existe** — `PlanningContext` no existía en `0563d60`
(pre-G3). En el candidato se lanza en cuanto `app.place` resuelve
(`$effect` en `PlanningContext.svelte`), entre la llegada de metrics
(3572) y el arranque del worker MapLibre (8583): compite por el único
canal Slow4G justo antes de las teselas.

## Clasificación de ítems candidate-only pre-t_result_ready

| ítem | clase | motivo |
|---|---|---|
| `data/planning-muni.json` 3,3 KB | **ACCIDENTALLY_EAGER** | L4, sin señal de usuario, sin papel en la condición de readiness |
| re-topología de chunks (+10,2 KB enc JS) | CORE_REQUIRED | mismo código eager reempaquetado por la frontera lazy R1; no es trabajo nuevo |
| `maplibre-gl-worker`, `cells/*.json`, css mapa | CORE_REQUIRED | presentes en baseline |

Sin trabajo candidate-only de `Contrast`, `OrthoControls`,
`DecadeDistribution`, shells address/compare, glue photo/histmap ni
imports de catálogo: ninguno emite request propio en la ventana.

## Hipótesis: CONFIRMADA

El planeamiento municipal inicia red+parse a los 3,9 s, dentro de la
ventana crítica, siendo L4 y estando a 2 046 px de documento
(viewport 844). Es la única petición de datos candidate-only.

## Decisión: OPCIÓN B (below-fold legítimo), no A

Opción A exigiría injertar la tabla G3-B (snapshot congelado propio,
procedencia distinta) en los 112 artefactos metrics de G1: cambio de
contrato de datos, regeneración de artefactos + manifests/QA, y acoplamiento
de dos gates. Opción B elimina la misma petición sin tocar el contrato de
datos: IntersectionObserver sobre un centinela en la posición de la sección
(`rootMargin 600px` → dispara a ~1 444 px de scroll; la sección está a
2 046 px ⇒ jamás en carga inicial), `focusin`/auto-scroll cubren la
navegación por teclado. Sin setTimeout/idle/trampas temporales.

i18n: `es.ts` = 26 971 B raw → 7 920 B gzip / 6 986 B br. ~131/285 claves
son feature-local; un split requeriría registro asíncrono de diccionario
para ~3–4 KB gz — no material frente al riesgo de contrato. No se
implementa en R2 (candidato de G4).
