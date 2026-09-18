# G3-B — Reporte: planeamiento + contexto de actividad económica

Rama: `g3b-planning-context` (baseline G3-A `3f3a1bb`).
Gate preregistrado: `docs/gates/G3-B.md` (commit `b8764a9`).
Snapshot de fuentes: `planning_20260918` (commit `37d67eb` + PDF de
atributos registrado en manifest).
Veredicto: **G3-B PASS** — GB1…GB12 cumplidas.

---

## A. Push verification `g3a-personal-depth`

`git push -u origin g3a-personal-depth` → rama en `origin` (verificado con
`git ls-remote`). G3 encadenado en ramas; `main` no se toca.

## B. G3-B gate SHA

`b8764a9 docs(g3b): preregistrar gate G3-B — planeamiento + contexto AE
(contratos congelados)`.

## C. Planning snapshot manifest

`data/snapshots/planning_20260918/manifest.json` — 20 recursos:

- `_gpkg_source`: GPKG INSPIRE oficial (zip_sha256 `175add8d…`), fuente
  estática para las capas grandes (WFS inabordable: `No_urbanizable`
  41.415 features, hits ~207 s).
- CSV `datos-globales-planeamiento-2023-2026.csv` (vigente, 1129 filas,
  ejercicios 2023–2026) + serie histórica 2019–2022.
- 14 capas extraídas del GPKG (4 clasificación + 5 usos globales + 6
  ámbitos de desarrollo; las 26 calificaciones pormenorizadas quedan
  fuera por decisión de producto).
- `espacios_ae`: WFS `JardueraEkonomikoak_…_Espacios_Actividades_Económicas`
  (418 polígonos, `IdPoligonoEmpresarial`, `NombrePoligonoEmpresarial`,
  `Shape.STArea__` m²). Puntos de empresa: fuera de scope.
- `CD_…_DescripcionAtributos_v1.5.pdf`: documento oficial de atributos
  (sha256 `86006afc…`), base semántica de P-07/P-08.
- Todos: `retrieved_at`, `sha256`, CRS `EPSG:25830`, licencia `CC-BY-4.0`,
  atribución Diputación Foral de Bizkaia.

## D. Contratos de métricas de planeamiento

`docs/DATA_SEMANTICS.md` §17 — P-01…P-09: campo oficial, unidad, universo
(SUB+SUZ(+NR) explícito), fecha de referencia (fecha de extracción oficial
por municipio), semántica de ausente (`METRIC_MISSING`, nunca 0), regla de
agregación, publicador, limitaciones. P-09 congela el denominador:
`100 · area(candidato ∩ espacio) / area(candidato)`, EPSG:25830.

## E. Copy contract planeamiento ≠ futuro

`docs/gates/G3-B.md` §3 + `docs/UX_COPY.md` §25.4. Copylint cubre las
claves `planning.*` (0 violaciones). La sección municipal muestra el
disclosure «planeamiento no es predicción» en todo caso.

## F. Resumen municipal implementado

`PlanningContext.svelte` en `ResultView` (progressive disclosure, bloque
editorial único — sin tarjetas). Evidencia navegador (Chromium, Bilbao):

> «A fecha de 2026-08-04, el planeamiento vigente registra en Bilbao:
> 13.949 viviendas pendientes de ejecución · 80,5 ha de suelo residencial
> vacante · 10,1 ha de suelo de actividad económica vacante»

Solo campos con semántica defendible (P-03/P-05/P-06); ausente ⇒ se omite
(verificado `no_fake_zero`).

## G. Matriz de identidad/solape local (PIP)

Estados implementados (`planning.ts`, `resolveFacets`):

| Estado | Semántica | Evidencia |
|--------|-----------|-----------|
| `inside` | clasif + usos + ≤1 ámbito + AE | Gran Vía 1: «suelo urbano · residencial» |
| `inside`+ámbito | nombre oficial + tipo | `20-1202-6001-1-2`: «UR.03.3 (Artasamina 18)» |
| `multiple_ambito` | todos los solapes listados | test dominio (`b-multi`) |
| `outside` | sin facet alguno | test dominio (`b-outside`) |
| `not_covered` | building_id sin facet | test dominio |
| `unavailable` | fichero municipal inaccesible | test dominio + fail-closed navegador |

Bug real encontrado y corregido: `tree_query` devolvía índices del
subconjunto candidato, no de la lista fuente → referencias ámbito/AE
mal etiquetadas (facets apuntaban a índices inexistentes o incorrectos).
Fix: `tree_query` devuelve pares `(idx, geom)`; tras el rebuild, **0
referencias rotas en los 112 ficheros municipales** (validación cruzada
completa).

## H. Contrato fuente AE

Snapshot WFS `espacios_ae.geojson` (418 polígonos, sha256 en manifest).
Atributos expuestos: `IdPoligonoEmpresarial`, `NombrePoligonoEmpresarial`,
`Shape.STArea__`. Sin inferencias (empleador, historia, causalidad,
contaminación).

## I. Contexto AE genérico implementado

Facet `ae` por `building_id` (share de huella ≥1 %). Copy: «Se solapa con
el espacio que el inventario oficial denomina «{nombre}».» Ejemplo real
Bilbao: edificio `20-1809-1003-1-11` → «POLÍGONO INDUSTRIAL EZQUERRIBAI»
(índice correcto tras el fix de §G).

## J. Matriz de solape — 5 casos editoriales

`evidence/g3/g3b/overlap_cases.json`, reproducido sobre el snapshot
(discovery confirmado, no asumido):

| Caso | Municipio | Cobertura AE | Principal |
|------|-----------|--------------|-----------|
| c2803 | Portugalete | **20,31 %** (15 espacios) | Área Terciaria Ibarzaharra 5,35 % |
| f4036 | Mungia | **0 %** (negativo) | — |
| f4233 | Muskiz | **98,07 %** | Polígono Industrial Petronor |
| f4738 | Santurtzi | **23,68 %** | Puerto de Bilbao |
| f149 | Abanto-Zierbena | **0 %** (negativo) | — |

## K. Enriquecimiento factual por caso

Mismo artefacto §J: por caso, miembros, área analizada, hits con
`IdPoligonoEmpresarial` oficial + solape m²/%. Los negativos (f4036,
f149) quedan registrados como dato explícito. La prosa editorial final
queda fuera de scope (STOP del gate).

## L. Matriz tamaño/rendimiento (demand-driven, ADR-014)

| Asset | Cuándo | Raw | gzip | Latencia 1º | Repetición |
|-------|--------|-----|------|-------------|------------|
| `planning-muni.json` | al entrar en RESULT | 16,7 KB | 3,8 KB | 2 ms | 1 ms |
| `planning/020.json` (peor caso: Bilbao, 13.750 bldg) | al resolver edificio | 630 KB | 52 KB | 681 ms | 2 ms |
| `planning-geom/020.json` | solo al activar «Ver los ámbitos» | 546 KB | 194 KB | 727 ms | 3 ms |

- 112 ficheros de facetas: **6,5 MB** totales (vs ~786 MB de snapshot crudo
  y ~13–70 MB/municipio si se sirviera GeoJSON de clasificación).
- Heap delta medido tras las 3 cargas: ~0 MB.
- Comparativa que motivó la decisión: `clasif_no_urbanizable` solo = 364 MB
  GeoJSON; WFS `resultType=hits` ~207 s. Descartado servir geometría global.

## M. Matriz de accesibilidad

| Check | Resultado |
|-------|-----------|
| Equivalente textual | toda la info local es texto; el resalte de mapa es opt-in y nunca único canal |
| axe (sección completa + disclosure abierta) | **0 violaciones** |
| 320 px | sin overflow horizontal; `.plan` sin elementos >320 px |
| Target táctil toggle | 44 px medidos |
| Teclado | toggle focuseable, opera con Enter (verificado) |
| 400 % | layout de lista vertical, sin columnas fijas (mismo patrón que el resto del panel) |
| Reduced-motion | la sección no introduce animación |

## N. Matriz de no-regresión

| Suite | Resultado |
|-------|-----------|
| G3-A flow (Chromium/Firefox/WebKit) | PASS ×3, 0 errores consola, `building_restored` OK |
| G2-A play | 20/20 PASS |
| G2-B views | all PASS |
| G1 perf gate (P1+P2) | dentro de presupuesto — P2 `t_ortho_visible` p75 = 1084 ms ≤ 3000 |
| `npm run check` | 0 errores / 0 avisos |
| `npm run lint` | limpio |
| `npm run format` | aplicado |
| `npm run test` | 100/100 vitest + 15/15 static-server |
| `npm run build` | OK |

## O. Screenshots

`evidence/g3/g3b/browser/`:
- `g3b-planning-chromium.png` — sección municipal + contexto local (Gran Vía 1)
- `g3b-ambito-chromium.png` — ámbito oficial + visual opt-in
- `g3b-mobile-320.png` — 320 px

## P. Veredicto G3-B

**PASS — GB1…GB12 cumplidas.**

| GB | Estado |
|----|--------|
| GB1 snapshot manifest | PASS (20 recursos, sha256, licencia, CRS) |
| GB2 contratos P-01..P-09 | PASS (§17 DATA_SEMANTICS) |
| GB3 copy planeamiento≠futuro | PASS (copylint + revisión) |
| GB4 resumen municipal | PASS (solo campos defendibles, fecha visible) |
| GB5 estados PIP | PASS (5 estados; MULTIPLE listado, nunca colapsado) |
| GB6 contexto AE | PASS (denominador P-09, sin copy causal) |
| GB7 solape 5 casos | PASS (reproducido: 20,31/0/98,07/23,68/0) |
| GB8 demand-driven | PASS (matriz §L; máx 52 KB gzip por request de facetas) |
| GB9 a11y | PASS (axe 0, 320 px, teclado, equivalente textual) |
| GB10 fallo explícito | PASS (unavailable + usable; nunca 0 por ausente) |
| GB11 no-regresión | PASS (G3-A ×3 motores, G2-A, G2-B, G1 perf) |
| GB12 toolchain | PASS (check/lint/format/test/build) |

Pendientes humanos heredados (no bloquean el gate): NVDA y móvil físico
(`PENDING_HUMAN`, pre-submit).

## Q. Scope restante de G3

- **G3-C**: mapa topográfico 1923–25 (profundidad temporal visual:
  mapa histórico → primeras ortofotos → stock actual). STOP respetado.
- Deltas de snapshot públicos: fuera hasta nueva fase.
- Prosa editorial final de las 5 historias: después de G3-C; ya disponen
  de enriquecimiento factual AE (§J/K).
- Gap documentado: Usansolo (entidad de planeamiento cod 916) sin
  edificios en el corpus catastral — gap de cobertura G1, no error G3-B.
