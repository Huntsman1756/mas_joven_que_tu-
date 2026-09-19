# PERF4 FINAL-R2 — CALIBRATED ADJUDICATION

Fecha: 2026-09-19 ~19:35–19:55 · Sesión post-reboot.
Protocolo: `evidence/g3/g3d/PERF4-CALIBRATION.md` (congelado).
Harness: `app/scripts/g1_gate_perf.mjs` sin modificaciones.

**Atribución:** commit congelado de adjudicación `a3ce0e6`; SHA de
implementación de producto `be06d39`. Los commits de evidencia/probes no
alteran el producto en runtime.

## A. Máquina

- Node v24.19.0 · Playwright 1.63.0 · Chromium 153.0.8010.12.
- RAM libre 24,7/61,6 GB · CPU ~5 % al inicio.
- Sin dev-servers del repo, sin workers Playwright, sin listeners del
  repo (4173–4189/5173 libres).
- Procesos ajenos documentados, no tocados: `next dev` de
  `renta-verificable` (:3111), `next dev` de `oposiciones2.0` (:3100),
  `chrome-devtools-mcp` (×3), `node .tmp/probe/probe4.mjs` (proceso de
  otro proyecto — `concursos_cyl`, este repo no tiene `.tmp/`),
  navegadores del usuario (~25), Docker :8080.
- Detalle: `environment.json`.

## B. Baseline `0563d60` — raw P2 `t_result_ready` (n=20)

```
3378 3422 3363 3349 3408 3384 3337 3390 3350 3379
3379 3351 3401 3375 3343 3362 3408 3399 3490 3377
```

p50 ≈ 3377 · **p75 = 3399** · **p95 = 3422** · max = 3490.

## C/D. Veredicto baseline

p75 3399 ≤ 3500 · p95 3422 ≤ 5000 → **PASS**. Sesión válida
(margen p75: 101 ms).

## E. Candidato `a3ce0e6` — raw P2 `t_result_ready` (n=20)

```
3575 3440 3509 3526 3427 3563 3424 3440 3547 3505
3504 3531 3477 3579 3497 3487 3528 3485 3633 3533
```

p50 = 3505 · **p75 = 3533** · **p95 = 3579** · max = 3633.

Una única tanda legal n=20; sin abortos ni incidentes del harness.

## F/G. Veredicto candidato

p75 3533 > 3500 → **FAIL** (margen: 33 ms). p95 3579 ≤ 5000.

## H/I/J. Deltas diagnósticos (no adjudican)

| | baseline `0563d60` | `f869de0` | `570b661` | `a3ce0e6` |
|---|---:|---:|---:|---:|
| p50 | ≈3377 | ≈3598 | ≈3480 | 3505 |
| **p75** | **3399** | **3614** | **3505** | **3533** |
| p95 | 3422 | 3680 | 3564 | 3579 |
| max | 3490 | 3704 | 3574 | 3633 |

- R2 vs baseline (misma sesión): **+134 ms p75 / +157 ms p95**.
- R2 vs `570b661` (entre sesiones): **+28 ms p75 / +15 ms p95**.
- R2 vs `f869de0` (entre sesiones): **−81 ms p75 / −101 ms p95**.

## K. Diagnósticos transfer/build/heap

| | baseline | `a3ce0e6` |
|---|---:|---:|
| transfer_hero | 62 KB | 73 KB |
| transfer_result | 477 KB | 488 KB |
| transfer_result_buildings | 650 KB | 661 KB |
| build_js_raw | 1.274.737 B | 1.355.020 B |
| heap | ~18–23 MB | ~18–22 MB |
| t_result_ready_buildings p75 | 4598 | 4659 |

## Critical-path attribution

Pre-R2: `planning-muni.json` era la única petición de datos
candidate-only antes de `t_result_ready` (trazas en
`perf4-remediation-r2/`). Post-R2: el contrato de critical path registra
**0 violaciones** (0 peticiones de planning/context/address/compare/
photo/histmap antes del equivalente a readiness). La eliminación de esa
petición es verificable y real; sin embargo el p75 medido no mejoró —
el residuo vs baseline (~+134 ms) no es atribuible a planeamiento y
sugiere coste estructural residual (glue/re-topología de chunks, ~+10 KB
enc JS, evaluación) que esta remediación no abordaba. No se afirma
causalidad temporal más allá de lo medido.

## Estado final

**PERF4_R2_FAILED**
**GD12_OPEN**

- Baseline pasa → sesión válida; el fallo del candidato es real
  (33 ms sobre el umbral congelado p75).
- Sin tercera remediación en esta sesión. STOP.

Artefactos: `environment.json` · `baseline-raw.json` ·
`candidate-raw.json` · `comparison.json` · `adjudication.json` · este
informe.
