# ARCHITECTURE

## 1. Visión

`static-first`. El runtime son ficheros estáticos (PMTiles + JSON) más servicios
oficiales OGC con **CORS verificado**. Sin backend propio, sin base de datos en
producción, sin IA.

```
                FUENTES OFICIALES
   (Open Data Bizkaia · Catastro BFA · geoEuskadi · NORA)
                        │
                        ▼
                 source adapters (pipeline/)
                        │
                        ▼
                  data/raw/  (snapshots, gitignored)
                        │
                        ▼
              DuckDB Spatial (ST_Read: SHP/GML)
                 ┌──────┴──────┐
                 ▼             ▼
          GeoParquet       data/qa/ (informes)
        data/processed/
                 │
          ┌──────┴───────┐
          ▼              ▼
     aggregates      tippecanoe
    (JSON/Parquet)        │
          │               ▼
          │           PMTiles
          │          public/data/
          └──────┬────────┘
                 ▼
             SvelteKit (static adapter)
                 │
          MapLibre GL JS
       ┌─────────┼──────────────┬───────────────┐
       ▼         ▼              ▼               ▼
   buildings   ortho raster   histograma     narrativa
   PMTiles     tiles/WMS      (JSON)         Scrollama
```

## 2. Stack

| Capa | Elección | Nota |
|------|----------|------|
| Frontend | **SvelteKit + TypeScript + Vite** | static adapter |
| Mapa | **MapLibre GL JS** | sin SDK propietario |
| Tiles vectoriales | **PMTiles** (formatos) generados con **tippecanoe** | servir como fichero estático |
| Raster histórico | ArcGIS cached tiles de `geo.bizkaia.eus` | CORS verificado |
| Raster moderno | WMS geoEuskadi vía `{bbox-epsg-3857}` en `raster` source | CORS `*` |
| Swipe | **maplibre-gl-swipe** (MIT) | API vanilla, sin React |
| Scrollytelling | **Scrollama** o IntersectionObserver | MIT |
| Geocoder | **NORA REST** (geoEuskadi) | oficial, CORS `*`, sin Google/Mapbox |
| ETL | **DuckDB Spatial** con `ST_Read` (lee SHP y GML) | primario; **GDAL CLI opcional** (ADR-005) |
| Vector tiles | **tippecanoe** vía contenedor Docker congelado | `pipeline/docker/tippecanoe.Dockerfile` (ADR-003) |
| Estilos | CSS nativo; Tailwind solo si simplifica | —

Todo lo reutilizable está decidido en `docs/OSS_REUSE.md`.

## 3. Runtime — consumo de ortofotos (RNF crítico)

Orden de preferencia (ver ADR-004):

1. **Tiles cacheados oficiales** (mejor latencia, CORS OK):
   `https://geo.bizkaia.eus/arcgisserverinspire/rest/services/Kartografia_Cartografia/ORTO_BFA_{AÑO}/MapServer/tile/{z}/{y}/{x}`
   → 1956, 1965, 1970, 1975, 1983, 1990, 1995, 1999, 2002.
2. **WMS geoEuskadi** para 2004–2025:
   `https://www.geo.euskadi.eus/WMS_ORTOARGAZKIAK?...&layers=ORTO_{AÑO}&crs=EPSG:3857&bbox={bbox-epsg-3857}...`
   → CORS `*`, `EPSG:3857`, `image/jpeg`. **Medido en P0:** ~40 ms/tesela 256 px
   (frío 41 ms, 24 teselas con 8 workers en 0,34 s), `Cache-Control: private`.
3. **Caché propia** (último recurso): permitida legalmente porque geoEuskadi publica sus
   contenidos bajo **CC BY 4.0** (con atribución visible), pero **no** se monta antes de
   demostrar necesidad y coste (ADR-004).

**Restricciones de integración del WMS (verificadas):**

- Un `layers` inexistente devuelve **HTTP 200 con `application/xml` `ServiceExceptionReport`**,
  no un 4xx/5xx ⇒ el cliente **debe** inspeccionar el tipo de contenido/cuerpo, no solo el
  código HTTP.
- `Cache-Control: private` ⇒ sin caché compartida en origen; la caché de navegador puede
  aplicarse pero no se debe confiar en caché intermedia.
- El **error de sintaxis de bbox** (p. ej. CRS equivocado) produce una imagen **blanca
  válida**, no un error. Toda verificación debe comprobar que la imagen tiene contenido
  (no basta con HTTP 200 + `image/jpeg`).

Riesgos conocidos: cambios de nomenclatura de capas WMS (aviso oficial 2026-06-12),
latencia de GetMap no cacheado, disponibilidad.

## 4. Fuentes de datos en runtime

| Recurso | Origen | Formato de transporte |
|---------|--------|----------------------|
| Edificios | nuestro pipeline | PMTiles (vector) |
| Agregados por celda/municipio | nuestro pipeline | PMTiles / JSON |
| Límites municipales | nuestro pipeline (Catastro) | PMTiles |
| Ortofotos 1956–2002 | geo.bizkaia.eus | XYZ raster tiles |
| Ortofotos 2003–2025 | geo.euskadi.eus | WMS raster |
| Búsqueda de lugar | geo.euskadi.eus | NORA REST (JSON) |
| Metadatos de fuente | nuestro repo | JSON estático |

## 5. Generación de tiles

- `tippecanoe` se ejecuta **dentro de contenedor** con versión fijada, para tener una vía
  reproducible en Windows sin herramienta nativa (ADR-003).
- Capas separadas por `minzoom`/`maxzoom`:
  - `buildings` (zoom ≥ 15) con `year`, `decade`, `use`, `status`;
  - `cells` (zoom 8–14) con agregados por década;
  - `municipalities` (zoom 5–9).
- Atributos mínimos en el tile para colorear sin peticiones extra.
- `UNKNOWN` debe viajar en el tile como valor propio (no `0`).
- Zonas con clúster: `-zg` / pirámide de profundidad variable.

## 6. Estado y URL

- Estado en la URL (ver `PRODUCT.md` §1). Sin cookies, sin almacenamiento de datos personales.
- El `view` (lat/lon/zoom/bearing/pitch) se comparte para reproducir la vista.

## 7. Despliegue

- Build estático (`npm run build`) → hosting estático.
- Sin variables de entorno con secretos. Sin claves de API.
- `CSP` restrictiva permitiendo los dominios oficiales: `geo.bizkaia.eus`,
  `www.geo.euskadi.eus`, `opengis.bizkaia.eus`, `www.opendatabizkaia.eus`.

## 8. Build de datos (offline)

```powershell
python -m venv .venv; .\.venv\Scripts\Activate.ps1
pip install -r pipeline\requirements.txt
python pipeline\fetch.py --source parcelario-catastral-leioa
python pipeline\qa_buildings.py --input data\raw\...
python pipeline\build_tiles.ps1
```

Dependencias previstas: `duckdb[spatial]`, `requests`, `pyyaml`, `shapely` (verificación).
`tippecanoe` se ejecuta vía Docker (no requiere instalación nativa).
**GDAL/ogr2ogr CLI no es requisito** (DuckDB `ST_Read` cubre la lectura).

## 9. Invariantes de arquitectura

1. El frontend **no** depende de un backend propio.
2. Ninguna métrica se calcula en el cliente que no esté en `DATA_SEMANTICS`.
3. Los fallos de los servicios de ortofoto **no** deben romper el resto (degradación
   elegante, mensaje explícito, sin spinner infinito).
4. Los datos crudos no se suben al repositorio; los manifests sí.
5. Todo consumo de terceros va por HTTPS y con dominio declarado en la CSP.
