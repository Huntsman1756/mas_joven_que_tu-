# PERF4 CALIBRATED ADJUDICATION — REPORT

Fecha: 2026-09-19 · Sesión post-reboot, máquina limpia verificada.
Protocolo: `evidence/g3/g3d/PERF4-CALIBRATION.md` (congelado).
Harness: `app/scripts/g1_gate_perf.mjs` **sin modificaciones**.

## A. Máquina

- Node v24.19.0 · Playwright 1.63.0 · Chromium bundled.
- RAM libre 34,5/61,6 GB · CPU ~23 % al inicio.
- Sin dev-servers del repo, sin workers Playwright, sin Chrome previo.
- Únicos procesos: `next dev` de otro proyecto del usuario
  (`renta-verificable`, PIDs 34864/35292/29072) — documentados, no tocados.
- Puerto 8080 = Docker backend (ajeno). Detalle: `environment.json`.

## B. Baseline `0563d60` — raw P2 `t_result_ready` (n=20)

```
3481 3423 3469 3434 3486 3489 3449 3376 3437 3507
3413 3431 3654 3623 3419 3404 3504 3439 3427 3468
```

p50 ≈ 3437 · **p75 = 3486** · **p95 = 3623** · max = 3654.

## C/D. Veredicto baseline

p75 3486 ≤ 3500 · p95 3623 ≤ 5000 → **PASS**. Sesión válida.

## E. Candidato `f869de0` — raw P2 `t_result_ready` (n=20)

(Producto idéntico a `26705c2`; `f869de0` = `26705c2` + docs.)

```
3587 3561 3607 3581 3554 3600 3579 3653 3619 3680
3604 3559 3592 3602 3704 3614 3561 3555 3624 3523
```

p50 ≈ 3598 · **p75 = 3614** · **p95 = 3680** · max = 3704.

## F/G. Veredicto candidato

p75 3614 > 3500 → **FAIL**. (p95 3680 ≤ 5000, irrelevante tras fallar p75.)

## H. Diagnóstico (no adjudica)

| Métrica | Baseline | Candidato | Δ |
|---------|----------|-----------|---|
| P2 t_result_ready p75 | 3486 | 3614 | +128 ms (+3,7 %) |
| P2 t_result_ready p95 | 3623 | 3680 | +57 ms (+1,6 %) |
| build_js_raw | 1.274.729 B | 1.345.861 B | +71 KB |
| transfer_result P2 | ~497 KB | 498 KB | ≈ igual |
| transfer_hero P2 | 62 KB | 80 KB | +18 KB |
| heap P2 | ~18 MB | ~19 MB | ≈ igual |
| P2 t_result_ready_buildings p75 | 4687 | 4790 | +103 ms |

El delta es consistente con el peso añadido por G3-D (módulos de
contexto/planning/histórico en el bundle inicial — ver
`docs/g4/PERFORMANCE-ARCHITECTURE.md` en `g4-research-pack`).

## I/J. Estado final

**PERF4_REGRESSION / REMEDIATION_REQUIRED**

- Baseline pasa → la sesión es válida; el fallo del candidato es real.
- GD12/PERF4 sigue abierto; G3-D NO es clean.
- Remediación requerida: nuevo candidato de producto. Input de diseño ya
  preparado: `docs/g4/PERFORMANCE-ARCHITECTURE.md` (fronteras lazy:
  profundidad personal, planning/contexto, histórico, foto; sin tocar
  MapView/Timeline/headline).
- No se ha implementado remediación en esta sesión.
- El gate G4 sigue en DRAFT hasta nuevo candidato adjudicado.

Artefactos: `environment.json` · `baseline-raw.json` ·
`candidate-raw.json` · `adjudication.json` · este informe.
