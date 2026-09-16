# ADR-004 — Ortofotos: consumo directo de servicios oficiales antes que raster propio

- **Estado:** aceptado
- **Fecha:** 2026-09-16
- **Verificado:** 2026-09-16 (CORS y teselas probados)

## Contexto

Las ortofotos son un pilar del producto. Consumirlas implica riesgos de CORS,
latencia, disponibilidad y cambios de endpoint. La tentación es montar un proxy o
generar raster propio, lo que añade coste y problemas de licencia/atribución.

## Decisión

Consumir **directamente los servicios oficiales**, verificados:

1. **Ortofotos 1956–2002 (Bizkaia):** tiles cacheados ArcGIS
   `https://geo.bizkaia.eus/arcgisserverinspire/rest/services/Kartografia_Cartografia/ORTO_BFA_{AÑO}/MapServer/tile/{z}/{y}/{x}`
   → `image/jpeg`, `Access-Control-Allow-Origin` reflejado. ✅
2. **Ortofotos 2003–2025 (geoEuskadi):** WMS
   `https://www.geo.euskadi.eus/WMS_ORTOARGAZKIAK?...&layers=ORTO_{AÑO}&crs=EPSG:3857&bbox={bbox-epsg-3857}`
   → `image/jpeg`, `Access-Control-Allow-Origin: *`. ✅

**No** se monta proxy permanente ni caché propia en P0/G0/G1.

## Motivos

- CORS verificado en ambos orígenes ⇒ el navegador puede consumirlos directamente.
- Se elimina el "no backend por defecto" y se conserva la atribución de origen.
- Los tiles cacheados de Bizkaia son rápidos; la WMS moderna es aceptable a falta de
  medir en G0.

## Alternativas consideradas

- **Proxy propio:** añade infraestructura, coste y mantenimiento sin necesidad demostrada.
  `REJECT (por ahora)`.
- **Caché de raster propia:** solo si (a) la licencia lo permite, (b) se preserva
  atribución, (c) el coste de tamaño/bandwidth es razonable, y (d) se demuestra que los
  servicios oficiales no bastan. `DEFER`.
- **IGN PNOA directo:** posible para fechas faltantes, pero introduce otra fuente y otro
  estilo; solo como último recurso. `DEFER`.

## Consecuencias

- Dependemos de la disponibilidad de servicios oficiales ⇒ degradación elegante
  obligatoria (`RISKS.md` R-02, R-03, R-12).
- La nomenclatura de capas WMS de geoEuskadi se valida en cada build.
- La vista compartida (`lat/lon/zoom`) debe reproducir la misma campaña.
