# G3-D — Reporte: Contexto actual condicional

Baseline: G3-C `0d21407`. Rama: `g3d-context-modules`.
Gate: `docs/gates/G3-D.md` (preregistrado en `2668e1a`, ampliado con R/N y
criterios de corpus en `a34af01`, **antes de implementar**).

Alcance público implementado: RUIDO · MOVILIDAD · MONTE PÚBLICO.
Study-only: espacios protegidos (geoEuskadi), demografía temporal (Eustat).
Reservado, no público: GARbigunes, servicios sociales.

## A. Push de g3c

`git ls-remote origin refs/heads/g3c-historical-map` →
`0d21407beeca04a4224f34a1ca50f8be00511166` — el candidato G3-C existe en
remoto antes de abrir la rama G3-D (verificado 2026-09-19).

## B. Gate SHA

`a34af01` — `docs/gates/G3-D.md` completo (301 líneas): alcance público,
estudio/reserva, R=400 m / N=5 congelados, corpus V1–V11 por criterio,
salida A–Q. (`2668e1a` fue la primera versión del mismo gate en la misma
sesión de preregistro.)

## C. Source manifests

| Fuente | Manifest | Decisión |
|--------|----------|----------|
| Mapas de ruido de carreteras forales | `data/manifests/bizkaia.ruido.carreteras.yaml` | ADOPT |
| Rutas y paradas de Bizkaibus | `data/manifests/bizkaia.bizkaibus.paradas.yaml` | ADOPT |
| Montes públicos de Bizkaia | `data/manifests/bizkaia.montes.publicos.yaml` | ADOPT |
| Espacios protegidos (geoEuskadi) | STUDY-geoEuskadi-ENP.md | STUDY |
| Población municipal (Eustat) | STUDY-eustat-population.md | STUDY |

Snapshot congelado `data/snapshots/context_20260919/` (WFS INSPIRE
geo.bizkaia.eus, EPSG:25830, CC BY 4.0): manifest.json con URL de dataset
y servicio, `retrieved_at`, `sha256`, `feature_count`, esquema y notas de
limitación por capa. Geometría cruda excluida del repo vía `.gitignore`
(misma convención G3-B: sha256 en el manifest basta para verificar).

Capas congeladas:

| Capa | Features |
|------|----------|
| `ruido_dia` | 14 |
| `ruido_tarde` | 13 |
| `ruido_noche` | 13 |
| `ruido_receptores` | 49 868 |
| `bizkaibus_paradas` | 2 376 |
| `montes_publicos` | 346 |

## D. Contrato de ruido + cobertura (R-01)

`noise_band(point, period)` — DATA_SEMANTICS §18:

- `LEVEL_1`/`LEVEL_2` = extremos de la banda oficial en dB (verificado
  contra GetFeature real: 55–60, 60–65, 65–70…); `TIPO` = periodo oficial.
- Día/tarde/noche son dimensiones independientes: nunca se agregan ni se
  elige «la peor». `MULTIPLE` conserva todas las bandas solapadas.
- Estados: `mapped` / `not_mapped` / `no_coverage`. `not_mapped` nunca es
  0 dB ni «sin ruido» (copy lo dice explícitamente).
- Receptores (49 868 puntos con dB exacto por periodo): congelados como
  evidencia, **fuera de runtime** — mezclarlos con bandas poligonales
  exigiría un contrato separado.
- Cobertura: 14 507 edificios con ≥1 banda sobre 100 420 con facets
  (112 municipios). El mapa cubre solo carreteras forales — `not_mapped`
  es el estado dominante, como corresponde a la fuente.

## E. Contrato de movilidad (R-02)

Congelado antes de implementar: **R = 400 m**, **N = 5**, distancia en
línea recta proyectada (EPSG:25830), orden ascendente, sin expansión
progresiva de radio. `stop_id` = `CodigoReducidoParada`; nombre =
`Denominacion`; rutas = prefijo de `CodificacionRuta` antes de `_`.

Prohibido y cumplido: sin horarios, frecuencias, duración de viaje ni
tiempo a pie (la fuente no los trae; el copy lo declara).

## F. Validación de movilidad

- Corpus V7 (primer edificio con ≥3 paradas): `1-1012-1001-1-1` (Abadiño)
  → 5 paradas a 15/28/217/218/330 m.
- Corpus V8 (rural sin parada): `75-49-90-1-1` (Orozko) →
  `no_nearby_stop`, texto explícito en pantalla.
- Corpus V1 (Bilbao denso): 5 paradas a 72/86/196/226/298 m — recorte
  a N=5 verificado.
- Overlay de paradas pinta solo las referenciadas: `features=2` en V5
  (corpus) — verificado en navegador.

## G. Contrato de monte público + resultados (R-03)

- PIP sobre 346 montes. Estados: `inside` / `multiple` / `outside` /
  `no_coverage`.
- `multiple` lista todos los solapes, nunca elige uno.
- Fechas con etiqueta oficial literal (deslinde / amojonamiento /
  catalogación); `"null"` de la fuente normalizado a «no consta»/omisión.
- Monte público ≠ espacio protegido: declarado en la propia atribución
  (copylint lo protege como excepción negativa).
- Cobertura: 2 082 edificios dentro de monte; 62/112 municipios sin
  ningún monte referenciado → allí el módulo se **omite** (no tarjeta
  vacía), verificado en Bilbao (V1: 2 módulos, monte ausente).
- Corpus V9: `1-13-10-2-1` (Abadiño) → `inside` «TOKI-ALAI», titular
  «DIPUTACIÓN FORAL DE BIZKAIA». V10: `outside` explícito.

## H. Estudio geoEuskadi (espacios protegidos) — STUDY

`evidence/g3/g3d/STUDY-geoEuskadi-ENP.md` + `probe-geoeuskadi.json`.
Servicio oficial `geo.euskadi.eus` (Gobierno Vasco), capas 5102 ENP (42),
5103 Natura 2000 (55), 5104 instrumentos internacionales (9), 5105 zonas
periféricas (44); campos `SITECODE/SITENAME/PSTYPE/N2000TYPE/INTTYPE`.
Geometría poligonal real, cobertura Euskadi completa.
**Decisión: STUDY** — semántica defendible y fuente oficial, pero la
respuesta «¿está este punto dentro de un espacio protegido?» requiere su
propio contrato de combinación de categorías legales; no se implementa
en G3-D.

## I. Estudio Eustat (demografía temporal) — STUDY

`evidence/g3/g3d/STUDY-eustat-population.md` + `probe-eustat.json`.
API PXStat `eustat.eus/bankupx/api/v1/es/DB`. Tablas verificadas:
`PX_010152_cepv1_ep31` (1900–2001, 275 áreas, incl. 112 municipios de
Bizkaia) y `PX_010154_cepv1_ep06b` (2001–2025 anual, por sexo/grupos de
edad). Serie Bilbao 1900→2001 extraída (102 845→349 972).
**Decisión: STUDY** — la pregunta «¿cómo ha cambiado la población del
municipio mientras cambia el parque registrado?» es defendible, pero
exige contrato de universo (parque actual ≠ historia) y presentación sin
causalidad; no se implementa en G3-D.

## J. Matriz de orquestación (corpus congelado)

`evidence/g3/g3d/corpus.json` — slots resueltos por criterio del gate,
nunca seleccionados a posteriori. `resolveContext` por módulo:

| Slot | Municipio | building_id | RUIDO | MOVILIDAD | MONTE |
|------|-----------|-------------|-------|-----------|-------|
| V1 | Bilbao | 20-1116-2001-1-2 | not_mapped | available (5) | **no_coverage → omitido** |
| V2 | Barakaldo | 13-1007-1001-1-1 | not_mapped | available (1) | outside |
| V3 | Muskiz | 71-1006-1001-1-143 | not_mapped | available (4) | outside |
| V4 | Orozko | 75-1011-1001-1-1 | not_mapped | available (5) | outside |
| V5 | Abadiño | 1-1017-2001-1-1 | **mapped (D+T)** | available (2) | outside |
| V6 | Abadiño | 1-1012-1001-1-1 | not_mapped | available (5) | outside |
| V7 | Abadiño | 1-1012-1001-1-1 | not_mapped | available (5) | outside |
| V8 | Orozko | 75-49-90-1-1 | not_mapped | **no_nearby_stop** | outside |
| V9 | Abadiño | 1-13-10-2-1 | not_mapped | no_nearby_stop | **inside** |
| V10 | Abadiño | 1-1017-2001-1-1 | mapped | available (2) | outside |
| V11-c2803 | Portugalete | 78-1004-1001-1-3 | not_mapped | available (5) | no_coverage |
| V11-f4036 | Mungia | 69-1042-10004-1-5 | not_mapped | no_nearby_stop | no_coverage |
| V11-f4233 | Muskiz | 71-1006-1001-1-143 | not_mapped | available (4) | outside |
| V11-f4738 | Santurtzi | 82-3-510-0-1 | not_mapped | available (2) | outside |
| V11-f149 | Abanto y Ciérvana | 2-5-247-7-6 | mapped (D) | no_nearby_stop | outside |

Todos los estados cubiertos en vivo: mapped / not_mapped / no_coverage ·
available / no_nearby_stop · inside / outside / no_coverage. `multiple`
(ruido y monte) cubierto por tests de dominio (`context.test.ts`).

Independencia verificada: en V1 el monte se omite sin suprimir ruido ni
movilidad; en V9 movilidad es negativo sin suprimir el monte. Ninguna
magnitud combinada en código ni en copy (copylint).

## K. Commits de implementación

- `a34af01` — preregistro del gate (B).
- `feat(g3d)` (este commit) — implementación completa:
  - `pipeline/g3d_snapshot_context.py` — snapshot WFS congelado
    `context_20260919` (6 capas, manifest con sha256).
  - `pipeline/g3d_build_artifacts.py` — facets por `building_id`:
    PIP ruido ×3 periodos, PIP montes, k-NN paradas R=400 m/N=5;
    geometría opt-in 4326 por módulo; QA `data/qa/g3d_context.json`.
  - `pipeline/g3d_corpus.py` — resolución V1–V11 por criterio congelado.
  - `app/src/lib/domain/context.ts` + `context.test.ts` — proyección
    fail-closed por módulo (10 tests).
  - `app/src/lib/components/ContextModules.svelte` — sección condicional
    con preguntas visibles, overlays opt-in, selector de periodo.
  - `app/src/lib/state/app.svelte.ts` — `ensureContextLocal` lazy,
    `setContextOverlay` exclusiva.
  - `app/src/lib/components/PlanningContext.svelte` — exclusividad
    bidireccional con el highlight de planeamiento.
  - `app/src/lib/map/MapView.svelte` — capas `ctx-*` (ruido fill/line,
    paradas circle/label, montes fill/line).
  - `app/src/lib/domain/catalog.ts` — `loadContext` + `loadContextGeom`.
  - `app/src/lib/i18n/es.ts` — keys `context.*` (copy contract §27).
  - `app/src/lib/copylint.test.ts` — términos prohibidos G3-D (GD5).
  - `app/scripts/g3d_context.mjs` — sonda funcional (main/reflow/axe/engines).
  - `app/static/data/context/` (112) + `context-geom/` (274) — artefactos.
  - `data/manifests/` ×3 + `docs/DATA_SEMANTICS.md` §18 +
    `DATA_SOURCES.md` + `PRODUCT.md` + `UX_COPY.md` §27.

## L. Screenshots

`evidence/g3/g3d/browser/`:

- `g3d-v1-bilbao.png` — Bilbao: ruido NOT_MAPPED + 5 paradas + monte
  omitido (2 módulos, no 3).
- `g3d-v5-abadino-overlay.png` — Abadiño: banda oficial día/tarde +
  overlay de paradas activa (excluyente).
- `g3d-v8-sin-parada.png` — Orozko: negativo explícito de movilidad.
- `g3d-v9-monte.png` — dentro de «TOKI-ALAI» con titular.
- `g3d-mobile-320.png` — sección completa a 320 px.
- `g3d-failclosed.png` — fetch de contexto abortado: sin sección, ficha
  intacta.

## M. Matriz de rendimiento (medido)

Contrato de red (sonda `g3d_context.mjs`, `g3d-results.json`):

| Momento | Requests |
|---------|----------|
| `?place=bilbao` sin edificio (+3 s) | **0** a `data/context*`, sección ausente |
| Selección de edificio | **1** → `context/<cod>.json` |
| Antes del opt-in | **0** a `context-geom/` |
| Overlay ruido | **1** → `001-ruido.json` (selector de periodo no re-descarga) |
| Overlay paradas | **1** → `001-paradas.json` (sustituye, una a la vez) |

Bytes por artefacto (`_probe_g3d_perf.mjs`):

| Artefacto | raw | gzip | br |
|-----------|-----|------|----|
| `context/020.json` (Bilbao, máx.) | 754 005 | 140 KB | — |
| `context/005.json` (mín., rural) | 4 200 | 0,8 KB | — |
| `context-geom/020-ruido.json` | 205 429 | 45 058 | 29 081 |
| `context-geom/020-paradas.json` | 23 806 | 3 977 | 3 041 |
| `context-geom/003-ruido.json` (máx.) | 275 503 | 62 042 | 38 684 |

Latencia y heap (fetch en página real, Bilbao):

| Operación | 1ª vez | repetida |
|-----------|--------|----------|
| `context/020.json` | 825 ms | 3 ms |
| `context-geom/020-ruido.json` | 249 ms | 1 ms |
| `context-geom/020-paradas.json` | 47 ms | — |
| Heap delta total | **0 MB** | |

Total del artefacto municipal: 7,41 MB facets (112 mun.) + 4,67 MB geom
(274 ficheros). Ningún dato de módulo se carga antes del depth
contextual; la geometría solo con acción explícita.

## N. Matriz de accesibilidad

| Check | Resultado |
|-------|-----------|
| Pregunta visible antes del dato | h4 por módulo (`context.*.q`) |
| Equivalente textual | todo resultado es texto; la overlay nunca es necesaria |
| Solo color | no hay codificación cromática de estados |
| axe-core | **0 violaciones** (`--axe`, V1 con sección renderizada) |
| Teclado | botones `.geom` focuseables, Enter activa overlay (verificado) |
| `aria-pressed` | overlays y selector de periodo |
| 320 px | sin overflow antes/después de overlay; target 44 px (`--reflow`) |
| 400 % | launch smoke `zoom400` PASS |
| reduced-motion | sin animaciones propias del módulo |
| touch | targets ≥42 px; g2a `mobile_320_touch` PASS |
| Fail-soft | fetch abortado → sección omitida, ficha intacta |

## O. Matriz de regresión

| Suite | Resultado |
|-------|-----------|
| `npm run check` (svelte-check) | 0 errores, 0 warnings |
| `npm run lint` | limpio |
| `npm run test` (vitest + node:test) | 12 ficheros, **112 tests**, 0 fallos |
| `npm run build` | OK, sitio estático escrito |
| `pytest tests/data` | 38 PASS |
| launch smoke (chromium/firefox/webkit) | 3× PASS |
| launch smoke `--reflow` 320 px | PASS |
| launch smoke `--zoom400` | PASS |
| G3-A `g3a_flow.mjs` | PASS ×3 motores |
| G3-B `g3b_planning.mjs` | PASS |
| G3-C `g3c_histmap.mjs` | PASS (red, activación, edificio, fail-closed) |
| G2-A `g2a_play.mjs` | PASS (incl. reduced-motion, touch, teclado) |
| G2-B `g2b_views.mjs` | PASS (incl. axe en las 3 vistas) |
| G1 budgets `g1_gate_perf.mjs` | corrida completa P1+P2 (20 reps); diff vs baseline cometido: p75 dentro de ruido (−121/+7 ms), transfer +3 KB (+0,4 %), heap igual |
| G3-D `g3d_context.mjs` main | PASS (red, estados, exclusividad, cámara, fail-closed) |
| G3-D `--reflow` / `--axe` / `--engines` | PASS / 0 violaciones / 3× PASS |

Sin relajación de umbrales.

## P. Veredicto

**GO** — los tres módulos responden preguntas distintas con evidencia
oficial congelada, los negativos son dato, la orquestación es por módulo
sin magnitud combinada, la geometría es opt-in y exclusiva, y la
regresión completa pasa sin tocar umbrales. Hallazgo registrado: la
versión inicial del builder usó R=500 m; detectado contra el gate
congelado (R=400 m), corregido y regenerado antes de cualquier
validación — el corpus y la evidencia final corresponden a R=400 m.

## Q. Siguiente fase recomendada

Parar de añadir capas de contexto: los tres módulos funcionan y los dos
estudios (protegidos, demografía) quedan listos para una fase propia si
se decide. El cuello de botella ya no son datos sino **organización del
producto**: integrar las cinco historias, «Descúbreme un cambio», ordenar
la experiencia, reducir fricción, acabado visual y presentación del
concurso.
