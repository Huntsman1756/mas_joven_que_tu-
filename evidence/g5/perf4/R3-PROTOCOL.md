# PERF4-R3 — protocolo declarado ANTES de medir

Declarado por el humano tras R2 (2026-09-20). R1 y R2 quedan intactos
como evidencia histórica; este documento se registra antes de ejecutar
R3 y su resultado se acepta cualquiera que sea.

## Motivo

R2 demostró regresión real del candidato `67c2618` (p75 3539 vs
baseline 3449 PASS). Diagnóstico: ~+90–105 ms antes del primer render
por mayor grafo JS eager. Remediación aplicada en `1765a64` (nuevo
candidato): todo el contenido below-fold se movió a un único chunk
lazy (`BelowFold.svelte`) cargado por `LazyView` (IntersectionObserver
rootMargin 0 + focusin + force en deep links). Chunk de página
96→80 KB; sonda decompose: `t_headline` ~1590→~1430 ms, `t_cells` en
paridad con baseline.

## Protocolo R3 (una única ejecución, declarado previamente)

1. Misma máquina y sesión estabilizada que R2 (sin procesos pesados
   ajenos a la medición).
2. Ejecutar **exactamente una vez** cada build, en este orden:
   - baseline `0563d60` (build en `F:\_CONCURSOS\mjt-baseline-0563d60\app\build`)
   - candidato `1765a64` (build en `app/build`)
3. Instrumento congelado sin cambios: P2 (390×844, dsf 3, CPU ×4,
   Slow4G), hito `t_result_ready`, n=20, p75 ≤ 3500 ms, p95 ≤ 5000 ms,
   script `app/scripts/perf4_timed.mjs`.
4. **Prohibido repetir hasta obtener un resultado favorable.**

## Reglas de adjudicación (declaradas antes del resultado)

- baseline ≤3500 y candidato ≤3500 → `PERF4 = PASS`.
- baseline >3500 → `PERF4 = BLOCKED`.
- baseline ≤3500 y candidato >3500 → `PERF4 = FAIL`.
- Sin cadenas R4/R5 de microoptimización salvo defecto evidente.
