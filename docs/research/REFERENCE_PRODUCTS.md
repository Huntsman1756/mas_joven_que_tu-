# REFERENCE_PRODUCTS — G6-O

> Estudio de productos internacionales antes de cerrar la UX temporal.
> Regla: copiamos **principios de honestidad y progressive disclosure**,
> no diseños ni arquitecturas GIS. Fuentes consultadas 2026-09-20.

## 1. Swisstopo — «Journey through time» (SWISSIMAGE)

**Qué hace.** Capa «SWISSIMAGE Journey through time» en map.geo.admin.ch:
un reloj activa un *time slider* que elige el año de vuelo; el mosaico se
sustituye manteniendo la vista. Serie 1926→hoy; HIST 1946 «US flight
mission» como mosaico B/N separado.

**Patrón clave (el que adoptamos).** Swisstopo explica explícitamente que
*«the mosaic always includes photographs taken over several previous years
in order to guarantee a coverage as complete as possible»*: el año del
control es **nominal**, no una promesa de fecha exacta. Además separa la
serie general de la capa «Tiling … Journey thru time» que permite aislar
un año concreto.

**Reutilizado conceptualmente.**
- Año nominal vs. fecha real de vuelo → ya es nuestro contrato
  (`flight_range` visible junto a cada campaña; G6 amplía la ficha a
  37 épocas verificadas, incl. `ORTO_1945_46_AMERICANO` análogo al
  «US flight mission» suizo).
- Slider temporal que conserva el viewport → rail de épocas en FOTO.

**NO copiar.** El modelo «mosaico completo por fecha» implica mezclar
años dentro de una capa sin marcarlo por tesela. Nosotros mantenemos
una fuente por época y sonda fail-closed por punto.

## 2. IGN — «Remonter le temps» (remonterletemps.ign.fr)

**Qué hace.** Portal con dos intenciones separadas: **«Voir et comparer»
(doble visor/cortina entre dos épocas) y «Télécharger»** (explorar y bajar
clichés/cartas). Comparación por **periodos agregados** («1950–1965»,
«1965–1980», «2000–2010», actual) más que por año exacto — la misma
honestidad temporal que Swisstopo: una ortofoto de archivo es un mosaico
de una *ventana* de vuelos.

**Reutilizado conceptualmente.**
- Separación clara entre *comparar* (dos fuentes a la vez) y *viajar*
  (una fuente temporal cada vez) → nuestros modos `swipe` (1956/hoy) y
  el rail de épocas en `photo` son exactamente esa dicotomía.
- Etiquetar épocas por periodo cuando la fuente es pluri-anual
  (`1945–46`, `1977–78`, `1984–85`) en vez de fingir un año preciso.

**NO copiar.** Tres servicios/solapas, catálogo de descargas, posters:
producto de archivo, no narrativa. Nosotros integramos la evidencia en
una sola escena con modos excluyentes.

## 3. Layers of London (layersoflondon.org)

**Qué hace.** Directorio de *overlays* históricos georreferenciados con
desvanecimiento (fade) apilables + *records*: piezas de información
ancladas a puntos del mapa que cuentan microhistorias.

**Reutilizado conceptualmente.**
- La idea **lugar → dato → pequeña historia**: nuestros hotspots por
  celda y la ficha de edificio son ese gesto, con datos oficiales en vez
  de crowdsourcing.
- Fade/apilado de capas como metáfora comprensible de comparación
  (nuestro swipe/cortina es la versión binaria de ese gesto).

**NO copiar.** Directorio de cientos de overlays con sliders de opacidad
múltiples = panel GIS. Nuestro límite: una fuente temporal activa por
vista, elección por rail, cero gestión de capas.

## 4. OldNYC (oldnyc.org, NYPL)

**Qué hace.** Fotos históricas geocodificadas sobre un mapa moderno;
descubrimiento por lugar, no por base de datos. Lección operativa
reciente (danvk, 2026): migración a MapLibre + OSM para poder *retirar*
elementos anacrónicos del basemap (autopistas que no existían en 1930).

**Reutilizado conceptualmente.**
- El basemap también dice una época: nuestras vistas históricas usan
  fondo papel/ortofoto de época, no el mapa actual debajo.
- El lugar es la puerta de entrada a la historia, no el catálogo.

**NO copiar.** Pines masivos de fotos (densidad de colección > narrativa);
nosotros mantenemos una superficie de evidencia continua, no una bolsa
de ítems.

## Decisiones adoptadas (resumen)

| Principio | Origen | Implementación |
|---|---|---|
| Año nominal ≠ fecha de vuelo, dicho siempre | Swisstopo | `flight_range` + chip de época |
| Comparar (2 fuentes) ≠ viajar (1 fuente) | IGN | `swipe` vs rail de épocas en `photo` |
| Periodos pluri-anuales como etiqueta honesta | IGN/Swisstopo | `layer` + `flight_range` en catálogo |
| Lugar → dato → historia | Layers of London | hotspots celda → flyTo → CellDetail |
| Basemap sin anacronismos | OldNYC | lienzo histórico sin etiquetas actuales |
| Una sola fuente temporal activa | propio (anti-GIS) | modos excluyentes `app.mode` |

## 5. Ronda G16 — verificación de patrones adoptados

**geoEuskadi — comparador de ortofotos** (geo.euskadi.eus/comparador-de-ortofotos):
lista simple de campañas con año y resolución; el usuario elige ambas
fechas explícitamente. → Adaptado en `SwipeControls`: dos selectores
«Primera imagen / Segunda imagen» sobre el catálogo real, con exclusión
mutua y sin mezclar con `compareYear` (años de edificios, otro concepto).

**IGN — Remonter le temps** (revisitado): la elección explícita de las
dos fechas es el patrón clave; las vistas magnifier/split alternativas
NO se adoptan (la cortina existente ya resuelve y añadir modos sería
ruido GIS).

**The Pudding** (pudding.cool): el referente editorial confirma la
estructura pregunta→descubrimiento; adoptado el patrón de «accesos
directos personales» (hitos vitales → campañas) como puerta a la
evidencia, no como segundo eje temporal.

| Patrón | Origen | Adaptación G16 |
|---|---|---|
| Elección explícita de las dos fechas | IGN/geoEuskadi | `swipe.pick.*` + `app.swipeBefore` + `ortho2=` en swipe |
| Lista de campañas con organismo | geoEuskadi | opciones `año — editor` en ambos selectores |
| Lugar con referencia → documento | Layers of London | hotspot «Zona n · a X km al dir del centro» → fotos sondeadas en la zona |
| Acceso personal al documento | The Pudding | hitos nacimiento/10/20/última → campaña real deduplicada |
