# ADR-005 — DuckDB Spatial + GDAL/ogr2ogr como pipeline

- **Estado:** aceptado
- **Fecha:** 2026-09-16

## Contexto

Necesitamos leer GML/SHP/CSV de Catastro, validar geometrías, calcular áreas en
`EPSG:25830`, agregar por municipio/celda/década y generar QA reproducible. Candidatos:
PostGIS, GeoPandas, DuckDB Spatial + GDAL.

## Decisión

Usar **DuckDB Spatial** (extensión `spatial`) como dependencia **primaria** del pipeline
de ETL/QA, empleando **`ST_Read`** para leer SHP y GML. **GDAL/`ogr2ogr` CLI queda como
herramienta opcional** (depuración o conversión puntual), **no como requisito**.

## Motivos

- DuckDB ya está disponible en el entorno (v1.5.5) y es MIT.
- **Verificado en P0 (2026-09-16):** `ST_Read` lee **tanto SHP como GML** de Catastro
  (`054_Edificio.shp` y `054_Edificio.gml` → 2.390 filas cada uno), y una sola consulta SQL
  produce total/known/unknown/min/max/huella/geometrías inválidas. No hace falta GDAL CLI.
- Procesa en local, sin servidor; encaja con *static-first*.
- SQL claro y reproducible para QA; salida directa a Parquet/GeoParquet.
- `tippecanoe` consume la salida para PMTiles.

## Alternativas consideradas

- **PostGIS:** potente pero exige servidor y operación; "no backend sin necesidad". `REJECT`.
- **GDAL CLI obligatorio:** innecesario si DuckDB `ST_Read` cubre la lectura; exigirlo
  introducía una dependencia ausente y no reproducible en Windows. **Opcional.**
- **GeoPandas solo:** cómodo para muestras, menos eficiente y frágil a escala; puntual.

## Consecuencias

- `pipeline/requirements.txt` fija `duckdb`, `requests`, `pyyaml`, `shapely` (verificación).
- GDAL CLI **no** figura como requisito; si se usa, se documenta en el preflight como opcional.
- El QA se expresa como consultas SQL versionadas (auditable).
- La reproducibilidad depende de fijar versiones (DuckDB y extensión `spatial`).
