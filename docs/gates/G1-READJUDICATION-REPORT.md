# G1 — READJUDICATION REPORT (formal, run 6 — candidato con detalle de celda accesible)

| Campo | Valor |
|---|---|
| Candidato | `0563d60` (`g1-remediation`) |
| HEAD al cierre | `0563d60` — árbol de trabajo restaurado tras el run D3 (solo timestamps); HEAD == candidato |
| Gate | `docs/gates/G1.md` — sha256 `8532c2111feb06b490f80ebaf47d07db9e426feb4657b3cd34d6c79ff28872f1` (sin cambios) |
| Freeze UTC | 2026-09-18T09:29:00Z |
| Entorno | Windows · Node v24.19.0 · Python 3.11.15 · Chromium/Firefox/WebKit (Playwright) |
| Evidencia | `evidence/g1-readjudication/2026-09-18T0929Z-0563d60/` (hash SHA-256 por fichero en `manifest.json`; `sandbox/` = tooling, no evidencia) |
| Relación con runs anteriores | **Readjudicación sobre candidato nuevo derivado del cierre de accesibilidad del detalle de celda.** `0563d60` = `7aa2688` + selección persistente de celda por clic/tap (mismo contenido C-05/C-08 que el tooltip hover), tarjeta estable bajo el mapa (`CellDetail.svelte`), sonda de teclado «Ver datos de esta zona» que inspecciona la celda del centro, capa `cells-selected`, limpieza por Esc/cerrar/cambio de municipio/salida del rango [9, 13.5). Sin métricas ni denominadores nuevos. Runs previos: `53b1e8a` ×2 → `G1_FAIL` PERF10-P2; `468c815`/`116b881`/`7aa2688` → 72/72 PASS. Toda la evidencia se regeneró fresca. |
| **Estado formal** | **`G1_PASS`** — 72/72 criterios PASS · HR1: **ACCEPTED** · HR2: **ACCEPTED** (decisión del responsable, 2026-09-18). NVDA y móvil físico: `PENDING_HUMAN` como checks `REQUIRED_PRE_SUBMIT` de `docs/LAUNCH_QUALITY.md` — **no son condiciones de G1** |

## Recuento

| Resultado | n |
|---|---|
| PASS | **72** |
| FAIL | 0 |
| BLOCKED | 0 |
| HR1 / HR2 | **ACCEPTED** — decisión del responsable del proyecto, 2026-09-18 |

## Qué cambió respecto al candidato anterior (7aa2688 → 0563d60)

`0563d60` — detalle de celda accesible (cierre del gap `REQUIRED_PRE_SUBMIT` de `docs/LAUNCH_QUALITY.md`): el detalle de celda dejaba de ser `mousemove`-only. Hover efímero preservado; clic/tap sobre `cells-fill` selecciona la celda y abre una tarjeta persistente bajo el mapa (`CellDetail.svelte`, patrón `BuildingCard`) con el mismo cuerpo que el tooltip (componente compartido `map/CellData.svelte`: cuota C-05, denominador/conocidos, huella C-08, aviso `CELL_SMALL_DENOMINATOR` cuando `known < 15`, estado `known === 0`); capa `cells-selected` con contorno visible filtrada por `{mun, fid}`; sonda de teclado «Ver datos de esta zona» visible solo en nivel CELDA que inspecciona la celda del centro del mapa y mueve el foco a la tarjeta (`tabindex="-1"`); limpieza por `Esc`, botón cerrar (con retorno de foco si venía de la tarjeta), cambio de municipio, reset y salida del rango `[9, 13.5)`; recálculo del detalle al cambiar de año o al llegar la serie asíncrona. Cero cálculos o denominadores nuevos.

### Cambios acumulados de la remediación (53b1e8a → 0563d60)

1. `0a2d9aa` — provenance: `flight_range` de la campaña 1956 → `null` (la ficha ODB indica vuelo catastral sin determinar, 1953–1955; `1956-1957` era el vuelo americano de geoEuskadi, no esta campaña).
2. `e7a0f82` — medidor PERF10 corregido: `sourcedata`/`content` de la primera imagen orto real + siguiente `render`; `areTilesLoaded()` conservado solo como diagnóstico sin efecto en gate.
3. `389525d` — preview progresivo first-party: JPEG ~1024 px por campaña derivado del servicio oficial (ArcGIS `/export` para ORTO_BFA_*, WMS `GetMap` para 2025), con manifiesto (bbox, CRS, sha256, licencia). Post-opt-in únicamente; bajo la capa `ortho` oficial; vectoriales encima; guarda de secuencia anti-stale; preview de comparación bajo `ortho-compare`.
4. `2f9c771` / `468c815` — serialización del prefetch de series de celda (el burst de ~12 `cells/*.json` saturaba el pool HTTP/1.1 y encolaba el preview hasta +2,9 s) y fixes de harness (axe same-origin bajo CSP, `CANDIDATE`/`ADJ_OUT` por env, contador P5 incluye `ortho-previews/`).
5. `116b881` — fix HR2: elimina «campaña 1956 (vuelo 1956–1957)» de `es.ts`/`UX_COPY.md`/`DATA_SEMANTICS.md`/manifest; fechas de vuelo resueltas; test de regresión copylint.
6. `7aa2688` — superficie de lanzamiento: canonical/og/twitter en `app.html` + `seo-static-head.mjs` postbuild por página, `robots.txt`, `sitemap.xml` (solo URLs canónicas reales), `favicon.svg`, `site.webmanifest`, tarjeta social propia `og-card.png`, title fallback sin «G0 vertical slice»; fix WCAG reflow 320 px (tabla `sr-only` envuelta en `div.sr-only`); smokes cross-browser + reflow 320 + zoom 400 %; checklist `docs/LAUNCH_QUALITY.md`; dependabot `cookie<0.7.0` documentado.
7. `0563d60` — detalle de celda accesible (ver arriba).

El cambio de producto es mínimo: `MapView.svelte` + dominio `ortho.ts` + un contenedor `div.sr-only` en `DecadeDistribution.svelte` + `CellDetail.svelte`/`CellData.svelte` (selección persistente de celda); no se tocó ningún umbral ni la definición congelada de PERF10.

## Verificación fresca (matriz)

| Paso | Resultado | Estado |
|---|---|---|
| `python -m pytest tests/data -q` | 38 passed | PASS |
| `npm run check` (svelte-check) | 0 errores, 0 warnings | PASS |
| `npm run lint` (eslint) | limpio | PASS |
| `npm run format:check` (prettier) | limpio | PASS |
| `npm run test` (vitest + node:test) | 66 + 15 tests | PASS |
| `npm run build` | OK + `engine-preload.js` | PASS |
| `powershell -File scripts/verify.ps1` | TODO OK (112/112 pmtiles+metrics, Range 206) | PASS |
| Harnesses navegador ×12 | todos ejecutados (`verify/verification-matrix.json`), incl. `g1r_cell_detail.mjs` 17/17 | PASS |
| Pipeline D3 ×2 | 456 ficheros comparados; única diferencia = `generated_at_utc` | PASS |
| Deploy candidato | dep-smoke contra host: 206 + CSP + compresión + PMTiles real | PASS |
| Launch QA cross-browser | Chromium+Firefox+WebKit journey PASS; 320 px sin hscroll; 400 % OK | PASS (`evidence/launch-qa/`) |

Nota de harnesses: en este run se ejecutan los scripts **comprometidos** del candidato (`g1_gate_adjudication.mjs` con axe same-origin, candidato por env y `ortho-previews/` en el contador P5 — commit `468c815`; `g1_gate_perf.mjs` con medidor corregido — commit `e7a0f82`). El sandbox solo contiene copias + junctions a `app/build`/`app/node_modules`; no hay parches de medición.

## PERF1–PERF11 — valores y percentiles (20 reps percentil · 5 transferencia/heap)

P1 = desktop local 1440×900 sin throttling, caché fría · P2 = móvil 390×844 DSF3, CPU×4, Slow4G.
Autoritativo: `perf10/perf-budgets.json` (con raws persistidos).

| ID | Métrica | Umbral P1 | Medido P1 | Umbral P2 | Medido P2 | Estado |
|---|---|---|---|---|---|---|
| PERF1 | transfer_hero | ≤420 KB | 62 KB | ≤420 KB | 62 KB | PASS |
| PERF2 | t_hero_interactive | p75≤900·p95≤1500 | 108/120 (máx 289) | p75≤2000·p95≤3200 | 1583/1594 (máx 1595) | PASS |
| PERF3 | build_js_raw | ≤1.800.000 B | 1.274.737 B | — | — | PASS |
| PERF4 | t_result_ready | p75≤1600·p95≤2400 | 299/312 (máx 2320) | p75≤3500·p95≤5000 | 3460/3472 (máx 3480) | PASS |
| PERF5 | transfer_result (1st-party) | ≤620 KB | 503 KB | ≤620 KB | 477 KB | PASS |
| PERF6 | transfer_result_buildings | ≤1.100 KB | 650 KB | ≤1.100 KB | 650 KB | PASS |
| PERF7 | t_result_ready_buildings | p75≤2400·p95≤3200 | 308/373 (máx 382) | p75≤5000·p95≤7000 | 4639/4661 (máx 4663) | PASS |
| PERF8 | t_year_change | p95≤120 | 103 (máx 122) | p95≤300 | 181 (máx 204) | PASS |
| PERF9 | t_place_change | p95≤1800 | 81 (máx 90) | p95≤3500 | 832 (máx 836) | PASS |
| PERF10 | t_ortho_visible | p75≤1500 | **92** | p75≤3000 | **1105** | PASS |
| PERF11 | heap_after_journey | ≤60 MB | máx 35 MB | ≤40 MB | máx 23 MB | PASS |

### PERF10 — detalle

`t_ortho_visible` = clic «Ver la foto» → primera imagen de ortofoto real renderizada (preview first-party **o** tesela oficial, lo que ocurra primero). Definición y umbrales sin tocar.

| Corrida | Perfil | p75 | p95 | máx | Ganador | Fuente |
|---|---|---|---|---|---|---|
| Este run (build adjudicado) | P1 | 92 ms | 106 | 240 | preview 20/20 | `perf10/perf-budgets.json` |
| Este run (build adjudicado) | P2 | 1105 ms | 1143 | 1158 | tile 20/20 | `perf10/perf-budgets.json` |
| Run anterior (build `7aa2688`, producto casi idéntico) | P1/P2 | 107 / 1128 ms | — | — | preview 20/20 · tile 20/20 | `evidence/g1-readjudication/2026-09-18T0714Z-7aa2688/perf10/` |
| Upstream degradado determinista (tiles→servidor lento real, 12 reps) | P2 | preview ≈1812 ms (max 1827) | — | — | preview 12/12, tiles ≈6,2 s | diagnóstico de remediación |

Lectura: con upstream sano la tesela oficial gana honestamente (~1,1 s P2); con upstream degradado el preview es el suelo (~1,8 s). En ambas fases `t_ortho_visible` ≤ 3.000 ms. Diagnóstico `t_ortho_all_viewport_tiles_loaded_diag` conservado sin efecto en gate (P1 712 ms · P2 1461 ms en este run).

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
| M6 | SMALL_DENOMINATOR solo contorno+tooltip/detalle | `m6-cell-tooltip` + `m6b-cell-detail` + `m6` | small n=9 con nota; normal sin nota; fill sin rama small-N; detalle persistente mismo denominador | — | PASS | OBSERVED |
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

## Regresión específica del detalle de celda (nueva superficie de producto en este run)

`map/m6b-cell-detail.json` — 17/17 checks PASS sobre el build adjudicado (`g1r_cell_detail.mjs`):

- `hover_tooltip`, `click_persists`, `card_survives_mouseout`, `tap_persists`: hover efímero preservado; clic y tap seleccionan y persisten.
- `same_denominator`, `same_share_text`: el detalle persistente muestra denominador y cuota idénticos al contrato del tooltip (C-05/C-08).
- `normal_no_smalln` / `smalln_warn_in_card`: aviso small-N solo cuando `known < 15`.
- `inspect_button_visible`, `keyboard_probe_card`, `keyboard_probe_focus`, `probe_none_message`: sonda de teclado sobre la celda del centro, foco a la tarjeta, mensaje sin-celda.
- `esc_clears`, `zoom_range_clears`, `zoomout_below9_clears`, `place_change_clears`: limpieza por Esc, salida de rango y cambio de municipio.
- `building_click_ok`: sin regresión en selección de edificio.

## Auditoría de evidencia obsoleta (stale)

| Artefacto | Motivo |
|---|---|
| `evidence/g1-readjudication/2026-09-17T{1340,1710}Z-53b1e8a/**` | candidato anterior; válidos, sustituidos por este run |
| `evidence/g1-readjudication/2026-09-17T2209Z-468c815/**` | run sobre `468c815` (72/72 PASS); válido, sustituido por este run |
| `evidence/g1-readjudication/2026-09-18T0546Z-116b881/**` | run sobre `116b881` (72/72 PASS); válido, sustituido |
| `evidence/g1-readjudication/2026-09-18T0714Z-7aa2688/**` | run sobre `7aa2688` (72/72 PASS); válido, sustituido por este run sobre `0563d60` |
| `evidence/g1-remediation/**` | pre-adjudicación; los JSON usados se re-emitieron frescos |
| `evidence/g1/08-adjudication/*` del repo | adjudicación de `b891a14`; este run escribió con `ADJ_OUT` al dir del run |
| `m1_sweep`/`m1_gaps` del harness comprometido y `g1r_scale_sweep.mjs` | metodología estática (z solicitada vs efectiva, munis lazy) → falsos gaps; sustituido por `readj_m1_sweep` |
| `rel4_nora_error` del harness principal | fixture NORA local enmascara el abort; re-probado sin fixture |
| `_axe.min.js` en `app/build` | auxiliar de medición copiado por los harnesses axe; no es parte del producto ni del deploy |
| Copy «campaña 1956 (vuelo 1956–1957)» en `es.ts`/`UX_COPY.md`/`DATA_SEMANTICS.md`/manifest | afirmación falsa detectada en revisión HR2 (era el vuelo americano de geoEuskadi, no el catastral); corregida en `116b881` + test de regresión |

## HR1 / HR2

**ACCEPTED · ACCEPTED** — decisión del responsable del proyecto (2026-09-18), sobre el
candidato `0563d60` con la evidencia fresca de este run:

- **HR1** (identidad editorial / ¿dato domina?): **ACCEPTED** — las 6 capturas canónicas
  `adjudication/hr1-01-hero-desktop.png` … `hr1-06-detail-mobile.png` mantienen el dato
  como protagonista sin dashboard institucional.
- **HR2** (claridad del copy en lectura real): **ACCEPTED** — el copy activo es claro;
  la afirmación falsa del vuelo 1956–1957 no aparece en la interfaz y el test de
  regresión pasa.

Historial HR2: en la revisión previa el responsable marcó **CHANGES_REQUESTED** por copy
factual obsoleto («campaña 1956 (vuelo 1956–1957)»). Subsanado en `116b881` +
`13377c8` (callout de `DATA_SOURCES.md`); confirmado en esta aceptación.

Evidencia empleada en la revisión:

- **HR1**: `adjudication/hr1-01…06-*.png` (hero, resultado, edificio, resultado tras
  cambio de año; móvil hero/resultado/detalle) + examen en vivo del relleno de celdas.
- **HR2**: `docs/UX_COPY.md` + estados con copy real en `adjudication/adjudication.json`
  (`u4`, `ortho_*`, `u3`, `rel4_*`, `rel3_pmtiles_down`) y `state/como-lo-sabemos.png`.
- Pack de contexto: `docs/design/G1-HUMAN-REVIEW-PACK.md`.
- Registro del closeout humano: `evidence/g1-closeout/` (incl. `tap-verification.json`,
  que documenta por qué `detail_after_tap:false` del smoke móvil es artefacto de
  harness y no defecto de producto).

## Veredicto

# `G1_PASS`

Resultado técnico: **72 PASS / 0 FAIL / 0 BLOCKED** sobre el candidato `0563d60`
(HEAD == candidato al freeze). PERF10 cumple en ambos perfiles con la definición y
umbrales congelados: P1 p75 = 92 ms, P2 p75 = 1105 ms.

Por la condición 9 de GO del gate congelado, `G1_PASS` requiere HR1 y HR2 `ACCEPTED`.
Ambas revisiones fueron aceptadas por el responsable el 2026-09-18 ⇒ **todas las
condiciones de GO del gate congelado se cumplen literalmente**.

> **`G1_PASS` — 72/72 PASS · HR1 ACCEPTED · HR2 ACCEPTED.**

Estados aparte, **no condiciones de G1** (viven en `docs/LAUNCH_QUALITY.md` como
`REQUIRED_PRE_SUBMIT`): smoke **NVDA**: `PENDING_HUMAN` · **móvil físico**:
`PENDING_HUMAN`. El release/tag definitivo para concurso puede esperar a esas dos
pruebas sin que eso afecte al estado formal de G1.

## Siguiente paso

1. Merge limpio `g1-remediation` → `main` (fast-forward verificado: 44/0).
2. Smoke post-merge contra el build en `main`.
3. Tag/freeze G1 — sobre `0563d60` + commits exclusivamente documentales posteriores;
   puede esperar a NVDA + móvil físico si se prefiere no etiquetar antes de esas pruebas.
4. QA pendiente de `LAUNCH_QUALITY.md` (no gate): NVDA real, móvil físico.
5. **G2 Competition Cut** — dirección congelada en `docs/G2-DIRECTION.md`; primero
   preregistrar `docs/gates/G2.md` con los tres spikes (propiedad `year` en tiles,
   proximidad a campaña con cobertura, fórmula de ranking de hotspots).
