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

## Contexto histórico (mismo commit 0563d60, sesiones G1)

p75 medido: 3376, 3411, 3440, 3441, 3451, 3456, 3460, 3461, 3539 ms.

## Estado

**PERF4 = FAIL (candidato)** adjudicado en R2: baseline PASS (3449),
candidato FAIL (3539 > 3500). Regresión real de ~+90 ms en render
inicial, causada por mayor grafo JS eager de la ruta. Umbrales
congelados, no movidos. Recuperable: lazy-mount de componentes del
árbol de resultado reduciría el eval inicial (~+90 ms recuperables);
cualquier fix requiere nuevo commit candidato + nueva ronda declarada.
