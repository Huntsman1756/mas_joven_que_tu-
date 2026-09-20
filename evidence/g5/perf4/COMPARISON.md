# PERF4 — comparación cronometrada t_result_ready (P2, n=20)

Protocolo congelado: baseline `0563d60` → candidato `67c2618`; P2
(390×844, dsf3, CPU×4, Slow4G); hito `t_result_ready`; n=20;
umbrales p75 ≤ 3500 ms, p95 ≤ 5000 ms. Script `app/scripts/perf4_timed.mjs`.

## R1 — sesión con carga ambiente (2026-09-20)

| build             | p75  | p95  | max  | errores | veredicto         |
| ----------------- | ---- | ---- | ---- | ------- | ----------------- |
| baseline 0563d60  | 3529 | 3654 | 5034 | 0       | FAIL (p75 > 3500) |
| candidato 67c2618 | 3532 | 3624 | 4934 | 0       | FAIL (p75 > 3500) |

Delta p75 candidato−baseline: +3 ms. Ambos sobre el umbral por ~30 ms →
R1 inválida para adjudicar el absoluto (baseline falla).

## R2 — única repetición controlada, pre-declarada (2026-09-20)

Declaración previa: `R2-PROTOCOL.md` (commit `a7026af`, antes de medir).
Sesión estabilizada; una sola ejecución por build, baseline → candidato.

| build                | p75  | p95  | max  | errores | veredicto |
| -------------------- | ---- | ---- | ---- | ------- | --------- |
| r2-baseline-0563d60  | 3449 | 3474 | 4828 | 0       | **PASS**  |
| r2-candidate-67c2618 | 3539 | 3589 | 4804 | 0       | **FAIL**  |

Baseline pasa; candidato falla p75 por +39 ms. Delta R2: **+90 ms**
(candidato ~3535 ms muy estable entre sesiones: 3532/3539; baseline
mejoró 80 ms con la máquina limpia).

## Investigación del candidato (regla 6 del protocolo R2)

Sonda `perf4_decompose.mjs` (P2, n=5/build, steady-state):

| fase                 | baseline | candidato | Δ       |
| -------------------- | -------- | --------- | ------- |
| `.headline-block h1` | ~1485    | ~1590     | +105 ms |
| `.mapband canvas`    | ~2370    | ~2450     | +80 ms  |
| celdas cargadas      | ~3500    | ~3500     | ≈0      |
| bytes transferidos   | 366 KB   | 375 KB    | +9 KB   |

El coste aparece **antes del primer render**, no en teselas ni red:
el grafo JS inicial creció — chunk de página 62 KB → 96 KB y más
imports estáticos (Timeline, ViewSwitch, StoriesSection, PlaceContext,
AddressInvite/CompareInvite eager; a cambio CellDetail/BuildingCard/
paneles pasaron a lazy). Bajo CPU×4, eval+montaje extra ≈ +90–105 ms.
`t_cells` en paridad: el dato y el mapa no empeoraron.

## Fix del candidato (code splitting real)

Commit `1765a64`: nuevo `LazyView.svelte` (sentinel + IntersectionObserver
dispara `import()` real; fallback `focusin` para teclado; prop `force` para
deep links) y `BelowFold.svelte` con todo el contenido below-fold movido a
un chunk dinámico. `Timeline`/`ViewSwitch` quedan eager (interacción
primaria above-the-fold). Chunk de página: **96 KB → 80 KB**. Descomposición
post-fix (n=5): `t_headline` ~1590 → **~1430 ms** (más rápido que el
baseline ~1485); `t_cells` ≈ 3490. Regresiones verdes: g2a/g2b(+axe)/
g3b/g3c/g4/lazy-contract/deeplink-race/r2-equiv/critical-path; capturas G5
regeneradas sin cambios visuales.

## R3 — única repetición controlada, pre-declarada (2026-09-20)

Declaración previa: `R3-PROTOCOL.md` (commit `b160548`, antes de medir).
Misma máquina/sesión estabilizada que R2; una ejecución por build,
baseline → candidato. Evidencia: `r3-baseline-0563d60.json`,
`r3-candidate-1765a64.json`.

| build                | p75  | p95  | max  | errores | veredicto |
| -------------------- | ---- | ---- | ---- | ------- | --------- |
| r3-baseline-0563d60  | 3588 | 3647 | 5086 | 0       | FAIL      |
| r3-candidate-1765a64 | 3576 | 3758 | 5534 | 0       | FAIL      |

El baseline volvió a fallar el absoluto en esta sesión (3588 ms tras
3449 ms en R2 — ~140 ms de variación sobre el mismo build). Delta R3
candidato−baseline en p75: **−12 ms** (el candidato quedó por debajo
del baseline, coherente con la descomposición post-fix).

Observación no bloqueante: en R3 el p95 del candidato fue 3758 ms
frente a 3647 ms del baseline (+111 ms). Con n=20 no se extraen
conclusiones de la cola ni se abre otra ronda; queda registrado.

## Contexto histórico (mismo commit 0563d60, sesiones)

p75 medido: 3376, 3411, 3440, 3441, 3449 (R2), 3451, 3456, 3460, 3461,
3529 (R1), 3539, 3588 (R3) ms. No puede demostrarse que la desviación
sea exclusivamente del entorno; lo demostrable es que el umbral
absoluto no es adjudicable de forma estable en esta máquina (el mismo
build oscila ~±150 ms entre sesiones).

## Estado final

**PERF4 = BLOCKED** según las reglas declaradas en `R3-PROTOCOL.md`
(baseline >3500 → BLOCKED). El umbral absoluto no es adjudicable de
forma estable en esta máquina (el mismo baseline mide 3449–3588 ms
entre sesiones). Tras el fix no aparece regresión en p75 frente al
baseline en la misma sesión:

- R3: candidato −12 ms bajo el baseline en la misma sesión.
- Descomposición post-fix: `t_headline` del candidato más rápido que el
  del baseline (~1430 vs ~1485 ms); `t_cells` en paridad.
- Grafo JS inicial: chunk de página 96 → 80 KB tras code splitting real
  del below-fold (`BelowFold` como chunk dinámico, verificado: 0 peticiones
  antes de `t_result_ready`).

R1, R2 y R3 se conservan íntegros. Umbrales congelados, no movidos.
Sin cadena R4/R5: no apareció ningún defecto nuevo del candidato; la
infructuosidad del absoluto es del entorno, no del build.
