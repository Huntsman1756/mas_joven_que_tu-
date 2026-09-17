# G1-R — Informe de remediación

> Fase: **G1-R (remediación)**. Este documento NO es una readjudicación.
> La readjudicación de los 72 criterios corre a cargo del evaluador sobre
> el SHA candidato indicado abajo. Umbrales y criterios preregistrados sin
> modificar (`docs/gates/G1.md`, sha256
> `8532c2111feb06b490f80ebaf47d07db9e426feb4657b3cd34d6c79ff28872f1`).

- Rama publicada: `origin/g1-remediation`
- Baseline de adjudicación: `8325a0d` (`G1_FAIL`, 52 PASS / 19 FAIL / 1 BLOCKED)
- Evidencia base: `evidence/g1/08-adjudication/`
- Evidencia de remediación: `evidence/g1-remediation/` (ver `manifest.json`)

## 1. Matriz de remediación (19 FAIL + 1 BLOCKED)

Estados detallados en `docs/remediation/G1-R-MATRIX.md`. Resumen:

| Dominio | Criterios | Estado |
|---|---|---|
| MAP/SCALE (M1, M6) | 2 | REMEDIATED |
| DATA DETERMINISM (D3) | 1 | REMEDIATED |
| PRODUCT STATE (REL1, PERF9) | 2 | REMEDIATED |
| SEARCH/NORA (U3) | 1 | REMEDIATED |
| ORTHO RELIABILITY (U2) | 1 | REMEDIATED |
| ACCESSIBILITY (A9, U6) | 2 | REMEDIATED |
| PERFORMANCE/DELIVERY (DEP4, PERF2/4/5/6/7/8/11) | 8 | ver §5 |
| VISUAL REGRESSION (VR4) | 1 | REMEDIATED |
| COPY (C1) | 1 | REMEDIATED |
| DEP6 (BLOCKED) | 1 | REMEDIATED — verificado en host real |

## 2. Causas raíz y correcciones (resumen por criterio)

Ver la columna `root_cause`/`remediation` de la matriz. Correcciones
estructurales relevantes añadidas en esta fase:

- `pipeline/net.py`: TLS verificado obligatorio; `SSLError` aborta; downgrade
  solo con `MJT_ALLOW_INSECURE_TLS=1` + allowlist de hosts oficiales + warning
  + provenance `tls_verified=false`.
- `app/scripts/static-server.mjs`: confinamiento al root por path resuelto
  (traversal literal/encodado/doble-encodado/backslash/sibling-prefix),
  malformed URI → 400, ranges completos, compresión cacheada, 404 si falta
  index.html.
- `engine-preload.js` (generado por `scripts/gen-engine-preload.mjs`):
  modulepreload de los chunks perezosos del motor solo en deep links
  `?place=…` (script externo defer, compatible con CSP hash).
- `catalog.ts`: dedupe de `loadMetrics` (la precarga del slug y
  `resolvePlace` compartían la descarga dos veces en la ventana crítica).
- `MapView.svelte`: series de celda diferidas a `idle`; capa de ortofoto
  optimista (opt-in → teselas en paralelo con la sonda); dedupe de capa
  orto para no descartar teselas ya cargadas.
- `copy-maplibre-worker.mjs`: worker empaquetado en un solo fichero (esbuild)
  — el split worker→shared obligaba a una segunda descarga serie que no
  comparte caché HTTP con el documento.
- `app.svelte.ts`: eliminada la precarga eager de series en `resolvePlace`
  (la cubre el barrido `idle`); `reset()` invalida la caché de métricas.

## 3. Tests de regresión añadidos

- `app/scripts/static-server.test.mjs` — 15 casos `node:test` (traversal
  literal/encodado/doble/backslash/sibling, malformed URI, ranges
  0-9/10-/-10/unsatisfiable/malformed/multi-range, SPA fallback, normal).
  RED confirmado contra la implementación previa (200 en traversal, hang en
  URI malformada). Integrado en `npm test`.
- `tests/data/test_cells_determinism.py` — 6 tests (D3, shuffle ×20).
- `nora.test.ts` — 13 tests RED→GREEN (U3).
- Tests existentes de estado (I-3/I-5), copylint reforzado (C1), sweep de
  escala (M1), tooltips (M6), ortofoto (U2/I-8) — ver commits de la fase.

## 4. Verificación fresca (sobre el candidato final)

| Paso | Resultado |
|---|---|
| `python -m pytest tests/data -q` | 34 passed |
| `npm run check` (svelte-check) | 0 errores, 0 warnings |
| `npm run lint` (eslint) | limpio |
| `npm run format:check` | limpio |
| `npm run test` (vitest + node:test) | 62 + 15 passed |
| `npm run build` | OK (+ `engine-preload.js` generado) |
| `powershell -File scripts/verify.ps1` | **TODO OK** |
| Integración navegador (`g1_browser_evidence`) | journey completo, 0 errores consola, Range 206 |
| Accesibilidad (`g1_a11y`, axe same-origin) | 0 violaciones INTRO/RESULT |
| Regresión visual (`g1_gate_vr`) | 0,0 % diff — 6 estados × 2 capturas |
| Journeys G1-R (`state_journey`, `scale_sweep`, `cell_tooltip`, `touch_targets`, `ortho`) | todos OK |
| Pipeline completo `g1_buildings.py` | 112 munis · 139.447 edificios · 0 mismatches · outputs sustantivos idénticos a la baseline |
| Smokes de red TLS (CKAN/NORA/Catastro/ortofotos) | todos verificados, `tls_verified=true`, sin fallback |
| DEP6 en host real | HTTPS+HSTS, CSP con 3 dominios geo, Range 206, 0 violaciones, 3 reps |

## 5. Rendimiento — medición oficial del candidato

Harness: `app/scripts/g1_gate_perf.mjs` (P1 local desktop sin throttling;
P2 mobile 390×844 DSF3 CPU×4 Slow4G; n=20 percentiles, n=5
transferencia/heap). Salida: `evidence/g1-remediation/perf-candidate-r2/perf-budgets.json`.

| Métrica | Umbral P1 | Medido P1 | Umbral P2 | Medido P2 | Estado |
|---|---|---|---|---|---|
| PERF1 transfer_hero | ≤420 KB | 59 KB | ≤420 KB | 59 KB | PASS |
| PERF2 t_hero_interactive | 900/1500 | 109/110 | 2000/3200 | 1576/1589 | PASS |
| PERF3 build_js_raw | ≤1,8 MB | 1.267.473 B | — | — | PASS |
| PERF4 t_result_ready | 1600/2400 | 344/376 | 3500/5000 | 3433/3456 | PASS |
| PERF5 transfer_result | ≤620 KB | 512 KB | ≤620 KB | 474 KB | PASS |
| PERF6 transfer_result_buildings | ≤1100 KB | 647 KB | ≤1100 KB | 647 KB | PASS |
| PERF7 t_result_ready_buildings | 2400/3200 | 374/387 | 5000/7000 | 4619/4632 | PASS |
| PERF8 t_year_change | p95≤120 | 73 | p95≤300 | 244 | PASS |
| PERF9 t_place_change | p95≤1800 | 83 | p95≤3500 | 752 | PASS |
| PERF10 t_ortho_visible | p75≤1500 | 732 | p75≤3000 | **5247** | ver nota |
| PERF11 heap_after_journey | ≤60 MB | 33 máx | ≤40 MB | 32 máx | PASS |

**Nota PERF10-P2** (no era criterio FAIL en la adjudicación; entonces midió
1749 ms): el upstream `geo.bizkaia.eus` responde hoy ~2,3–2,5 s por tesela
bajo Slow4G (en adjudicación ~0,7 s; P1 sin throttling subió de 239 a 732 ms
con semántica equivalente → degradación ambiental del servicio). La capa
optimista adelanta las teselas ~2,5 s respecto al flujo anterior (sonda →
capa). El resto es latencia de servidor + decodificación bajo CPU×4. **No se
ha tocado el umbral preregistrado**; queda documentado para la
readjudicación.

## 6. Commits del candidato

Encadenados sobre `873f3a9` → publicados en `origin/g1-remediation`:

- `c5a6ca9` fix(security): harden static verification server against path traversal
- `d7c814a` fix(pipeline): make TLS verification fail closed and record provenance
- `13a9688` docs(repo): OSS community files, stale tooling cleanup, node engine
- `70a2871` chore(repo): normalize line endings and enforce formatting in CI
- (esta fase) perf deep-link / ortofoto optimista / robustez servidor /
  harnesses a11y+M6 / evidencia+docs — ver `git log` del candidato.

## 7. Hallazgos IMPORTANT/MINOR pendientes

- I-8, I-13, I-14: REMEDIATED (ver matriz).
- m-1..m-8: registrados en el informe de adjudicación; solo tocados si eran
  causa directa de FAIL. Ninguno bloquea la readjudicación.
- PERF10-P2 (arriba): residual ambiental, documentado sin tocar el umbral.

## 8. Riesgos y limitaciones conocidas

- La medición P2 depende de la latencia real de upstreams oficiales
  (geo.bizkaia.eus) en `t_ortho_visible`: la sonda/teselas son servicio vivo
  por diseño del criterio.
- `gh-pages` es rama de despliegue (evidencia DEP6), no parte del candidato.

## 9. Veredicto de fase

**G1_REMEDIATION_READY_FOR_READJUDICATION**

- Los 19 FAIL tienen causa raíz, fix, test/regresión y evidencia.
- El BLOCKED (DEP6) está verificado en host real.
- Verificación fresca completa y verde; mediciones oficiales del candidato
  registradas en `evidence/g1-remediation/perf-candidate-r2/`.
- Umbrales y criterios preregistrados intactos (`G1.md` sha256 sin cambios).
- Único residual: PERF10-P2 por latencia del upstream (documentado).
