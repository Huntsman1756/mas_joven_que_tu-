# METHODOLOGY — adquisición, snapshots, QA

## 1. Principio

Toda métrica del producto debe ser **reproducible**. Para cada ejecución se publica:
snapshot de origen, transformación aplicada, informe de QA y fecha del dato.

Separación de estados: `OBSERVED` (fuente) · `DERIVED` (calculado) · `UNKNOWN` ·
`NOT_APPLICABLE`. Nunca se mezclan en el mismo campo sin etiquetar.

## 2. Adquisición

### 2.1 Catastro de edificios

Fuente preferida (una sola descarga contiene edificios + geometría + municipio):

```
https://opengis.bizkaia.eus/Planificacion territorial y catastro/Catastro/Open Data/{COD}_{MUNICIPIO}_{GML|SHP}.zip
```

1. Descubrimiento de municipios vía CKAN:
   `GET https://www.opendatabizkaia.eus/es/api/3/action/package_search?q=parcelario-catastral&rows=200`
2. Para cada dataset, leer `resources[].access_URL` y el campo `licence` del recurso.
3. Descargar el ZIP GML (contiene `Edificio`, `Municipio`, …).
4. Guardar `sha256` del ZIP y la fecha de descarga.

Alternativa `WFS`: `Katastro_Catastro_WFS:Edificios` en `outputFormat=text/xml; subtype=gml/3.2`
(útil para actualizaciones incrementales; no soporta JSON).

`PENDING`: confirmar si el CSV del datastore contiene `Ano_Constr` por edificio o es
agregado por parcela. Si lo contiene, es la vía de ingesta más rápida (menos volumen que GML).

### 2.2 Ortofotos

- Bizkaia 1956–2002: metadatos vía CKAN (`ortoimagenes-{AÑO}`) y **tiles** vía
  `/MapServer/tile/{z}/{y}/{x}`. No se descarga raster por defecto.
- geoEuskadi 2004–2025: WMS `WMS_ORTOARGAZKIAK`. No se descarga raster por defecto.
- `PENDING`: obtener fecha/rango real de vuelo por campaña (Fototeca geoEuskadi / IGN).

## 3. Snapshotting

- `data/raw/` — descargas íntegras, **gitignored**. Conservadas para reproducibilidad local.
- Cada `data/manifests/<source_id>.yaml` registra: URL, `retrieved_at`, `sha256`, licencia,
  atribución y limitaciones.
- El snapshot de datos del producto se identifica con `snapshot_date` (p. ej. `2026-09-03`,
  la fecha `modified` del dataset de Leioa). Se muestra en *Cómo lo sabemos*.

## 4. Normalización

1. Leer el origen con **DuckDB Spatial `ST_Read`**, que lee **SHP y GML sin GDAL CLI**
   (GDAL embebido). Verificado en P0 sobre `054_Edificio.shp` y `054_Edificio.gml`
   (2.390 filas en ambos). El CSV del datastore queda como vía alternativa si se
   desbloquea el WAF (ver §6.2).
2. Derivar `building_id` = concatenación canónica de códigos
   (`Codigo_Mun-Codigo_Pol-Codigo_Par-Codigo_Sub-Codigo_Edi`).
3. Clasificar `Ano_Constr` en los estados `VALID | UNKNOWN | SUSPICIOUS | INVALID`
   (`DATA_SEMANTICS.md` §5). Ningún valor se elimina ni corrige en silencio; toda
   transición se registra con su evidencia.
4. Validar geometría antes de medir: `ST_IsValid`; si es inválida, `ST_MakeValid`
   **conservando original, transformación, motivo y resultado** (tabla
   `geometry_repairs`). Nunca reparar en silencio.
5. Calcular `footprint_area_m2` con `ST_Area(geom)` sobre geometría **válida**
   (`EPSG:25830`). Evidencia P0: incluir la geometría inválida altera el total
   (~135,4 ha con inválida vs ~129,9 ha solo válidas en Leioa).
6. Persistir `buildings.parquet` (GeoParquet, `EPSG:4326` para web) + agregados.

## 5. Agregados

- Por municipio: M-01…M-09 de `DATA_SEMANTICS`.
- Por celda (grid/hex) y por década: M-10 (mapas a zoom bajo).
- Todos los agregados son deterministas y se testean (`tests/data/`).

## 6. QA obligatorio por ejecución

Salida en `data/qa/qa-<municipio>-<fecha>.md/json`:

```
total_buildings, unique_building_ids, duplicated_building_ids,
valid_geometries, invalid_geometries,
known_construction_year, unknown_construction_year, coverage_pct,
min_year, max_year, impossible_future_years, out_of_range_years,
year_distribution, year_heaping (mod 10), year_heaping (exact years),
municipality_coverage, footprint_area_distribution (min/p50/p95/max),
zero_area_geometries
```

Analizar y **no** ocultar:

- acumulación en años acabados en 0/5 (heaping);
- años por defecto o centinela;
- outliers y ceros;
- códigos de municipio no reconocidos;
- geometrías inválidas o de área nula.

Toda corrección se traza: `source_value → transformation → rationale → result`.
Prohibido "limpiar" para obtener una distribución más bonita.

### 6.1 Baseline ya medido (spike P0, Leioa, snapshot 2026-09-03)

Detalle en `data/qa/leioa-baseline-qa.md`. Resumen: 2.390 edificios, cobertura `Ano_Constr`
**99,79 %** (`known=2.385`), rango 1700–2025, **0 IDs duplicados**, **1 geometría inválida**
(self-intersection, 91.121 m² brutos), **129,9 ha de huella en planta válida**,
**29,0 %** de años acabados en 0/5, **47,59 %** de edificios con año conocido > 1987.
Valores `SUSPICIOUS`: `1500×3`, `1640×2`. `Ano_Rehabi≠0`: 105 · `Ano_Reform≠0`: 0 ·
`Ano_Calcul≠0`: 9 (semántica no documentada).

> Este baseline demuestra que el núcleo es viable, pero **es un solo municipio**.
> G0 debe repetirlo en la muestra congelada y en el reconocimiento de los 113 municipios.

### 6.2 Restricción de entorno observada (WAF)

Los endpoints de **datastore** y `/download/` de `www.opendatabizkaia.eus` devuelven
**`Request Rejected`** (WAF) desde la red usada en P0. La vía de ingesta verificada es
el **ZIP de `opengis.bizkaia.eus`**. No se asume que el datastore sea inaccesible en
general: se documenta como limitación de esta red y se reevalúa en G0 (spike S-2).

## 7. Pipeline objetivo

```
fuentes oficiales
  → data/raw/ (snapshots + manifests)
  → DuckDB Spatial con ST_Read (SHP/GML) — primario; GDAL/ogr2ogr CLI opcional
  → clasificación de anomalías + QA (data/qa/)
  → GeoParquet analítico (data/processed/)
  → agregados territoriales (data/processed/aggregates/)
  → tippecanoe (contenedor Docker congelado) → PMTiles (public/data/)
  → frontend estático (SvelteKit + MapLibre)
```

- **DuckDB Spatial** es la dependencia **primaria** de ETL: lee SHP/GML, valida y repara
  geometría, agrega y genera QA. Verificado en P0.
- **GDAL/ogr2ogr CLI** es **opcional** (depuración/conversión puntual). No es requisito
  del pipeline (ADR-005).
- **tippecanoe** se ejecuta por la vía reproducible congelada en ADR-003
  (`pipeline/docker/tippecanoe.Dockerfile`, versión fijada).
- No hay PostGIS ni backend de producción.

## 7.1 Reconocimiento territorial (previo a producción)

Antes de generar cartografía de toda Bizkaia, ejecutar un probe **descriptivo** por
municipio (113) que obtenga `total`, `known`, `unknown`, `coverage_pct`, `min`, `max` y
`suspicious_year_count`, vía descarga de ZIP por municipio + `ST_Read`.
- Es **descriptivo**: no altera la muestra de G0 (`docs/gates/G0.md` §2/§3).
- Se archiva en `data/qa/recon-bizkaia-<fecha>.json`.

## 8. Rendimiento

En **G0** el rendimiento es **caracterización únicamente**: se mide, no se juzga
(`docs/gates/G0.md` §1). Los **presupuestos numéricos se preregistran para G1** a partir
de esas mediciones. Mínimo a caracterizar: JS inicial, dato inicial, tiempo hasta primer
mapa usable, latencia de tesela (local y oficial), memoria, respuesta a interacción y
rendimiento móvil.

Prohibido declarar un resultado «aceptable/inaceptable» en G0 sin umbral preregistrado.

## 9. Reproducibilidad

- `pipeline/g0_recon.py` descarga los ZIP de Catastro y produce el inventario QA.
- `pipeline/g1_buildings.py` normaliza y genera parquet/GeoJSON/métricas + QA por municipio.
- `scripts/g1_build_tiles.ps1` (o `scripts/g1_build_tiles.sh`) produce PMTiles con
  tippecanoe 2.79.0 en contenedor fijado (ADR-003).
- Todo artefacto publicable registra su `snapshot_date` y los `sha256` de origen.
