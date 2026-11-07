# Memoria técnica — «Más joven que tú»

Categoría a) Visualización de datos. Documentación técnica de la Base 6: datos
utilizados, proceso de trabajo y herramientas.

- Proyecto: https://masjovenquetu.eus
- Copia permanente: https://huntsman1756.github.io/mas_joven_que_tu-/
- Código y datos procesados: https://github.com/Huntsman1756/mas_joven_que_tu-

## 1. El proyecto

Visualización interactiva sobre la edad de los edificios de Bizkaia. La persona indica
su año de nacimiento y su municipio, y la pieza responde qué parte de los edificios
**que existen hoy** en ese municipio se construyó después de ese año.

A partir de esa respuesta, cinco modos de exploración comparten el mismo año, lugar y
encuadre:

| Modo | Qué muestra |
|------|-------------|
| Por antigüedad | Mapa con la proporción de edificios posteriores a tu año por zona de 500 m, y cada edificio al acercarse |
| Evolución | Cómo aparecen, año a año, los edificios actuales según su año de construcción |
| Fotos aéreas | Vuelos oficiales del lugar, de 1945 a 2025 |
| Mapa 1923–25 | Cartografía histórica de Bizkaia |
| Antes / ahora | Dos fotografías aéreas comparadas con una cortina deslizante |

Además, cinco capítulos con casos concretos, búsqueda de dirección y la página
«Cómo lo sabemos», con método, fuentes y límites. La web funciona en castellano y en
euskera, en ordenador y en móvil, y se puede usar con teclado.

## 2. Datos utilizados

### 2.1 Open Data Bizkaia (fuente principal)

| Conjunto de datos | Acceso | Uso en el proyecto |
|-------------------|--------|--------------------|
| Parcelario catastral de Bizkaia (capa Edificio, 112 municipios) | opendatabizkaia.eus/es/catalogo/parcelario-catastral (ZIP SHP/GML por municipio) | Geometría de cada edificio y su año de construcción (campo Ano_Constr). Es la única fuente del año |
| Ortoimágenes 1956, 1965, 1970, 1975, 1983, 1990, 1995, 1999 y 2002 | opendatabizkaia.eus/es/catalogo/ortoimagenes-{año} (servicio de teselas) | Fotografías aéreas del visor |
| Hojas de la cartografía histórica 1:25.000 (1923–1925) | opendatabizkaia.eus/es/dataset/hojas-de-la-cartografia-historica-1-25-000-1923-1925-toponimicas-y-topograficas | Modo «Mapa 1923–25» |
| Planeamiento urbanístico | opendatabizkaia.eus/es/catalogo/planeamiento-urbanistico | Contexto del lugar: clasificación vigente del suelo |
| Mapas de ruido de las carreteras forales | opendatabizkaia.eus/es/catalogo/mapas-de-ruido-de-las-carreteras-forales-de-bizkaia | Contexto del lugar: banda oficial de ruido |
| Montes públicos de Bizkaia | opendatabizkaia.eus/es/catalogo/montes-publicos-de-bizkaia | Contexto del lugar |
| Rutas y paradas de Bizkaibus | opendatabizkaia.eus/es/catalogo/informacion-geografica-de-rutas-y-paradas-de-bizkaibus | Contexto del lugar |
| Límites municipales | geo.bizkaia.eus | Contorno de cada municipio |

Licencia: CC BY 4.0, con atribución a la Diputación Foral de Bizkaia.

### 2.2 Fuentes complementarias

| Conjunto de datos | Editor y licencia | Uso |
|-------------------|-------------------|-----|
| Ortofotos 1945, 1977, 1984, 1989, 1991, 2001 y 2004–2025 (servicio WMS_ORTOARGAZKIAK) | Gobierno Vasco, geoEuskadi. CC BY 4.0 | Completan la serie de fotografías aéreas |
| Buscador de direcciones NORA | Gobierno Vasco, geoEuskadi. CC BY 4.0 | Búsqueda de dirección |
| Callejero de la CAPV (portales) | Eustat / Gobierno Vasco, Open Data Euskadi. CC BY 4.0 | Sugerencias de calle |
| Población municipal | Eustat (redifusión citando la fuente) | Contexto del municipio |

## 3. Proceso de trabajo

**Obtención.** Los conjuntos se localizaron con la API del catálogo de Open Data
Bizkaia, leyendo la licencia de cada recurso. Se descargaron los 112 ficheros del
parcelario catastral y se registró la huella digital (SHA-256) de cada uno, para poder
comprobar que el análisis usa exactamente esos datos.

**Selección.** Se usa el año de construcción (Ano_Constr). No se usan el año de
reforma ni el de rehabilitación, que responden a otra pregunta.

**Tratamiento.** Cada año se clasifica como válido, desconocido, sospechoso o inválido.
Un año vacío o igual a 0 es **desconocido**: nunca se convierte en un año ni se cuenta
como edificio antiguo. Ningún dato se corrige en silencio; las geometrías reparadas
conservan el original y el motivo.

**Análisis.** Una sola consulta espacial calcula, para cada municipio, el total de
edificios, los que tienen año conocido, los años dudosos y la serie acumulada por año
de construcción, tanto en número de edificios como en huella en planta. Resultado:
139.447 edificios actuales, 138.501 con año válido (99,32 %).

Cada cifra tiene definido su universo, numerador y denominador, y la web usa
exactamente los mismos que el análisis. Ejemplo: «el 59,9 % de los edificios actuales
de Mungia con año conocido se construyó después de 1979» = edificios posteriores a 1979
÷ edificios con año conocido.

**Visualización.** El análisis genera teselas vectoriales (PMTiles) y ficheros JSON por
municipio. La web elige el año en el propio navegador, sin servidor de datos. Las
fotografías aéreas se piden a los servicios oficiales solo cuando la persona las activa,
y cada imagen indica su campaña y, si se conoce, la fecha real del vuelo.

**Comprobación.** Pruebas automáticas de datos, de interfaz y de accesibilidad, y
pruebas en navegadores de ordenador y móvil (Chrome, Firefox, Safari, Android, iPhone e
iPad) sobre la web publicada.

## 4. Herramientas y técnicas

| Para qué | Herramienta | Licencia |
|----------|-------------|----------|
| Análisis de datos | Python y DuckDB con extensión espacial | MIT |
| Teselas vectoriales | tippecanoe y PMTiles | BSD |
| Web | SvelteKit, Svelte y TypeScript; web estática | MIT |
| Mapa | MapLibre GL JS | BSD-3 |
| Pruebas | Playwright, Vitest y axe-core | MIT / Apache-2.0 |

La comparación «Antes / ahora» es desarrollo propio: dos mapas sincronizados y una
cortina que se puede mover con el ratón, con el dedo o con el teclado.

## 5. Límites que la pieza declara

- Los datos describen los edificios **que existen hoy**. La pieza no reconstruye
  cuántos edificios había en el pasado ni detecta derribos.
- El área calculada es **huella en planta**, no superficie construida.
- Cada cifra se muestra junto a su cobertura: qué parte de los edificios tiene año
  conocido.
- Las fotografías aéreas son evidencia visual: de ellas no se calcula ninguna cifra.
- Contar edificios no es medir cuánto ocupan: en Mungia, una sola construcción catastral
  de 1975 (un campo de golf en la ortofoto) suma el 98 % de la huella de una zona de 70
  edificios. La pieza lo explica en lugar de ocultarlo.
