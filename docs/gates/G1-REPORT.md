# G1 — INFORME CANÓNICO DE CIERRE

> Entregable exigido por `docs/gates/G1.md` §Entregable: «`docs/gates/G1-REPORT.md`
> con la evaluación criterio a criterio, mediciones, capturas y veredicto».
> Este documento es el cierre formal. La evaluación exhaustiva (72 criterios,
> mediciones PERF con raws, capturas, matriz de adjudicación completa) vive en
> `docs/gates/G1-READJUDICATION-REPORT.md` y en la evidencia hasheada del run 6.

## Veredicto

# `G1_PASS`

| Campo | Valor |
|---|---|
| Criterios binarios | **72 PASS / 0 FAIL / 0 BLOCKED** |
| Revisión humana HR1 | **ACCEPTED** (responsable, 2026-09-18) |
| Revisión humana HR2 | **ACCEPTED** (responsable, 2026-09-18) |
| Candidato adjudicado | `0563d60` (HEAD == candidato al freeze) |
| Rama | `g1-remediation` → merge FF a `main` |
| Gate | `docs/gates/G1.md` — sha256 `8532c2111feb06b490f80ebaf47d07db9e426feb4657b3cd34d6c79ff28872f1` (sin cambios desde preregistro) |
| Evidencia autoritativa | `evidence/g1-readjudication/2026-09-18T0929Z-0563d60/` (manifest SHA-256, 222 ficheros) |
| Closeout humano | `evidence/g1-closeout/` |

## Medición principal (PERF10, umbrales congelados)

`t_ortho_visible` — P1 p75 = **92 ms** (≤1500) · P2 p75 = **1105 ms** (≤3000).
Resto de presupuestos PERF1–PERF11: todos dentro de umbral; valores completos y
raws en el informe de readjudicación §PERF.

## Estados que NO son condiciones de G1

Viven en `docs/LAUNCH_QUALITY.md` como `REQUIRED_PRE_SUBMIT`; no forman parte de
las condiciones de GO del gate congelado y su pendiente **no altera `G1_PASS`**:

- Smoke **NVDA** real (Windows): `PENDING_HUMAN`.
- Smoke **móvil físico**: `PENDING_HUMAN` (la emulación no sustituye el dispositivo).

## Historial de la adjudicación

| Run | Candidato | Resultado |
|---|---|---|
| Adjudicación original (`b891a14`) | `5b80240` | `G1_FAIL` — 19 criterios (informe histórico `G1-FINAL-REPORT.md`) |
| Readjudicación 1–2 | `53b1e8a` | `G1_FAIL` — PERF10-P2 |
| Readjudicación 3 | `468c815` | 72/72 técnico; HR pendiente |
| Readjudicación 4 | `116b881` | 72/72 técnico; HR pendiente |
| Readjudicación 5 | `7aa2688` | 72/72 técnico; HR pendiente |
| **Readjudicación 6** | **`0563d60`** | **72/72 técnico + HR1/HR2 ACCEPTED ⇒ `G1_PASS`** |

Remediaciones del ciclo: preview progresivo first-party de ortofoto, corrección de
provenance «campaña 1956», superficie de lanzamiento (SEO/social/cross-browser/
reflow 320), detalle de celda accesible (clic/tap persistente + sonda de teclado).

## Cadena de custodia

- Evidencia regenerada fresca en cada run; manifest SHA-256 por fichero.
- `G1.md` intacto: mismo sha256 en todos los runs.
- Cierre humano: HR1 (identidad editorial) y HR2 (claridad semántica) aceptadas
  sobre las capturas y estados del run 6.
- `detail_after_tap:false` del smoke móvil de closeout: investigado y cerrado como
  artefacto de harness (`evidence/g1-closeout/tap-verification.json`).
