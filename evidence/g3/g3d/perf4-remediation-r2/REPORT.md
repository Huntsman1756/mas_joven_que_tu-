# PERF4-R2 — informe (diagnóstico + funcional, SIN timing de gate)

Rama: `perf4-remediation-r2`. Hipótesis y método: `PLAN.md`. Trazas:
`critical-path-baseline.json` · `critical-path-current.json` ·
`critical-path-r2.json` · `CRITICAL-PATH.md` · `critical-path-contract.json`.

## A. Critical path residual confirmado

Única petición de datos candidate-only antes de `t_result_ready`:
`/data/planning-muni.json` (3 286 B enc, 3875→4452 ms). En baseline no existe
(la feature es posterior a `0563d60`). La re-topología de chunks (+10,2 KB
enc) es el mismo código eager reempaquetado, no trabajo nuevo.

## B. Hipótesis: CONFIRMADA

`PlanningContext` disparaba `ensurePlanningMuni()` al existir `app.place` —
una petición L4 dentro de la ventana del mapa, sin señal de usuario.

## C. Coste del ítem

Una petición Slow4G de 3,3 KB (16,7 KB raw, 112 filas) ocupando el canal
entre la llegada de metrics (~3,6 s) y el worker MapLibre (~8,6 s), más el
parse/dedup del JSON y el re-render reactivo de la sección.

## D. Remediación elegida: OPCIÓN B (below-fold legítimo)

IntersectionObserver sobre centinela en la posición de la sección
(`rootMargin 600px` ⇒ dispara a ~1 444 px de scroll; la sección vive a
2 046 px ⇒ jamás en la carga inicial). Señales de demanda adicionales:
`focusin` sobre elementos posteriores en orden de lectura (teclado) y
`app.selectedBuilding` (deep link `building=` = demanda explícita). Sin
timers, sin idle, sin trucos post-ready. Sección idéntica: aparece cuando
el dato existe, como antes — sin estados de carga nuevos ni saltos de
layout (centinela 0-height en la misma posición).

Opción A descartada: injertar el snapshot G3-B en los 112 artefactos
metrics de G1 contamina el contrato de datos (procedencia distinta,
regeneración + manifests/QA, acoplamiento de gates) para ahorrar la misma
petición que B ya elimina.

## E. Grafo de imports eager antes/después

Sin cambios materiales: `domain/planning.ts` ya era `import type` eager y se
carga por `import()` dentro de `ensurePlanningLocal` (R1). `catalog.ts` es
módulo compartido necesario eager (metrics/catalog); `loadPlanningMuni` no
añade código al grafo — el coste era la **petición**, no el chunk.
`nodes/2` closure: 170 349 → 171 090 B raw (+741 B de centinela/IO/Lazy).

## F. i18n

`es.ts` = 26 971 B raw → 7 920 B gzip / 6 986 B br; ~131/285 claves
feature-local. Split viable pero exige diccionario asíncrono por feature
para ~3–4 KB gz — no implementado en R2 (candidato G4, riesgo de contrato).

## G. Red inicial antes/después (ventana ≤ t_result_ready equiv.)

| | a34eadc | R2 |
|---|---:|---:|
| peticiones | 35 | 34 |
| bytes enc | 391 887 | 388 822 |
| planning-muni | 1 (3 286 B) | **0** |

## H. Equivalencia de producto (probe `perf4_r2_equiv.mjs`, 5/5)

Bilbao (cod 20): 13.949 viv · 80,5 ha res · 10,1 ha AE · Ejercicio 2026 ·
intro/source idénticos. Leioa (54): idénticos. Amoroto (4, rural):
idénticos. Campo `res_v` anulado por interceptación: el `<li>` se omite.
Fila ausente: la sección no se renderiza. Fail-closed intacto (`.note`).

## I. Diagnósticos bundle/transfer

- `nodes/2` closure: raw 171 090 · gzip 62 016 · br 54 705
- ruta completa (entry+layout+page): raw 193 298 · gzip 70 828 · br 62 667
- contrato `perf4_critical_path_contract.mjs`: **0 violaciones** —
  ninguna petición de planning/context/address/compare/photo/histmap antes
  del equivalente a `t_result_ready`.

## J. Matriz de regresión funcional

| suite | resultado |
|---|---|
| check / lint / format / vitest / pytest | PASS (0 err · 15 t · 38 t) |
| build | PASS (engine-preload = 3 chunks idénticos) |
| G3-B planning (+reflow 320 +axe) | PASS |
| G3-C histmap (+reflow +axe) | PASS |
| G3-D context (+reflow +axe +3 engines) | PASS |
| G3-A flow ×3 engines (+reflow +axe) | PASS |
| G2-A play / G2-B views | PASS |
| g1r cell-detail / ortho-preview | PASS (foco de sonda intacto) |
| g1 a11y / browser-evidence / zoom400 | PASS |
| lazy-contract (R1) | 6/6 PASS — fronteras intactas |
| deep-link/race (R1) | PASS |
| equivalencia planning R2 | 5/5 PASS |

Incidente encontrado y corregido: TDZ en el efecto (`trigger()` leía
`onFocus` antes de su `const` en deep links `building=`) — orden corregido;
además `building=` pasa a disparar la carga como demanda explícita.

## K/L. SHAs

Ver commit de producto y commit de evidencia en el mensaje de entrega.

**STOP.** Sin PERF4 timed, sin G4, sin segunda pasada.
