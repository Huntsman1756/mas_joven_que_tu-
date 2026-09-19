# PERF4 FINAL READJUDICATION — REPORT (candidato remediado)

Fecha: 2026-09-19 ~18:18–18:40 · Sesión post-reboot, máquina limpia verificada.
Protocolo: `evidence/g3/g3d/PERF4-CALIBRATION.md` (congelado).
Harness: `app/scripts/g1_gate_perf.mjs` **sin modificaciones**.

**Atribución:** commit congelado de adjudicación `570b661`; SHA de
implementación de producto `a34eadc` (los commits de evidencia/probes no
alteran el producto en runtime).

## A. Máquina

- Node v24.19.0 · Playwright 1.63.0 · Chromium bundled 153.0.8010.12.
- RAM libre 26,9/61,6 GB · CPU ~33 % al inicio.
- Sin dev-servers del repo, sin workers Playwright, sin listeners del repo.
- Procesos ajenos documentados, no tocados: `next dev` de
  `renta-verificable` (PIDs 34864/35292/29072), `chrome-devtools-mcp`
  (6832/2440/48464), navegadores del usuario (chrome×17, msedge×8, sin
  cmdline de playwright), Docker backend en :8080.
- Detalle: `environment.json`.

## B. Baseline `0563d60` — raw P2 `t_result_ready` (n=20)

```
3392 3369 3376 3416 3457 3451 3363 3403 3327 3347
3365 3392 3377 3402 3398 3444 3410 3368 3402 3385
```

p50 ≈ 3390 · **p75 = 3403** · **p95 = 3451** · max = 3457.

## C/D. Veredicto baseline

p75 3403 ≤ 3500 · p95 3451 ≤ 5000 → **PASS**. Sesión válida.

## E. Candidato `570b661` — raw P2 `t_result_ready` (n=20)

```
3436 3564 3474 3516 3472 3458 3530 3454 3449 3452
3460 3574 3505 3493 3490 3496 3479 3446 3421 3520
```

p50 ≈ 3480 · **p75 = 3505** · **p95 = 3564** · max = 3574.

### Incidente del harness (documentado, no adjudica)

La primera invocación del candidato abortó en la rep 1 — `waitForSelector`
25 s — **antes de registrar ninguna observación**. Reproducción manual
bajo la misma emulación P2: headline en 4063 ms, 0 errores. La segunda
invocación produjo la única tanda legal n=20 reportada. No es un
rerun-until-green: la tanda anterior no existió como medición.

## F/G. Veredicto candidato

p75 3505 > 3500 → **FAIL** (margen: 5 ms). p95 3564 ≤ 5000.

## H. Diagnóstico (no adjudica)

| Métrica P2 | baseline `0563d60` | `f869de0` (sesión previa) | `570b661` |
|---|---|---|---|
| t_result_ready p50 | ≈3390 | ≈3598 | ≈3480 |
| **t_result_ready p75** | **3403** | **3614** | **3505** |
| t_result_ready p95 | 3451 | 3680 | 3564 |
| max | 3457 | 3704 | 3574 |
| transfer_hero KB | 62 | 80 | 72 |
| transfer_result KB | ~477 | 498 | ~490 |
| transfer_result_buildings KB | 650 | — | 663 |
| build_js_raw B | 1.274.733 | 1.345.861 | 1.354.324 |
| heap MB | ~21 | ~19 | ~21 |
| t_result_ready_buildings p75 | 4571 | 4790 | 4652 |

- Remediación vs baseline (misma sesión): **+102 ms p75 (+3,0 %)**.
- Remediación vs `f869de0` (entre sesiones, indicativo): **−109 ms p75,
  −116 ms p95** — la remediación eliminó la mayor parte de la regresión
  previa (+128 ms) pero no toda.
- `transfer_result` del candidato (490 KB) sigue sobre baseline (477 KB):
  el split de chunks añade bytes de glue; el JS inicial pedido bajó −30 KB
  raw pero el coste de parse residual + red supera al baseline.
- Margen de fallo: **5 ms en p75**.

## I/J. Estado final

**PERF4_REMEDIATION_FAILED / GD12_OPEN**

- Baseline pasa → sesión válida; el fallo del candidato es real aunque
  marginal (5 ms sobre el umbral congelado).
- GD12/PERF4 sigue abierto; G3-D NO es clean; G4 sigue bloqueado.
- No se ha hecho segunda remediación ni ajuste en esta sesión.
- Lectura honesta: la estrategia estructural funcionó parcialmente
  (−109 ms de los +128 ms). El residuo sugiere que el coste no es solo
  JS eager: overhead de chunks adicionales, glue y posiblemente coste
  no-JS (estilos, fuentes, serialización) que la frontera lazy no toca.

Artefactos: `environment.json` · `baseline-raw.json` ·
`candidate-raw.json` · `comparison.json` · `adjudication.json` · este
informe.
