# MEMORIA TÉCNICA — «Más joven que tú» (DRAFT G5)

> Documentación técnica de la **Base 6** del Decreto Foral 73/2026:
> procedencia y forma de acceso de los datos utilizados, descripción del
> proceso de trabajo con los datos y herramientas/técnicas empleadas.
> Estado: **borrador** — se congela con el candidato G5 tras aceptación
> humana y calibración PERF4 (`docs/gates/G5.md`).

## 1. Qué es el producto

Pieza de periodismo de datos estática y explorable: el visitante indica su
año de nacimiento y su municipio, y el producto responde qué proporción de
los edificios **que hoy existen** en ese municipio es posterior a ese año.
Debajo de la respuesta se puede comprobar el dato con otras fuentes
oficiales (ortofotografía histórica y actual, cartografía de 1923–25),
conocer contexto del lugar (población, planeamiento vigente) y leer casos
editoriales concretos.

Afirmación semántica central (no negociable, `docs/DATA_SEMANTICS.md`):
los datos describen el **parque de edificios existente hoy**, no una
reconstrucción del parque histórico. El producto ordena los edificios
actuales por su año registrado; nunca afirma cuántos edificios existían en
una fecha pasada.

## 2. Datos utilizados: procedencia y acceso

### 2.1 Fuente principal — Open Data Bizkaia (Base 1)

| Dataset | Procedencia / acceso | Uso |
|---------|----------------------|-----|
| Parcelario catastral — edificios (112 municipios) | `opengis.bizkaia.eus/.../Open Data/{COD}_{MUNI}_{GML\|SHP}.zip`; catálogo `opendatabizkaia.eus/es/catalogo/parcelario-catastral` | Capa `Edificio`: geometría + `Ano_Constr`. Única fuente del año de construcción |
| Ortoimágenes 1956–2002 | Tiles `opengis.bizkaia.eus/.../MapServer/tile/{z}/{y}/{x}` (no se descarga raster) | Evidencia visual, activación opt-in |
| Cartografía histórica 1923–1925 | `opengis.bizkaia.eus/.../ORTO_EJ_CARTO_1925/...` (servicio de teselas) | Mapa histórico standalone, opt-in |
| Límites municipales | Open Data Bizkaia | Geometrías de municipio |
| Planeamiento urbanístico | Open Data Bizkaia (snapshot municipal) | Contexto de capacidad registrada |
| Contexto territorial (montes, ruido, bizkaibus…) | Open Data Bizkaia | Hechos de lugar con denominador de solape |

### 2.2 Fuentes complementarias (explícitamente no principales)

| Dataset | Procedencia / acceso | Uso |
|---------|----------------------|-----|
| Ortofotos 2004–2025 | WMS `WMS_ORTOARGAZKIAK` de geoEuskadi (Gobierno Vasco, CC BY 4.0) | Continúa la serie fotográfica donde termina Open Data Bizkaia |
| NORA geocoder | Servicio oficial Gobierno Vasco (CORS `*`) | Búsqueda de dirección; sin clave, sin tracking |
| Población municipal | API PXWeb de Eustat (`eustat.eus`), snapshot propio `app/static/data/eustat-population.json` | Contexto humano «Qué más sabemos del lugar» |

Licencias: todas las fuentes de datos son CC BY 4.0 a nivel de recurso o
equivalente oficial; el detalle por dataset está en
`docs/submission/SOURCES-LICENSES.md` y en `data/manifests/*.yaml`
(un manifiesto por fuente: URL, fecha de descarga, licencia, CRS,
limitaciones conocidas).

## 3. Proceso de trabajo con los datos

### 3.1 Obtención y congelación

1. Descubrimiento vía API CKAN de Open Data Bizkaia
   (`package_search`), lectura de `access_URL` y licencia por recurso.
2. Descarga de los ZIP GML/SHP por municipio (176 ficheros en el
   snapshot `data/snapshots/catastro_manifest_20260918.json`, con digest).
3. Cada ejecución registra snapshot de origen, transformación aplicada,
   informe de QA y fecha (`data/qa/`). Sin excepciones.

### 3.2 Análisis y contratos de métrica

- Una sola consulta DuckDB Spatial (`ST_Read` sobre SHP/GML) produce por
  municipio: total de edificios (C-01), con año válido (C-02),
  desconocidos/sospechosos/inválidos, huella en planta aceptada (C-06) y
  la serie acumulada por año (`cum_buildings`, `cum_footprint_area`).
- El año `Ano_Constr` se clasifica `VALID | UNKNOWN | SUSPICIOUS |
  INVALID` (§5 de DATA_SEMANTICS). `UNKNOWN ≠ 0`: un 0 o vacío nunca se
  convierte en año ni en dato. 139.447 edificios actuales (C-01);
  138.501 con año válido (C-02, cobertura 99,32 %); 936 sospechosos.
- Las métricas siguen contratos con universo, numerador y denominador
  (§11 de DATA_SEMANTICS); pipeline y frontend usan el mismo denominador.
- Área derivada de polígono = **huella en planta**, nunca superficie
  construida total. Reparaciones geométricas (`ST_MakeValid`) trazadas
  con original, transformación, motivo y resultado.
- Reparación: el año nominal de campaña de ortofoto se muestra junto a
  la fecha real de vuelo cuando se conoce; la cartografía 1923–25 se
  presenta como mapa, nunca como fotografía ni como fecha de
  construcción.

### 3.3 Publicación estática

- Vector tiles PMTiles (tippecanoe, contenedor fijado — ADR-003):
  `cells.pmtiles` (celdas con cuota de edificios posteriores al año),
  `municipalities.pmtiles`, índices por edificio.
- JSON por municipio en `app/static/data/` (métricas, planeamiento,
  contexto, población Eustat). Nada se calcula en cliente que no esté
  trazado en el pipeline.
- Ortofotos e histórico se sirven desde los servicios oficiales solo
  tras activación explícita del visitante (0 peticiones hasta opt-in,
  verificado por sondas).

## 4. Herramientas y técnicas

| Pieza | Herramienta | Licencia |
|-------|-------------|----------|
| Pipeline de datos | Python + DuckDB (ext. spatial) | MIT |
| Vector tiles | tippecanoe (fork felt) en contenedor fijado | BSD-2 |
| Frontend | SvelteKit (adapter-static) + Svelte 5 + TypeScript | MIT |
| Mapa | MapLibre GL JS + PMTiles | BSD-3 |
| Comparación fotográfica | Implementación propia de dos lienzos sincronizados (`CompareMap.svelte` + `map/sync.ts`); el swipe por solape se descartó por legibilidad | — |
| Verificación | Playwright (sondas multi-navegador), Vitest, axe-core, ESLint, Prettier | MIT/Apache |
| Servidor estático | Node con soporte HTTP Range (PMTiles lo exige) | — |

Inventario completo de terceros y decisiones ADOPT/REJECT:
`docs/OSS_REUSE.md`. Sin backend: el producto es un build estático.

## 5. Reproducibilidad

- `powershell -File scripts\verify.ps1` ejecuta comprobación de tipos,
  lint, tests unitarios, formato, build y tests de datos.
- Cada fuente tiene manifiesto (`data/manifests/`) y QA
  (`data/qa/`); las cifras visibles del producto se derivan de esos
  artefactos, no de cálculos ad hoc.
- Las sondas de navegador verifican semántica en ejecución:
  0 peticiones de ortofoto sin opt-in, `UNKNOWN` nunca renderiza como 0,
  el mapa histórico falla cerrado, la línea temporal solo muestra el eje
  catastral, cobertura y denominadores visibles.

## 6. Incertidumbre declarada (visible en producto)

- Cobertura de año por municipio mostrada junto a cada cifra.
- Edificios «sin año utilizable» con canal visual propio (hatch), nunca
  asimilados a un año.
- Año anómalo contado aparte («Otros N registran un año anómalo»).
- Planeamiento = capacidad registrada hoy; no uso histórico ni
  predicción. Contexto = solape/proximidad actual; nunca causalidad.
