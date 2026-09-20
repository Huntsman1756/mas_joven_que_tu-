# PERF4-R2 — protocolo declarado ANTES de medir

Declarado por el humano tras R1 (2026-09-20). R1 queda intacta como
evidencia (`baseline-0563d60.json`, `candidate-67c2618.json`); este
documento se registra antes de ejecutar R2.

## Motivo

En R1 ambos builds superaron p75 ≤ 3500 ms por ~30 ms con delta
candidato−baseline de +3 ms (p95: −30 ms). El histórico del mismo
commit baseline en G1 osciló 3376–3539 ms entre sesiones: el umbral
absoluto queda dentro del ruido del entorno. R1 no es válida para
adjudicar el umbral absoluto, pero sí muestra ausencia de regresión.

## Protocolo R2 (una única ejecución, declarado previamente)

1. Cerrar procesos pesados ajenos a la medición (servidor de preview,
   procesos node huérfanos de sesiones anteriores) y dejar estabilizar
   la máquina.
2. Ejecutar **exactamente una vez** cada build, en este orden y en las
   mismas condiciones:
   - baseline `0563d60` (build en `F:\_CONCURSOS\mjt-baseline-0563d60\app\build`,
     con los mismos artefactos de datos generados que el candidato)
   - candidato `67c2618` (build en `app/build`)
3. Protocolo de medición congelado sin cambios: P2 (390×844, dsf 3,
   CPU ×4, Slow4G), hito `t_result_ready`, n=20, p75 ≤ 3500 ms,
   p95 ≤ 5000 ms, script `app/scripts/perf4_timed.mjs`.
4. **Prohibido repetir hasta obtener <3500.** R2 se ejecuta una vez y
   su resultado se acepta cualquiera que sea.

## Reglas de adjudicación (declaradas antes del resultado)

- Baseline y candidato pasan → `PERF4 = PASS` (conservando R1 + R2).
- Ambos fallan de forma comparable → `PERF4 = BLOCKED_WITH_HUMAN_ADJUDICATION`:
  el umbral absoluto no pudo validarse en el entorno, sin evidencia de
  regresión G5.
- Baseline pasa y candidato falla materialmente → problema del
  candidato: investigar.

Conclusión defendible tras R1 (cita del humano):

> PERF4 BLOCKED: absolute threshold could not be adjudicated because
> the frozen baseline failed in the measurement session.
> Candidate-vs-baseline regression: not observed (+3 ms p75;
> −30 ms p95).
