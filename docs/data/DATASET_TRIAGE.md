# DATASET_TRIAGE — G6

> Clasificación de los 283 datasets inspeccionados en
> `evidence/g6/source-discovery/` (12 consultas CKAN prerregistradas).
> Regla: ningún dataset entra por estar disponible; entra si responde a una
> variante de «¿qué había / qué apareció / cuánto cambió / cuándo / cómo
> cambió mi municipio / qué está previsto?».
> Familias por municipio se colapsan en una línea (`<municipio>` = ~92 datasets).

| Dataset / familia | Veredicto | Razón (1 línea) |
|---|---|---|
| `parcelario-catastral` + `<municipio>` | INCLUDE | fuente primaria del parque actual (año de construcción, huella) — ya integrado |
| `ortoimagenes-{1956…2002}` | INCLUDE | serie histórica primaria (tiles cacheados) — time machine + swipe |
| geoEuskadi WMS `ORTO_*` (61 capas) | INCLUDE | rellena huecos (1977_78, 1984_85, 1989, 1991, 2001) y serie anual 2004–2025; contenido verificado en 3 puntos |
| `hojas-cartografia-historica-1923-1925` | INCLUDE | «antes de todos nosotros» — ya integrado como modo `hist` |
| Eustat `ep31` + `ep06b` (PXWeb) | INCLUDE | población municipal: censo de hecho 1900–2001 + padrón anual 2001–2025 |
| Eustat `v02a` viviendas (PXWeb) | INCLUDE | serie censal municipal 1991–2021 — única familia comparable de vivienda |
| `planeamiento-urbanistico` + `<municipio>` | INCLUDE | «¿Y mañana?» — ya integrado como hechos; WMS opcional en evaluación |
| `mapas-de-ruido-carreteras-forales` | INCLUDE | ya adoptado G3-D (módulo contextual existente) |
| `bizkaibus` rutas/paradas | INCLUDE | ya adoptado G3-D |
| `montes-publicos-de-bizkaia` | INCLUDE | ya adoptado G3-D |
| `nora` (geocodificación geoEuskadi) | INCLUDE | ya adoptado (búsqueda de lugar) |
| `ortoimagenes-urdaibai-2023` | DEFER | cobertura solo Urdaibai; útil si se hace un capítulo de Urdaibai |
| `cartografia-1-500-areas-urbanas` | DEFER | WMTS = compuesto actual único (EPSG:25830); la serie por hojas exige auditar el ZIP — gate D sin evidencia temporal por servicio |
| `contratos-menores` / `contratos-no-menores` (+IFAS) | REJECT | schema auditado: sin campo territorial (ni dirección ni municipio ni coords) — linkage sería fuzzy sobre texto libre |
| `plan-anual-de-contratacion-pac-*` (17) | REJECT | planes de entes instrumentales; sin localización de obra |
| `presupuestos-completos` / `liquidacion` / `modificaciones` / `informes ejecución` (+IFAS) | REJECT | presupuesto agregado DFB; sin desagregación por lugar |
| `udaldata-<municipio>` (~92) | DEFER | info económico-financiera municipal — evaluable en otra iteración; no responde directamente al cambio físico del territorio |
| datasets puramente actuales sin dimensión temporal (servicios, playas, equipamientos, rutas turísticas…) | REJECT | no responden a «¿cuánto cambió?» |

## Notas

- «REJECT» ≠ mala fuente: significa que no responde a la pregunta del
  producto con el nivel de evidencia exigido.
- Cualquier DEFER puede promoverse si aparece un servicio con semántica
  temporal explícita (p. ej. la malla 1:500 con año por hoja).
