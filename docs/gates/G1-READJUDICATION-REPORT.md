# G1 — READJUDICATION REPORT (formal, run 3 — candidato con preview progresivo)

| Campo | Valor |
|---|---|
| Candidato | `468c8150f16fafecf168a7302c770618e9cd9fcc` (`g1-remediation`) |
| HEAD al cierre | `b5d096a` — solo refresca timestamps de artefactos regenerados por el propio run D3; producto idéntico |
| Gate | `docs/gates/G1.md` — sha256 `8532c2111feb06b490f80ebaf47d07db9e426feb4657b3cd34d6c79ff28872f1` (sin cambios) |
| Freeze UTC | 2026-09-17T22:09:00Z |
| Entorno | Windows · Node v24.19.0 · Python 3.11.15 · Chromium (Playwright) |
| Evidencia | `evidence/g1-readjudication/2026-09-17T2209Z-468c815/` (hash SHA-256 por fichero en `manifest.json`; `sandbox/` = tooling, no evidencia) |
| Relación con runs anteriores | **Readjudicación independiente de un candidato nuevo.** Los dos runs sobre `53b1e8a` (`…T1340Z`, `…T1710Z`) arrojaron `G1_FAIL` por PERF10-P2. Este candidato incorpora la remediación: preview first-party de la misma campaña oficial (ADR-011, commit `389525d`), corrección del medidor PERF10 (`e7a0f82`) y corrección factual de provenance 1956 (`0a2d9aa`). Toda la evidencia se regeneró fresca: nada se hereda. |
| **Veredicto** | **G1_PASS** |

## Recuento

| Resultado | n |
|---|---|
| PASS | **72** |
| FAIL | 0 |
| BLOCKED | 0 |
| HR1 / HR2 | **READY** — gate técnico limpio; pendiente de adjudicación humana como fase separada |

## Qué cambió respecto al candidato anterior (53b1e8a → 468c815)

1. `0a2d9aa` — provenance: `flight_range` de la campaña 1956 → `null` (la ficha ODB indica vuelo catastral sin determinar, 1953–1955; `1956-1957` era el vuelo americano de geoEuskadi, no esta campaña).
2. `e7a0f82` — medidor PERF10 corregido: `sourcedata`/`content` de la primera imagen orto real + siguiente `render`; `areTilesLoaded()` conservado solo como diagnóstico sin efecto en gate.
3. `389525d` — preview progresivo first-party: JPEG ~1024 px por campaña derivado del servicio oficial (ArcGIS `/export` para ORTO_BFA_*, WMS `GetMap` para 2025), con manifiesto (bbox, CRS, sha256, licencia). Post-opt-in únicamente; bajo la capa `ortho` oficial; vectoriales encima; guarda de secuencia anti-stale; preview de comparación bajo `ortho-compare`.
4. `2f9c771` / `468c815` — serialización del prefetch de series de celda (el burst de ~12 `cells/*.json` saturaba el pool HTTP/1.1 y encolaba el preview hasta +2,9 s) y fixes de harness (axe same-origin bajo CSP, `CANDIDATE`/`ADJ_OUT` por env, contador P5 incluye `ortho-previews/`).

El cambio de producto es mínimo y acotado a `MapView.svelte` + dominio `ortho.ts`; no se tocó ningún umbral ni la definición congelada de PERF10.

## Verificación fresca (matriz)

| Paso | Resultado | Estado |
|---|---|---|
| `python -m pytest tests/data -q` | 38 passed | PASS |
| `npm run check` (svelte-check) | 0 errores, 0 warnings | PASS |
| `npm run lint` (eslint) | limpio | PASS |
| `npm run format:check` (prettier) | limpio | PASS |
| `npm run test` (vitest + node:test) | 65 + 15 tests | PASS |
| `npm run build` | OK + `engine-preload.js` | PASS |
| `powershell -File scripts/verify.ps1` | TODO OK (112/112 pmtiles+metrics, Range 206) | PASS |
| Harnesses navegador ×11 | todos ejecutados (`verify/verification-matrix.json`) | PASS |
| Pipeline D3 ×2 | 456 ficheros comparados; única diferencia = `generated_at_utc` | PASS |
| Deploy candidato | dep-smoke contra host: 206 + CSP + compresión + PMTiles real | PASS |

Nota de harnesses: en este run se ejecutan los scripts **comprometidos** del candidato (`g1_gate_adjudication.mjs` con axe same-origin, candidato por env y `ortho-previews/` en el contador P5 — commit `468c815`; `g1_gate_perf.mjs` con medidor corregido — commit `e7a0f82`). El sandbox solo contiene copias + junctions a `app/build`/`app/node_modules`; no hay parches de medición.

## PERF1–PERF11 — valores y percentiles (20 reps percentil · 5 transferencia/heap)

P1 = desktop local 1440×900 sin throttling, caché fría · P2 = móvil 390×844 DSF3, CPU×4, Slow4G.
Autoritativo: `perf10/perf-budgets.json` (con raws persistidos).

| ID | Métrica | Umbral P1 | Medido P1 | Umbral P2 | Medido P2 | Estado |
|---|---|---|---|---|---|---|
| PERF1 | transfer_hero | ≤420 KB | 60 KB | ≤420 KB | 60 KB | PASS |
| PERF2 | t_hero_interactive | p75≤900·p95≤1500 | 106/112 (máx 271) | p75≤2000·p95≤3200 | 1574/1578 (máx 1578) | PASS |
| PERF3 | build_js_raw | ≤1.800.000 B | 1.269.549 B | — | — | PASS |
| PERF4 | t_result_ready | p75≤1600·p95≤2400 | 244/252 (máx 1775) | p75≤3500·p95≤5000 | 3376/3388 (máx 3390) | PASS |
| PERF5 | transfer_result (1st-party) | ≤620 KB | 498 KB | ≤620 KB | 475 KB | PASS |
| PERF6 | transfer_result_buildings | ≤1.100 KB | 648 KB | ≤1.100 KB | 648 KB | PASS |
| PERF7 | t_result_ready_buildings | p75≤2400·p95≤3200 | 330/340 (máx 344) | p75≤5000·p95≤7000 | 4592/4622 (máx 4631) | PASS |
| PERF8 | t_year_change | p95≤120 | 84 (máx 103) | p95≤300 | 127 (máx 128) | PASS |
| PERF9 | t_place_change | p95≤1800 | 77 (máx 77) | p95≤3500 | 732 (máx 755) | PASS |
| PERF10 | t_ortho_visible | p75≤1500 | **63** | p75≤3000 | **1129** | PASS |
| PERF11 | heap_after_journey | ≤60 MB | máx 34 MB | ≤40 MB | máx 22 MB | PASS |

### PERF10 — detalle

`t_ortho_visible` = clic «Ver la foto» → primera imagen de ortofoto real renderizada (preview first-party **o** tesela oficial, lo que ocurra primero). Definición y umbrales sin tocar.

| Corrida | Perfil | p75 | p95 | máx | Ganador | Fuente |
|---|---|---|---|---|---|---|
| Este run (build adjudicado) | P1 | 63 ms | 76 | 194 | preview 20/20 | `perf10/perf-budgets.json` |
| Este run (build adjudicado) | P2 | 1129 ms | 1143 | 1171 | tile 20/20 | `perf10/perf-budgets.json` |
| Batch A (build `389525d`, producto idéntico) | P1/P2 | 76 / 1151 ms | — | — | preview 20/20 · tile 20/20 | evidencia `out/perf10` de la remediación |
| Batch B (build `389525d`) | P1/P2 | 75 / 1137 ms | — | — | preview 20/20 · tile 20/20 | idem |
| Upstream degradado determinista (tiles→servidor lento real, 12 reps) | P2 | preview ≈1812 ms (max 1827) | — | — | preview 12/12, tiles ≈6,2 s | diagnóstico de remediación |

Lectura: con upstream sano la tesela oficial gana honestamente (~1,1 s P2); con upstream degradado el preview es el suelo (~1,8 s). En ambas fases `t_ortho_visible` ≤ 3.000 ms. Diagnóstico `t_ortho_all_viewport_tiles_loaded_diag` conservado sin efecto en gate (P1 476 ms · P2 1470 ms en este run).

## Matriz de adjudicación — 72 criterios binarios

| ID | Requisito (abreviado) | Evidencia fresca | Medido | Umbral | Estado | Notas |
|---|---|---|---|---|---|---|
| P1 | Solo `/` + `/como-lo-sabemos` | build lista `index.html` + `como-lo-sabemos.html` | 2 rutas | =2 | PASS | OBSERVED |
| P2 | Hero año+lugar, sin cuenta/geoloc, 1 CTA | `u1_cta_focus`, capturas hero | 1 CTA «Ver mi Bizkaia» | 1 | PASS | OBSERVED |
| P3 | Titular+denominador+cobertura sin scroll | `p3_desktop/mobile` | 319≤900 · 389≤905 | ≤viewport | PASS | OBSERVED |
| P4 | Viz temporal única, ≤15 buckets, idéntica d/m | `p4_desktop/mobile` | 14+1 barras, marker, srTable, sameBuckets | 15 | PASS | OBSERVED |
| P5 | 0 req. orto antes de acción | `p5_ortho_requests_before_click`, `p5_after_cta`; regresión `p5-zero` (incluye `ortho-previews/`) | 0 / 0 | 0 | PASS | OBSERVED |
| P6 | Sin features de no-objetivos | inspección rutas/deps/UI | sin hallazgos | — | PASS | DERIVED |
| D1 | 112 municipios + Usansolo documentado | verify.ps1 + `slice-summary` (112 munis, 139.447 edif., 6.027 celdas) | 112/112 | 112 | PASS | OBSERVED |
| D2 | Contratos C-01…C-12 | pytest tests/data | 38/38 | all | PASS | OBSERVED |
| D3 | Agregados deterministas | `d3-determinism.json`: pipeline ×2, 456 ficheros | 1 diff = solo `generated_at_utc` | idéntico | PASS | OBSERVED |
| D4 | Sin recálculo en frontend | inspección código | única división: `footprintShareAfter` sobre serie canónica `ya` serializada | — | PASS | OBSERVED |
| D5 | NO_YEAR fuera num/den, desglose publicado | metrics constants + `qa-all.json` + barra «sin año» | unknown/suspicious/invalid separados | — | PASS | OBSERVED |
| D6 | 0 geometrías inválidas sin reparación | `geometry-repairs.json` + `slice-summary` | 16 repairs, 0 inválidas post-repair | 0 | PASS | OBSERVED |
| M1 | Dominio zoom total, sin solapes/huecos | `m1-live-sweep-desktop/mobile` (jumpTo real, zoom efectivo) | 0 gaps · 0 overlaps · 0 mismatch, d+m | 0 | PASS | OBSERVED |
| M2 | Zoom no recalcula métricas | `m2_metric_fetches_during_10_zooms` | 0 | 0 | PASS | OBSERVED |
| M3 | UNKNOWN/SUSP/INV sin estilo before/after | expresión + capa `*-noyear` | hatch propio | — | PASS | OBSERVED |
| M4 | NO_YEAR distinguible sin color | `m4_structure` | hatch_image + capas pattern | — | PASS | OBSERVED |
| M5 | Leyenda refleja capas por nivel | `m5_legend` + sweep | textos correctos por nivel | — | PASS | OBSERVED |
| M6 | SMALL_DENOMINATOR solo contorno+tooltip | `m6-cell-tooltip` + `m6` | small n=9 con nota; normal sin nota; fill sin rama small-N | — | PASS | OBSERVED |
| U1 | Journey solo teclado | `u1_keyboard_journey` + focus trail | RESULT alcanzado | — | PASS | OBSERVED |
| U2 | Todo estado con salida, 0 loaders ∞ | orto timeout→SERVICE_ERROR; searching resuelve; deep-link inválido no crash | todos con salida | — | PASS | OBSERVED |
| U3 | 7 estados de búsqueda con UI+copy | `search-states-rel4` | 7/7 | 7 | PASS | OBSERVED |
| U4 | Titular no cambia al hacer zoom | `u4` | 5/5 lecturas idénticas | — | PASS | OBSERVED |
| U5 | Recarga y atrás/adelante | `deeplink_C_reload`, `deeplink_D` | reload OK, b/f coherentes | — | PASS | OBSERVED |
| U6 | Móvil sin panel fijo, hoja operable, ≥44px | `u6_mobile_layout` + `touch-targets` | 0 paneles fijos; sheet presente; 0 <44px | ≥44 | PASS | OBSERVED |
| C1 | 100 % copy en diccionario | copylint | 0 literales | 0 | PASS | OBSERVED |
| C2 | Toda cifra con denominador | tooltip, dist, lead, coverage | «sobre n edificios con año conocido» adyacente | — | PASS | OBSERVED |
| C3 | 0 frases prohibidas | copylint suite | verde | 0 | PASS | OBSERVED |
| C4 | Disclosure heaping junto a dist. | `c4_heaping` | nota en `.dist` | — | PASS | OBSERVED |
| C5 | NOT_COVERED ≠ SERVICE_ERROR | textos orto | copies distintos | — | PASS | OBSERVED |
| C6 | Estados vacío/error con copy real | REL3/REL4/orto textos | todos reales | — | PASS | OBSERVED |
| PERF1–11 | ver tabla PERF arriba | `perf10/perf-budgets.json` (raws) | — | — | **11 PASS** | — |
| A1 | axe 0 violaciones ×6 estados | axe_×6 (same-origin, CSP) | [] ×6 | 0 | PASS | OBSERVED |
| A2 | Contraste ≥4,5:1/3:1 | axe color-contrast | limpio | — | PASS | OBSERVED |
| A3 | Journey teclado + foco visible | `u1_focus_trail` | outlines visibles | — | PASS | OBSERVED |
| A4 | Alt. textual mapa + resumen dist. | `a4` (a7-u2-misc) | aria-label canvas + srTable + leyenda | — | PASS | OBSERVED |
| A5 | prefers-reduced-motion | `a5_reduced_motion` + `state-journey` | matches, mapa parado, form sobrevive | — | PASS | OBSERVED |
| A6 | aria-live anuncia cambios | `a6` | 3 anuncios | ≥1 | PASS | OBSERVED |
| A7 | Combobox APG | `a7` (a7-u2-misc) | combobox/expanded/activedescendant/Esc | — | PASS | OBSERVED |
| A8 | 200 % sin pérdida | `a8_200pct` + captura | sin hscroll, sin cortes | — | PASS | OBSERVED |
| A9 | Targets ≥44 px | `a9_targets` + `touch-targets` | 0 bajo 44 | 0 | PASS | OBSERVED |
| REL1 | 0 excepciones no capturadas | `pageErrors` en todos los harnesses | [] | 0 | PASS | OBSERVED |
| REL2 | 0 console.error fuera whitelist | `consoleErrors` | 4 = 404 NOT_COVERED + ERR_FAILED inducidos | 0 fuera | PASS | OBSERVED |
| REL3 | Fallo PMTiles controlado | `rel3_pmtiles_down` | maperror + headline/dist vivos | — | PASS | OBSERVED |
| REL4 | Fallo NORA recuperable | `search-states-rel4` (sin fixture) | NETWORK_ERROR real + fallback local + recovery | — | PASS | OBSERVED |
| REL5 | 3 estados orto alcanzables | `ortho-evidence` + adjudication | AVAILABLE/NOT_COVERED/SERVICE_ERROR | 3 | PASS | OBSERVED |
| REL6 | 0 fallos first-party journey | `net.firstPartyFailures` | 0 | 0 | PASS | OBSERVED |
| REL7 | Disponibilidad orto medida aparte | `ortho-evidence` + net.external (bizkaia 40, euskadi 18) | caracterizada; NOT_COVERED ≠ fallo | — | PASS | OBSERVED |
| REL8 | Smoke externo no ejecutable→BLOCKED | dep smoke + PERF10 ejecutaron | ejecutó | — | PASS | OBSERVED; regla no disparada |
| DEP1 | Range→206+Content-Range | dep smoke | 206 `bytes 0-99/1681173` | 206 | PASS | OBSERVED |
| DEP2 | Accept-Ranges | dep smoke | `bytes` | presente | PASS | OBSERVED |
| DEP3 | MIME .pmtiles | dep smoke | `application/octet-stream` | — | PASS | OBSERVED |
| DEP4 | Compresión JS/CSS | dep smoke | br/gzip | br/gzip | PASS | OBSERVED |
| DEP5 | PMTiles real desde host | dep smoke P3 | features renderizadas | render | PASS | OBSERVED |
| DEP6 | HTTPS+CSP host candidato | dep smoke | HTTPS+HSTS+CSP, 0 violaciones | — | PASS | OBSERVED |
| VR1 | 6 estados ×2 vp, diff ≤0,1 % | `vr-diff.json` | 0 % ×6 | ≤0,1 % | PASS | OBSERVED |
| VR2 | Máscara canvas+tiles remotos | `vr-diff.json` mask | aplicada | — | PASS | OBSERVED |
| VR3 | Aserciones estructurales mapa | `vr3` z8/z11/z15 | capas+conteos+tiles_loaded | — | PASS | OBSERVED |
| VR4 | Fixture local, sin servicios vivos | VR usa `installLocalFixtures` + glyphs self-hosted | 0 deps vivas | — | PASS | OBSERVED |
| PROV1 | Manifests licencia+retrieved_at+sha256 | `data/manifests/` + `ortho-previews/manifest.json` + manifest del run | licencias+fechas+sha256 | — | PASS | OBSERVED |
| PROV2 | Atribución visible ODB/geoEuskadi | `/como-lo-sabemos` + footer + `ortho_available` | CC BY 4.0 | — | PASS | OBSERVED |
| PROV3 | Snapshot visible | `how.snapshot_line` | «Snapshot de datos: 2026» | — | PASS | OBSERVED |
| PROV4 | Deps con licencia+ADR | `OSS_REUSE.md` + ADRs (incl. ADR-011) | documentado | — | PASS | OBSERVED |

## Regresión específica del preview (nueva superficie de producto)

`ortho-preview/ortho-preview-regression.json` — 6/6 escenarios PASS sobre el build adjudicado:

- `p5-zero`: 0 requests de imagen ortográfica (incl. `ortho-previews/`) antes del opt-in.
- `layer-order`: preview idx 6 < `ortho` 7 < `cells-fill` 8; diff de píxeles 52,4 % (imagen real).
- `slow-tiles`: preview pinta y permanece con teselas oficiales pendientes.
- `stale-campaign`: cambio 1990→1975 antes de resolver → la capa final referencia `1975.jpg`.
- `cleanup-hide`: preview eliminado al ocultar.
- `compare`: `ortho-compare-preview` 8 < `ortho-compare` 9, debajo de vectoriales.

## Auditoría de evidencia obsoleta (stale)

| Artefacto | Motivo |
|---|---|
| `evidence/g1-readjudication/2026-09-17T{1340,1710}Z-53b1e8a/**` | candidato anterior; válidos, sustituidos por este run |
| `evidence/g1-remediation/**` | pre-adjudicación; los JSON usados se re-emitieron frescos |
| `evidence/g1/08-adjudication/*` del repo | adjudicación de `b891a14`; este run escribió con `ADJ_OUT` al dir del run |
| `m1_sweep`/`m1_gaps` del harness comprometido y `g1r_scale_sweep.mjs` | metodología estática (z solicitada vs efectiva, munis lazy) → falsos gaps; sustituido por `readj_m1_sweep` |
| `rel4_nora_error` del harness principal | fixture NORA local enmascara el abort; re-probado sin fixture |
| `_axe.min.js` en `app/build` | auxiliar de medición copiado por los harnesses axe; no es parte del producto ni del deploy |
| Batches PERF10 A/B sobre `389525d` | build previo al commit `2f9c771` (SvelteSet, solo lint); medición autoritativa = `perf10/` de este run sobre el build adjudicado |

## HR1 / HR2

**READY** — gate técnico limpio (72/72). La revisión humana se adjudica como fase separada según el plan. Evidencia preparada fresca: `adjudication/hr1-0{1..6}-*.png`, `state/como-lo-sabemos.png`, estados U3/orto/error con copy real en los JSON del run.

## Veredicto

**G1_PASS** — 72 PASS / 0 FAIL / 0 BLOCKED sobre el candidato `468c815` (producto idéntico en `b5d096a`). PERF10 cumple en ambos perfiles con la definición y umbrales congelados: P1 p75 = 63 ms, P2 p75 = 1129 ms. La remediación (preview first-party de la misma campaña oficial, post-opt-in, bajo la capa oficial) es progressive enhancement real medido en ambas fases de salud del upstream.

## Siguiente paso

1. Push `g1-remediation` (HEAD `b5d096a`).
2. Adjudicar **HR1/HR2** como fase separada con la evidencia preparada.
3. Tras HR limpio: fase de producto — narrativa, hotspots, Play y acabado visual. **No** G2 ni merge a `main` sin esos pasos.
