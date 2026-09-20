# ADR-018: observaciones demográficas y hotspots post-nacimiento

**Fecha:** 2026-09-21 · **Estado:** aceptado

## Contexto

G6-F/G6-I piden (a) «tu municipio cuando naciste» con datos Eustat y
(b) «¿dónde cambió más?» sin poder decir «creció más» — el catastro
actual no contiene los edificios demolidos
(`CURRENT_BUILDING_STOCK != HISTORICAL_BUILDING_STOCK`).

## Decisión

### Población / vivienda (`eustat-population.json`)

- Dos familias Eustat por PxWeb API: `ep06b` (padrón municipal, serie
  anual `20010101`–`20250101`, incl. referencias a 1 de julio literales)
  y `v02a` (viviendas censales 1991–2021, con `null` donde el censo no
  publica). Se conserva la serie censal larga existente (`ep31`).
- `sincebirth.ts::resolvePopulation`: **observación más cercana** al año
  de nacimiento dentro de la misma `methodology_family`; desempate
  determinista (preferir la observación posterior en empate); nunca
  interpolar. El copy muestra siempre el año observado.
- Vivienda solo se muestra con el mismo contrato (observación real, año
  explícito); sin mezcla de censos.

### Hotspots (`cells/*.json` + `cellHotspots`)

- `pipeline/g6_cells_xy.py` añade centroide `[lon,lat]` (EPSG:4326) a
  cada celda de 500 m — peso por celda ≈ nada frente a la serie.
- Ranking determinista sobre el **parque actual**: celdas con ≥2
  edificios con `Ano_Constr > Y`, ordenadas por (nº post-Y ↓, huella
  post-Y ↓, id ↑); deduplicación geográfica 800 m; máximo 3.
- Etiqueta contractual: «celdas de 500 m con más edificios actuales
  construidos después de {Y}» — prohibido «las zonas que más crecieron».
- Click → `flyTo` a **zoom 13.2** (dentro del rango 9–13.5 de la capa
  de celdas; a ≥13.5 `MapView` limpia `selectedCell`).

## Consecuencias

- Ninguna cifra nueva sin año de observación explícito en UI.
- Hotspots solo existen donde hay celdas con serie; municipios sin
  datos de celda degradan a `empty` sin bloquear la página.
- Lazy: el panel de hotspots vive en `BelowFold` (ya diferido);
  la serie de celdas se descarga por municipio bajo demanda.

## Alternativas descartadas

- **Interpolación lineal** de población entre censos: prohibida por los
  principios (no interpolar salvo justificación metodológica).
- **Clustering DBSCAN/hexbin** en cliente: añade librería y no mejora la
  determinabilidad; la malla 500 m ya es el agrupador oficial.
- **Housing por interpolación padrón/vivienda**: familias no comparables;
  se muestran solo observaciones reales.
