# QA baseline — Leioa (spike P0)

> **Tipo:** spike de viabilidad (P0). **No es producción.**
> **Fecha del dato:** snapshot `2026-09-03` (campo `modified` del dataset).
> **Fecha de medición:** 2026-09-16.
> **Fuente:** `parcelario-catastral-leioa` → `054_LEIOA_GML.zip`
> (`https://opengis.bizkaia.eus/Planificacion territorial y catastro/Catastro/Open Data/054_LEIOA_GML.zip`,
> HTTP 200, `application/zip`, 8.812.496 bytes). Licencia del recurso: CC BY 4.0.
> **Capa:** `054_Edificio.gml`, `EPSG:25830`.
> **Script:** `qa_leioa.py` (spike, descartable; se formalizará en `pipeline/qa_buildings.py`).

## Resultados

| Métrica | Valor |
|---------|-------|
| `total_buildings` | **2.390** |
| `unknown_construction_year` (0 / vacío) | **0** |
| `out_of_range_years` | **5** (`1500×3`, `1640×2`) |
| `known_construction_year` | **2.385** |
| `coverage_pct` | **99,79 %** |
| `min_year` / `max_year` | **1700** / **2025** |
| `duplicated_building_ids` | **0** de 2.390 |
| `valid_geometries` / `invalid` | **2.389 / 1** |
| `invalid_geometry` | 1 polígono con *ring self-intersection*, huella bruta **91.121 m²**, `Codigo_Uso=Y`, `Ano_Constr=2012` |
| `zero_area_geometries` | **0** |
| `footprint_area_total` (válidas) | **129,9 ha** |
| `footprint_area_total` (si se incluyeran inválidas) | ~139,1 ha — **no válido**, el área de un polígono inválido no es fiable |
| `footprint_area_median` | **184,8 m²** |
| `impossible_future_years` | **0** |
| `year_heaping` (años acabados en 0/5) | **29,0 %** |
| `buildings_after_1987` | **1.135** |
| `pct_built_after_1987` (sobre años conocidos) | **47,59 %** |

Campos auxiliares:

- `Ano_Rehabi` ≠ 0: **105** registros (4,4 %).
- `Ano_Reform` ≠ 0: **0**.
- `Ano_Calcul` ≠ 0: **9** registros (`1963, 1970, 1974, 1978, 1982, 2002, 2014, …`).
- `Codigo_Uso` (top): `V`=1.666, `Y`=270, `I`=219, `D`=87, `K`=56, `O`=31, `C`=22,
  `T`=11, `R`=9, `A`=9, `P`=5, `B`=4, `E`=1.

Distribución por década (edificios actuales, años conocidos):

```
1700:2 1750:3 1780:4 1790:1 1800:2 1810:1 1820:3 1830:3 1840:9 1850:9
1860:3 1870:5 1880:6 1890:5 1900:12 1910:13 1920:56 1930:34 1940:42 1950:99
1960:192 1970:552 1980:228 1990:381 2000:395 2010:194 2020:131
```

## Observaciones (no ocultadas)

1. **Cobertura muy alta** (99,79 %) en Leioa. **No generalizable** sin medir otros
   municipios: es el principal riesgo de dato (R-05).
2. **Heaping del 29 %** en años acabados en 0/5. Debe comunicarse cuando distorsione la
   lectura del histograma.
3. **Centinelas fuera de rango**: `1500` y `1640`. Tratados como `UNKNOWN` a efectos de
   métrica; contabilizados aparte. Nunca como edificios del s. XVI.
4. **Pico en la década de 1970** (552 edificios) y repunte 1990–2000 (381 / 395).
5. El campo `Ano_Calcul` tiene 9 valores no nulos con semántica desconocida ⇒ **no usar**
   (ADR-007).
6. Leioa tiene 2.390 edificios y **129,9 ha de huella en planta válida**; mediana de 184,8 m².
7. **1 geometría inválida** (*ring self-intersection*) de gran tamaño (91.121 m² brutos,
   `Codigo_Uso=Y`, año 2012). Confirma que el pipeline **debe** reparar con `ST_MakeValid`
   y **registrar la corrección** (`METHODOLOGY.md` §4). El área de un polígono inválido no
   se usa como métrica.
8. Mayores huellas válidas observadas son industriales/equipamientos (60.863 m² `I` 1998,
   33.798 m² `Y` 1976, 46.287 m² `K` 1972), coherentes con el perfil de Leioa. La huella
   **no** es superficie construida (ADR-008).

## Cambios respecto a los supuestos del encargo

| Supuesto del encargo | Realidad observada |
|----------------------|--------------------|
| `Ano_Construccion` | **`Ano_Constr`** |
| `Codigo_Municipio` / `Codigo_Edificio` | **`Codigo_Mun` / `Codigo_Edi`** (+ `Codigo_Pol`, `Codigo_Par`, `Codigo_Sub`) |
| `Numero_Alturas_Sobre_Rasante` | **`Numero_Alt`** |
| `Ano_Rehabilitacion` / `Ano_Reforma` | **`Ano_Rehabi` / `Ano_Reform`** (existen, no son la métrica) |
| CRS `EPSG:25830` | confirmado |

## Reproducir

Ingesta verificada con **DuckDB Spatial `ST_Read`** (lee SHP y GML sin GDAL CLI):

```powershell
# descarga (vía verificada; el datastore del portal da WAF en esta red)
Invoke-WebRequest "https://opengis.bizkaia.eus/Planificacion%20territorial%20y%20catastro/Catastro/Open%20Data/054_LEIOA_SHP.zip" -OutFile 054_LEIOA_SHP.zip
Expand-Archive 054_LEIOA_SHP.zip -DestinationPath data\raw\leioa_shp
# preflight + QA
powershell -File scripts\preflight.ps1 -Phase data
python scripts\qa_leioa_spike.py data\raw\leioa\054_Edificio.gml
```

Consulta DuckDB equivalente (una sola pasada, sin GDAL CLI):

```sql
WITH b AS (SELECT * FROM ST_Read('data/raw/leioa_shp/054_Edificio.shp'))
SELECT
  count(*) AS total,
  count(*) FILTER (WHERE TRY_CAST(Ano_Constr AS INTEGER) BETWEEN 1700 AND 2026) AS known,
  count(*) FILTER (WHERE TRY_CAST(Ano_Constr AS INTEGER) IS NULL
                     OR TRY_CAST(Ano_Constr AS INTEGER) = 0) AS unknown_zero,
  count(*) FILTER (WHERE NOT ST_IsValid(geom)) AS invalid_geom,
  round(sum(ST_Area(geom))/10000.0, 1) AS footprint_ha
FROM b;
-- resultado: total=2390, known=2385, unknown_zero=0, invalid_geom=1, footprint_ha=135.4
```

> Diferencia de área: **135,4 ha** si se incluye la geometría inválida (ST_Area sobre un
> anillo auto-intersectado) vs **129,9 ha** solo con geometrías válidas (shapely).
> Confirma que hay que reparar (`ST_MakeValid`) **antes** de medir y registrar la corrección.

Reglas aplicadas: `docs/DATA_SEMANTICS.md` §3, §5 (política de anomalías), §11.
