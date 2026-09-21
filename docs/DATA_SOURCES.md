# DATA_SOURCES — inventario verificado

> Estado: **P0**. Todo lo marcado `VERIFIED` fue probado con peticiones reales el
> **2026-09-16** (ver evidencia en cada fila y en `data/manifests/`).
> Lo marcado `PENDING` es una duda abierta que **no** se puede asumir como cierta.

## Jerarquía de evidencia (obligatoria)

1. Bases oficiales del concurso (Open Data Bizkaia).
2. Open Data Bizkaia (resto de datasets).
3. Servicios oficiales de Catastro / Diputación Foral de Bizkaia.
4. geoEuskadi / Gobierno Vasco.
5. Otras fuentes públicas oficiales (IGN, INE).
6. OSS para código y métodos.
7. Proyectos periodísticos internacionales **solo como inspiración**.

Nunca se usa un repositorio de GitHub como evidencia factual sobre Bizkaia.

---

## 0. Puerta de entrada

| Campo | Valor |
|-------|-------|
| Portal | `https://www.opendatabizkaia.eus` (**VERIFIED**, HTTP 200) |
| Tecnología | CKAN (`/es/api/3/action/...`) |
| Nº de datasets | **1.348** (`package_list`, VERIFIED 2026-09-16) |
| Organizaciones | 1 por municipio + mancomunidades + `bfa-dfb` (Diputación, 94 datasets) |
| Licencia declarada a nivel dataset | `null` en metadatos del paquete |
| Licencia declarada a nivel **recurso** | **`http://creativecommons.org/licenses/by/4.0/rdf`** (CC BY 4.0), VERIFIED en todos los recursos de catastro y ortofotos |
| Nota | La falta de licencia a nivel de paquete es un dato relevante: **la licencia fiable es la del recurso**. Se documenta en cada manifest. |

---

## 1. CORE — Catastro de edificios

### 1.1 Dataset global

| Campo | Valor |
|-------|-------|
| `source_id` | `bizkaia.catastro.parcelario` |
| `dataset` | `parcelario-catastral-de-bizkaia` |
| `publisher` | Diputación Foral de Bizkaia — Servicio de Catastro y Valoración |
| `dataset_url` | `https://www.opendatabizkaia.eus/es/catalogo/parcelario-catastral` |
| `modified` | `2026-04-20T06:21:01Z`, frecuencia declarada **daily** |
| Recursos | ZIP `[CSV, DWG, GDB, GML, SHP]`, **WFS**, **WMS** |
| Licencia | CC BY 4.0 (por recurso) |
| Estado | **VERIFIED** |

### 1.2 Datasets por municipio (los que usaremos para ingesta masiva)

Patrón: `parcelario-catastral-<municipio>` (organización = el ayuntamiento).
Cada uno expone:

- `ZIP [GML]` → `https://opengis.bizkaia.eus/Planificacion territorial y catastro/Catastro/Open Data/{CODIGO}_{MUNICIPIO}_GML.zip`
- `ZIP [SHP]` → misma ruta `_SHP.zip`
- `CSV` (datastore) → `.../resource/<uuid>/download/upload`, con `hash` MD5 en metadatos

Ejemplo verificado (Leioa):

| Campo | Valor |
|-------|-------|
| `dataset` | `parcelario-catastral-leioa` |
| `org` | Ayuntamiento de Leioa |
| ZIP GML | `https://opengis.bizkaia.eus/Planificacion%20territorial%20y%20catastro/Catastro/Open%20Data/054_LEIOA_GML.zip` — HTTP 200, `application/zip`, 8.812.496 bytes |
| CSV | `0054ParcelarioCatastral_20260903.csv` — 7.071.089 bytes, `hash a9857e579473b64a965ad48c6d8bd574` |
| `modified` | `2026-09-03T09:03:37Z`, frecuencia **monthly** |
| Licencia | CC BY 4.0 |

### 1.3 Esquema real de la capa `Edificio` (VERIFIED, no asumido)

> ⚠️ **Corrección respecto al encargo.** Los nombres de campo del encargo
> (`Codigo_Municipio`, `Codigo_Edificio`, `Numero_Alturas_Sobre_Rasante`,
> `Ano_Construccion`, `Ano_Rehabilitacion`, `Ano_Reforma`) **no coinciden** con los reales.
> Los reales son:

`054_Edificio.gml` — EPSG:25830, `gml:surfaceProperty` → `Polygon`.

| Campo real | Tipo | Nota |
|------------|------|------|
| `FID` | int | índice interno de la exportación |
| `Codigo_Mun` | int | código de municipio (INE, sin ceros a la izquierda). Verificado: **54** = Leioa, **908** = Murueta. La capa `Municipio` aporta además `Codigo_Pro` (48 = Bizkaia) y `Descripcio` |
| `Codigo_Pol` | int | polígono |
| `Codigo_Par` | int | parcela |
| `Codigo_Sub` | int | subparcela |
| `Codigo_Edi` | int | **edificio** |
| `Codigo_Cal`, `Tipo_Porta`, `Orden_Port`, `Numero_Por`, `Duplicado_` | — | dirección/portal |
| `Codigo_Uso` | char | `V` vivienda, `Y`, `I` industrial, `D`, `K`, `O`, `C`, `T`, `R`, `A`, `P`, `B`, `E` (Leioa) |
| `Codigo_Cla`, `Codigo_Mod`, `Codigo_C_1` | — | clasificación |
| `Numero_Alt` | int | nº de alturas sobre rasante (equivalente al `Numero_Alturas_Sobre_Rasante` del encargo) |
| `Numero_A_1` | int | alturas bajo rasante |
| **`Ano_Constr`** | int | **métrica primaria**. `0` = desconocido |
| `Ano_Rehabi` | int | rehabilitación. `0` = no aplica/desconocido |
| `Ano_Reform` | int | reforma |
| `Ano_Calcul` | int | **semántica NO documentada** → no usar como métrica |
| `Categoria` | int | categoría catastral |
| `Numero_Viv` | int | nº de viviendas |
| `Valor_*` | — | valores catastrales/superficie auxiliar (no usados) |

Clave de edificio construida: `Codigo_Mun-Codigo_Pol-Codigo_Par-Codigo_Sub-Codigo_Edi`.

Capas del ZIP por municipio: `Municipio`, `Poligono`, `Parcela`, `Subparcela`,
`Edificio`, `Elemento`, `ElementoComun`, `ElementoSecundario`, `NumeroPortal`.

### 1.4 servicios OGC de Catastro (VERIFIED, CORS echo)

| Servicio | URL | Uso |
|----------|-----|-----|
| WMS | `https://geo.bizkaia.eus/arcgisserverinspire/services/LurraldeAntolamendua_PlanificacionTerritorial/Katastro_Catastro/MapServer/WMSServer` | contexto |
| WFS | `https://geo.bizkaia.eus/arcgisserverinspire/services/LurraldeAntolamendua_PlanificacionTerritorial/Katastro_Catastro_WFS/MapServer/WFSServer` | **`Edificios`, `Municipios`, `Parcelas`, `Subparcelas`, `Elementos`, `Elementos_Comunes`, `Elementos_Secundarios`, `Poligonos`, `Numeros_de_portal`** |
| WFS formatos | GML 3.2 (no soporta `application/json`) | `outputFormat=text/xml; subtype=gml/3.2` |

**CORS:** `geo.bizkaia.eus` **devuelve `Access-Control-Allow-Origin` reflejando el Origin**
(peticiones simples GET). Probado con `Origin: https://x.example`. Sin cabecera
`Access-Control-Allow-Methods`, por lo que solo sirven peticiones simples.

### 1.5 Dudas abiertas (PENDING)

- `PENDING` significado exacto de `Ano_Calcul` (¿año calculado por el Catastro cuando falta?
  En Leioa solo 9/2390 ≠ 0). **No se usará hasta documentarlo.**
- `PENDING` tabla oficial de códigos `Codigo_Uso` y `Categoria`.
- **RESUELTO** conciliación de municipios: `Codigo_Mun` del Catastro coincide con `idMunicipio`
  de NORA una vez igualada la longitud con ceros (Leioa `54`↔`054`, Bilbao `20`↔`020`,
  Murueta `908`↔`908`). Verificado en la capa `Municipio` (incluye `Codigo_Pro=48` y `Descripcio`).

---

## 2. CORE — Ortofotografías históricas

### 2.1 Serie Open Data Bizkaia (1956–2002) — VERIFIED

Datasets: `ortoimagenes-1956`, `-1965`, `-1970`, `-1975`, `-1983`, `-1990`, `-1995`,
`-1999`, `-2002` (más `ortoimagenes-urdaibai-2023`, solo Urdaibai).
`modified` de la serie: 2026-02-13. Licencia: CC BY 4.0.

**WMS común (todas las campañas):**
`https://geo.bizkaia.eus/arcgisserverinspire/services/Kartografia_Cartografia/WMS_Ortoargazkiak_BFA/MapServer/WMSServer`
→ `GetMap` en `EPSG:3857` devuelve `image/jpeg` (VERIFIED). Capas internas nombradas `0…8`
(sin título legible): **la correspondencia número↔año no es explícita** → usar WMTS por año.

**WMTS por campaña (preferido, sin ambigüedad):**

```
https://geo.bizkaia.eus/arcgisserverinspire/rest/services/Kartografia_Cartografia/ORTO_BFA_{AÑO}/MapServer/WMTS/1.0.0/WMTSCapabilities.xml
```

Capas verificadas: `ORTO_BFA_1956`, `_1965`, `_1970`, `_1975`, `_1983`, `_1990`,
`_1995`, `_1999`, `_2002`. TileMatrixSets: `GoogleMapsCompatible` (EPSG:3857) y `default028mm`.
Formato declarado: `image/jpgpng`.

**Tiles cacheados (el hallazgo clave para el runtime):**

```
https://geo.bizkaia.eus/arcgisserverinspire/rest/services/Kartografia_Cartografia/ORTO_BFA_{AÑO}/MapServer/tile/{z}/{y}/{x}
```

→ **HTTP 200, `image/jpeg`, `Access-Control-Allow-Origin` reflejado.** Probado en 1956,
1983 y 2002 (`/tile/14/5999/8055`, `/tile/16/23998/32220`). `singleFusedMapCache: true`.
Esto permite servir la ortofoto histórica **directamente desde el navegador, sin proxy**.

> ⚠️ La ruta WMTS RESTful (`.../WMTS/tile/1.0.0/...`) devolvió `400 Invalid URL` con las
> matrices probadas; la ruta ArcGIS `/MapServer/tile/{z}/{y}/{x}` sí funciona. Usar la segunda.

**Descarga raster (ZIP):** `https://opengis.bizkaia.eus/?t=Cartografia/Ortoargazkiak__Ortofotos/Historikos__Historicos/{AÑO}/`
(solo si en el futuro se necesita caché propia; alto coste → no por defecto).

**Previews first-party (G1-R2, ADR-011):** `app/static/data/ortho-previews/{año}.jpg`
son imágenes **derivadas de la misma campaña oficial** vía `/export` (Bizkaia) o
WMS `GetMap` (geoEuskadi 2025), ~1024 px, extent = bbox real de edificios.
Generador: `pipeline/build_ortho_previews.py`. Provenance completo por fichero en
`ortho-previews/manifest.json` (sha256, retrieved_at, recurso, licencia).

### 2.2 Cartografía histórica 1923–1925 — VERIFIED

| Campo | Valor |
|-------|-------|
| `dataset` | `hojas-de-la-cartografia-historica-1-25-000-1923-1925-toponimicas-y-topograficas` |
| WMTS | `https://geo.bizkaia.eus/arcgisserver/rest/services/ORTOARGAZKIAK/ORTO_EJ_CARTO_1925/MapServer/WMTS/1.0.0/WMTSCapabilities.xml` |
| WMS | `https://geo.bizkaia.eus/arcgisserverinspire/services/Kartografia_Cartografia/KartografiaHistorikoa_CartografiaHistorica_25000/MapServer/WMSServer` |
| WFS | `.../KartografiaHistorikoa_CartografiaHistorica_25000/MapServer/WFSServer` |
| Licencia | CC BY 4.0 |
| Decisión | **STUDY** — solo si aporta a un capítulo concreto. No es una ortofoto (es un mapa). |

### 2.3 geoEuskadi — serie oficial moderna (hasta 2025) — VERIFIED

| Campo | Valor |
|-------|-------|
| Portal | `https://www.geo.euskadi.eus` |
| WMS ortofotos | `https://www.geo.euskadi.eus/WMS_ORTOARGAZKIAK?request=GetCapabilities&service=WMS` |
| Capa más reciente | `ORTO_2025` (también `ORTO_EGUNERATUENA_MAS_ACTUALIZADA`) |
| Serie | `ORTO_2025, 2024, 2023, 2022, 2021, 2020, 2019, 2018, 2017, 2016, 2015, 2014, 2013, 2012, 2011, 2010, 2009, 2008, 2007, 2006, 2005, 2004, 2002, 2001, 1995, 1991, 1989, 1984_85, 1977_78, 1956_57_AMERICANO` (+ `_IrRG`) |
| **Fecha real del último vuelo** | **2025-07-09 → 2025-08-04**; publicado 2026-01-08 |
| `GetMap` | `EPSG:3857` → `image/jpeg`; **imagen real verificada** (22.402–36.734 colores únicos en zona urbana) |
| Latencia medida | **≈40 ms/tesela 256 px** (frío 41 ms); 24 teselas / 8 workers en **0,34 s**; 0 en blanco |
| Cabeceras | `Cache-Control: private`, `Access-Control-Allow-Origin: *` |
| **CORS** | **`Access-Control-Allow-Origin: *`** (VERIFIED) |
| Licencia | **CC BY 4.0** — el pie de geoEuskadi declara licencia CC BY 4.0 con atribución visible a *Eusko Jaurlaritza / Gobierno Vasco. geoEuskadi* y enlaza `creativecommons.org/licenses/by/4.0/deed.es` |
| Trampa verificada | Un `layers` inexistente devuelve **HTTP 200 con XML `ServiceExceptionReport`**; un bbox/CRS incorrecto devuelve **imagen blanca con HTTP 200** ⇒ validar contenido, no solo el código |
| Descarga | `https://www.geo.euskadi.eus/cartografia/DatosDescarga/Cartografia_Basica/Ortofotos/ORTO_2025/` |
| Riesgo documentado | Aviso oficial 2026-06-12: **cambio de nomenclatura de capas WMS** (espacios/guiones → `_`). Los endpoints deben validarse en cada build. |

> ⚠️ **Cuidado con la nomenclatura nominal.** La campaña nominal «1956» de Open Data
> Bizkaia **no debe confundirse** con `ORTO_1956_57_AMERICANO` de geoEuskadi. La primera
> deriva de vuelos catastrales cuya fecha exacta no está determinada entre 1953 y 1955
> (§2.4, RESOLVED); la segunda corresponde al vuelo americano 1956-57. El año nominal
> **no** es necesariamente la fecha exacta del vuelo.

### 2.4 Dudas abiertas (PENDING)

- `RESOLVED (2026-09-17)` fecha/rango real de vuelo: la descripción oficial del dataset
  «Ortoimágenes históricas de Bizkaia» (ficha ODB + datos.gob.es) sí las publica:
  - **1956**: contactos del vuelo para Catastro 1956, ~1:12000, **fecha sin determinar
    entre 1953 y 1955** (ortoimagen generada 2019). ⇒ `flight_range: "entre 1953 y
    1955, fecha exacta desconocida"` (G11.3: el intervalo verificado se muestra con
    su incertidumbre); no es el vuelo americano 1956-57. **Cobertura**: el mosaico
    contiene zonas sin imagen (p. ej. un rectángulo sobre la ría frente a Getxo);
    las teselas las codifican como alpha=0 y el preview JPEG como píxeles claros —
    se ve el fondo de la página. Causa de origen no confirmada; verificado como
    ausencia de imagen en el mosaico servido, no fallo de renderizado de la app
    (G11.3b, `evidence/g11/prod-swipe-1956-loaded.png`). La UI lo declara con
    `swipe.gaps` = «Esta campaña contiene zonas sin imagen».
  - **1965**: 3 vuelos parciales 1963 y 1965, ~1:20000, píxel 0,50 m, generada 2015.
  - **1975**: vuelo mayo 1975, 1:7000, píxel 0,10 m, generada 2018.
  - **1983**: vuelo junio 1983, 1:18000, píxel 0,50 m, generada 2015.
  - **1990**: vuelo mayo 1990, 1:18000, píxel 0,35 m, generada 2016.
  - **1995**: vuelo junio 1995, 1:18000, píxel 0,35 m, generada 2016.
  - **1999**: vuelo junio 1999, 1:18000, píxel 0,25 m, generada 2020.
  - **2002**: vuelo marzo 2002, 1:18000, píxel 1 m, generada 2002.
  - `PENDING` 1970: la ficha consultada no detalla su vuelo → `flight_range: null`.
- `PENDING` ¿existe un servicio de **teselas cacheadas** para la ortofoto moderna de
  geoEuskadi (mejor latencia que WMS `{bbox-epsg-3857}`)? El comparador usa
  `https://www.geo.euskadi.eus/geoeuskadi/rest/services/U11/KARTOGRAFIA_CAS_EUS/MapServer`
  (`singleFusedMapCache: false`, no cacheado). A resolver en G0.

### 2.5 geoEuskadi — mapa base de referencia (`KARTOGRAFIA_CAS_EUS`) — VERIFIED (G11.2)

Mapa base oficial bajo las celdas del resultado: orientación territorial
(costa/ría, núcleos, topónimos, red viaria) sin convertir el mapa en un panel GIS.

| Campo | Valor |
|-------|-------|
| Servicio | `https://www.geo.euskadi.eus/geoeuskadi/rest/services/U11/KARTOGRAFIA_CAS_EUS/MapServer` |
| Uso en app | `export?bbox={bbox-epsg-3857}&size=256,256&format=png32&transparent=true` como fuente raster `refbase` en `MapView.svelte`, por debajo de las celdas de 500 m |
| Capas servidas | `layers=show:10,12,41,74,63` — nombres verificados en `/layers?f=json` (88 capas): 10 `EAEko eremua / Marco CAPV`, 12 `Lurrazala / Cubierta terrestre`, 41 `Hidrografia / Hidrografía`, 74 `Hiriguneak / Núcleos urbanos`, 63 `Errepideak / Red viaria` |
| Trampa verificada | El servicio **no tiene capas visibles por defecto**: un `export` sin `layers=show:` devuelve imagen vacía con HTTP 200 ⇒ hay que pedir los IDs explícitamente |
| Contenido | VERIFIED visualmente: costa, ría, topónimos y viales reconocibles en `evidence/g11/shots/result-desktop.png` |
| Licencia | **CC BY 4.0** — misma atribución que §2.3 (Eusko Jaurlaritza / Gobierno Vasco · geoEuskadi); atribución visible en el mapa: «geoEuskadi — Gobierno Vasco · Mapa base · CC BY 4.0» |

---

## 3. CORE — Límites municipales

| Fuente | Detalle | Estado |
|--------|---------|--------|
| Catastro WFS | `Katastro_Catastro_WFS:Municipios` (GML) | VERIFIED (existe) |
| Catastro ZIP | capa `Municipio` en cada `{CODIGO}_{MUNICIPIO}_GML.zip` | VERIFIED |
| NORA | `/v1/municipios?provinciaId=48` → 1 registro por municipio con centroide ETRS89 | VERIFIED |

No se ha localizado un dataset de límites municipales completo en Open Data Bizkaia.
**Decisión:** construir la capa de límites ensamblando las capas `Municipio` de los ZIP
de Catastro (misma fuente que los edificios → coherencia) o vía WFS `Municipios`.
Comparar con límites IGN/CNIG si hace falta precisión topológica.

---

## 4. CORE COMPLEMENTARIO — NORA (geocodificación oficial)

| Campo | Valor |
|-------|-------|
| API | `https://www.geo.euskadi.eus/t17iApiRestWar/rest/v1/...` |
| Especificación | `https://www.geo.euskadi.eus/sidl/rest/nora.json` (OpenAPI/Swagger) |
| Documentación | `https://www.geo.euskadi.eus/bisorea/v4/api_nora_rest/` |
| CORS | `Access-Control-Allow-Origin: *` (VERIFIED) |
| Endpoints verificados | `/v1/municipios?provinciaId=48` (200), `/v1/municipios?descMunicipio=Leioa` (200), `/v1/portales/cercano?x=&y=&srs=EPSG:25830` (200) |
| Otros endpoints | `/v1/calles`, `/v1/portales`, `/v1/portal/{id}/edificios`, `/v1/localidades`, `/v1/barrios`, `/v1/distritos`, `/v1/secciones`, `/v1/edificios/{id}` |
| Decisión | **ADOPT** para búsqueda de municipio/lugar. Sustituye a Google/Mapbox Search |

---

## 5. Datasets opcionales (solo si aportan una historia concreta)

| Dataset | Uso potencial | Decisión |
|---------|---------------|----------|
| `planeamiento-urbanistico` (+ 110 por municipio) | contexto de planeamiento — **nunca** uso histórico | STUDY |
| `inventario-de-espacios-de-actividades-economicas-de-bizkaia` | capítulo industrial | STUDY |
| `cartografia-1-500-de-areas-urbanas-de-bizkaia` | detalle urbano | STUDY |
| `directorio-de-los-entes-locales-de-bizkaia` | nombres/relación de municipios | STUDY |
| `ortofoto` Urdaibai 2023 (0,07 m) | capítulo Urdaibai | STUDY |
| `mapas-de-ruido-de-las-carreteras-forales-de-bizkaia` | módulo RUIDO (bandas oficiales D/T/N por punto) | **ADOPT** (G3-D) |
| `informacion-geografica-de-rutas-y-paradas-de-bizkaibus` | módulo MOVILIDAD (paradas ≤400 m, máx. 5) | **ADOPT** (G3-D) |
| `montes-publicos-de-bizkaia` | módulo MONTE PÚBLICO (PIP; ≠ espacio protegido) | **ADOPT** (G3-D) |
| geoEuskadi `INGURUMENA_CAS/MapServer` capas 5102–5104 (ENP/N2000/internacional) | «espacio protegido oficial» — estudio `evidence/g3/g3d/STUDY-geoEuskadi-ENP.md` | STUDY |
| Eustat PXWeb `bankupx/api/v1` (ep31 1900–2001 + ep06b 2001–2025) | demografía municipal temporal — estudio `evidence/g3/g3d/STUDY-eustat-population.md` | STUDY |
| Otras capas de Open Data Bizkaia | — | **NO** por defecto |

Regla: **no** se añade una capa por estar disponible. Entra si resuelve un capítulo o una
métrica concreta, y entonces se documenta aquí y en `data/manifests/`.

---

## 6. Formatos y CRS

| Elemento | CRS | Formato |
|----------|-----|---------|
| Catastro `Edificio` (GML) | `EPSG:25830` | GML FME, Polygon en `gml:surfaceProperty` |
| Catastro WFS | GML 3.2 | `text/xml; subtype=gml/3.2` |
| Ortofotos Bizkaia (tiles) | `EPSG:3857` | JPEG (GoogleMapsCompatible) |
| Ortofotos geoEuskadi (WMS) | `EPSG:3857` / `EPSG:4326` | JPEG |
| NorA | ETRS89 (`EPSG:25830`), lat/lon ETRS89 | JSON |
| Visualización objetivo | `EPSG:3857` | PMTiles (vector) + raster |

---

## 7. Manifests

Cada fuente anterior tiene un manifest en `data/manifests/<source_id>.yaml` con:
`source_id, source_name, publisher, source_url, dataset_url, resource_url, retrieved_at,
published_at/modified_at, nominal_date, actual_date_or_range, license, attribution, crs,
format, sha256, notes, limitations`.

Ver plantilla y ejemplos en `data/manifests/`.
