# SOURCE_MATRIX — G6 «¿Cuánto ha cambiado tu Bizkaia?»

> Generado: 2026-09-20 · Generador: `pipeline/g6_source_discovery.py`
> Artefacto machine-readable: `evidence/g6/source-discovery/source-matrix.json`
> Evidencia cruda: `evidence/g6/source-discovery/raw/` (283 `package_show` +
> `geoeuskadi-wms-capabilities.xml`), `searches.json` (12 consultas prerregistradas).
> Este documento **consolida**, no sustituye, `docs/DATA_SOURCES.md` (P0,
> verificado 2026-09-16) ni los manifests `data/manifests/*.yaml`.

Leyenda de estado: `VERIFIED` = probado con contenido real · `PROBED` = endpoint
responde con contenido en la sonda G6 · `CATALOGUED` = metadata CKAN leída,
contenido sin sondear · `REJECTED`/`DEFERRED` = decisión documentada.

## 1. Ortofotos — serie temporal completa descubierta

### 1a. Open Data Bizkaia (fuente primaria, tiles cacheados EPSG:3857)

`package_search q=ortoimagenes` → 10 datasets, todos `bfa-dfb`, CC BY 4.0,
`metadata_modified` 2026-02-13. La serie publicada es **exactamente**
1956 · 1965 · 1970 · 1975 · 1983 · 1990 · 1995 · 1999 · 2002 + Urdaibai 2023
(0,07 m, cobertura parcial — no serie). **No hay más años publicados.**

| Año nominal | Vuelo real (ficha ODB, §2.4 DATA_SOURCES) | Tiles | WMTS |
|---|---|---|---|
| 1956 | fecha sin determinar entre 1953–1955 (vuelo para Catastro; NO el vuelo americano) | VERIFIED | VERIFIED |
| 1965 | 3 vuelos parciales 1963 y 1965 | VERIFIED | VERIFIED |
| 1970 | no detallado en ficha | VERIFIED | VERIFIED |
| 1975 | mayo 1975 | VERIFIED | VERIFIED |
| 1983 | junio 1983 | VERIFIED | VERIFIED |
| 1990 | mayo 1990 | VERIFIED | VERIFIED |
| 1995 | junio 1995 | VERIFIED | VERIFIED |
| 1999 | junio 1999 | VERIFIED | VERIFIED |
| 2002 | marzo 2002 | VERIFIED | VERIFIED |

### 1b. geoEuskadi WMS — serie completa con contenido verificado en Bizkaia

GetCapabilities 2026-09-20 (`geoeuskadi-wms-capabilities.xml`, sha256-16 en
matriz): **61 capas ORTO_***. Sonda de contenido en Leioa + Karrantza + Bakio
(`probe-geoeuskadi-epochs.json`, `probe-geoeuskadi-rural.json`): todas las
capas probadas devuelven imagen real (>95 colores únicos a 64px), sin errores
XML. CORS `*`, licencia CC BY 4.0.

Capas con cobertura real verificada en Bizkaia (excluye `_IrRG`, `_URBANA_*`,
`_COSTA`, `ORTO_1958_ARABA` que es Álava):

`ORTO_1945_46_AMERICANO` · `ORTO_1956_57_AMERICANO` · `ORTO_INTERMINISTERIAL_1977_78`
· `ORTO_1984_85` · `ORTO_1989` · `ORTO_1991` · `ORTO_1995` · `ORTO_2001` ·
`ORTO_2002` · `ORTO_2004`…`ORTO_2025` (anual).

**Regla de selección para la línea temporal** (determinista, §G6-B):
años con servicio Bizkaia → fuente Bizkaia (primaria, tiles cacheados);
huecos y 2004+ → geoEuskadi WMS. Los nombres multi-año (`1945_46`, `1977_78`,
`1984_85`, `1956_57_AMERICANO`) se conservan literales: el año nominal no es
la fecha del vuelo.

## 2. Cartografía histórica 1923–1925

| Campo | Valor |
|---|---|
| dataset | `hojas-de-la-cartografia-historica-1-25-000-1923-1925-toponimicas-y-topograficas` |
| servicio usable | WMTS `ORTO_EJ_CARTO_1925` + WMS/WFS INSPIRE (VERIFIED P0) |
| JPG descargables | no georreferenciados → no se usan |
| estado | **VERIFIED**, ya integrado como modo `hist` (G3-C) |
| toponímica | solo como imagen rasterizada del servicio: no hay WFS de nombres → G6-L se limita a visualización (sin OCR ni entity matching) |

## 3. Cartografía 1:500 (G6-J, gate D)

| Campo | Valor |
|---|---|
| dataset | `cartografia-1-500-de-areas-urbanas-de-bizkaia` |
| recursos | WMTS `ORTOARGAZKIAK/CARTO_500` + ZIP (`opengis.bizkaia.eus`) |
| WMTS | una sola capa `ORTOARGAZKIAK_CARTO_500`, `image/png`, TileMatrixSet `default028mm` en **EPSG:25830** (no GoogleMapsCompatible); `/MapServer/tile/{z}/{y}/{x}` → 404 |
| frecuencia | `not_planned` · sin `temporal_coverage` |
| cobertura | `spatial` MultiPolygon de áreas urbanas (parcial por definición) |
| **veredicto** | **DEFERRED (gate D)**: el servicio es un único compuesto actual; la serie por hojas exigiría auditar el ZIP completo. Sin evidencia temporal por hoja accesible por servicio → no se construye «detalle histórico» |

## 4. Población y vivienda — Eustat PXWeb

`GET https://www.eustat.eus/bankupx/api/v1/es/DB` → 2 326 tablas
(2026-09-20). ODB **no** tiene serie demográfica/vivienda municipal
(`q=poblacion|padron|vivienda` → 0 datasets).

| tabla | contenido | periodos | dimensión | estado |
|---|---|---|---|---|
| `PX_010152_cepv1_ep31.px` | Población **de hecho** por censo | 1900…2001 (14 obs) | 112 municipios 48xxx | VERIFIED (G3-D study + snapshot G5) |
| `PX_010154_cepv1_ep06b.px` | Población por ámbitos (padrón/EMH) | 2001–2025 anual, refs `0101`/`0701` | 113 ámbitos | VERIFIED; G6 lo incorpora completo |
| `PX_010152_cepv1_v02a.px` | Viviendas por ámbitos y tipo | **1991, 1996, 2001, 2006, 2011, 2016, 2021** | 112 municipios | PROBED (metadatos) — adoptada para G6-G |

Semántica congelada (STUDY-eustat-population.md): `ep31` es población **de
hecho**; `ep06b` mezcla referencias `0101`/`0701` — cada observación lleva su
fecha literal; `v02a` es familia censal — solo se compara dentro de la misma
operación. Licencia: redifusión con atribución «Fuente: Sitio web de Eustat:
www.eustat.eus» (aviso legal auditado en G5, `context-source-audit`).

## 5. Planeamiento urbanístico (G6-K)

| Campo | Valor |
|---|---|
| datasets | `planeamiento-urbanistico` (DFB) + ~110 `planeamiento-urbanistico-<municipio>` |
| recursos DFB | CSV `DatosGlobalesPlaneamiento` + `CalificacionPormenorizada` (2019/2024), WMS, GML, ZIP, ATOM |
| estado | VERIFIED P0; ya usado below-fold como hechos en línea (snapshot `g3b_snapshot_planning.py`) |
| veredicto | datos globales suficientes para hechos; modo mapa «¿Y mañana?» solo si el WMS rinde por municipio — se evalúa en implementación |

## 6. Contratos / presupuestos (G6-M, gate E)

| dataset | contenido observado (muestra real 2025) |
|---|---|
| `contratos-no-menores` | CSV trimestrales DFB: SOCIEDAD · EJERCICIO · ADJUDICATARIA · OBJETO (texto libre) · EXPEDIENTE CONTABLE · METODO ADJUDICACION · ACTUACION · IMPORTE… |
| `contratos-menores` | misma familia, trimestral |
| `plan-anual-de-contratacion-pac-*` | planes anuales por ente |
| `udaldata-*` | información económico-financiera **municipal** (por ayuntamiento) |

**Auditoría de vinculación** (`evidence/g6/contracts/schema.json` +
`sample-contratos-no-menores.csv`): la muestra **no contiene campo de
localización** — ni dirección, ni municipio, ni coordenadas, ni identificador
de inmueble. El objeto es texto libre corporativo («SERVICIO PUBLICIDAD
PROY…»). El único campo territorial sería inferir del texto → fuzzy matching,
prohibido por los criterios congelados de linkage.

**Veredicto gate E: REJECTED para producto.** Investigación documentada; no
se construye la feature. `PublicInterventionEvidence` queda como esquema
propuesto sin datos que lo satisfagan con `linkage_confidence` suficiente.

## 7. Triage del resto del catálogo

`docs/data/DATASET_TRIAGE.md` clasifica los 283 datasets inspeccionados en
INCLUDE / EXPERIMENTAL / DEFER / REJECT con razón de una línea.
