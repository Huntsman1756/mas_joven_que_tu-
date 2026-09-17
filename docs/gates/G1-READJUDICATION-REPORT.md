# G1 — READJUDICATION REPORT (formal, run 2)

| Campo | Valor |
|---|---|
| Candidato | `53b1e8aaccb469042d099d31b667ee91ac00c69b` (`g1-remediation`) |
| Gate | `docs/gates/G1.md` — sha256 `8532c2111feb06b490f80ebaf47d07db9e426feb4657b3cd34d6c79ff28872f1` (sin cambios) |
| Freeze UTC | 2026-09-17T17:10:02Z |
| Freeze check | HEAD == candidato ✓ · working tree CLEAN (tracked) ✓ · gate hash inalterado ✓ |
| Entorno | Windows · Node v24.19.0 · npm 11.17.0 · Python 3.11.15 · Chromium (Playwright) |
| Evidencia | `evidence/g1-readjudication/2026-09-17T1710Z-53b1e8a/` (72 ficheros con hash en `manifest.json`; `sandbox/` = tooling, no evidencia) |
| Relación con run anterior | **Segunda readjudicación independiente** del mismo candidato. La primera (`…T1340Z-53b1e8a`, mismo día) también arrojó `G1_FAIL` por PERF10-P2. Este run regenera toda la evidencia: nada se hereda. |
| **Veredicto** | **G1_FAIL** |

## Recuento

| Resultado | n |
|---|---|
| PASS | **71** |
| FAIL | **1** (PERF10 — perfil P2) |
| BLOCKED | 0 |
| HR1 / HR2 | **PENDING_HUMAN** — existe FAIL técnico; no se adjudican (regla §12) |

## Verificación fresca (matriz)

| Paso | Resultado | Estado |
|---|---|---|
| `python -m pytest tests/data -q` | 34 passed | PASS |
| `npm run check` (svelte-check) | 0 errores, 0 warnings | PASS |
| `npm run lint` (eslint) | limpio | PASS |
| `npm run format:check` (prettier) | limpio | PASS |
| `npm run test` (vitest + node:test) | 62 + 15 tests | PASS |
| `npm run build` | OK + `engine-preload.js` | PASS |
| `powershell -File scripts/verify.ps1` | TODO OK (112/112 pmtiles+metrics, Range 206) | PASS |
| Harnesses navegador ×9 | todos ejecutados (ver `verify/verification-matrix.json`) | PASS |
| Pipeline D3 ×2 | 456 ficheros comparados; única diferencia = `generated_at_utc` | PASS |
| Deploy candidato | gh-pages `ed0ef58` = build de 53b1e8a (sin cambios desde run anterior; remedido fresco contra el host) | PASS |

Nota de integridad del harness PERF: el script fue modificado en remediación — cambios: (a) `installLocalFixtures` (NORA→fixture local, excluye latencia externa del presupuesto first-party); (b) `build_js_raw` medido real; (c) `PERF_OUT` configurable; (d) `journey()` muerto eliminado. En este run la copia de sandbox añade solo `raw` en `stats()` (percentiles idénticos). Perfiles, umbrales, repeticiones y funciones de medida **idénticos** a preregistro.

Nota de harness de adjudicación: la copia de sandbox corrige dos defectos de instrumentación ya documentados — (a) `addScriptTag({content})` para axe viola la CSP hash del candidato → axe se sirve same-origin (idéntico al fix comprometido de `g1_a11y.mjs`, commit `503f40c`); (b) `meta.candidate` hardcodeado → corregido a `53b1e8a`. Sin cambios en la lógica de medida.

## PERF1–PERF11 — valores y percentiles (20 reps percentil · 5 transferencia/heap)

P1 = desktop local 1440×900 sin throttling, caché fría · P2 = móvil 390×844 DSF3, CPU×4, Slow4G.
Autoritativos: `perf/perf-budgets.json` (con raws). Corroboración independiente misma sesión: `perf-runA-summary/perf-budgets.json`.

| ID | Métrica | Umbral P1 | Medido P1 | Umbral P2 | Medido P2 | Estado |
|----|----|----|----|----|----|----|
| PERF1 | transfer_hero | ≤420 KB | 59 KB | ≤420 KB | 59 KB | PASS |
| PERF2 | t_hero_interactive | p75≤900·p95≤1500 | 114/120 (máx 292) | p75≤2000·p95≤3200 | 1594/1600 (máx 1612) | PASS |
| PERF3 | build_js_raw | ≤1.800.000 B | 1.267.464 B | — | — | PASS |
| PERF4 | t_result_ready | p75≤1600·p95≤2400 | 304/348 (máx 2322) | p75≤3500·p95≤5000 | 3440/3460 (máx 3478) | PASS |
| PERF5 | transfer_result (1st-party) | ≤620 KB | ≤517 KB | ≤620 KB | 474 KB | PASS |
| PERF6 | transfer_result_buildings | ≤1.100 KB | 647 KB | ≤1.100 KB | 647 KB | PASS |
| PERF7 | t_result_ready_buildings | p75≤2400·p95≤3200 | 310/400 (máx 406) | p75≤5000·p95≤7000 | 4625/4647 (máx 4663) | PASS |
| PERF8 | t_year_change | p95≤120 | 73 (máx 74) | p95≤300 | 284 (máx 566) | PASS |
| PERF9 | t_place_change | p95≤1800 | 96 (máx 106) | p95≤3500 | 722 (máx 752) | PASS |
| PERF10 | t_ortho_visible (externo) | p75≤1500 | 819 | p75≤3000 | **5126** | **FAIL** |
| PERF11 | heap_after_journey | ≤60 MB | máx 34 MB | ≤40 MB | máx 34 MB | PASS |

### PERF10 — adjudicación estricta

Contrato congelado: `p75 ≤ 1500 ms` (P1) · `p75 ≤ 3000 ms` (P2) · 20 repeticiones.

- **P1: PASS** — p75 = 819 ms. Raws: 963, 860, 669, 819, 688, 618, 804, 619, 651, 733, 700, 737, 557, 837, 668, 784, 979, 760, 915, 725.
- **P2: FAIL** — p75 = 5126 ms > 3000 ms. Raws: 5708, 5479, 5240, 5484, 4229, 3924, 5365, 3972, 4259, 4332, 3159, 3151, 3222, 3520, 4290, 5126, 3374, 4274, 3703, 4019.
- Corrida A (misma sesión, harness sin parchear): p75 = 5250 ms. Raws no persistidos por defecto en el harness comprometido; percentiles: p75 5250 / p95 5482 / máx 5772.

Adjudicación según §4 del prompt / regla del gate: el servicio **ejecuta normalmente** — las 20 repeticiones P2 completaron con la ortofoto visible (máx 5708 ms < timeout 30 s del harness; ninguna rep terminó en SERVICE_ERROR). Proveedor lento pero funcional ⇒ **regla B: FAIL**. No es BLOCKED: el smoke externo sí se ejecutó (REL8 no disparada). No se excluye ninguna repetición. Umbral sin tocar.

Serie temporal de `t_ortho_visible` P2 p75 sobre este candidato: 5247 (remediación) → 4740 (readjudicación 14Z) → 5250 (17:4xZ, corrida A) → 5126 (17:5xZ, corrida B). Degradación sostenida del upstream `geo.bizkaia.eus` bajo Slow4G; el contrato congelado la adjudica como FAIL binario.

## Tabla exhaustiva — 72 criterios

| ID | Requisito (abreviado) | Evidencia fresca | Medido | Umbral | Estado | Notas |
|----|----|----|----|----|----|----|
| P1 | Solo `/` + `/como-lo-sabemos` | build lista `index.html` + `como-lo-sabemos.html` | 2 rutas | =2 | PASS | OBSERVED |
| P2 | Hero año+lugar, sin cuenta/geoloc, 1 CTA | `u1_cta_focus`, capturas hero | 1 CTA «Ver mi Bizkaia» | 1 | PASS | OBSERVED |
| P3 | Titular+denominador+cobertura sin scroll | `p3_desktop/mobile` | 319≤900 · 389≤905 | ≤viewport | PASS | OBSERVED |
| P4 | Viz temporal única, ≤15 buckets, idéntica d/m | `p4_desktop/mobile` | 14+1 barras, marker, srTable, sameBuckets | 15 | PASS | OBSERVED |
| P5 | 0 req. orto antes de acción | `p5_ortho_requests_before_click`, `p5_after_cta` | 0 / 0 | 0 | PASS | OBSERVED |
| P6 | Sin features de no-objetivos | inspección rutas/deps/UI | sin hallazgos | — | PASS | DERIVED |
| D1 | 112 municipios + Usansolo documentado | verify.ps1 + `slice-summary` (112 munis, 139.447 edif., 6.027 celdas) | 112/112 | 112 | PASS | OBSERVED |
| D2 | Contratos C-01…C-12 | pytest tests/data | 34/34 | all | PASS | OBSERVED |
| D3 | Agregados deterministas | `d3-determinism.json`: pipeline ×2, 456 ficheros | 1 diff = solo `generated_at_utc` | idéntico | PASS | OBSERVED; `municipalities.json#no-ts` idéntico; 112/112 metrics y cells idénticos |
| D4 | Sin recálculo en frontend | inspección código | única división: `footprintShareAfter` sobre serie canónica `ya` serializada | — | PASS | OBSERVED; no hay recomputación desde datos brutos |
| D5 | NO_YEAR fuera num/den, desglose publicado | metrics constants + `qa-all.json` + barra «sin año» | unknown/suspicious/invalid separados | — | PASS | OBSERVED |
| D6 | 0 geometrías inválidas sin reparación | `geometry-repairs.json` + `slice-summary` | 16 repairs, 0 inválidas post-repair | 0 | PASS | OBSERVED |
| M1 | Dominio zoom total, sin solapes/huecos | `m1-live-sweep-desktop/mobile` (jumpTo real, zoom efectivo) | 0 gaps · 0 overlaps · 0 mismatch, d+m | 0 | PASS | OBSERVED; desktop clampa z≥9.351 (maxBounds), móvil ejercita BIZKAIA real z7.743–8.75 |
| M2 | Zoom no recalcula métricas | `m2_metric_fetches_during_10_zooms` | 0 | 0 | PASS | OBSERVED |
| M3 | UNKNOWN/SUSP/INV sin estilo before/after | expresión + capa `*-noyear` | hatch propio | — | PASS | OBSERVED |
| M4 | NO_YEAR distinguible sin color | `m4_structure` | hatch_image + capas pattern | — | PASS | OBSERVED |
| M5 | Leyenda refleja capas por nivel | `m5_legend` + `legend` por fila del sweep | textos correctos por nivel | — | PASS | OBSERVED |
| M6 | SMALL_DENOMINATOR solo contorno+tooltip | `m6-cell-tooltip` + `m6` (fill=interpolate(share)) | small n=9 con nota; normal sin nota; fill sin rama small-N | — | PASS | OBSERVED |
| U1 | Journey solo teclado | `u1_keyboard_journey` + focus trail | RESULT alcanzado | — | PASS | OBSERVED |
| U2 | Todo estado con salida, 0 loaders ∞ | orto timeout→SERVICE_ERROR 8,3 s; searching resuelve; boot RESULT 1.941 ms <20 s; deep-link inválido no crash | todos con salida | — | PASS | OBSERVED |
| U3 | 7 estados de búsqueda con UI+copy | `search-states-rel4` | 7/7 (IDLE+TOO_SHORT+SEARCHING+RESULTS+NO_RESULTS+OUT_OF_SCOPE+NETWORK_ERROR) | 7 | PASS | OBSERVED |
| U4 | Titular no cambia al hacer zoom | `u4` | 5/5 lecturas idénticas | — | PASS | OBSERVED |
| U5 | Recarga y atrás/adelante | `deeplink_C_reload`, `deeplink_D` | reload OK, b/f coherentes | — | PASS | OBSERVED |
| U6 | Móvil sin panel fijo, hoja operable, ≥44px | `u6_mobile_layout` + `touch-targets` | 0 paneles fijos; sheet presente; 0 <44px en 5 estados | ≥44 | PASS | OBSERVED |
| C1 | 100 % copy en diccionario | grep aria-labels → `t()` + copylint | 0 literales | 0 | PASS | OBSERVED |
| C2 | Toda cifra con denominador | tooltip, dist, lead, coverage | «sobre n edificios con año conocido» adyacente | — | PASS | OBSERVED |
| C3 | 0 frases prohibidas | copylint suite | verde | 0 | PASS | OBSERVED |
| C4 | Disclosure heaping junto a dist. | `c4_heaping` | nota en `.dist` (años acabados 0/5, 29 %) | — | PASS | OBSERVED |
| C5 | NOT_COVERED ≠ SERVICE_ERROR | textos orto | copies distintos | — | PASS | OBSERVED |
| C6 | Estados vacío/error con copy real | REL3/REL4/orto textos | todos reales | — | PASS | OBSERVED |
| PERF1–11 | ver tabla PERF arriba | `perf/` + `perf-runA-summary/` | — | — | **10 PASS · 1 FAIL** | PERF10-P2 |
| A1 | axe 0 violaciones ×6 estados | axe_×6 (sandbox same-origin) | [] ×6 | 0 | PASS | OBSERVED |
| A2 | Contraste ≥4,5:1/3:1 | axe color-contrast | limpio | — | PASS | OBSERVED |
| A3 | Journey teclado + foco visible | `u1_focus_trail` | outlines visibles | — | PASS | OBSERVED |
| A4 | Alt. textual mapa + resumen dist. | `a4` (a7-u2-misc) | aria-label canvas + srTable + leyenda textual | — | PASS | OBSERVED |
| A5 | prefers-reduced-motion | `a5_reduced_motion` + `state-journey` | matches, mapa parado, form sobrevive | — | PASS | OBSERVED |
| A6 | aria-live anuncia cambios | `a6` | 3 anuncios | ≥1 | PASS | OBSERVED |
| A7 | Combobox APG | `a7` (a7-u2-misc) | combobox/expanded/activedescendant=place-opt-0/Esc | — | PASS | OBSERVED |
| A8 | 200 % sin pérdida | `a8_200pct` + captura | sin hscroll, sin cortes | — | PASS | OBSERVED |
| A9 | Targets ≥44 px | `a9_targets` + `touch-targets` | 0 bajo 44 en 8+5 estados | 0 | PASS | OBSERVED |
| REL1 | 0 excepciones no capturadas | `pageErrors` en todos los harnesses | [] | 0 | PASS | OBSERVED; sin `effect_update_depth_exceeded` |
| REL2 | 0 console.error fuera whitelist | `consoleErrors` | 4 = 404 NOT_COVERED + ERR_FAILED inducidos | 0 fuera | PASS | OBSERVED |
| REL3 | Fallo PMTiles controlado | `rel3_pmtiles_down` | maperror + headline/dist vivos | — | PASS | OBSERVED |
| REL4 | Fallo NORA recuperable | `search-states-rel4` (sin fixture) | NETWORK_ERROR real + fallback local + recovery | — | PASS | OBSERVED |
| REL5 | 3 estados orto alcanzables | `ortho-evidence` + adjudication | AVAILABLE/NOT_COVERED/SERVICE_ERROR | 3 | PASS | OBSERVED |
| REL6 | 0 fallos first-party journey | `net.firstPartyFailures` | 0 | 0 | PASS | OBSERVED |
| REL7 | Disponibilidad orto medida aparte | `ortho-evidence` + net.external (bizkaia 40, euskadi 16) | caracterizada; NOT_COVERED ≠ fallo; SERVICE_ERROR degrada bien | — | PASS | OBSERVED |
| REL8 | Smoke externo no ejecutable→BLOCKED | dep smoke + PERF10 ejecutaron | ejecutó | — | PASS | OBSERVED; regla no disparada |
| DEP1 | Range→206+Content-Range | dep smoke host real | 206 `bytes 0-99/1639058` | 206 | PASS | OBSERVED |
| DEP2 | Accept-Ranges | dep smoke | `bytes` | presente | PASS | OBSERVED |
| DEP3 | MIME .pmtiles | dep smoke | `application/octet-stream` | — | PASS | OBSERVED |
| DEP4 | Compresión JS/CSS | dep smoke | gzip en JS+CSS+engine-preload | br/gzip | PASS | OBSERVED |
| DEP5 | PMTiles real desde host | dep smoke P3 | 3.036 features renderizadas ×3 | render | PASS | OBSERVED |
| DEP6 | HTTPS+CSP host candidato | dep smoke | HTTPS+HSTS+CSP 3 dominios geo, 0 violaciones | — | PASS | OBSERVED; deploy `ed0ef58` = build 53b1e8a |
| VR1 | 6 estados ×2 vp, diff ≤0,1 % | `vr-diff.json` | 0 % ×6 | ≤0,1 % | PASS | OBSERVED |
| VR2 | Máscara canvas+tiles remotos | `vr-diff.json` mask | aplicada (región mapa) | — | PASS | OBSERVED |
| VR3 | Aserciones estructurales mapa | `vr3` z8/z11/z15 | capas+conteos+tiles_loaded | — | PASS | OBSERVED |
| VR4 | Fixture local, sin servicios vivos | VR usa `installLocalFixtures` + glyphs self-hosted | 0 deps vivas en VR | — | PASS | OBSERVED |
| PROV1 | Manifests licencia+retrieved_at+sha256 | `data/manifests/` + `manifest.json` del run | licencias+fechas; sha256 por fichero en manifest del run | — | PASS | OBSERVED |
| PROV2 | Atribución visible ODB/geoEuskadi | `/como-lo-sabemos` + footer | CC BY 4.0 ambos | — | PASS | OBSERVED |
| PROV3 | Snapshot visible | `how.snapshot_line` | «Snapshot de datos: 2026» | — | PASS | OBSERVED |
| PROV4 | Deps con licencia+ADR | `OSS_REUSE.md` + ADRs | documentado | — | PASS | OBSERVED |

## Auditoría de evidencia obsoleta (stale)

| Artefacto | Motivo de rechazo/corrección |
|---|---|
| `evidence/g1-readjudication/2026-09-17T1340Z-53b1e8a/**` | run anterior del mismo candidato: válido pero **sustituido** por este run fresco; concordante en veredicto |
| `evidence/g1-remediation/**` | pre-adjudicación; los JSON usados se re-emitieron frescos en sandbox |
| `evidence/g1/08-adjudication/*` del repo | adjudicación de `b891a14`; este run escribió en sandbox (OUT redirigido por cwd) |
| `m1_sweep`/`m1_gaps` del harness comprometido y `g1r_scale_sweep.mjs` | metodología estática: evalúan nivel sobre z solicitada, no sobre z efectiva tras clamp; `munis` es lazy z<9 → falsos gaps. Sustituido por `readj_m1_sweep` (jumpTo real + zoom efectivo): 0/0/0 |
| `rel4_nora_error` del harness principal | fixture NORA local (204) enmascara el abort → muestra NO_RESULTS. Re-probado sin fixture: NETWORK_ERROR real + fallback + recovery |
| `perf-raw/` corrida A | percentiles correctos pero sin raws (harness comprometido); corrida B con `raw` persistido es la autoritativa |
| `_axe.min.js` en `app/build` | auxiliar de medición inyectado por los harnesses axe (no parte del build de producto ni del deploy) |

## HR1 / HR2

**PENDING_HUMAN** — el gate contiene un FAIL binario (PERF10-P2); por la regla §12 no se adjudica revisión humana. Evidencia preparada fresca del candidato: capturas canónicas `adjudication/hr1-0{1..6}-*.png` (desktop+móvil), `state/como-lo-sabemos.png`, y estados U3/orto/errores con copy real en los JSON del run.

## Veredicto

**G1_FAIL** — PERF10 (`t_ortho_visible`, perfil P2): p75 = 5126 ms > 3000 ms (corrida B; corroborado 5250 en corrida A). Servicio externo funcional pero lento; adjudicado FAIL por regla B del contrato congelado. Los otros 71 criterios: PASS. Dos readjudicaciones independientes del mismo candidato convergen en el mismo veredicto.

## Siguiente paso (único)

Remediar PERF10-P2 (p75 ≤ 3000 ms bajo Slow4G/CPU×4) — el cuello de botella es latencia de teselas del upstream `geo.bizkaia.eus` (~3–5,5 s/visible bajo el perfil); opciones dentro del producto: reducir el número de teselas necesarias para `areTilesLoaded` en el viewport móvil, carga diferida/prefetch condicionado, o revisar si la métrica debe esperar a menos teselas visibles — **sin tocar el umbral** — y readjudicar de nuevo los 72 criterios sobre un nuevo candidato.

## PERF10 — corrección de instrumentación (fase posterior, mismo candidato)

Se detectó un defecto de conformidad del medidor (`PERF10_INSTRUMENTATION_CONFORMANCE`):

- **Definición congelada**: clic «Ver la foto» → *primera imagen de ortofoto visible* (`docs/design/G1-PERFORMANCE-BUDGETS.md`).
- **Implementación anterior**: `map.getLayer('ortho') && map.areTilesLoaded()` — espera a TODAS las teselas visibles de TODAS las sources (condición estrictamente más fuerte). `areTilesLoaded` era `false` en el instante t1 en **58/60** mediciones de control → sobre-medición demostrada (RED).
- **Implementación corregida** (solo tooling, `app/scripts/g1_gate_perf.mjs`; producto intacto): `sourcedata` con `sourceId==='ortho'` y `e.coord` presente → siguiente `render` → t1. En MapLibre 6.10 los eventos de tesela llevan `coord`+`tile` con `sourceDataType:null`.
- **Validación visual** (fuera del timer): diff de píxeles de la región del mapa antes/después de t1 = 60,65 % (P1) / 66,70 % (P2) → el evento corresponde a píxeles raster reales.
- **Métrica diagnóstica conservada**: `t_ortho_all_viewport_tiles_loaded_diag` (clic → `areTilesLoaded`), sin umbral ni efecto en gate.

### Medición corregida (20 reps, sesión caliente idéntica al harness)

| Perfil | p75 `t_ortho_visible` | p95 | max | umbral | resultado | diag `all_tiles` p75 |
|---|---|---|---|---|---|---|
| P1 | 523 ms | 656 | 857 | ≤1500 | PASS | 791 ms |
| P2 batch A | 5.115 ms | 5.383 | 5.468 | ≤3000 | **FAIL** | 5.347 ms |
| P2 batch B | 5.170 ms | 5.412 | 5.530 | ≤3000 | **FAIL** | 5.412 ms |

Raws en `evidence/g1-readjudication/2026-09-17T1710Z-53b1e8a/perf10-corrected/perf10-corrected.json`.

### Descomposición de causa (§10, post-FAIL)

CDP Network bajo P2, 3 reps (`perf10-request-decomp.json`): 5 teselas raster `ORTO_BFA_1990/MapServer/tile` por activación, ~16–18 KB cada una (transferencia ≪100 ms en Slow4G). **TTFB upstream ≈ 2.950–3.000 ms en fase degradada vs ≈ 250–300 ms en fase sana**, mismo candidato, mismas teselas, a minutos de distancia. La varianza es del servidor `geo.bizkaia.eus` (ArcGIS), no del producto ni del transporte emulado. La medición corregida elimina ~200 ms de cola de teselas pero no el TTFB de la primera.

### Adjudicación PERF10 corregida

**FAIL** (regla B): servicio ejecuta y completa (todos HTTP 200, ningún timeout), p75 P2 > 3.000 ms. REL8 no aplica: el smoke externo sí se ejecutó. El defecto de instrumentación era real y quedó corregido y documentado, pero **no cambia el veredicto bajo las condiciones upstream actuales**. Veredicto global: **G1_FAIL** (71 PASS / 1 FAIL), sin cambios.

> Nota de reproducibilidad: la métrica corregida es dependiente de la fase de salud del upstream (observado ~810 ms en fase sana, ~5.100 ms en fase degradada). Bajo el gate congelado, la adjudicación se toma con las condiciones del run; un run en fase sana podría producir p75 ≤ 3.000 ms — pero el resultado adjudicado de ESTE run es el medido.
