# G0 — Reconnaissance territorial de Bizkaia

> **Descriptivo y NO selectivo.** No altera la muestra congelada de G0
> (`docs/gates/G0.md` §2). Ejecutado desde `5c68d74` (rama `g0-viability`).

## Método

1. `pipeline/g0_discover.py` — inventario CKAN de `parcelario-catastral-*`
   → `evidence/g0/02-recon/datasets.json`.
2. `pipeline/g0_recon.py` — descarga del `ZIP [SHP]` por municipio desde
   `opengis.bizkaia.eus`, lectura de la capa `Edificio` con **DuckDB Spatial `ST_Read`**
   y agregación por `Codigo_Mun`.
3. Clasificación de año según `DATA_SEMANTICS.md` §5 con `min_valid_year=1700`,
   `snapshot_year=2026`.

Artefactos: `recon-bizkaia.csv`, `recon-bizkaia.json`, `recon-qa-summary.json`.

## Cobertura

| Métrica | Valor |
|---------|-------|
| Municipios de Bizkaia (NORA) | **113** |
| Municipios con ZIP de Catastro | **112** |
| Municipios procesados OK | **112 / 112** |
| Fallos de descarga/lectura | **0** |
| Sin ZIP disponible | **Usansolo (916)** — su dataset no publica recurso ZIP |
| Edificios actuales (suma) | **139.447** |
| Año `VALID` (suma) | **138.501** |
| Cobertura global | **99,32 %** |
| Cobertura mínima | **91,59 %** (Izurtza) |
| Cobertura p25 / mediana / máx | 98,46 % / **99,44 %** / 100,00 % |
| Municipios con cobertura < 90 % | **0** |
| Municipios con cobertura < 95 % | **4** (Atxondo 91,82 · Berriz 94,20 · Izurtza 91,59 · Ziortza-Bolibar 93,24) |

## Respuesta a las preguntas del gate

1. **¿Leioa es excepcional?** **No.** La cobertura de Leioa (99,79 %) está en la mediana
   territorial (99,44 %). No es un caso atípico de calidad de dato.
2. **¿Existe heterogeneidad territorial importante?** En cobertura, **no**: el rango
   útil es 91,59 %–100 %. La heterogeneidad real aparece en **heaping** de años y en
   **número de edificios** (de ~100 a 13.750).
3. **¿Hay municipios con problemas sistemáticos?** No se detectan problemas
   sistemáticos de disponibilidad. Los casos de cobertura más baja (<95 %) son 4
   municipios pequeños/medianos, y siguen por encima del umbral de aviso (90 %).

## Muestra congelada

| Municipio | Cod. | Edificios | Cobertura | SUSPICIOUS | Geom. inválidas | min–max año | Heaping 0/5 |
|-----------|------|-----------|-----------|------------|-----------------|-------------|-------------|
| **Bilbao** | 020 | 13.750 | 99,91 % | 3 | 1 | 1700–2026 | 37,76 % |
| **Leioa** | 054 | 2.390 | 99,79 % | 5 | 1 | 1700–2025 | 29,01 % |
| **Murueta** | 908 | 254 | 96,46 % | 9 | 0 | 1800–2024 | 43,67 % |
| *(fallback)* Lekeitio | 057 | 1.007 | 99,11 % | 9 | 0 | 1720–2024 | 56,81 % |

> Murueta se mantiene como municipio de la muestra: su fuente es **técnicamente
> utilizable**. El fallback a Lekeitio **no se activa** (no hay causa técnica).

## Anomalías observadas (no corregidas)

- **936** valores de año `SUSPICIOUS` (fuera de `[1700, 2026]` y ≠ 0) repartidos por
  ~95 municipios. Se contabilizan; no se borran ni reinterpretan.
- **16 geometrías inválidas** (`ST_IsValid = false`) en **13** municipios
  (Bilbao 1, Leioa 1, Portugalete 2, Santurtzi 2, Iurreta 2, …). Se reportan; no se
  reparan en esta fase salvo evidencia y trazabilidad (`DATA_SEMANTICS.md` §5.2).
- **0** geometrías nulas.
- **0** años por encima del `snapshot_year` (máximo observado = 2026).
- **Heaping** en años acabados en 0/5: sistemático y variable por municipio
  (Bilbao 37,8 %; Lekeitio 56,8 %). Afecta a la lectura del histograma y deberá
  comunicarse en producto.

## Limitación de entorno

El *datastore* y las rutas `/download/` de `www.opendatabizkaia.eus` devuelven
`Request Rejected` (WAF) desde la red usada: la ingesta se hizo por **ZIP de
`opengis.bizkaia.eus`**, que sí funciona. No se asume que el datastore esté caído
en general (`RISKS.md` R-14).
