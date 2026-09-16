# G1 — INFORME FINAL DE ADJUDICACIÓN

> Adjudicación del candidato `5b80240` contra el gate congelado `docs/gates/G1.md`.
> Estados autorizados: `G1_PASS` · `G1_FAIL` · `G1_BLOCKED`.
> Tipos de evidencia: **OBSERVED** (visto en código/salida/artefacto) · **DERIVED** (calculado
> desde evidencia observada) · **HUMAN_JUDGMENT** (requiere decisión humana).

---

## 1. Integridad del preregistro

| Campo | Valor |
|---|---|
| Fichero de gate | `docs/gates/G1.md` |
| Blob SHA-1 (git) | `a1a458f821f09a95623e34d1669d5acf7572b525` |
| SHA-256 del fichero | `8532c2111feb06b490f80ebaf47d07db9e426feb4657b3cd34d6c79ff28872f1` |
| Commit de preregistro | `60a5fdc` |
| Enmiendas preregistradas | `3fe17b7`, `4169f3c` (última modificación del gate; ambas anteriores a la implementación) |
| ¿Gate modificado tras iniciar implementación? | **NO** (OBSERVED: `git log` del fichero; toda la implementación es `5b80240`, posterior a `4169f3c`) |
| Criterios binarios parseados del fichero | **72** (PRODUCT 6 · DATA 6 · MAP 6 · UX 6 · COPY 6 · PERFORMANCE 11 · ACCESSIBILITY 9 · RELIABILITY 8 · DEPLOYMENT 6 · VISUAL_REGRESSION 4 · PROVENANCE 4) |
| Revisiones humanas | **2** (HR1, HR2) |
| Integridad | **ÍNTEGRA** — la cifra "72" del encargo coincide con el fichero congelado |

## 2. Baseline

`be26508` (G0_PASS), según `G1.md` §metadatos. Rama de diseño: `g1-design`.

## 3. Candidato de implementación

| Campo | Valor |
|---|---|
| Commit candidato nombrado | `5b80240` |
| HEAD adjudicado | `b891a14` |
| Delta candidato→HEAD | `5b80240..b891a14` = borrado de 2 PNG de depuración en `evidence/` — **0 cambios de producto** (OBSERVED, `git diff --stat`) |
| Working tree | limpio salvo regeneraciones idénticas por timestamp (ver §7) |
| Evidencia ligada a | `b891a14` ≡ `5b80240` en todo lo adjudicable |

## 4. Entorno

Windows · Node v24.19.0 · npm 11.17.0 · Python 3.11.15 · Chromium (Playwright, channel chrome) · `static-server.mjs` local (Range 206, **sin compresión**) · maplibre-gl 6.10.0 · pmtiles 4.5.0.

**No conformidades del harness registradas antes de medir:**
1. `static-server.mjs` no implementa compresión: PERF1/5/6 se miden en bytes **sin comprimir** (el perfil P1/P2 presupone compresión).
2. DEP6 exige host candidato real con HTTPS+CSP: el servidor local no lo provee.
3. No existía comparador de píxeles: se escribió `g1_gate_vr.mjs` como herramienta de adjudicación (umbral 0,1 % ya congelado en el gate, no movido).

## 5. Verificación fresca (tree adjudicado, exit codes registrados)

| Comando | Exit | Resultado |
|---|---|---|
| `npm run lint` | 0 | 0 errores, 4 warnings |
| `npm run check` (svelte-check) | 0 | 0 errores, 0 warnings |
| `npm run test` (vitest) | 0 | 30/30 tests, 6 ficheros |
| `python -m pytest tests/data -q` | 0 | 28/28 |
| `npm run build` | 0 | adapter-static, `build/` escrito |
| `node scripts/g1_gate_adjudication.mjs` | 0 | `evidence/g1/08-adjudication/adjudication.json` |
| `node scripts/g1_gate_perf.mjs` | 0 | `perf-budgets.json` (20 reps percentiles, 5 transferencia/heap, P1+P2 CDP) |
| `node scripts/g1_gate_vr.mjs` | 0 | `vr/vr-diff.json` |
| `scripts/verify.ps1` | 0 | todos los pasos OK, Range 206 |
| patrón `verify.ps1` con hijo fallido (réplica) | **1** | propaga fallo correctamente (ya no hay falso verde) |

## 6. Hallazgos de la revisión adversarial del diff

Diff revisado: `4169f3c..b891a14` (300 ficheros). Clasificación:

### CRITICAL — ninguno catalogado como tal; los siguientes son los defectos de mayor peso (IMPORTANT que hacen FAIL a criterios):

### IMPORTANT

| # | Hallazgo | Criterio(s) |
|---|---|---|
| I-1 | **Dominio de zoom no coincide literalmente con §6.2.** `munis-fill` `maxzoom 9.5` (spec: <9), `cells-fill`/`cells-line`/`cells-smalln`/`cells-hl` `minzoom 8.5 maxzoom 14.5` (spec: 9≤z<13,5), edificios `minzoom 13.5`. Solapes medidos en 8 valores de z: `[8.5,9.5)` municipios+celdas y `[13.5,14.5)` celdas+edificios. Además `cells-fill` interpola opacidad 13,5→14,2 = **fundido**, prohibido por §6.2 («sin fundidos»). `vr3.z8` muestra 15.035 features de celdas renderizadas en z8 (fuera de dominio). | M1 |
| I-2 | **Tooltip de celda inexistente.** §6.2/§7 exigen tooltip con cuota de la celda + huella como lectura secundaria + nota `CELL_SMALL_DENOMINATOR`. En `MapView.svelte` solo existe tooltip de edificio (`cell_tooltip_present: false`). El porcentaje por celda nunca se publica. | M6 (+ C-08 visible) |
| I-3 | **Cambio de lugar desde RESULT roto.** `choose()` → `app.selectPlace()` → `metrics=null` → `phase` derivado cae a `'intro'` → `ResultView` se desmonta **antes** de poder enviar el formulario. Reproducido en perf harness (`place_change_defect.landed = {hero:true, headline:null}`). | PERF9, journey UX |
| I-4 | **`NO_RESULTS` inalcanzable.** NORA devuelve **HTTP 204** sin body para cero resultados; `r.json()` lanza → se clasifica `NETWORK_ERROR`. Evidencia viva: búsqueda `xqzzk` mostró «No hay conexión con el geocodificador» cuando debía mostrar «No encontramos…». | U3 |
| I-5 | **Excepción no capturada en journey canónico.** `effect_update_depth_exceeded` (Svelte) reproducido en build de producción y en dev al entrar en RESULT con `prefers-reduced-motion` (`pageerror`). | REL1 |
| I-6 | **`probeCampaign` sin timeout ni abort.** La especificación exige timeout 8 s → `SERVICE_ERROR`. Un fetch colgado deja `Cargando la fotografía…` infinito. | U2 |
| I-7 | **Deep link `ortho=` deja `orthoState='UNKNOWN'` para siempre** (`applyUrl` no lanza sondeo) → loader infinito reproducible por URL. | U2 |
| I-8 | **Heurística de clasificación ortofoto frágil:** `blob.size < 800 → NOT_COVERED`. OBSERVED: una imagen WMS en blanco real pesa ~2.419 B (se clasificaría AVAILABLE) y una imagen válida pequeña (<800 B) se clasificaría NOT_COVERED. El criterio del gate exige verificar contenido, no solo tamaño. | REL5/REL7 (estados alcanzados sí; clasificación dudosa) |
| I-9 | **`arg_max(decade, n)` no determinista en empates:** 1.353 celdas con empate de década modal → `cells.geojson` cambia entre regeneraciones idénticas (sha256 distinto, resto de artefactos idénticos). Afecta también al resaltado por década (`decade` prop). | D3 |
| I-10 | **Objetivos táctiles <44 px en móvil:** Zoom in/out (29 px), «Ver la foto» (34 px alto), ✕ (24×22 px), «Cómo lo sabemos» (15 px alto), skip-link (37 px). | A9, U6 |
| I-11 | **Servidor estático sin compresión** (`content-encoding` ausente): incumple DEP4 y contamina las medidas de transferencia del perfil de rendimiento. | DEP4, PERF5/6 |
| I-12 | **Pruebas de mapa dependen de servicios vivos:** fuente de glyphs `demotiles.maplibre.org` + NORA/ortofoto en los journeys. VR4 exige fixture local. | VR4 |
| I-13 | **`showNearest`/`chooseAlt` sin guarda de obsolescencia:** una respuesta tardía puede fijar `orthoState`/`orthoAlternatives` del lugar anterior si el usuario cambia de sitio durante el sondeo (race). | REL7/UX (latente) |
| I-14 | **`NO_RESULTS`/`OUT_OF_SCOPE` copy de RESULTS diverge de la lista cerrada:** implementado `{n} resultado(s) · {m} municipios de Bizkaia`; congelado `{n} resultado(s) en NORA · {m} con datos disponibles`. | C6 (nota) |

### MINOR

| # | Hallazgo |
|---|---|
| m-1 | Literales fuera del diccionario: `>OK<`, `aria-label="Ortofoto"`, fallback `'otra campaña'` en OrthoControls, `aria-label="✕"`. El test copylint no los detecta (umbral ≥3 letras; atributos). → C1 |
| m-2 | `building.invalid` existe en el diccionario pero INVALID se muestra con copy de `suspicious` («año anómalo»); `building.repaired` nunca se usa. |
| m-3 | `applyUrl` acepta lat/lon/z arbitrarios sin validación de rango (no rompe, pero §state-model exige defaults documentados — se documenta). |
| m-4 | `applyUrl` no cancela/serializa cargas de metrics en navegación rápida atrás/adelante (race latente). |
| m-5 | `combobox` sin `aria-autocomplete="list"`. |
| m-6 | `refreshShares()` se ejecuta en cada `moveend` (proyección por feature, no recálculo de métrica; ver M2 nota). |
| m-7 | `ARCHITECTURE.md` §10 describe rangos de zoom del artefacto (`z8–13`, `z13–16`) que difieren del dominio de visualización §6.2 — ambiguo. |
| m-8 | `verify.ps1` usa `$ErrorActionPreference='Continue'` global (mitigado: propaga fallos, comprobado). |

## 7. Contratos de datos (C-01…C-12, D1–D6)

- Regeneración fresca: 112 municipios · 6.027 celdas · 139.447 edificios · 16 reparaciones · 0 inválidas tras reparación · 0 mismatch de clasificación · año mínimo válido 1700 · snapshot 2026. (OBSERVED)
- `headlineForYear`: `after = c02 − cum(year)`, `share = after/c02` → C-04/C-05 exactos, denominador canónico. (OBSERVED)
- `bucketsForYear`: <1900 + 13 décadas + `sin año` fuera del eje; `none` = unknown+suspicious+invalid, cuota sobre c01. (OBSERVED)
- D5: desglose publicado (`coverage.unknown_note`, banda `sin año utilizable`). (OBSERVED)
- **D3 FAIL**: `cells.geojson` no reproducible bit a bit (empates `arg_max`, 1.353 celdas). Municipios y métricas sí reproducibles (solo difiere `generated_at_utc`). (OBSERVED+DERIVED)
- D4: el frontend solo proyecta agregados canónicos; la cuota por celda divide `ys` serializado canónico (denominador `known` recomputado por celda — equivalente por construcción; no existe el test que prohíbe división de denominadores, nota). PASS con nota.
- D6: `geometry-repairs.json` registra 16 reparaciones; 0 inválidas sin registro. PASS.

## 8. Product journey

INTRO (año+lugar, un CTA, sin cuenta/geoloc) → RESULT (titular+denominador+cobertura sin scroll, mapa, distribución, ortofoto opt-in, compartir) → `/como-lo-sabemos`. Solo 2 rutas en build. **Defecto:** cambiar de lugar desde RESULT rebota a INTRO (I-3).

## 9. Mapas

Worker MapLibre verificado (§F). Niveles: solapes M1 documentados (I-1). Leyenda por nivel correcta. Hatch `noyear` presente. `UNKNOWN/SUSPICIOUS/INVALID` → estilo `noyear`, nunca BEFORE/AFTER (expresión verificada). Estado real `pmtilesError` controlado.

## 10. Distribución temporal

14 barras temporales + 1 `sin año` = 15 categorías; ticks exactos; marcador `TU AÑO · 1987` continuo; tabla sr; sin scroll horizontal; idéntica en móvil. Disclosure de heaping visible. PASS.

## 11. Ortofoto

- Propuesta: «La foto aérea oficial más próxima a 1987 es de 1990 (a 3 años)» — C-11 corregido (1990, no 1983). ✓
- AVAILABLE real (1990), NOT_COVERED real (1975 en Murueta, con alternativas 1970/1983 verificadas), SERVICE_ERROR forzado con copy + Reintentar. 3/3 alcanzables. ✓
- Opt-in estricto: 0 peticiones orto antes del clic. ✓
- Defectos: sin timeout (I-6), deep-link loader infinito (I-7), heurística de tamaño (I-8), sin guarda anti-race (I-13).

## 12. Búsqueda

7 estados con UI/copy definidos; abort+debounce correctos; fallback local cuando NORA cae. **NO_RESULTS inalcanzable** con el servicio real (I-4). `aria-autocomplete` ausente (m-5).

## 13. Accesibilidad

axe 0 violaciones en 6 estados canónicos (desktop+móvil). Teclado hasta RESULT con foco visible. `aria-live` anuncia cambios. Reduced-motion: journey completo sin animación de cámara. 200 % sin scroll ni cortes. **A9 FAIL**: 6 controles <44 px.

## 14. Rendimiento (medido, perfiles P1/P2 del gate)

Ver `perf-budgets.json`. Resumen por criterio en §21. Mediciones crudas principales:

| Métrica | P1 p75/p95 | P2 p75/p95 | Umbral P1 | Umbral P2 |
|---|---|---|---|---|
| t_hero_interactive | 65/67 ms | 2080/2091 ms | ≤900/1500 | ≤2000/3200 |
| t_result_ready | 324/381 ms | 11599/11628 ms | ≤1600/2400 | ≤3500/5000 |
| t_result_ready_buildings | 300/363 ms | 12319/12373 ms | ≤2400/3200 | ≤5000/7000 |
| t_year_change | 140/196 ms | 136/168 ms | p95≤120 | p95≤300 |
| t_place_change | no completable (I-3) | no completable | p95≤1800 | p95≤3500 |
| t_ortho_visible | 239/483 ms | 1749/1759 ms | p75≤1500 | p75≤3000 |
| transfer_hero | 181 KB | 181 KB | ≤420 | ≤420 |
| transfer_result | 2209 KB* | 2030 KB* | ≤620 | ≤620 |
| transfer_result_buildings | 2163 KB* | 2163 KB* | ≤1100 | ≤1100 |
| heap_after_journey | máx 62 MB | máx 27 MB | ≤60 | ≤40 |
| build_js_raw | 1.260.421 B | — | ≤1.800.000 | — |

\* medido **sin compresión** (harness no conforme, ver §4). Con gzip estimado ~25-30 % → transfer_result ~550-600 KB quedaría dentro; se adjudica sobre lo medido.

## 15. Fiabilidad

`pageerror` no nulo (I-5). Console errors: todos inducidos por las pruebas de fallo o el 404 whitelisting de NOT_COVERED. PMTiles down → error controlado + headline/dist vivos. NORA down → copy + fallback local. First-party: 0 fallos.

## 16. Deployment / Range

206 + `Content-Range` + `Accept-Ranges: bytes` + `application/octet-stream` + teselas renderizadas desde el host. Sin compresión (DEP4). DEP6 no medible en local → BLOCKED.

## 17. Regresión visual

VR1: 6 estados × 2 ejecuciones, máscara = canvas del mapa → **diff 0 %** en los 6 (≤0,1 %). VR2: política de máscara aplicada. VR3: aserciones estructurales (capas, conteos por nivel, leyenda). **VR4 FAIL**: dependencias vivas (glyphs demotiles, NORA).

## 18. Provenance

Manifiestos por fuente con licencia + `retrieved_at`; `sha256` por ZIP en `evidence/g0/00-manifest/source-manifest-g0.json` (112/112) y hashes frescos de artefactos en `evidence/g1/08-adjudication/fresh-hashes/`. Nota: `data/manifests/*.yaml` llevan `sha256: null` (pendiente de rellenar con los valores ya registrados). Atribución y snapshot visibles en UI. OSS_REUSE cubre las dependencias nuevas (maplibre, pmtiles, tippecanoe, swipe, svelte); ADR-010 documenta la decisión del worker. Evidence-set ligado a `b891a14` ≡ `5b80240` (§3).

## 19. HR1 — Identidad editorial y jerarquía

**PENDIENTE DE DECISIÓN HUMANA** (HUMAN_JUDGMENT). Pack listo: `hr1-01…06` (hero/result/building desktop, hero/result/detail mobile) en `evidence/g1/08-adjudication/`. No auto-adjudicado.

## 20. HR2 — Claridad del copy

**PENDIENTE DE DECISIÓN HUMANA**. Hoja de copy completa = `src/lib/i18n/es.ts` (todas las claves renderizadas por estado, verificadas en vivo en adjudication.json: hero, resultado, cobertura, distribución, heaping, edificio, ortofoto 4 estados, búsqueda 7 estados, compartir, errores, metodología).

## 21. Tabla exhaustiva del gate

| ID | Criterio (texto congelado, abreviado) | Evidencia | Estado | Notas |
|----|----|----|----|----|
| P1 | Una sola experiencia `/` + `/como-lo-sabemos` | build lista solo `index.html` + `como-lo-sabemos.html` | PASS | OBSERVED |
| P2 | Hero año+lugar sin cuenta/fecha/geoloc, 1 CTA | captura hero + DOM | PASS | OBSERVED |
| P3 | Titular+denominador+cobertura sin scroll 1440×900 y 390×844 | bottom 319/389 ≤ viewport | PASS | OBSERVED |
| P4 | Una sola viz temporal, 15 buckets, idéntica desktop/móvil | 14+1, ticks exactos, srTable | PASS | OBSERVED |
| P5 | 0 peticiones orto antes de acción | `p5_ortho_requests_before_click: 0` | PASS | OBSERVED |
| P6 | Sin features de no-objetivos | inspección rutas/deps/UI | PASS | DERIVED |
| D1 | 112 municipios + Usansolo documentado | conteo artefactos + G0 recon | PASS | OBSERVED |
| D2 | C-01…C-12 sin cambios de denominador | pytest 28/28 | PASS | OBSERVED |
| D3 | Agregados deterministas (2 regeneraciones, sha256) | `cells.geojson` difiere (arg_max empates, 1353 celdas) | **FAIL** | OBSERVED — I-9 |
| D4 | Sin recálculo de métricas en frontend | inspección + proyección canónica | PASS | OBSERVED; nota: no existe test anti-división; denominador de celda recomputado desde `ys` canónico |
| D5 | NO_YEAR fuera de num/den, desglose publicado | buckets + coverage note | PASS | OBSERVED |
| D6 | 0 geometrías inválidas sin reparación registrada | 16 repairs, 0 inválidas | PASS | OBSERVED |
| M1 | Dominio de zoom literal §6.2, función total, sin solapes/huecos | 8 valores con solape + fundido 13,5–14,2 | **FAIL** | OBSERVED — I-1 |
| M2 | Zoom no recalcula métricas (contador=0) | 0 fetches de métricas en 10 zooms; titular idéntico | PASS | OBSERVED; nota m-6 (repintado por feature ≠ recálculo de métrica) |
| M3 | UNKNOWN/SUSPICIOUS/INVALID sin estilo BEFORE/AFTER | expresión + capa noyear | PASS | OBSERVED |
| M4 | NO_YEAR distinguible sin color | imagen hatch + capa pattern | PASS | OBSERVED |
| M5 | Leyenda refleja capas por nivel | 3 niveles, textos correctos | PASS | OBSERVED |
| M6 | SMALL_DENOMINATOR no altera relleno; solo contorno y tooltip | color idéntico por construcción; **tooltip de celda ausente** | **FAIL** | OBSERVED — I-2 |
| U1 | Journey canónico solo teclado | teclado hasta RESULT, foco visible | PASS | OBSERVED (ortofoto/share: botones nativos, DERIVED) |
| U2 | Todo estado tiene salida; 0 loaders infinitos | sondeo orto sin timeout; deep-link `ortho=` → UNKNOWN eterno; boot loader sin timeout | **FAIL** | OBSERVED — I-6/I-7 |
| U3 | 7 estados de búsqueda con UI y copy | NO_RESULTS inalcanzable (NORA 204→NETWORK_ERROR) | **FAIL** | OBSERVED — I-4 |
| U4 | Titular no cambia de universo al hacer zoom | 5 lecturas idénticas | PASS | OBSERVED |
| U5 | Recarga y atrás/adelante reproducen resultado | reload ok; back/forward coherente | PASS | OBSERVED |
| U6 | Móvil: sin panel fijo, hoja operable, targets ≥44px | 6 controles <44 px | **FAIL** | OBSERVED — I-10 |
| C1 | 100 % copy en diccionario, 0 literales | `>OK<`, `aria-label="Ortofoto"`, `'otra campaña'`, `aria-label="✕"` | **FAIL** | OBSERVED — m-1 |
| C2 | Toda cifra con denominador adyacente | «de cada 100», dist.denominator, cobertura | PASS | OBSERVED |
| C3 | 0 frases prohibidas en UI/comentarios | copylint verde | PASS | OBSERVED |
| C4 | Disclosure de heaping junto a la distribución | `dist.heaping` renderizado | PASS | OBSERVED |
| C5 | NOT_COVERED ≠ SERVICE_ERROR, copy distinto | dos copies distintos, observados | PASS | OBSERVED |
| C6 | Estados vacíos/error con copy real de la lista | error.pmtiles/metrics/generic reales | PASS | OBSERVED; nota: `search.results` diverge de la lista congelada (I-14) |
| PERF1 | transfer_hero ≤420 KB | 181 KB | PASS | OBSERVED |
| PERF2 | t_hero_interactive p75≤900/2000 · p95≤1500/3200 | P1 65/67 ✓ · P2 2080/2091 ✗ (p75>2000) | **FAIL** | OBSERVED |
| PERF3 | build_js_raw ≤1.800.000 B | 1.260.421 B | PASS | OBSERVED |
| PERF4 | t_result_ready p75/p95 | P1 324/381 ✓ · P2 11599/11628 ✗ | **FAIL** | OBSERVED |
| PERF5 | transfer_result ≤620 KB | 2209/2030 KB sin compresión | **FAIL** | OBSERVED — I-11 (con gzip estimado dentro; medido fuera) |
| PERF6 | transfer_result_buildings ≤1100 KB | 2163 KB | **FAIL** | OBSERVED — I-11 |
| PERF7 | t_result_ready_buildings | P1 300/363 ✓ · P2 12319/12373 ✗ | **FAIL** | OBSERVED |
| PERF8 | t_year_change p95 ≤120/300 | P1 196 ✗ · P2 168 ✓ | **FAIL** | OBSERVED |
| PERF9 | t_place_change p95 ≤1800/3500 | interacción no completable vía UI (formulario se desmonta) | **FAIL** | OBSERVED — I-3 |
| PERF10 | t_ortho_visible p75 ≤1500/3000 | 239 ✓ / 1749 ✓ | PASS | OBSERVED |
| PERF11 | heap ≤60/40 MB | P1 máx 62 ✗ · P2 máx 27 ✓ | **FAIL** | OBSERVED (límite por 2 MB) |
| A1 | axe 0 violaciones en 6 estados | [] ×6 | PASS | OBSERVED |
| A2 | Contraste ≥4,5:1 / 3:1 | axe color-contrast limpio | PASS | OBSERVED |
| A3 | Journey teclado completo, foco visible | trail + outlines 2 px | PASS | OBSERVED |
| A4 | Alternativa textual mapa + resumen distribución | aria-label canvas + srTable + aria-live | PASS | OBSERVED |
| A5 | prefers-reduced-motion equivalente | mapMoving false, journey ok | PASS | OBSERVED (ver REL1) |
| A6 | aria-live anuncia cambios | 3 anuncios en cambio de año | PASS | OBSERVED |
| A7 | combobox APG (flechas, Esc) | role/expanded/controls/activedescendant ok | PASS | OBSERVED; m-5 nota |
| A8 | 200 % sin pérdida | sin hscroll, sin cortes | PASS | OBSERVED |
| A9 | Targets ≥44 px 100 % | 6 < 44 px | **FAIL** | OBSERVED — I-10 |
| REL1 | 0 excepciones no capturadas | `effect_update_depth_exceeded` (pageerror) | **FAIL** | OBSERVED — I-5 |
| REL2 | 0 console.error fuera de whitelist | solo inducidos + 404 NOT_COVERED | PASS | OBSERVED |
| REL3 | Fallo PMTiles → error controlado | maperror + headline/dist vivos | PASS | OBSERVED |
| REL4 | Fallo NORA recuperable | NETWORK_ERROR + fallback local | PASS | OBSERVED |
| REL5 | AVAILABLE/NOT_COVERED/SERVICE_ERROR alcanzables | 3/3 | PASS | OBSERVED; nota I-8 (clasificación por tamaño frágil) |
| REL6 | 0 fallos first-party en journey | `fpFailures: 0` | PASS | OBSERVED |
| REL7 | Disponibilidad orto medida aparte; NOT_COVERED ≠ fallo | caracterización registrada | PASS | OBSERVED; nota I-13 (race latente) |
| REL8 | Smoke externo no ejecutable → BLOCKED | el smoke sí se ejecutó | PASS | OBSERVED (regla no disparada) |
| DEP1 | Range → 206 + Content-Range | 206 `bytes 0-99/2919560` | PASS | OBSERVED |
| DEP2 | Accept-Ranges: bytes | presente | PASS | OBSERVED |
| DEP3 | MIME .pmtiles | `application/octet-stream` | PASS | OBSERVED |
| DEP4 | Compresión JS/CSS (br/zstd/gzip) | `content-encoding: null` | **FAIL** | OBSERVED — I-11 |
| DEP5 | Lectura real PMTiles desde host | teselas renderizadas (1606 features z15) | PASS | OBSERVED |
| DEP6 | HTTPS + CSP en host candidato | no medible en localhost | **BLOCKED** | requiere despliegue real |
| VR1 | 6 estados × 2 viewports, diff ≤0,1 % | diff 0 % en los 6 | PASS | OBSERVED |
| VR2 | Máscara: canvas + tiles remotos | máscara aplicada | PASS | OBSERVED |
| VR3 | Aserciones estructurales de mapa | capas/conteos/leyenda verificadas | PASS | OBSERVED |
| VR4 | Fixture local, sin servicios vivos | glyphs demotiles + NORA vivos en tests | **FAIL** | OBSERVED — I-12 |
| PROV1 | Manifests: licencia + retrieved_at + sha256 | hashes en manifest g0 + fresh-hashes; `sha256:null` en yamls | PASS | OBSERVED — nota de consistencia |
| PROV2 | Atribución visible Open Data/geoEuskadi | footer + línea de ortofoto | PASS | OBSERVED |
| PROV3 | Snapshot visible en Cómo lo sabemos | sección presente | PASS | OBSERVED |
| PROV4 | Deps nuevas con licencia+ADR | OSS_REUSE + ADR-010 | PASS | OBSERVED |
| HR1 | Identidad editorial (humano) | pack 6 capturas listo | **BLOCKED** | HUMAN_JUDGMENT pendiente |
| HR2 | Claridad del copy (humano) | hoja de copy completa | **BLOCKED** | HUMAN_JUDGMENT pendiente |

### Recuento

| | Binarios (72) | Humanas (2) |
|---|---|---|
| PASS | **52** | — |
| FAIL | **19** | — |
| BLOCKED | **1** (DEP6) | **2** (HR1, HR2) |

## 22. Veredicto

**`G1_FAIL`**

Mecánico desde la tabla: 19 criterios binarios en FAIL (D3, M1, M6, U2, U3, U6, C1, PERF2, PERF4, PERF5, PERF6, PERF7, PERF8, PERF9, PERF11, A9, REL1, DEP4, VR4). Independiente del estado de HR1/HR2.

## 23. Cuestiones no resueltas

1. HR1/HR2 pendientes de revisión humana (pack preparado).
2. DEP6 requiere despliegue en host candidato real (HTTPS+CSP).
3. Origen exacto del `effect_update_depth_exceeded` por localizar en remediación (cadena moveend→app.view→efecto de sync URL; reproducible).
4. Estimar de nuevo PERF5/6 con compresión habilitada en el servidor.
5. `search.results`/`building.invalid`/`building.repaired`: alinear copy con la lista congelada o enmendar la lista vía proceso preregistrado.

---

_Generado en adjudicación. Ningún fix aplicado al candidato durante esta corrida._
