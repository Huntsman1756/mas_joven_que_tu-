# G0 — Evidencia de ortofotos (en vivo)

Ejecutado por `pipeline/g0_orthos.py` (2026-09-16). Detalle en `orthos-live.json`.

Detectores: `IMAGE_OK | SERVICE_EXCEPTION | BLANK_IMAGE | HTTP_ERROR`.

## Bizkaia — teselas cacheadas (ArcGIS `/MapServer/tile/z/y/x`)

| Campaña | Bilbao | Leioa | Murueta |
|---------|--------|-------|---------|
| 1956 | IMAGE_OK | IMAGE_OK | IMAGE_OK |
| 1965 | IMAGE_OK | IMAGE_OK | IMAGE_OK |
| 1970 | IMAGE_OK | IMAGE_OK | IMAGE_OK |
| **1975** | IMAGE_OK | IMAGE_OK | **HTTP_ERROR (404)** |
| 1983 | IMAGE_OK | IMAGE_OK | IMAGE_OK |
| 1990 | IMAGE_OK | IMAGE_OK | IMAGE_OK |
| 1995 | IMAGE_OK | IMAGE_OK | IMAGE_OK |
| 1999 | IMAGE_OK | IMAGE_OK | IMAGE_OK |
| 2002 | IMAGE_OK | IMAGE_OK | IMAGE_OK |

**Hallazgo:** la campaña **1975 no cubre Murueta** (la tesela devuelve `404 ArcGIS
Not Found`, no un hueco blanco). La cobertura **no es homogénea por campaña**.
→ El producto debe detectar ausencia de tesela (404) y caer a la campaña adyacente con
aviso explícito (`UX_COPY.md` §9 «No hay una ortofoto oficial para ese año…»).

## geoEuskadi — WMS `WMS_ORTOARGAZKIAK` (`EPSG:3857`)

| Capa | Bilbao | Leioa | Murueta |
|------|--------|-------|---------|
| ORTO_2025 | IMAGE_OK | IMAGE_OK | IMAGE_OK |
| ORTO_2020 | IMAGE_OK | IMAGE_OK | IMAGE_OK |
| ORTO_2015 | IMAGE_OK | IMAGE_OK | IMAGE_OK |
| ORTO_2010 | IMAGE_OK | IMAGE_OK | IMAGE_OK |
| ORTO_2005 | IMAGE_OK | IMAGE_OK | IMAGE_OK |

Todos con **imagen real** (no blanca). `CORS: *`.

## Modos de fallo (verificados, no asumidos)

| Caso | Resultado | Detalle |
|------|-----------|---------|
| `layers=ORTO_NOEXISTE` | **SERVICE_EXCEPTION** | HTTP **200** con cuerpo XML `ServiceExceptionReport` |
| `bbox` en CRS no válido | **BLANK_IMAGE** | HTTP 200 + `image/jpeg` de **1 color** |

→ Refuerza R-15: `HTTP 200` **no** implica éxito. El cliente debe inspeccionar
`content-type`, decodificar y medir variación de color.

## Latencia (caracterización, red del evaluador)

| Origen | mediana 256 px |
|--------|----------------|
| geoEuskadi WMS `ORTO_2025` | **112 ms** |
| Bizkaia tile `ORTO_BFA_1983` | **140 ms** |

> Sin juicio: son valores crudos. El gate **no** evalúa rendimiento (§1 de `G0.md`).

## Resultado

**IMAGE_OK 41 / 42** consultas de imagen. El único fallo es cobertura ausente de la
campaña 1975 en Murueta (documentado arriba).
