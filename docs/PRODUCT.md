# PRODUCT — journeys, features y modelo de estado

> Documento canónico de producto. Se actualiza **junto con** `docs/UX_COPY.md`.

## 1. Modelo de estado (la pieza congelada)

Existe **un único estado temporal** visible: `year` (año elegido por el usuario).
Todo lo demás deriva de él.

```ts
type AppState = {
  year: number | null; // año de nacimiento elegido. null = sin elegir
  place: Place | null; // municipio o lugar de Bizkaia
  view: {
    lat: number;
    lon: number;
    zoom: number;
    bearing: number;
    pitch: number;
  };
  // G4/G6: una sola escena con cinco modos mutuamente excluyentes (ADR-015/016)
  mode: "map" | "time" | "photo" | "hist" | "swipe";
  playYear: number | null; // cabezal temporal; independiente de `year`
  orthoVisible: boolean; // solo tiene sentido en mode='photo'
  orthoCompare: Campaign | null;
  histMapVisible: boolean; // solo tiene sentido en mode='hist'
  story: StoryId | null; // capítulo editorial activo (L4)
  storySnapshot: Snapshot | null; // estado personal preservado durante la historia
};
```

Reglas de coherencia (invariantes):

1. Cambiar `year` **debe** actualizar simultáneamente: edificios, métricas,
   histograma, copy y ortofoto sugerida. Nunca dos sliders temporales contradictorios
   en la misma pantalla.
2. En modo comparación **sí** existen dos años (izquierdo/derecho), porque representa
   una comparación explícita.
3. `compare.left` y `compare.right` comparten `view` (centro, zoom, bearing, pitch).
4. `year` se serializa en URL. `place` se serializa como slug. No se serializa nada personal.
5. Si el usuario no elige año, no se inventa uno: se muestra el hero.

## 2. Estados explícitos del dato

| Estado           | Significado                                       | Representación                     |
| ---------------- | ------------------------------------------------- | ---------------------------------- |
| `OBSERVED`       | Valor tomado directamente de la fuente            | Se muestra tal cual                |
| `DERIVED`        | Calculado por nosotros a partir de observados     | Se muestra con _¿Cómo se calcula?_ |
| `UNKNOWN`        | Fuente sin dato (p. ej. `Ano_Constr = 0` o vacío) | Estilo propio; nunca 0, nunca 1900 |
| `NOT_APPLICABLE` | La pregunta no aplica a esa entidad               | No se muestra                      |

## 3. Áreas del producto

```
/                      Hero + resultado completo (una sola ruta, deep links)
/como-lo-sabemos       CÓMO LO SABEMOS  (primera clase, no pie de página)
```

Desde G4 el producto es **una sola página**. Las superficies de evidencia
(MAPA · TIEMPO · FOTO · 1923–25 · 1956/HOY), las historias, MI EDIFICIO, DOS AÑOS y el
planeamiento viven en `/` y se direccionan por parámetros de URL
(`view=`, `story=`, `building=`, `compare=`, `ortho=`, `ortho2=`, `play=`).

### 3.1 TU BIZKAIA (`/`)

- Hero (G11) con: identidad+método, titular corto (**Tu municipio también tiene
  edad.**), **[año de nacimiento]** + **[municipio]** con labels explícitos, CTA
  **Descubrir mi Bizkaia**, y un díptico real de un lugar concreto
  (Abandoibarra 1956/2025). Composición ~40/60; en móvil: titular → intro →
  formulario → imagen → metadatos.
- Resultado (G11): panel narrativo (~340–400 px) junto al mapa en la misma
  primera vista — titular editorial con la cifra a escala de titular +
  aproximación humana («casi 5 de cada 10») + cobertura en lenguaje llano +
  CTA a la campaña cercana →
  escena única (un lienzo, cinco modos agrupados por intención: LEER EL DATO
  `map`/`time` vs COMPROBAR CON OTRAS FUENTES `photo`/`hist`/`swipe`) → tramo de
  lectura «La forma del parque» → «Qué más sabemos del lugar» (población
  Eustat + planeamiento vigente, hechos en línea con fuente y fecha) →
  «Cinco lugares de Bizkaia» (índice editorial de historias) → «Baja hasta
  tu calle» (MI EDIFICIO → DOS AÑOS) → pie con fuentes y snapshot.
- Nunca pide nombre, email, fecha completa ni cuenta.

Titular (estructura, no cifra):

> «Eres mayor que el **47,6 %** de los edificios que hoy forman **Leioa**.»

El porcentaje va a tamaño de titular (serif editorial, acento rojo);
debajo, una **frase directa** restating con la marca («Es decir: casi 5
de cada 10 edificios actuales de Leioa son más jóvenes que tú», G5-R2 —
hace legibles también los porcentajes bajos); el lead da las cifras
exactas; **un único dato humano** (población del padrón Eustat, dentro
del metrics JSON — sin fetch extra) y la cobertura simplificada («hay
año registrado para 2385 de los 2390 edificios actuales») completan el
bloque, sin jerga técnica en la superficie.
El cálculo literal (numerador/denominador, huella en planta, contrato
técnico) vive en un disclosure «Cómo lo calculamos» dentro del tramo de
lectura y en `/como-lo-sabemos`.

### 3.2 VIAJA EN EL TIEMPO (modos `time`/`photo` de la escena)

- **Rail temporal de épocas** (G6, ADR-017): las 37 campañas verificadas
  (BFA primarias + geoEuskadi complementarias) forman un rail horizontal
  en FOTO — 1945 → 2025 — con marcador «tu año» sobre la campaña más
  cercana al año de nacimiento. Operable por teclado; el año real se ve
  siempre; la relación «antes/después de que nacieras» se anuncia en
  texto.
- Selección de campaña con procedencia siempre visible
  (editor · año nominal · vuelo real si se conoce · licencia).
- Comparación de dos campañas **sin swipe ni solape de opacidad** (G5-E):
  en pantalla ancha un segundo lienzo MapLibre sincronizado
  (`CompareMap.svelte`, cámara compartida por `mapSync`); en pantalla
  estrecha un toggle segmentado elige qué campaña ocupa el lienzo único.
  (La cortina antes/después existe, pero como modo aparte —`swipe`,
  ADR-016—, no como comparación de campañas de FOTO.)
- El contorno de los edificios actuales sobre la imagen es opt-in;
  en los modos de evidencia se ocultan los rellenos de dato y la leyenda.
- Autoplay opcional (solo si es técnicamente sólido y respeta reduced-motion).
- Al entrar en «En el tiempo» el eje catastral se inserta sobre el lienzo
  y la página **lo lleva a la vista** (`scrollIntoView`, suave salvo
  reduced-motion) — G5-R2: el eje nunca puede aparecer fuera de pantalla
  tras el click. En deep link `?view=time` no hay scroll automático.
- Centro, zoom, bearing y pitch **idénticos** en ambos lados.
- Siempre visible: **fuente y fecha real de vuelo**.
- Al elegir año, se preselecciona la ortofoto temporalmente más próxima y se comunica:
  «La fotografía oficial más próxima a {Y} disponible es la de {nearest_year}»
  (valores **calculados**, contrato `C-11`; con `Y = 1987` el resultado es **1990**,
  ver `DATA_SEMANTICS.md` `M-11`).
- Carga progresiva (ADR-011): tras el opt-in se pinta primero un preview local de
  **la misma campaña oficial** a baja resolución, y las teselas oficiales de alta
  resolución lo refinan encima en cuanto llegan. Nunca se muestra otra fecha ni
  una imagen sintética; si el servicio oficial falla, el copy de error sigue
  siendo el real.

### 3.3 HISTORIAS DEL CAMBIO (tramo editorial de `/`, `?story=`)

- Capítulos cortos dentro de `/` (~1–1.5 viewports móviles cada uno), no rutas.
- El orden y la selección salen de un método **dato-primero**:
  grid/hex → suma de huella de edificios actuales por década → delta temporal →
  candidatos → revisión con ortofotos → selección editorial.
- Selección congelada: `c2803` · `f4036` · `f4233` · `f4738` · `f149`
  (orden editorial determinista; «Descúbreme un cambio» abre el primero,
  «Otro» rota cíclicamente, sin aleatoriedad).
- Cada capítulo responde: qué vemos · el dato · **qué sabemos y qué no sabemos**,
  con acciones «Ver en el tiempo»/«Ver en el mapa» (primaria dinámica según
  la señal; lleva a la escena `#scene`, scroll suave o instantáneo con
  `prefers-reduced-motion`) / «Míralo desde el aire» (cuando hay campaña;
  activa FOTO y lleva a la escena) / «Otro» / «Volver a mi Bizkaia».
- Una historia configura cámara, cabezal, modo y campaña del caso **sin destruir
  el estado personal**: se guarda un snapshot explícito que «Volver a mi
  Bizkaia» restaura.

### 3.4 CÓMO LO SABEMOS (`/como-lo-sabemos`)

Sección de primera clase. Responde en lenguaje humano: qué es el Catastro, qué mide
`Ano_Constr`, qué es "edificio actual", por qué hay años desconocidos, qué es una ortofoto,
por qué la campaña nominal puede diferir del vuelo real, qué métricas calculamos y cuáles no,
fuentes, licencias, código y fecha del snapshot. Enlaza a metodología técnica.

## 4. Features (alcance)

| ID   | Feature                                                                                                       | Fase  |
| ---- | ------------------------------------------------------------------------------------------------------------- | ----- |
| F-01 | Selección de año + lugar, sin cuenta                                                                          | G1    |
| F-02 | Mapa de edificios por estado temporal (`≤ year`, `> year`, `UNKNOWN`)                                         | G1    |
| F-03 | Estadística principal personalizada con denominador explícito                                                 | G1    |
| F-04 | Indicador de cobertura del dato (`known` / `unknown` / %)                                                     | G1    |
| F-05 | Histograma sincronizado con línea del año elegido                                                             | G1    |
| F-06 | Control temporal único                                                                                        | G1    |
| F-07 | Serie de ortofotos con selección de campaña                                                                   | G2    |
| F-08 | Comparación lado a lado sincronizada / toggle (FOTO, G5-E) + cortina 1956/hoy como modo `swipe` (G6, ADR-016) | G2→G6 |
| F-09 | Fuente + fecha real de vuelo siempre visible                                                                  | G2    |
| F-10 | URL compartible con `year`, `place`, `view`                                                                   | G1    |
| F-11 | Scrollytelling con capítulos dato-fundados                                                                    | G3    |
| F-12 | _Cómo lo sabemos_ + disclosures _¿Cómo se calcula?_                                                           | G1/G3 |
| F-13 | Agregados multiescala (municipio / celda / edificio)                                                          | G1    |
| F-14 | Accesibilidad AA + alternativa textual                                                                        | G4    |
| F-15 | Play/scrub temporal del stock actual por `Ano_Constr`                                                         | G2    |
| F-16 | Hotspots editoriales (señales internas → selección humana)                                                    | G2/G3 |
| F-17 | MI EDIFICIO: dirección exacta NORA→Catastro, fail-closed                                                      | G3-A  |
| F-18 | DOS AÑOS: partición del stock actual con segundo año                                                          | G3-A  |
| F-19 | URL compartible `compare=` / `building=` (sin texto de dirección)                                             | G3-A  |
| F-20 | «¿Y qué está previsto?»: resumen municipal de planeamiento vigente                                            | G3-B  |
| F-21 | Contexto local de planeamiento por edificio (PIP precalculado)                                                | G3-B  |
| F-22 | Contexto de espacio oficial de actividad económica (AE)                                                       | G3-B  |
| F-23 | Visual opt-in: resalte de ámbitos/AE del edificio resuelto                                                    | G3-B  |
| F-24 | MAPA HISTÓRICO 1923–25: cuarta superficie temporal opt-in                                                     | G3-C  |
| F-25 | Contexto de lugar: población municipal Eustat (padrón + censo)                                                | G5    |
| F-26 | Rail temporal de 37 épocas ortofoto con ancla «tu año»                                                        | G6    |
| F-27 | Hotspots: celdas 500 m con más stock actual posterior a `Y`                                                   | G6    |
| F-28 | «Cuando naciste»: observación Eustat exacta/más cercana (padrón + vivienda)                                   | G6    |
| F-29 | Modo swipe 1956↔hoy con cortina accesible (segundo lienzo lazy)                                               | G5/G6 |

Dirección G2 congelada en `docs/G2-DIRECTION.md` (benchmark ampliado en
`docs/INSPIRATION.md` §8–§16). G2 no inicia hasta `G1_PASS`; el copy del Play
tiene contrato explícito (stock actual por año registrado, nunca reconstrucción).

**Estado G2-A (implementado):** F-15 existe como eje temporal editorial
(`Timeline.svelte`, ADR-012): `selected_year` fija titular/métricas/URL; un
cabezal `play_year` proyecta el stock constatado por año registrado — celdas con
la serie canónica `ys` (cuota hasta P, inversa exacta de C-05), edificios con
filtro `year <= play_year`, UNKNOWN siempre explícito. Las marcas de campaña son
exactas, se activan al alcanzarlas y solo piden ortofoto al clic.

**Estado G2-B (implementado):** las tres vistas MAPA·TIEMPO·FOTO comparten
`place + year + view` (`app.mode`, `?view=`, ADR-013). TIEMPO encabeza el eje
con el cabezal anclado pausado al año personal; FOTO muestra `PhotoPanel` con
navegación prev/next entre campañas y procedencia (editor, año nominal, vuelo
real, licencia) siempre visible — ninguna vista pide imagen sin activación
explícita. Las marcas de campaña separan hitbox 44 px y tick visual. La sección
de contraste C-05/C-08 muestra ambos denominadores. F-16 (hotspots) sigue
pendiente.

**Estado G3-A (implementado):** tras RESULT, «¿Quieres bajar hasta tu calle?»
abre el flujo MI EDIFICIO: calle (combobox NORA, desambiguación local por
`localidad[0].entidad.municipio`, nunca `descMunicipio`) → portales (matching
exacto local; variantes bis/letra siempre visibles) → edificios NORA → identidad
Catastro fail-closed por el punto oficial del portal (`EXACT`/`MULTIPLE`/
`NORA_ONLY`/`NOT_FOUND`, nunca se colapsa `MULTIPLE`→`EXACT`). `NORA.fechaConstr`
se muestra como observación independiente junto a `Ano_Constr` — si difieren se
muestran ambos sin ganador (`BOTH_EQUAL`/`BOTH_DIFFER`/`CATASTRO_ONLY`/
`NORA_ONLY`/`BOTH_UNKNOWN`). La dirección nunca se persiste ni entra en la URL;
el deep link usa `building=<id catastral>` solo con identidad probada. DOS AÑOS
añade `compare_year` (invariante T1 de `selected_year`): partición del mismo
`CURRENT_BUILDING_STOCK` en `≤ earlier` / `earlier–later` / `> later` /
no-VALID con denominadores explícitos; edificios a 3 estados temporales +
hatch sin quinto color. Gate: `docs/gates/G3-A.md`.

**Estado G3-B (implementado):** «¿Y qué está previsto?» añade contexto de
planeamiento vigente sin convertir el producto en visor urbanístico (gate
`docs/gates/G3-B.md`, ADR-014). Fuentes congeladas en snapshot
`planning_20260918` (CSV datos globales 2023–2026 + GPKG INSPIRE + WFS de
espacios AE, manifest con sha256). Municipal: bloque editorial con 2–3 cifras
defendibles (viviendas pendientes de ejecución, suelo residencial vacante,
suelo AE vacante — SUB+SUZ(+NR) según contratos P-02..P-06), fecha oficial de
extracción y disclosure «planeamiento no es predicción». Local: cuando MI
EDIFICIO resuelve un edificio, facets PIP precalculados en pipeline
(`planning/<cod>.json`, por `building_id`) muestran clasificación de suelo,
uso global, ámbitos oficiales y solape con espacios AE — los solapes múltiples
se listan, nunca se elige. Visual opt-in: un toggle resalta solo los
ámbitos/AE del edificio en el mapa (`planning-geom/<cod>.json` solo se
descarga al activarlo; nunca una capa de planeamiento global ni selector GIS).
Usansolo (entidad de planeamiento cod 916) carece de edificios en el corpus
catastral: se documenta como gap de cobertura G1, no como error de
planeamiento.

**Estado G3-C (implementado):** MAPA HISTÓRICO 1923–25 añade una cuarta
superficie de evidencia temporal sin confundirse con la ortofotografía (gate
`docs/gates/G3-C.md`, manifest `bizkaia.cartografia.historica.1923-1925.yaml`).
El WMTS nativo es EPSG:25830 — inutilizable como tesela Web Mercator — así que
la superficie se sirve por el `export` del propio MapServer ArcGIS con
reproyección server-side a 3857 (plantilla `{bbox-epsg-3857}` de MapLibre).
Opt-in estricto: 0 peticiones al servicio antes de la acción del usuario
(medido en sonda de red); sonda de disponibilidad con imagen decodable y
estado `UNAVAILABLE` explícito si el servicio falla — el resto de la
experiencia sigue funcionando. Es un **mapa, nunca una ortofoto**: no entra
en el catálogo de campañas, no se mezcla con DOS AÑOS ni con `play_year`, y
la fecha 1923–25 es nominal por hoja (copy contract §5). Desde MI EDIFICIO la
activación muestra el mismo punto resuelto en la cartografía de hace un
siglo — sin inferir existencia/inexistencia del edificio actual.

**Estado G3-D (implementado):** «Tu entorno, según los datos oficiales»
añade tres módulos condicionales sobre el edificio resuelto (gate
`docs/gates/G3-D.md`, contratos DATA_SEMANTICS §18). Cada módulo responde
una pregunta visible y existe solo si la fuente aporta resultado; un fallo
en uno no suprime a los demás y no hay magnitud combinada. Fuentes
congeladas en snapshot `context_20260919` (WFS INSPIRE geo.bizkaia.eus,
EPSG:25830, manifest con sha256). RUIDO: bandas oficiales del mapa
estratégico de ruido de carreteras forales por periodo (día/tarde/noche
independientes, `MULTIPLE` conserva todas, `NOT_MAPPED` nunca es 0 dB;
la capa de receptores queda congelada como evidencia fuera de runtime).
MOVILIDAD: paradas oficiales de Bizkaibus a ≤400 m del punto, máx. 5 por
distancia (R/N congelados antes de implementar; sin horarios, frecuencias
ni tiempos a pie). MONTE PÚBLICO: PIP sobre los 346 montes con nombre,
titular y fechas exactas de deslinde/amojonamiento/catalogación; monte
público nunca se presenta como espacio protegido. Facets precalculados
por `building_id` (`context/<cod>.json`); overlay opt-in por módulo
(`context-geom/<cod>-{ruido|paradas|montes}.json`), una sola activa,
mutuamente excluyente con el highlight de planeamiento y sin mover la
cámara. Espacios protegidos (geoEuskadi) y demografía temporal (Eustat)
quedan estudiados y documentados, no implementados.

**Estado G4 (implementado, en adjudicación):** «corte de producto» final
(gate `docs/gates/G4.md`, ADR-015, `docs/g4/PRODUCT-CUT.md`). La página de
resultado se reorganiza en la jerarquía CUT B — respuesta → escena → lectura
→ acción → editorial — sin añadir fuentes de datos. **Escena única**: MAPA ·
TIEMPO · FOTO · 1923–25 · 1956/HOY son cinco modos mutuamente excluyentes
de un solo `ViewSwitch` (`app.mode`, `?view=`); la ortofoto por campaña
solo existe en FOTO, el mapa histórico solo en 1923–25 (su propio modo es
el opt-in de red) y en 1956/HOY el lienzo muestra siempre la última campaña
con la cortina de 1956 encima (ADR-016). Las
marcas de campaña del eje temporal son la entrada a FOTO en esa campaña
exacta. `OrthoControls` y `HistMapControls` como secciones independientes
desaparecen del flujo. **Tramo de acción** «Tu lugar concreto»: una
invitación secuencial (MI EDIFICIO → DOS AÑOS) elimina la colisión de dos
CTA primarios; la profundidad del edificio (ficha, planeamiento local,
contexto) se revela solo tras resolver, como lectura continua y no grid.
**Tramo editorial**: planeamiento municipal (below-fold, fuera del critical
path, arquitectura R2 intacta) + cinco historias (`story=`, runtime lazy,
snapshot/restauración del estado personal, «Descúbreme un cambio»
determinista). **BUG-01 resuelto**: `building=` sin cámara se restaura de
forma determinista mediante un índice id→centroide por municipio
(`buildings-index/<cod>.json`, generado en pipeline desde la misma fuente
que los PMTiles); si no se localiza, aviso visible `building.restore_failed`
— nunca desaparición silenciosa. Primer viewport: ≤6 acciones verificadas
por sonda. **G4-H1 (remediación editorial):** copy de las cinco historias
corregido a la letra de los story briefs (sin «suelo nuevo», «casco
consolidado», «suelo ganado» ni dominancia municipal no probada); el
contraste C-05/C-08 sale del flujo municipal y vive solo en los capítulos
`f4036`/`f4738` con los valores congelados de sus briefs; jerarquía de
acciones del capítulo reducida a una primaria, una secundaria
(`Míralo desde el aire`) y dos terciarias (`Otro`, `Volver`). **G4-H2
(pulido visual humano):** la primaria pasa a etiqueta dinámica por señal
(`Ver en el tiempo` / `Ver en el mapa`) y todas las acciones de escena
llevan al usuario a `#scene` (scroll suave; instantáneo con
`prefers-reduced-motion`); el foco programático del encabezado de capítulo
anuncia sin caja — en deep link sin interacción no pinta indicador, con
teclado muestra un subrayado editorial. La adjudicación PERF4 (protocolo
original congelado) se realiza en sesión separada sobre el candidato
congelado y, si pasa, cierra GD12.

**Estado G5 (implementado, pendiente de revisión humana):** rediseño
editorial final tras `CHANGES_REQUIRED_BY_HUMAN` sobre G4 (feedback
congelado en `docs/g5/HUMAN-FEEDBACK.md`, gate `docs/gates/G5.md`,
wireframes `docs/g5/`). Sistema visual propio (`src/lib/palette.ts`: papel
cálido `#f5f1e8`, tinta `#191817`, acento `#c9403b`, antes `#3f6f8e`,
después `#c9403b`; serif editorial para titulares y cifra). **Titular**:
la cifra ES el titular, sin caja; aproximación humana (`human.ts`,
«casi N de cada 10») junto al valor exacto; cobertura y años sin dato en
lenguaje llano — `Ano_Constr`, numerador/denominador y `DATA_SEMANTICS §`
solo en superficies técnicas. **Escena**: los cinco modos se agrupan por
intención (LEER EL DATO / COMPROBAR CON OTRAS FUENTES) con copy puente que
explica la diferencia de evidencia; el mapa pierde la rejilla de celdas
(solo contorno discontinuo en small-N) y en los modos de evidencia se
ocultan rellenos de dato y leyenda. **Eje temporal único** (GT1): las
marcas de campaña salen del eje catastral — cada sistema de fechas vive en
su superficie (años catastrales en el eje; campañas nominales en el panel
FOTO; hojas 1923–25 en el modo histórico standalone). **FOTO sin swipe**:
lado a lado sincronizado en pantalla ancha (`CompareMap` lazy), toggle
segmentado en estrecha; contorno de edificios opt-in. **1956/HOY (G6)**:
quinto modo «1956 / hoy» — cortina antes/después (`SwipeCompare` lazy,
overlay MapLibre no interactivo con la campaña 1956 recortada por
`clip-path`, slider accesible, sincronizado por `mapSync`; ADR-016).
**Contexto de lugar**: población municipal Eustat (snapshot propio
`eustat-population.json`, pipeline `g5_eustat_population.py`, manifest
`eustat.poblacion.yaml`, 112/112 municipios) + planeamiento vigente como
hechos en línea con fuente y fecha, below-fold por IntersectionObserver
(0 peticiones en critical path, contrato PERF4 verificado). **Historias**:
índice editorial numerado en vez de botón único. Dependencia
`maplibre-gl-swipe` eliminada.

## 5. Multiescala del mapa (rendimiento)

Dominios de escala exclusivos (M1): `[7, 9)` municipio · `[9, 13.5)` celda · `[13.5, ~]` edificio.

- Zoom bajo → agregados por **municipio** (nunca miles de polígonos a la vez).
- Zoom medio → celdas de 500 m con cuota de construidos después del año (C-05)
  y contorno del **municipio seleccionado** (GeoJSON ligero).
- Detalle de celda accesible: hover con ratón muestra tooltip efímero; clic/tap
  selecciona la celda y abre una **tarjeta persistente** bajo el mapa con el
  mismo contenido (cuota, denominador, huella, aviso small-N). Teclado: botón
  «Ver datos de esta zona» que inspecciona la celda en el centro del mapa;
  `Esc`/cerrar, cambio de municipio o salir del rango `[9, 13.5)` limpian la
  selección.
- Zoom urbano → edificios individuales con `≤ year` / `> year` / `UNKNOWN`.
- `UNKNOWN` tiene estilo propio y leyenda propia.
- Las fuentes PMTiles se instancian solo dentro de su dominio de zoom (el
  índice no se descarga fuera de rango).

## 6. Estados vacíos / error (contrato de copy)

- Sin año → hero, sin mapa de resultado; nunca un mapa vacío sin explicación.
- `UNKNOWN` en un edificio → «El Catastro no indica un año de construcción para este edificio.»
- Ortofoto no cubierta por esa campaña → «La campaña de {Y} no cubre este lugar.» +
  alternativas verificadas. Estado de dominio `NOT_COVERED`, distinto de `SERVICE_ERROR`
  (ver `G1-STATE-MODEL.md` §3).
- Ortofoto no disponible por servicio → «La ortofoto oficial no está disponible
  temporalmente. El resto de la visualización sigue funcionando.»
- Servicio caído → «La ortofoto oficial no está disponible temporalmente. El resto de la
  visualización sigue funcionando.»
- Cobertura baja → «En este municipio falta el año de construcción en una parte relevante
  del parque actual. Consulta cómo afecta al cálculo.»

Sin spinners infinitos: todo fallo tiene mensaje.

## 7. Dirección visual (fijada)

> **«Ficha catastral contemporánea: denso, sobrio, con el dato como único ornamento.»**
> Registro documental + atlas cartográfico. No SaaS, no dashboard institucional.

La estética sale del material fuente: fichas Catastro, hojas de vuelo escaneadas con
sus márgenes (visibles en los previews 1956/1975), retícula cartográfica, metadatos
de snapshot y provenance. Si el nombre del proyecto pudiera sustituirse por el de
cualquier startup y la página siguiera teniendo sentido, el diseño es demasiado genérico.

Reglas (criterio, no aspiración):

1. **Tipografía + composición + contenido real primero**; cajas, color y ornamento
   después — el orden inverso al de las plantillas.
2. **El dato es protagonista**: el porcentaje/hallazgo puede tener escala de titular
   (número grande), la explicación escala de texto. No se entierra en prosa.
3. **Nada de mosaico de tarjetas**: un elemento que puede existir sobre el fondo no
   lleva `border`, `shadow` ni `border-radius`. Las tarjetas se reservan a unidades
   independientes reales (leyenda, tooltip, hoja). Radios sobrios (≤ 12 px), nada de
   pills/cápsulas por defecto.
4. **Ritmo, no simetría**: densidades distintas por sección, bloques 60/40, índices
   numerados (`01 / caso ───`) para historias. La retícula ordena, no se exhibe.
5. **Iconos solo si informan**. Nada de icono-en-círculo ni filas de features.
6. **Color funcional**: ~90 % neutros; el acento `#c9403b` (rojo cálido sobre
   papel) se reserva a dato, marca y estados; el azul `#3f6f8e` marca lo
   anterior a tu año. Paleta congelada en `src/lib/palette.ts`. Sin
   degradados decorativos.
7. **Metadatos editoriales**: kicker en mayúsculas, «Snapshot de datos: 2026»,
   «Campaña {Y} · CC BY 4.0» — el patrón `ÚLTIMA ACTUALIZACIÓN · FECHA · FUENTE`,
   no pills de estado.
8. **Estados reales diseñados**: loading, error, vacío, datos parciales, small-N —
   no solo el estado perfecto.
9. **Cada historia se diseña alrededor de su caso real** (§3.3) antes de diseñar el
   contenedor. Prohibido «aquí irá un gráfico».

Anti-patrones a evitar en G2/G3 (historias, Play, comparador): grid de tarjetas para
casos, botón Play como pill flotante, toggle estilo SaaS, sección de «features» con
iconos, simetría perfecta 3×3.

## 8. Redesign G7 (dirección de arte frontend)

> Baseline funcional: `6b5edb1` (G6). Propuesta congelada en
> `docs/design/G7-ART-DIRECTION.md`; capturas before/after en
> `evidence/g7/`.

La presentación se reconstruyó sin tocar modelo de datos, semántica,
cálculos ni el registry de campañas:

- **HOME**: composición 55/45 — copy+formulario coherente a la izquierda
  (grid `año | lugar | CTA`, altura única `--ctl-h`), díptico real
  ortofoto 1956/hoy a la derecha (`HeroVisual`, previews first-party,
  lazy). Móvil: columna única, visual entre intro y formulario.
- **RESULTADO**: la cifra es el display (`--fs-figure`); el municipio es
  dato secundario en `.post` — los nombres largos ya no rompen el
  titular. Topbar con chip de contexto + `Cambiar` + `Compartir`; la
  edición se expande en un formulario contenido (`max-width 46rem`).
  Fila de hechos con iconos Lucide (edificios post-año, padrón con su
  año observado, campaña más cercana, década dominante).
- **FOTO**: el rail de pills es una línea temporal continua con ticks
  posicionados por año real (1945→2025). Campañas BFA y épocas
  especiales llevan etiqueta permanente (anti-colisión: nunca dos
  etiquetas a ≤2 años); la serie anual revela su año a hover/foco;
  «tu año» va etiquetado en acento sobre la línea. Se conservan
  role=group, roving tabindex, flechas/Home/Fin y todos los aria-labels.
- **HISTORIAS**: índice visual — historia destacada + grid 2×2 con
  miniaturas reales (`static/data/story-thumbs/`, manifest + sha256).
- **CIERRE**: «Sobre este proyecto», «Datos utilizados» (6 fuentes con
  organismo/aporte/cobertura/enlace), footer con navegación, licencias
  y snapshot. `/como-lo-sabemos` gana pasos numerados y Limitaciones.
- **Tokens**: `--surface`, `--carto`, `--topo`, `--line-strong`,
  tipografía clamp (`--fs-*`), `--ctl-h: 3.25rem`, `--radius: 10px`.
- **Iconos**: `@lucide/svelte` (tree-shaken). **Animación**: solo la
  entrada del número del resultado, `prefers-reduced-motion` respetado.

## 9. G8 — controlador único del visor (ADR-019)

> Sobre `295d01c` (G7). Contrato E2E: `app/scripts/g8_viewer.mjs`;
> capturas en `evidence/g8/`.

El salto de calidad de G7 quedaba frenado por la navegación de la escena:
mezclaba secciones (`EL DATO`), agrupaciones (`VER CÓMO ERA`, un `span`
con apariencia de tab — no-op silencioso) y modos reales. G8 la sustituye
por **un único selector de modo** con una sola pregunta: «¿qué quiero ver
sobre este lugar?».

- **Modos**: `Edificios | Evolución | Fotos aéreas | Mapa 1923–25 |
Antes / ahora` (`view=map|time|photo|hist|swipe`). Sin grupos ni
  segunda jerarquía de tabs.
- **Desktop**: toolbar sticky inmediatamente encima del lienzo
  (`Explora {municipio}` + contexto `{año} · {municipio}`); el activo
  tiene superficie (`--paper-2` + borde + icono Lucide), no solo
  underline.
- **Móvil**: `Vista · [modo]` abre un bottom sheet accesible
  (`role="menu"`, `menuitemradio`, `aria-checked`, Escape, flechas,
  retorno de foco). No se comprimen 5 tabs.
- **Controles contextuales**: cada modo monta solo su control entre
  toolbar y lienzo (leyenda / Timeline / PhotoPanel / HistMapControls /
  SwipeCompare). Los paneles siguen lazy (PERF4).
- **«Ver cómo era»** pasa a CTA narrativo (`view.cta_era`): activa la
  campaña más cercana al año del usuario, entra en `photo`, hace scroll
  y enfoca el panel (esperando al lazy-load).
- **Historial**: `modeNavSeq` marca cambios explícitos → `pushState`;
  popstate/restores van por `suppressSync`. Clic en el modo activo =
  no-op sin entrada duplicada.
- **No-data neutral**: el «rectángulo negro» de Bilbao era cobertura
  provincial ausente, no tile fallido. Los previews post-procesan
  píxeles no-data a neutro y la UI muestra `photo.nodata` + alternativas;
  nunca negro puro ni no-op.

Verificación: `g8_viewer` 28/28 (secuencia Bilbao/1952, deep links,
back/forward, reload, axe por modo, menú móvil), `g2b_views` y
`g5_swipe` en verde, `g1r_ortho_preview` 6/6 (script actualizado a la
realidad de capas G5+), PERF4 lazy + critical-path PASS.

## 10. G9 — contrato editorial (copy/style hardening)

> Sobre `d2e3f8c` (G8). Sin datos/cálculos/semántica nuevos: solo cómo se
> escribe. Contrato en `docs/EDITORIAL_STYLE.md`; helpers en
> `app/src/lib/domain/format.ts` (`fmtDateEs`, `decadeName`,
> `relYearLabel`/`relYearShort`, `obsLabel`, `joinEs`…); test dedicado en
> `format.test.ts` y bloque «G9» en `copylint.test.ts` (ISO visible,
> `2000–9`, `%` sin espacio, «1990s» quedan prohibidos en el diccionario).

Cambios visibles:

- Fechas de observación explícitas y en español: «A 1 de enero de 2025,
  Bilbao tenía 346.933 habitantes empadronados.» La fuente baja a una
  línea `.src` por bloque («Eustat · Padrón municipal») — no paréntesis
  de provenance en cada frase.
- Observaciones históricas nombradas por lo que son: «La observación
  oficial más cercana a tu año es el censo de 1950: …» / «el padrón de
  julio de 2022». Viviendas como comparación: «Entre los censos de 1991
  y 2021, las viviendas familiares pasaron de 137.245 a 165.685.»
- Planeamiento: «A 4 de agosto de 2026, el planeamiento vigente de
  Bilbao registraba 13.949 viviendas pendientes de ejecución, 80,5 ha de
  suelo residencial vacante y 10,1 ha de suelo para actividades
  económicas vacante.» (una frase; capacidad registrada, no predicción).
- Cards: cifra · concepto · contexto («1 ene 2025», «2 años antes»).
  Década dominante «años 1960»; el bug «2000–9» desaparece.
- Swipe: «Hoy · 2025» → «Actualidad · 2025» (la ortofoto es una campaña
  observada, no el día actual).
- Historias con contraste (f4036, f4738): EL DATO son las dos cifras
  grandes + una frase interpretativa — dato → lectura, sin párrafo que
  repita los números.

## 11. G10 — final hardening (cero defectos conocidos)

> Sobre `5df397d` (G9). Input normativo: la auditoría manual
> `evidence/ux-audit-20260920/OBSERVATIONS.md`. Gate: `docs/gates/G10.md`;
> evidencia en `evidence/g10/`. Sin features, fuentes ni rediseño: solo
> cierre de defectos (validación de año accesible, denominador visible en
> el titular, semántica de leyenda en play, díptico hero determinista,
> histograma con 4 estados + «sin año» fuera del eje + teclado/táctil,
> reduced-motion en restart, búsqueda local inmediata con NORA no
> bloqueante, hotspots con identidad `municipio:año`, `null ≠ 0` en
> huella, contraste AA en hover, codificación redundante no solo-color).
> Gates humanos `NV-18/19` y `MOB-05b` quedan `PENDING_HUMAN`.

## 12. G11 — rediseño editorial del frontend

> Sobre `630d581` (G10.1) + fix documental `a8b9872`. Input normativo: la
> dirección de producto del auditor («un atlas personal de Bizkaia»).
> Gate: `docs/gates/G11.md`; evidencia en `evidence/g11/`. Sin cambios de
> datos, pipeline, semántica ni registry de campañas: solo presentación.
> Los deep links `?view=` y los contratos G8/G10 se conservan; las pruebas
> humanas (`NV-18/19`, `MOB-05b`) se difieren a este candidato, no al
> diseño G10.1 que sustituye.

- **Identidad**: «un atlas personal de Bizkaia» — territorio reconocible,
  lectura editorial breve, interacción precisa. La inversión visual va al
  territorio y su comparación; iconos/bordes/tarjetas acompañan.
- **Portada**: composición ~40/60 (relato+formulario / evidencia) dentro
  de un contenedor ~1320 px. El mosaico regional se sustituye por un
  díptico real de la curva de la ría y Abandoibarra (`data/hero/`,
  campañas 1956 Open Data Bizkaia y 2025 geoEuskadi, mismo bbox,
  manifiesto + CC BY 4.0). En móvil: titular, intro, formulario, imagen,
  metadatos.
- **Resultado**: panel narrativo (~340–400 px) a la izquierda y mapa a la
  derecha en la misma primera vista; desaparece la fila de tarjetas-KPI
  (población y década viven en sus capítulos). En móvil: resultado
  compacto y mapa inmediatamente después.
- **Mapa**: leyenda compacta con extremos numéricos `0 %`/`100 %`,
  mensaje de escala («Vista por zonas. Acerca para ver edificios»),
  controles agrupados y selección evidente (contorno tinta + halo).
- **Antes/ahora**: la pareja relevante primero — el «antes» es la campaña
  más cercana al año del usuario (`app.nearest`), no siempre 1956; con
  resguardo a la anterior a la última y a BFA 1956 como ancla final.
  Cortina + presets de puntero + teclado conservados.
- **Historias**: image-led (miniaturas oficiales), dos líneas de contexto
  y acción explícita «Explorar este lugar →». Histograma con barras
  horizontales en móvil y «sin año» con trama neutra.
- **Sistema visual**: tokens luz-atlas (`--paper #f7f8fa`, `--ink
  #182631`, `--accent #a8372a`, antes `#52768e`, después `#c94f38`, sin
  año `#d8dde2`+trama — `lib/palette.ts` es la fuente de verdad);
  Newsreader 500 para la voz + Source Sans 3 400/600/700 para interfaz
  (OFL, self-hosted, `static/fonts/`); cifra protagonista en sans, serif
  reservada al relato. Contrastes recomputados en
  `evidence/g11/contrast.json`; la codificación redundante (trama +
  opacidad) se mantiene porque la separación antes/después por luminancia
  es insuficiente por sí sola.
- **Hexes legacy**: toda la chrome migra a `var(--*)`; los colores
  hardcodeados que quedan en `MapView` son simbología de datos dentro de
  expresiones MapLibre (donde `var()` no resuelve) y usan los valores
  nuevos de la paleta.
