# G1-R — Matriz de remediación

Baseline: `8325a0d` (informe de adjudicación). Candidato original: `5b80240`.
Gate: `docs/gates/G1.md` sha256 `8532c2111feb06b490f80ebaf47d07db9e426feb4657b3cd34d6c79ff28872f1` (verificado al inicio de la fase).
Evidencia base: `evidence/g1/08-adjudication/`. Evidencia nueva: `evidence/g1-remediation/`.

Estados: `UNINVESTIGATED → INVESTIGATING → ROOT_CAUSE_FOUND → RED → GREEN → REMEDIATED | NOT_REMEDIATED | BLOCKED`.

## Dominio A — MAP / SCALE

| gate_id | finding | symptom | evidence | files | root_cause | remediation | status |
|---|---|---|---|---|---|---|---|
| M1 | I-1 | Solapes de dominio: munis `maxzoom 9.5` + celdas `minzoom 8.5` `[8.5,9.5)`; celdas `maxzoom 14.5` + edificios `≥13.5` `[13.5,14.5)`; fundido de opacidad 13,5→14,2 prohibido | `adjudication.json` `m1_overlaps=8`; `m1-sweep-before.json` idéntico (8 solapes, mismos z) | `MapView.svelte` (capas), `scale.ts` | minzoom/maxzoom de capa no coincidían con §6.2 | munis-fill/hl→9; cells-*→[9,13.5); opacidad constante 0,75; b-sel→13,5. `m1-sweep.json`: 0 huecos, 0 solapes, 0 mismatch (60 valores) | REMEDIATED |
| M6 | I-2 | Tooltip de celda ausente: no publica cuota, huella secundaria ni nota small-N | `cell_tooltip_present:false`; `m6-cell-tooltip.json` + 2 PNG | `MapView.svelte`, `cells.ts`, `es.ts`, pipeline (`ya`) | sin handler `mousemove` en `cells-fill`; la tesela no llevaba serie de huella (C-08) | `footprintShareAfter` + `ya` en teselas + tooltip C-05/denominador/C-08/small-N (known<15). Relleno sin rama por `known` | REMEDIATED |

## Dominio B — DATA DETERMINISM

| gate_id | finding | symptom | evidence | files | root_cause | remediation | status |
|---|---|---|---|---|---|---|---|
| D3 | I-9 | `cells.geojson` difiere entre regeneraciones idénticas; 1.353 celdas con empate de década modal | `d3-determinism.json`: 2 regeneraciones → sha256 idéntico | `pipeline/g1_buildings.py`, `pipeline/metrics.py` | `arg_max(decade, n)` sin orden total → empate = argumento arbitrario según orden de scan | `SQL_DOMINANT_DECADE` (row_number `n DESC, decade ASC`; empate→década temprana, = `_dominant_decade`) en celdas y municipios; `test_cells_determinism.py` 6 tests (shuffle ×20) | REMEDIATED |

## Dominio C — PRODUCT STATE / NAVIGATION

| gate_id | finding | symptom | evidence | files | root_cause | remediation | status |
|---|---|---|---|---|---|---|---|
| REL1 | I-5 | `effect_update_depth_exceeded` no capturado en journey (reproducido prod+dev, con reduced-motion) | `pageErrors` adjudication.json; `state-journey.json` 0 errors ambos modos | `MapView.svelte` | fitBounds `duration:0` → `moveend` síncrono dentro del `$effect` → lecturas de `app.view` capturadas como dependencias → auto-invalidación | `untrack(fitBounds)` (`60aecec`) | REMEDIATED |
| PERF9 | I-3 | Cambiar lugar desde RESULT desmonta el formulario (`selectPlace→metrics=null→phase='intro'`) | `place_change_defect` perf-budgets.json; `state-journey.json` formSurvived=true, headline=Bilbao | `app.svelte.ts`, `PlaceSearch.svelte`, `Hero.svelte`, `ResultView.svelte`, `+page.svelte` | `phase` derivado de `metrics!==null`: selectPlace ponía metrics=null → intro → unmount | fase explícita + `resolvePlace` last-write-wins + mapa/sheet montados por `app.place` (`de31aad`) | REMEDIATED |

## Dominio D — SEARCH / NORA

| gate_id | finding | symptom | evidence | files | root_cause | remediation | status |
|---|---|---|---|---|---|---|---|
| U3 | I-4 | `NO_RESULTS` inalcanzable: NORA 204 → `r.json()` lanza → `NETWORK_ERROR` | `u3.NO_RESULTS` muestra copy de NETWORK_ERROR; curl live `204`; `nora.test.ts` RED→GREEN (13 tests) | `nora.ts` | `r.ok` incluye 204; `r.json()` sobre cuerpo vacío lanzaba → catch → NETWORK_ERROR | 204 → lista vacía → `NO_RESULTS`; + timeout 10 s (`de1a956`) | REMEDIATED |

## Dominio E — ORTHOPHOTO RELIABILITY

| gate_id | finding | symptom | evidence | files | root_cause | remediation | status |
|---|---|---|---|---|---|---|---|
| U2 | I-6/I-7 | `probeCampaign` sin timeout (spec 8 s); deep-link `ortho=` deja `UNKNOWN` eterno; boot loader sin acotar | `ortho-evidence.json`: deep-link→AVAILABLE 540 ms; tesela colgada→SERVICE_ERROR 8.328 ms; blanca→SERVICE_ERROR; 404→NOT_COVERED | `ortho.ts`, `OrthoControls.svelte`, `catalog.ts`, `nora.ts` | sin `AbortSignal.timeout`; nadie sondeaba al restaurar `ortho=` desde URL; fetches de arranque sin límite | timeout 8 s + `AbortSignal.any`; `$effect` de auto-sondeo; loaders a 15 s (`7eb544`-ish) | REMEDIATED |

## Dominio F — ACCESSIBILITY

| gate_id | finding | symptom | evidence | files | root_cause | remediation | status |
|---|---|---|---|---|---|---|---|
| A9 | I-10 | 6 controles <44 px en 390×844 (zoom±29 px, «Ver la foto» 34 px, ✕ 22 px, «Cómo lo sabemos» 15 px, skip 37 px) | `a9_targets` adjudication.json; `a11y/touch-targets.json`: 42 controles medidos, 0 <44 px | `+page.svelte` (regla móvil global), `BuildingCard.svelte`, MapLibre nav control | targets CSS declarados pero el layout final los reducía (controles MapLibre por defecto 29 px, enlaces inline) | media query 390 px: `min-width/min-height:44px` en `button,a[href],input,[role=option],.maplibregl-ctrl button`; ✕ con padding propio (`723a674`) | REMEDIATED |
| U6 | I-10 | mismo fallo medido en criterio UX móvil | idem | idem | idem | idem | REMEDIATED |

## Dominio G — PERFORMANCE / DELIVERY

| gate_id | finding | symptom | evidence | files | root_cause | remediation | status |
|---|---|---|---|---|---|---|---|
| DEP4 | I-11 | `content-encoding` ausente en JS/CSS | `dep.js_content_encoding:null`; verificación: `br`/`gzip` en JS/JSON, ranges pmtiles en identity | `static-server.mjs` | servidor de verificación no negociaba compresión | negociación br/gzip/deflate por Accept-Encoding para tipos compresibles (`4a0fc55`) | REMEDIATED |
| PERF5 | I-11 | transfer_result 2.209 KB > 620 KB (sin compresión) | `perf-budgets.json`; desglose post-fix: 696 KB total | `static-server.mjs`, `MapView.svelte`, pipeline `ya` int | sin compresión (≈3×) + `ys`/`ya` serializados por año (~53% de props; `ya` con 2 decimales) | DEP4 + `ya`→m² enteros | PENDIENTE_READJUDICATION |
| PERF6 | I-11 | transfer_result_buildings 2.163 KB > 1.100 KB | idem | idem | idem | idem | PENDIENTE_READJUDICATION |
| PERF2 | — | P2 p75 2.080 > 2.000 ms | cascada: chunk maplibre y worker arrancaban tras montar MapView | `engine.ts`, `app.svelte.ts`, `MapView.svelte` | cadena serie doc→catálogo→métricas→chunk maplibre (2,2 s)→worker (1,4 s)→teselas | `preloadMapEngine()` en `resolvePlace` + prefetch worker; teselas −15 % (ya int) (`fec28ea`) | PENDIENTE_READJUDICATION |
| PERF4 | — | P2 11.599/11.628 > 3.500/5.000 ms | idem | idem | idem | idem | PENDIENTE_READJUDICATION |
| PERF7 | — | P2 12.319/12.373 > 5.000/7.000 ms | idem | idem | idem | idem | PENDIENTE_READJUDICATION |
| PERF8 | — | P1 p95 196 > 120 ms | `refreshShares` recorría `querySourceFeatures` (todas las teselas cargadas) por año | `MapView.svelte` | trabajo O(teselas·features) no acotado al viewport | `queryRenderedFeatures` + dedupe por fid (`fec28ea`) | PENDIENTE_READJUDICATION |
| PERF11 | — | P1 heap máx 62 > 60 MB | caché de teselas sin techo | `MapView.svelte` | `maxTileCacheSize` por defecto ilimitado respecto al journey | `maxTileCacheSize:384`, `maxTileCacheZoomLevels:4` (`fec28ea`) | PENDIENTE_READJUDICATION |

## Dominio H — VISUAL REGRESSION

| gate_id | finding | symptom | evidence | files | root_cause | remediation | status |
|---|---|---|---|---|---|---|---|
| VR4 | I-12 | Tests de mapa usan servicios vivos (glyphs demotiles, NORA) | `external: demotiles-glyphs:1, nora:7` | `MapView.svelte` (glyphs URL→`fonts/glyphs/`), `scripts/fixtures.mjs`, harnesses | dependencias externas vivas en el camino crítico visual | glyphs auto-hospedados (Apache-2.0, OSS_REUSE) + `installLocalFixtures` (NORA determinista) en perf/VR/journey/adjudication; ortofoto vivo solo en harness dedicado (`e36630a`) | REMEDIATED |

## Dominio I — COPY

| gate_id | finding | symptom | evidence | files | root_cause | remediation | status |
|---|---|---|---|---|---|---|---|
| C1 | m-1 | Literales fuera del diccionario: `>OK<`, `aria-label="Ortofoto"`, `'otra campaña'`, `aria-label="✕"` | grep + copylint no los detecta; copylint reforzado 5/5 | `ResultView.svelte`, `OrthoControls.svelte`, `BuildingCard.svelte`, `es.ts`, `copylint.test.ts` | lint no detectaba literales de 2 letras, atributos aria literales ni strings ES en `<script>` | claves nuevas (`result.change.apply`, `building.close`, `ortho.section_label`, `ortho.fallback_alt`) + lint ampliado (`723a674`) | REMEDIATED |

## BLOCKED

| gate_id | finding | status |
|---|---|---|
| DEP6 | HTTPS+CSP requiere host candidato real | EN CURSO — CSP hash-based emitida (meta, `f739889`), 0 violaciones en smoke local; deploy a GitHub Pages aprobado por el usuario, pendiente verificación en el host real |

## IMPORTANT no ligados a FAIL directo

| finding | nota | status |
|---|---|---|
| I-8 | `probeCampaign` clasifica por `blob.size<800`; imagen blanca real ~2.419 B → AVAILABLE erróneo | REMEDIATED — cobertura por contenido de píxel (`>1 color`, spec §3); tests RED→GREEN + `white-image` evidence |
| I-13 | `showNearest`/`chooseAlt` sin guarda anti-race | REMEDIATED — seq + AbortController last-write-wins; `selectPlace` resetea ortofoto |
| I-14 | `search.results` diverge de lista cerrada UX_COPY | REMEDIATED — copy y placeholders según §18 (`n`=NORA, `m`=locales) (`ec8088e`) |

## MINOR

m-1..m-8 registrados en el informe; solo se tocan si son causa directa de FAIL o dejan contradicción.
