# G3 — Depth & Return Discovery Report

Branch: `g3-discovery` · Estado: **discovery completo, sin implementación pública**

Todas las sondas usan endpoints oficiales con contenido verificado (no solo HTTP 200).
Evidencia: `evidence/g3/` + `data/snapshots/catastro_manifest_20260918.json`.

---

## A. Inventario del catálogo ODB

- **1.348 datasets** únicos vía CKAN `package_search` (paginado ×4).
- Volcado completo: `evidence/g3/odb_catalog_raw.json` (metadata + recursos).
- Familias relevantes detectadas por scan de títulos:
  - 114 datasets de planeamiento (1 global + 113 municipales)
  - 112 datasets parcelario-catastral municipales + 1 provincial
  - 1 inventario de espacios de actividades económicas
  - 1 cartografía histórica 1:25.000 (1923–1925)
  - 3 BTB 1:5000 + 1 cartografía urbana 1:500
  - 0 datasets NORA/direcciones en ODB (la vía es la API REST de geoEuskadi)
  - 0 datasets de snapshots/archivo histórico de Catastro

## B. Shortlist de fuentes relevantes

| # | Fuente | Responde a | Formato | Veredicto |
|---|--------|-----------|---------|-----------|
| 1 | **Planeamiento urbanístico** (`planeamiento-urbanistico`) | QUÉ PUEDE CAMBIAR | CSV global + WFS/WMS + ZIP | **ENTRA** — datos + geometrías verificados |
| 2 | **Inventario espacios actividades económicas** (`inventario-de-espacios-…`) | QUÉ TIPO DE LUGAR | WFS (2 capas) + WMS + ZIP | **ENTRA** — solape real demostrado |
| 3 | **Cartografía histórica 1923–25** (`hojas-de-la-cartografia-historica-…`) | PROFUNDIDAD TEMPORAL | WMTS (25830) + WMS + ZIP | **ENTRA** — legible, georreferenciada |
| 4 | **NORA API REST** (geoEuskadi, no ODB) | MI EDIFICIO | JSON REST | **ENTRA** — cadena completa verificada |
| 5 | Snapshots Catastro (auto-archivo) | QUÉ HA CAMBIADO | ZIP GML/SHP | **ENTRA como archivo propio** — no hay histórico oficial |
| 6 | BTB 1:5000 / urbana 1:500 | contexto | WMTS/WMS/WFS/ZIP | **RECHAZO parcial** — ver §L |
| 7 | Planeamiento CSV `CalificacionPormenorizada` + `InventarioNucleosRurales` | detalle municipal | CSV | **reserva** — solo si la WFS no basta |

## C. Contratos de fuentes

### C1. Planeamiento urbanístico de Bizkaia
- Dataset: `planeamiento-urbanistico` · Diputación Foral de Bizkaia · CC BY 4.0
- **CSV global** `DFBDatosGlobalesPlaneamiento_20240507.csv` (22 KB, verificado):
  una fila por municipio: censo, suelo AE/residencial total y vacante (SUB/SUZ),
  vivienda libre/VPO/otras protegidas, **viviendas por ejecutar** (SUB/SUZ/NR),
  fecha de extracción explícita (2024-05-07).
- **WFS Plangintza** — 3 niveles INSPIRE verificados en GetCapabilities:
  - Clasificación: `_.1._Urbano` / `_.2._Urbanizable` / `_.3._No_urbanizable` / `_.4._Suelos_suspendidos`
  - Usos globales: Residencial, Actividades económicas, Sistemas generales, Categorías no urbanizable
  - Calificación pormenorizada: 26 tipos (casco histórico ARI, vivienda ×3 bandas de densidad,
    industrial, parque tecnológico, terciario, comercial, núcleos rurales, equipamientos…)
  - Ámbitos: 6 tipos (residenciales/económicos en urbano/urbanizable, planes especiales)
- Contrato semántico: **planeamiento ≠ predicción**. "Viviendas por ejecutar" es
  capacidad registrada, no compromiso. Copy seguro/prohibido en §F.
- Limitación observada: los tipos WFS llevan prefijo `_.N._`; la atribución de nombre
  legible requiere mapeo explícito por capa (devuelve etiqueta vasca `Ez Urbanizagarria`).

### C2. Inventario de espacios de actividades económicas
- Dataset: `inventario-de-espacios-de-actividades-economicas-de-bizkaia` · mod. 2026-09-11
- WFS 2.0 (`JardueraEkonomikoak_ActividadesEconomicas`):
  - `…_Espacios_Actividades_Económicas` — polígonos: `IdPoligonoEmpresarial`,
    `NombrePoligonoEmpresarial`, `Shape.STArea__` (m²). Ej.: «ÁREA COMERCIAL BALLONTI».
  - `…_Empresas` — censo de empresas (puntos).
- ⚠ WFS 2.0 + `EPSG:4326` ⇒ **bbox en orden lat,lon** (invertir ejes devuelve vacío en silencio).
- GEOJSON `outputFormat=GEOJSON` soportado; `count` pagina.
- Licencia: misma familia INSPIRE geoBizkaia; anual.

### C3. Cartografía histórica 1:25.000 (1923–1925)
- Dataset: `hojas-de-la-cartografia-historica-1-25-000-1923-1925-toponimicas-y-topograficas`
- **WMTS** `ORTO_EJ_CARTO_1925` — TileMatrixSet `default028mm` en **EPSG:25830** (no 3857):
  19 niveles (scale 661 459 → 472), tesela 512px JPEG.
- Cobertura: bbox 25830 [461 504, 4 756 603 → 548 978, 4 812 451] ≈ toda Bizkaia.
- Verificado con contenido: tesela z14 sobre Bilbao = cartografía histórica legible
  (edificios en rojo, curvas, ría) → `evidence/g3/historical-map/tile_bilbao_z14.jpg`.
- Semántica: **es un MAPA, no una ortofoto**. No mezclar en el catálogo de campañas
  fotográficas. Nominal 1923–1925 por hoja, no fecha exacta por píxel.

### C4. NORA REST (geoEuskadi)
- Spec Swagger: `sidl/rest/nora.json` (descargado a `evidence/g3/nora_spec.json`).
- Cadena de resolución verificada:
  `calles?descCalle&descMunicipio` → `calle/{id}/portales?portalNum` →
  `portal/{id}/edificios` → `edificios/{id}?withParents=true` + `portales/cercano?x&y&crs` (inversa).
- `edificio` devuelve `fechaConstr`, `tipo`, `estado` — fecha de construcción NORA
  (fuente independiente de Catastro `Ano_Constr`; documentar discrepancias, no fusionar).
- CORS `*` ya verificado en G0 (manifest `euskadi.nora.geocoder.yaml`).

### C5. Snapshots Catastro
- Recursos ODB **mutables**: `0054ParcelarioCatastral_20260903.csv` se sobrescribe;
  índice opengis solo expone `NNN_MUNICIPIO_{GML,SHP}.zip` vigente (m. 2026-09-02).
- **No existe histórico público.** Archivo propio iniciado:
  `pipeline/g3_snapshot_archive.py` → `data/snapshots/catastro_manifest_YYYYMMDD.json`
  (176 ficheros, digest SHA-256). Nuestro snapshot nº1 = descarga G1 (2026-09-16).
- Primer diff real posible tras la próxima publicación oficial.

## D. Spike MI EDIFICIO (dirección exacta)

`evidence/g3/address/address_spike.json` — 14 consultas estratificadas:

| Estado | n | Detalle |
|--------|---|---------|
| RESOLVED | **11** | cadena completa → edificio con `fechaConstr` |
| CALLE_NO_MATCH | 3 | 204 oficial: «Gallarta» (localidad≠calle), «Zelai Haundi», «Korujo» (variantes de nombre) |

- Latencia: mediana **335 ms** (mín 290 / máx 609) — viable en runtime.
- **Hallazgos de contrato:**
  - `descMunicipio` NO filtra por id: devuelve calles homónimas de toda Euskadi
    («San Julián» devuelve Gipuzkoa + Bizkaia). Hay que desambiguar por
    `localidad.entidad.municipio` anidado (`withParents=true`).
  - `portalNum` es **prefijo**: `portalNum=2` ⇒ 2, 2A, 2B, 2C, 20, 21…
    El número exacto y el `bis` hay que resolverlos en cliente → ambigüedad real
    («¿2A, 2B o 2C?») que debe mostrarse, no autoelegirse.
  - Portal lleva `dxEtrs89/dyEtrs89` + `codigoPostal` → ancla espacial directa.
  - `portales` (listado sin filtro) y `portales?x` sin `radio` devuelven 500: solo
    usar los endpoints del spec verificados.
- Fallos esperables a cubrir: nombre en euskera vs castellano (probar ambas
  descripciones), localidad ≠ municipio (Gallarta), calle renombrada.
- **Conclusión: viable.** Resolución ~80 % ingenua; mejorando con búsqueda
  bilingüe y desambiguación explícita. No requiere geolocalización ni datos personales.

## E. Spike DOS GENERACIONES

Partición real sobre los 6 municipios de c2803 (años A=1960, B=1987):

| Bucket | Edificios | Huella m² |
|--------|-----------|-----------|
| ≤ A (antes de ambos) | 4 826 | 1 095 179 |
| A < año ≤ B (entre) | 4 419 | 1 577 551 |
| > B (después de ambos) | 4 776 | 2 530 133 |
| UNKNOWN | 39 | 15 617 |

- Contrato: mismo universo (`CURRENT_BUILDING_STOCK`), mismas métricas C-05/C-08
  con N anclas ⇒ N+1 particiones + UNKNOWN explícito. Sin nueva fuente.
- Coste: bajo (misma agregación, otro group-by). Valor: alto (rejugable, compartible).
- Semántica segura: «posterior a ambos años», nunca «entre la vida de X e Y» con
  datos personales — solo años, sin relaciones ni nombres.

## F. Spike QUÉ PUEDE CAMBIAR (planeamiento)

Datos verificados (CSV 2024 + WFS):

- A nivel **municipio**: censo, suelo res./AE total y vacante, vivienda libre/VPO,
  **viviendas por ejecutar** — lectura directa del CSV.
- A nivel **celda/área**: clasificación + calificación pormenorizada + ámbitos vía WFS.

**Contrato de copy (draft):**
- SEGURO: «El planeamiento vigente clasifica este suelo como urbanizable residencial» ·
  «El inventario municipal registra capacidad para N viviendas pendientes de ejecución» ·
  «suelo de actividad económica vacante: X % del total municipal».
- PROHIBIDO: «aquí se construirán N viviendas» · «este solar será…» ·
  «el barrio crecerá» · cualquier predicción temporal o de probabilidad.
- Caveat: el planeamiento no reconstruye uso histórico (ya en DATA_SEMANTICS).

## G. Solape actividad económica × 5 casos

`evidence/g3/overlap/overlap_results.json` (WFS real, intersección en 25830):

| Caso | Espacios solapados | Cobertura celdas | Empresas (puntos) en celdas |
|------|--------------------|------------------|------------------------------|
| c2803 (continuo metropolitano) | 15 | 19,7 % | 629 |
| f4036 (Mungia, B) | 0 | 0 % | 4 |
| f4233 (Muskiz, A/1970s) | **1: POLÍGONO INDUSTRIAL PETRONOR** | **98,1 %** | 0 |
| f4738 (Santurtzi, B) | 1: PUERTO DE BILBAO | 23,7 % | 9 |
| f149 (Abanto-Zierbena, A/2000s) | 0 | 0 % | 3 |

**Hallazgo editorial:** f4233 — 51/51 edificios en los 1970s + 98 % de solape con el
«POLÍGONO INDUSTRIAL PETRONOR» oficial. El contraste extremo de f4738 coexiste con el
Puerto de Bilbao. c2803 solapa Ibarzaharra (industrial + terciario) + puerto + Aparkabisa.
f4036 y f149 NO se explican por un espacio de actividad — evidencia negativa igual de útil.

- SEGURO: «Esta celda solapa el espacio del inventario oficial denominado X (año de
  publicación Y)». PROHIBIDO: «este cambio lo causó Petronor/el puerto».

## H. Spike 1923–25 (mapa histórico)

- WMTS operativo, EPSG:25830, hasta scale 472 (~equivalente a calle).
- Contenido verificado visualmente: legible, georreferenciada, edificios trazados.
- Recomendación de integración: **cuarta superficie temporal** como MAPA, separada de
  campañas de ortofoto (etiqueta «Mapa topográfico 1923–25», nominal por hoja).
- Coste: un tilesource adicional; la UI ya soporta capas conmutadas con opt-in.

## I. Viabilidad de deltas entre snapshots

- Histórico oficial: **NO** (recursos mutables, índice opengis solo vigente).
- Archivo propio iniciado: `g3_snapshot_archive.py` + manifest diario digestible.
- Eventos conservadores a implementar cuando haya 2 snapshots:
  `APPEARED_IN_SNAPSHOT`, `DISAPPEARED_FROM_SNAPSHOT`, `ATTRIBUTE_CHANGED`,
  `GEOMETRY_CHANGED` — jamás «construido este mes».
- Nuestro baseline: `data/raw/catastro/*.zip` (2026-09-16, datos al 2026-09-02).

## J. Matriz de features

| Feature | Pregunta | Fuentes | Recurrencia | Coste | Riesgo sem. | Riesgo perf. | Riesgo a11y | Recom. |
|---------|----------|---------|-------------|-------|------------|--------------|-------------|--------|
| **MI EDIFICIO** | «¿qué año tiene mi edificio?» | NORA+Catastro+orto | **alta** (muchas direcciones) | medio | bajo (fechaConstr vs Ano_Constr documentar) | bajo (335 ms/query) | bajo | **P0** |
| **DOS GENERACIONES** | «¿qué parte es posterior a los dos?» | actual | alta (N años) | bajo | bajo | bajo | bajo | **P0** |
| **QUÉ PUEDE CAMBIAR** | «¿qué planeamiento hay alrededor?» | Plan. CSV+WFS | media-alta | medio | medio (≠predicción) | bajo-medio (WFS runtime) | bajo | **P0** |
| **QUÉ TIPO DE LUGAR** | «¿por qué tanta huella?» | Espacios AE | media | medio | medio (≠causa) | bajo | bajo | **P1** — primero en historias |
| **1923→1956→…→2025** | «¿cómo era en 1925?» | WMTS 1925 | media | bajo | bajo (mapa≠foto) | bajo | bajo | **P1** |
| **QUÉ CAMBIÓ** | «¿qué cambió desde la última act.?» | snapshots | **alta** (razón para volver) | alto (pipeline+diff) | alto (≠construido) | medio | medio | **P1 diferido** — tras 2ª snapshot |
| **COMPARAR DOS LUGARES** | «¿Bilbao vs Leioa?» | actual | alta | medio | bajo | bajo | medio | P1 |
| **DESCÚBREME UN CAMBIO** | «¿qué rincón miro?» | hotspots+deltas | alta | medio | bajo | bajo | bajo | P1 (usa las 5 historias + hotspots S3) |
| Quiz «¿reconoces este lugar?» | juego | ortofotos | media | medio | bajo | bajo | medio (imagen→alt difícil) | P2 |

## K. Scope G3 recomendado (acotado)

1. **P0-a MI EDIFICIO**: búsqueda dirección → edificio (NORA), ficha con
   `Ano_Constr` Catastro + nota si NORA discrepa, ortofoto más próxima,
   relación con `selected_year`. Desambiguación explícita bis/portal.
2. **P0-b DOS GENERACIONES**: segundo ancla temporal (N≤3), partición
   `≤A / A–B / >B / UNKNOWN` en cifra + mapa + timeline. URL: `year2=`.
3. **P0-c QUÉ PUEDE CAMBIAR**: panel planeamiento por lugar — clasificación
   de celda (WFS) + cifras municipales (CSV) con contrato de copy de §F.
4. **P1-a Contexto de lugar**: etiqueta de espacio de actividad cuando solape
   (primero dentro de las 5 fichas de historias; luego opcional en celda).
5. **P1-b Mapa 1923–25**: cuarta superficie en FOTO/MAPA como «mapa», opt-in.
6. **Diferido**: snapshot deltas (empieza archivo ya; producto tras 2ª publicación),
   comparar dos lugares, quiz.
7. Las 5 historias G2 se integran como sección «5 cambios que los datos nos
   hicieron mirar» dentro de `/`, no como destino final ni rutas nuevas.

Orden sugerido: P0-b (más barato, misma fuente) → P0-a → P0-c → P1.

## L. Rechazos explícitos

| Fuente/feature | Motivo |
|----------------|--------|
| **BTB 1:5000 como capa permanente** | contexto genérico (nombres/transporte/hidrografía): convierte el producto en atlas; solo se justificaría p. ej. topónimo para etiquetar, y ya lo da NORA |
| **Cartografía urbana 1:500** | misma variable que Catastro (edificios actuales) sin añadir eje temporal ni personal; no responde a ninguna de las 4 preguntas |
| **Empresas (censo puntual) en runtime público** | puntos por empresa son datos sensibles de densidad comercial; agregado sí, puntos no — además 629 pts/caso saturan el render sin narrativa |
| **Snap deltas públicos ahora** | imposible: solo existe 1 snapshot; prometer «qué cambió» sin 2ª entrega sería fabricar la feature |
| **`Ano_Calcul` / `ano_rehabi` / `ano_reform` como métrica** | prohibido por contrato vigente; NORA `fechaConstr` puede citarse como fuente distinta, nunca sustituir |
| **Cualquier dataset de los 1.348 sin pregunta de producto** | criterio del gate: no entra por existir |
| **Predicción desde planeamiento** | semánticamente inválido (planeamiento≠futuro) |
| **Geolocalización / datos personales** | fuera de scope y de privacidad; dirección la escribe el usuario, nada se almacena |
