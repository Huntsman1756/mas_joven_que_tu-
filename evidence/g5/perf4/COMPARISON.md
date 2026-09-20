# PERF4 — comparación cronometrada t_result_ready (P2, n=20)

| build             | p75  | p95  | max  | errores | veredicto         |
| ----------------- | ---- | ---- | ---- | ------- | ----------------- |
| baseline 0563d60  | 3529 | 3654 | 5034 | 0       | FAIL (p75 > 3500) |
| candidato 67c2618 | 3532 | 3624 | 4934 | 0       | FAIL (p75 > 3500) |

Delta p75 candidato−baseline: **+3 ms** — sin regresión atribuible a G5.

## Contexto histórico (mismo commit 0563d60, sesiones G1)

p75 medido: 3376, 3411, 3440, 3441, 3451, 3456, 3460, 3461, 3539 ms.
El umbral 3500 ms queda dentro del ruido entre sesiones de este entorno (~±80 ms).

## Estado

Ambos builds fallan el umbral congelado p75 ≤ 3500 por ~30 ms.
Por la regla «baseline pasa o G5_BLOCKED»: **PERF4 = BLOCKED — requiere adjudicación humana**
(re-ejecutar en entorno más limpio o waiver explícito; los umbrales no se mueven).
