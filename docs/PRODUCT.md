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
- Resultado (G11/G11.2): panel narrativo (~340–400 px) junto al mapa en la
  misma primera vista — titular con la cifra a escala de titular que ya nombra
  municipio + universo + año + una aproximación humana + recuento exacto +
  cobertura en una línea (desglose de registro en un desplegable) + CTA
  «Comparar fotografías» con la campaña cercana anunciada debajo →
  escena única (un lienzo, cinco modos agrupados por intención: LEER EL DATO
  `map`/`time` vs COMPROBAR CON OTRAS FUENTES `photo`/`hist`/`swipe`) →
  «Baja hasta tu calle» (concentraciones del municipio + MI EDIFICIO →
  ficha + DOS AÑOS) → «¿De qué épocas son los edificios actuales?»
  (distribución por décadas + «Cómo lo calculamos») → «Qué más sabemos del
  lugar» (población Eustat + planeamiento vigente, hechos con fuente y
  fecha) → «Para seguir leyendo» (índice editorial de historias) → pie con
  fuentes y fecha del conjunto de datos.
- Nunca pide nombre, email, fecha completa ni cuenta.

Titular (estructura, no cifra):

> «El **30,3 %** de los edificios actuales de Getxo con año conocido se
> construyó después de 1988.»

El porcentaje va a tamaño de titular (serif editorial, acento rojo);
debajo, una **aproximación humana** («Aproximadamente 3 de cada 10 con año
conocido» — hace legibles también los porcentajes bajos), el lead con las
cifras exactas, **un único dato humano** (población del padrón Eustat,
dentro del metrics JSON — sin fetch extra) y la cobertura en una línea
(«Cobertura del año registrado: 99,8 %») con el detalle del registro en un
desplegable, sin jerga técnica en la superficie.
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
(`EvolutionTimePlayer.svelte` desde G18; antes `Timeline.svelte`, ADR-012):
`selected_year` fija titular/métricas/URL; un
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
planeamiento. El Callejero EUSTAT sí tiene 355 registros de portales de
Usansolo — su ausencia del catálogo es una limitación del corpus de
edificios, no de la fuente de calles; ningún copy debe anunciar cobertura
de «todos los municipios de Bizkaia».

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
  no-op sin entrada duplicada. Desde G15 `searchNavSeq` aplica la misma
  regla a búsquedas confirmadas (año + lugar) desde el editor.
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
  controles agrupados y selección evidente (contorno tinta + halo). La
  leyenda vive fuera del lienzo (`.mapouter` flex): absoluta sobre el
  mapa en escritorio, en flujo debajo del lienzo en móvil.
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

### 12.1 G11.2 — pasada de producto y copy

Sobre `99d90b3` (código G11.1b = `8824c3d`). Input: revisión de producto del
usuario — mismo sistema visual, mejor orientación al descubrimiento. Sin
cambios de datos, semántica ni contratos G8/G10; copy en `UX_COPY.md` §35.

- **Formulario de portada**: año a ancho fijo (~112 px, `7rem`), municipio
  al resto del ancho y CTA a fila completa — nombres largos y listas de
  sugerencias ya caben.
- **Referencias territoriales en el mapa**: fuente raster `refbase` bajo las
  celdas con el mapa base oficial geoEuskadi `KARTOGRAFIA_CAS_EUS` (capas
  10/12/41/74/63 — marco, cubierta, hidrografía, núcleos, red viaria;
  `DATA_SOURCES.md` §2.5, CC BY 4.0, atribución visible). Costa, ría,
  topónimos y viales permiten reconocer el lugar; las celdas de 500 m siguen
  siendo la unidad analítica.
- **Recorrido local primero**: nuevo orden de tramos — «Baja hasta tu
  calle» (concentraciones + tu edificio) → «¿De qué épocas son los edificios
  actuales?» → «Qué más sabemos del lugar» → «Para seguir leyendo». Las
  historias de otros municipios amplían el hallazgo personal, no lo preceden.
- **Panel de resultado simplificado**: titular con municipio + universo +
  año; una aproximación llana; recuento exacto; cobertura en una línea con
  el desglose `unknown`/`suspicious` en un `<details>` «Detalle del
  registro». Se elimina `result.headline.scope` (redundante con el titular).
- **Ficha de edificio personalizada**: con año `VALID` y año del usuario,
  línea de vínculo (`building.rel.*`): «{n} años después/antes de tu
  nacimiento» / «Terminado el mismo año en que naciste». Nunca con año
  desconocido, anómalo o inválido.
- **Copy de superficie**: `share.label` = «Copiar enlace»; `footer.snapshot`
  = «Fecha del conjunto de datos»; `search.results*` = «municipios
  encontrados» (NORA en información secundaria); `view.cta_era` = «Comparar
  fotografías» + nota «Campaña cercana a tu nacimiento: {año}».
- **Etiquetas interpretativas ~14 px**: chips de campaña, instrucción de la
  cortina y presets del comparador suben a 0.85–0.875 rem; la atribución de
  fuente sigue secundaria.

### 12.2 G11.3 — estabilización (sin rediseño)

Pasada de corrección tras auditoría del candidato G11.2b — sincronización,
recuperación ante fallos y honestidad de fuentes. No hay cambios de
dirección visual ni de recorrido:

- **Comparador sincronizado**: la fuente raster del overlay se recarga
  cuando cambia la campaña «antes» (editar el año dentro del comparador ya
  no deja etiqueta 1956 con teselas 1989). La etiqueta solo cambia cuando
  la sonda verifica la nueva imagen; cámara y cortina se conservan.
- **Atribución por lado**: `swipe.src` nombra por separado el organismo, el
  año nominal y el intervalo de vuelo de cada imagen. La campaña ODB 1956
  declara «vuelo entre 1953 y 1955, fecha exacta desconocida» (ficha
  oficial); ya no se le asigna el rango 1956-57 del vuelo americano
  geoEuskadi.
- **Privacidad sin sobreafirmación**: el aviso bajo la búsqueda nombra NORA
  y aclara que el texto de la dirección no se incluye en el enlace
  compartido.
- **Cámara de URL validada**: `lat`/`lon`/`z` fuera de rango, vacíos,
  no numéricos o incompletos se descartan; se conserva municipio/año, se
  recupera el encuadre municipal y se muestra un aviso descartable
  (`url.camera_reset`).
- **Fallo de descarga recuperable**: `Lazy`/`LazyView` muestran
  `role="alert"` con el motivo y acción «Recargar la página» (el navegador
  cachea el fallo del `import()`; el estado vive en la URL y se restaura).
- **Estilos globales compartidos**: tokens y reset viven en `app.css` +
  `+layout.svelte`; `/como-lo-sabemos` se ve igual en navegación directa.
- **Pipeline honesto con decimales**: la clasificación (`VALID/UNKNOWN/
SUSPICIOUS/INVALID`) se hace sobre el valor de origen (`year_src`) antes
  de convertir; `1960.7` es `INVALID` (no se trunca ni redondea) y `1960.0`
  es `VALID`, igual en Python y en SQL.
- **E2E que pueden fallar**: `pageerror` inesperado y checks de texto
  `'FAIL …'` hacen salir ≠0 en todas las suites; `g2b_views`/`g3*`/
  `perf4` ahora tienen veredicto agregado. Regresiones nuevas: cambio de
  año dentro del swipe, cámara inválida, fallo de chunk lazy.
- **CI**: workflow en todas las ramas; subset E2E determinista con
  `CI_STUBS=1` (fixtures locales para NORA e imágenes externas no
  uniformes); la comprobación Range se hace sobre el PMTiles real.

## 13. G12 — comprensión del mapa (sin rediseño visual)

Pasada de comprensión de producto motivada por feedback real («¿y los
cuadrados que van cambiando de color?»). No hay cambios de dirección
visual, de pipeline ni de contratos de métrica; el cambio es de
**explicación y jerarquía**:

- **Barrera diagnosticada**: la relación año → cuota por zona → color →
  edificio nunca se enunciaba junto al mapa. La leyenda era un overlay
  con jerga («celda», «cuota»); en móvil pasaba a flujo **bajo** el lienzo,
  así que el primer viewport mostraba cuadrados sin explicación. La ficha
  persistente de zona vivía bajo el pliegue, en la sección CUÁNDO, sin
  acción para acercar.
- **Recorrido elegido: A** (respuesta personal → mapa explicado → fotos).
  Se descartó B (fotos primero): cargar dos rasters externos por defecto
  rompe el contrato opt-in de red documentado y en móvil no resuelve la
  barrera de los cuadrados. Las fotos siguen a un toque con el CTA.
- **Intro del mapa** (`.mapintro`, antes del lienzo en ambos viewports):
  explica qué es un cuadrado (zona de 500 m de lado, dimensión verificada
  en pipeline), qué codifica el color y qué variable está activa; cambia
  por nivel (`app.mapLevel`) y por modo (`playYear`). En play declara
  «no es la ciudad del pasado — solo los edificios que siguen en pie hoy».
- **Leyenda por contrato**: cada modo declara variable, universo («sobre
  los de año conocido de cada zona»), extremos («0 % · ninguno» /
  «100 % · todos») y entrada de ausencia de dato con muestra a rayas
  (capa `cells-nodata` con hatch). UNKNOWN nunca se dibuja como 0 %.
- **Ficha de zona junto al mapa**: titular «En esta zona», frase exacta
  «{N} de {K} edificios actuales con año conocido se construyeron después
  de que nacieras» (`countAfterParsed`/`countUntilParsed`, mismo
  denominador que la cuota) y acción real «Acercar para ver los edificios
  por separado» (`app.mapFlyTo`, zoom al nivel de edificios). Escape,
  cambio de municipio y salida de rango de zoom limpian la selección.
- **Terminología**: «zona» sustituye a «celda» en toda la superficie de
  usuario; «celda» queda solo en código y documentación técnica.
- **Validación humana pendiente**: guion en `docs/HUMAN_TEST.md`
  (Cassnyo + 3–4 personas, sin explicación previa). Los tests automáticos
  no se consideran prueba de comprensión. NVDA (NV-18/19) y móvil físico
  (MOB-05b) siguen pendientes sobre la versión desplegada.

### G12 — correcciones de fiabilidad y lectura móvil

- La trama exige denominador conocido igual a cero en la tesela. Una serie
  pendiente no prueba ausencia; una descarga fallida ofrece aviso y reintento
  explícito, sin bucle automático de peticiones; una descarga resuelta sin
  el registro del fid se declara «No se han podido obtener los datos de esta
  zona» (estado `missing`: sin porcentaje, sin trama, navegación intacta).
- La ficha distingue carga, error, ausencia y porcentaje disponible. En táctil
  no se presenta tooltip hover duplicado; la huella en planta queda en un detalle.
- Pregunta del mapa en línea propia y explicación de 16 px. En móvil se omite
  la aproximación redundante: titular con año y universo, recuento exacto
  desplegable y cobertura permanecen disponibles.
- Explicaciones municipal y temporal restringidas a edificios actuales con año
  conocido. No se modifican métricas, pipeline ni fuentes.
- Capturas de nivel edificio exigen `z=16` y `mapLevel=EDIFICIO`; el guion móvil
  emula tacto. Evidencia real separada de pruebas con imágenes simuladas.
- A sigue siendo la hipótesis que se prueba; el contrato opt-in no demuestra
  que B sea inferior. Cambiar el recorrido requeriría evaluar y documentar ese
  contrato, no descartar B por una restricción técnica inmutable.
- La comprensión, NVDA y móvil físico deben probarse sobre esta nueva interfaz
  cuando se publique. Las pruebas de una versión anterior no la validan.

## 14. G13 — pasada de producto (marca, callejero, reproducción, titular)

- **Marca → portada**: «Más joven que tú» en el resultado es un enlace real a
  la portada que conserva año y municipio en sesión (precargados en el
  formulario) y limpia la query — recargar no re-entra al resultado.
- **Selector de municipio**: estado y sugerencias en un popup absoluto bajo el
  input; el campo no se mueve ni empuja el formulario al escribir.
- **Callejero municipal (ADR-020)**: sugerencias desde la capa oficial de
  portales EUSTAT/NORA (`data/streets/<slug>.json`, los 112 municipios del
  catálogo — 6 340 calles, revisión cruzada CSV↔JSON sin diferencias de ids
  ni denominaciones vacías; no significa «toda Bizkaia»: Usansolo tiene
  callejero en la fuente pero queda fuera por el corpus de edificios),
  `pipeline/g6_streets.py`, QA en `data/qa/g6_streets.json`, manifiesto
  `data/manifests/eustat.callejero.nora.yaml`). Tolerante a tildes,
  mayúsculas y orden «tipo + nombre» (tipos extraídos del propio callejero);
  casi-matches ofrecidos, nunca autoseleccionados; editar el campo invalida
  la calle y todo lo derivado; número/Bis/enviar solo existen tras calle
  confirmada; «Bis» solo si la calle tiene portales bis. El id es la clave
  NORA (`Kalea-gakoa`): los portales se resuelven por `listPortals` como antes.
- **«Reproducir fotografías»**: avance por campañas reales con la sonda
  existente; encuadre, fecha nominal, vuelo, editor y licencia visibles; pausa
  y velocidad (lenta/normal/rápida); sin autoplay; bajo `prefers-reduced-motion`
  no hay reproducción automática (paso manual por rail/flechas); si falta
  cobertura se detiene con el aviso, nunca sustituye en silencio.
- **Titular llano**: «De los edificios actuales con año conocido, casi N de cada
  10 se construyeron después de que nacieras» con el % exacto como cifra de
  apoyo y un único «Sobre este dato» para recuento/cobertura/cálculo. Corregido
  «Aproximadamente casi» → «Casi».
- **Relato fundamentado**: la personalización fija el **resultado**
  (titular, cifra, cabezal inicial del reproductor, campaña sugerida),
  no la interfaz: el control temporal no repite la edad del usuario
  (G18-R).
- **i18n ES/EU**: `lang.svelte.ts` + `t()` con fallback por clave a ES;
  diccionario `eu.ts` (borrador asistido) con contrato estructural
  verificado (`verify:eu`). El selector ES/EU es visible en portada,
  resultado y `/como-lo-sabemos`; la preferencia (`mjt-lang`) y
  `<html lang>` se gestionan en el layout. Revisión automática ejecutada
  (contraste Itzuli de muestra + terminología oficial + QA visual G14);
  **sin revisión lingüística humana — no certificada idiomáticamente**
  (detalle y límites: UX_COPY §11, `evidence/eu/`).
- **Regresiones**: `scripts/g13_ux.mjs` (en CI), 35 checks + artefactos en
  `evidence/g13/`. Cubre además las correcciones de revisión: edición del
  campo invalida calle/portales/resultado (sin consulta stale), Número/Bis/
  enviar solo existen con calle confirmada, orden «tipo + nombre» y
  «nombre + tipo» en ambos idiomas, Atrás/Adelante restauran la fase que
  pide la URL, la reproducción se detiene ante falta de cobertura sin
  sustituir la imagen y una elección manual toma el control.
# Verificación automática adicional — 2026-09-21

Por decisión del usuario no se planifica revisión humana de la traducción EU.
Esto no equivale a certificación lingüística ni cierra las pruebas pendientes
de comprensión, NVDA o móvil físico. El diccionario EU existe como borrador
asistido (2026-09-21): `verify:eu` pasa y el selector ES/EU está activo; la
calidad idiomática sigue sin verificación humana y el proyecto no la declara
cerrada.

Revisión automática ejecutada, con estas limitaciones (2026-09-21):

- **Itzuli** (`es2eu`, Playwright): 25 claves de muestra con riesgo
  semántico; 24 `translated` + 1 `reused` (texto idéntico). Cada salida se
  lee del cuerpo del POST emparejado por entrada — no del área de salida.
  Mejoras aplicadas y divergencias documentadas en `evidence/eu/itzuli.*`.
- **Terminología oficial** (fichas Eustat, datasets EU Open Data
  Bizkaia/datos.gob.es, capas geo.bizkaia.eus, DPD): términos conformes y
  dos correcciones — `jende-basoa`→`baso publiko` (título oficial del
  dataset), `geokodetzailea`→`kale-izendegia` (nombre oficial NORA).
  Registro: `evidence/eu/terminology.md`.
- **QA visual** (`g14_eu_qa.mjs`): 101 checks, matriz explícita de 11
  superficies con precondición (`need`) y postcondición (`expect`) por
  escenario — la ausencia de un control falla, no se omite. Escritorio
  1440 px y **móvil táctil real** (390 px, `isMobile`+`hasTouch` en el
  contexto, no en `viewport`). Por superficie: `lang=eu`, sin overflow,
  sin placeholders, `%` en convención vasca, detección de fugas conocidas
  (fragmentos ES largos + etiquetas cortas con borde de palabra +
  literales ES de datos, en texto y atributos accesibles), cero
  pageerrors. En CI con `CI_STUBS=1`. Capturas + `report.json` en
  `evidence/eu/qa/`.
- Limitaciones: muestra Itzuli dirigida (25/≈290 claves), dominio general,
  Euskalterm consultado vía fichas indexadas (su formulario no es
  consultable por script), la detección de fugas cubre patrones conocidos
  — no garantiza ausencia de castellano — y el QA mide fugas/overflow, no
  naturalidad. Desbordamientos en móvil: **comprobados** en las
  superficies del gate.

`python scripts/verify_street_source.py --live` compara el CSV oficial con
su SHA fijado y todos los municipios/calles del catálogo: IDs, nombres ES/EU,
recuento de portales y presencia de bis. No escribe ni regenera datos. Una
fuente inaccesible o modificada falla: debe investigarse, no actualizarse el
hash para lograr un verde. CI ejecuta este contraste. No verifica cada portal
contra NORA ni acredita todas las vías sin portales.

`npm run verify:eu` exige un diccionario EU real y comprueba claves,
placeholders, textos vacíos y caracteres de sustitución. Pasa sobre
`src/lib/i18n/eu.ts`; no se interpreta el fallback castellano como
traducción. Estos controles estructurales no verifican gramática ni
equivalencia semántica: el estado lingüístico es NO VERIFICADO.
# Ajuste de continuidad visual — 2026-09-21

Regresión reproducible desde `app`: `node scripts/layout-continuity.mjs`,
sobre build reciente.
Admite `LAYOUT_URL` para un servidor de desarrollo. Comprueba altura estable
en cuatro campañas (1945, 1956, 1989 y 2025), ES/EU, 1440/390 px, ficha
visible/cerrable y ausencia de errores JS, con servicios externos simulados.

La cabecera de fotografías usa posiciones independientes para navegación,
distancia al nacimiento y fuente. Reserva espacio para varias líneas sin
truncar metadatos; la velocidad permanece visible al pausar y los controles
reservan altura para reducir desplazamientos durante la carga.

Las fichas de zona y edificio aparecen en el lateral del resultado en
escritorio (desde 1024 px), y en un panel inferior fijo, desplazable y
cerrable en pantallas estrechas (máximo 40svh). La ficha de edificio ya no
se duplica en BelowFold. Seleccionar explícitamente una zona o edificio en
el mapa limpia la selección del otro tipo. En escritorio una selección
nueva fuera de pantalla se lleva a la vista sin animación; actualizar sus
datos no repite el desplazamiento. El contexto ampliado permanece bajo
el mapa, con su carga perezosa existente.
# Navegación y lectura personal — 2026-09-22

- Portada: campos alineados por arriba y confirmación de municipio en una
  fila propia con espacio reservado; no desplaza el input al seleccionar.
  Editar el nombre invalida la selección a efectos de enviar el formulario:
  hay que escoger un resultado, no se reutiliza silenciosamente el anterior.
- Edificios y Evolución comparten un único reproductor temporal encima
  del mapa (G18: `EvolutionTimePlayer`; antes `Timeline`).
  Recuento y cobertura se leen sin abrir «Sobre este dato»; el desplegable
  conserva el desglose y las limitaciones.
- Confirmar «Cambiar año o lugar» pausa y reinicia el visor en Edificios,
  sin conservar el final de una reproducción anterior. Escribir una
  dirección pausa el tiempo y las fotografías; se puede reanudar mediante
  Reproducir. Un portal con punto válido lleva la escena a la vista, sin
  reanudar automáticamente. Sin punto válido no se inventa ubicación.
- Los cambios de fragmento de URL (p. ej. Datos utilizados) no restauran
  municipio, año ni modo: no se tratan como otra búsqueda.
- Población, vivienda y planeamiento explicitan fechas y alcance. El
  planeamiento se presenta en lista con una advertencia visible: no son
  obras confirmadas. La historia de Muskiz describe el registro de los
  edificios actuales, no el nacimiento de una localidad.

Regresión: desde `app`, `node scripts/ux-navigation-regression.mjs` contra
build reciente; `UX_URL` permite usar desarrollo. Servicios externos
simulados, catálogo local real; escritorio y móvil emulado.
# G15 — editor atómico, historial coherente y mapa en primera pantalla — 2026-09-22

Corrección de defectos confirmados en auditoría (sin commit ni despliegue
en esta ronda):

- **Editor «Cambiar año o lugar» con borrador independiente.** Antes,
  `PlaceSearch.choose()` llamaba `app.resolvePlace()` al elegir de la
  lista: dentro del editor eso mutaba el estado confirmado y la URL antes
  de «Aplicar», y cerrar no revertía. Ahora `PlaceSearch` acepta modo
  `draft` + `bind:value`/`bind:picked`: el candidato vive en `ResultView`
  hasta confirmar. Cancelar descarta el borrador (ninguna escritura en
  `app`); confirmar sin cambios no muta ni crea entrada de historial;
  confirmar una búsqueda distinta llama `app.commitSearch(p, y)` — año y
  lugar se escriben en el mismo turno, con reset completo de escena si el
  lugar cambia (`selectPlace`) y reinicio de escena si solo cambia el año.
  El nombre escrito sin seleccionar bloquea la confirmación con error en
  línea (`search.choose_from_list`), igual que en portada; el mensaje va
  asociado al campo (`aria-invalid` + `aria-describedby` → `#edit-place-err`)
  y se limpia en cuanto el borrador vuelve a ser una opción elegida, sin
  esperar a otro envío.
- **Historial**: cada commit de búsqueda incrementa `searchNavSeq` → un
  único `pushState` con el estado final (año + lugar + cámara). Atrás
  restaura la búsqueda anterior completa y Adelante la nueva; ya no puede
  existir el estado fantasma «lugar nuevo + año viejo» (el pick intermedio
  ya no reescribe la entrada vigente). El contrato queda en ADR-019 §5.
- **Composición móvil** (≤1023 px apilado): la escena se ordena selector
  de modo → explicación del mapa → lienzo → controles contextuales, y el
  bloque «invitación + Comparar fotografías + nota de campaña» pasa a
  `.explore-tail` tras el mapa. El reorden es de **DOM** (snippet
  `modeControls` montado según `stacked`), no solo visual: Tab y lectores
  recorren lo mismo que se ve. En escritorio el orden no cambia.
  Criterio fijado antes de tocar CSS: que el lienzo sea visible en la
  primera pantalla del caso de referencia (390×844).
  Medido: `mapband` sube de y≈1064 a y≈577 y el lienzo completo (240 px)
  queda visible en el primer viewport, ES y EU; en 360×844 top≈603 con el
  lienzo entero; en 768×844 top≈726 con ~118 px visibles de un lienzo de
  472 px. La explicación de los cuadrados y la leyenda siguen visibles;
  no se recorta texto ni se ocultan controles tras un menú.
- Regresión: `ux-navigation-regression.mjs` cubre pick-sin-confirmar,
  cancelar, año inválido, escrito-sin-seleccionar, commit único,
  Atrás/Adelante con cámara, cambios parciales, deep link recargado y
  portada↔resultado. `g14_eu_qa` corrige su escenario `building` (scroll
  al lienzo + espera de `idle`) — el fallo era del test, no del producto.
- **G15b — coherencia de reproducción tras remontaje.** Cruzar el
  breakpoint de 1023 px remonta los controles contextuales; el
  intervalo del reproductor temporal es local al componente, así que al montar se
  reconcilia con el estado global: `playing` activo reanuda desde el
  `playYear` vigente (sin reiniciar ni duplicar temporizadores), y con
  `prefers-reduced-motion` o reproducción terminada queda pausado de
  forma explícita — nunca «Pausar» con año congelado. En `PhotoPanel`
  la reproducción es local: el cruce la pausa explícitamente (botón
  «Reproducir fotografías», `aria-pressed=false`) mientras campaña,
  etiqueta y velocidad sobreviven (`app.photoSpeed`). El foco dentro de
  un control se anota antes del cambio de breakpoint y se devuelve al
  elemento equivalente tras el remontaje (en `onDestroy` el
  `activeElement` ya es `body`; el `Lazy` puede tardar unos frames, así
  que el reintento es breve y solo si el foco no se movió a otra parte).
  Además `narrow`/`stacked` se inicializan en la primera evaluación —
  leerlos solo en `$effect` provocaba un remontaje gratuito al cargar
  en móvil. Y `.mapband` en apilado usa `min-height` en vez de `height`
  fija: la altura rígida hacía desbordar la nota `.universe` sobre los
  controles (interceptaba clics reales).
- **G15c — identidad de acción y movimiento reducido en sesión.** La
  restauración de foco ya no usa clases compartidas (devolvía el foco a
  «Reproducir» estando en «Cuando tenías 10 años»): cada acción lleva
  `data-action` estable (G18-R: `play`, `step-back/fwd`, `scrub`, `info`;
  `prev/next`, `speed`, `compare`, `overlay`, `panel-a/b`,
  `alt`+`data-year`, `retry`, `hide`, `exit`) y el remontaje devuelve el foco a la
  misma acción; si desapareció, al primer control del panel. Además,
  activar `prefers-reduced-motion` a mitad de reproducción detenía el
  botón pero no el temporizador: ahora `playing` pasa a pausa
  explícita conservando el año, y desactivar la preferencia no reanuda
  solo. En `PhotoPanel` el mismo cambio pausa y limpia su intervalo.
  Regresión: identidad exacta del foco en ambos sentidos y ES/EU,
  RM activado/desactivado en sesión en ambos paneles.

# G16 — referentes oficiales y fuentes candidatas — 2026-09-22

Ronda de mejora guiada por benchmark (Swisstopo, IGN «Remonter le
temps», comparador geoEuskadi, Layers of London, The Pudding; ver
`docs/research/REFERENCE_PRODUCTS.md` §5). Sin cambios de sistema visual,
métricas ni fuentes incorporadas.

## Implementado

- **Zona destacada → fotografías (P1-A/P1-D).** `CellDetail` gana
  «Ver esta zona en fotos» (`map.cell.photos`, `data-action="cell-photos"`):
  conserva la selección (volver al mapa devuelve la ficha), encuadra la
  celda a z 13.2 — nunca ≥13.5, que limpiaría la selección en moveend —
  y sondea la campaña EN el centro de la zona (`app.orthoPoint`), no en
  el centroide municipal. `Hotspots` gana la misma acción por ítem
  (`data-action="spot-photo"`) más una referencia territorial neutral
  verificable (`hotspots.zone/ref/center` + `dir.*`: número de zona y
  distancia/cardinal desde el centro — las celdas no tienen nombre
  oficial y no se inventan barrios). Un solo camino de selección: la
  lista llama al mismo `go()` que el mapa.
- **Hitos vitales → campañas reales (P1-B).** ~~Fila de chips en
  `PhotoPanel` (`photo.ms.*`)~~ **retirada en G18-R**: los atajos
  biográficos convertían el selector temporal en un dashboard. La
  propuesta inicial ya no compite con el rail — la campaña sugerida al
  entrar es la más cercana al año elegido (`app.nearest`) y el rail es
  el único selector. La regla de proximidad se conserva en
  `nearestCampaign()` (empate → anterior, regla del pipeline).
- **Swipe con dos imágenes elegibles (P1-C).** `SwipeControls` (patrón
  IGN «Fond 1 / Fond 2»): «Primera imagen» fija `app.swipeBefore` y
  «Segunda imagen» `app.orthoCampaign` (sondeada por `setSwipeAfter`).
  Opciones mutuamente excluyentes; `defaultSwipeBefore()` centraliza la
  heurística (más cercana al año ≠ «después» → anterior a «después» →
  BFA 1956). Chip derecho honesto: dice «Actualidad · {year}» solo si la
  imagen 2 ES la última campaña; si no, el año. `swipe.only_after` y
  `swipe.slider` pasan a llevar el año real. En URL, `ortho`/`ortho2`
  sirven a ambos comparadores: en FOTO son campaña+pareja del dúo; en
  SWIPE imagen 2/imagen 1 (solo si el usuario la eligió — la heurística
  se re-deriva).
- **Punto de sonda único (G16b).** `app.orthoPoint` es el punto donde
  rige la afirmación de cobertura. Lo fija una acción («Ver esta zona en
  fotos»), la cámara de la URL al restaurar (`lat/lon` válidos = el lugar
  mostrado, sin parámetro extra) o el centro de `app.view`. `probeOrtho`
  lo reescribe con el punto comprobado; en `moveend`, si la cámara se
  aleja >0,5 km del punto sondeado, se re-sondea en el nuevo centro —
  discreto por moveend, nunca continuo — y la sonda «antes» del swipe
  reacciona al mismo `orthoPoint` (respuestas tardías descartadas por
  `probeSeq`/`AbortController`). `orthoPoint`/`swipeBefore`/`photoView`
  se resetean con lugar/año y entran en el snapshot de historias.

## Descartado / diferido

- «Tu recorrido» (P2-A): la URL ya restaura lugar/año/modo/campañas; un
  panel extra duplicaría el titular y arriesgaría prometer restauración
  incompleta.
- Reescritura de historias (P2-B): los capítulos ya responden
  dónde/dato/relación/observable/desconocido/fuente; reescribir sin
  revisión editorial añade riesgo.
- Fototeca geoEuskadi (vuelos 1945–91): fotogramas SIN ortorrectificar
  → no entran en el swipe; viabilidad documentada en
  `docs/research/G16-SOURCES.md` como enlace al visor oficial por
  historia concreta. **Estudiada, no incorporada.**

## G16b — corrección de hallazgos (2026-09-23)

Revisión posterior encontró tres defectos que la ronda inicial no
detectaba:

- **Cobertura tras recarga.** `orthoPoint` no se restauraba desde la
  URL: la sonda caía al centro de `app.view` (centroide en arranque).
  Corrección: `applyUrl` fija `orthoPoint = [lon, lat]` de la cámara
  válida en `view=photo|swipe`, y `moveend` re-sondea si la cámara se
  aleja >0,5 km (`distM`). El contrato se verifica sobre las
  coordenadas de la PETICIÓN real (tesela z15), no sobre el estado.
- **Foco de hitos.** `controlFocusSel()` ignoraba `data-ms`: todos los
  hitos compartían `[data-action="milestone"]` y el foco caía al primero
  al cruzar el breakpoint. Corrección: el selector incluye `data-ms`
  (identidad estable, invariable al idioma); los selectores de swipe ya
  llevaban `data-action="swipe-first|second"`. **G18-R**: los hitos se
  eliminaron; la identidad de acción es `data-action`+`data-year`.
- **Edad nominal.** `msAge()` comparaba `Campaign.year` con el año de
  nacimiento («Campaña 1956 · aprox. 4 años después» con vuelo
  1953–1955). Corrección: `milestoneCaption()` muestra el intervalo de
  vuelo cuando `flight_range` lo publica y marca «año nominal» cuando
  no; títulos de proximidad + nota aclaratoria. **G18-R**: la línea
  `.meta` del panel conserva esa honestidad («{año} · {fuente} · vuelo
  {rango}» / «· año nominal») sin capa biográfica; el detalle completo
  vive en el disclosure «Fuente y detalles».

## Verificación

- `check` 0 errores (2 warnings preexistentes) · `lint`/`format:check`
  limpios · `test` 234+15 PASS (`milestoneCampaigns`, `defaultSwipeBefore`,
  `zoneRef`, `milestoneCaption` ×10, `flightSuffix` ×4).
- `g16_product.mjs`: 46 PASS — incl. regresiones G16b: sonda por
  coordenadas de petición reales (tesela z15 de zona ≠ centroide, stub
  diferenciado AVAILABLE/NOT_COVERED), recarga conserva punto y
  resultado, re-sonda al alejar la cámara, foco por identidad de acción
  en ambos sentidos del breakpoint + EU + swipe-first/second +
  alternativa coherente + no robo de foco.
- Regresiones intactas: `ux-navigation-regression`, `g13_ux`,
  `g14_eu_qa` 101 checks, `layout-continuity` 6 PASS, `verify-eu`.
- Evidencia: `evidence/g16/` (hotspots.png, milestones.png,
  swipe-controls.png, swipe-page.png).

## G16c — solape del comparador en móvil y QA Android (2026-09-23)

QA en Chrome 109 real dentro de Android Emulator (AVD `hbo`, Pixel 5,
Android 13, viewport CSS 393×722 @2.75). En producción (25452e0) el
comparador se desbordaba por debajo del canvas: `SwipeCompare` se montaba
sobre `.mapcell`, que en móvil incluye la leyenda y `«Ver datos de esta
zona»` bajo el mapa — `.swipe{inset:0}` cubría 403 px sobre un canvas de
240 px y sus controles (chips, presets, handle) interceptaban toques de
la leyenda y del botón de celda. Agravante: `.mapband{height:50svh}`
fijaba una altura menor que su contenido en flujo (mapa + leyenda).

El mismo desborde bloquea toques en otras vistas de producción (no solo
el comparador): en `time` y `photo`, `p.universe` de la leyenda queda
encima del botón de reproducción (`elementFromPoint` sobre el centro del
botón devuelve el `<p>`, no el botón) y de la navegación de campañas —
los clics reales nunca llegan, verificado por timeouts de actionability,
no por «carga lenta».

Corrección estructural (sin tocar `z-index`):

- `MapView` acepta un snippet `overlay` que se renderiza **dentro** de
  `.mapwrap`: la cortina hereda exactamente la caja del canvas y su
  `overflow:hidden`.
- `ResultView` pasa `SwipeCompare` como overlay; `.mapband` pasa a
  `min-height: 50svh` (la leyenda en flujo empuja, no se solapa).
- `.cell-inspect` se suprime en modo `swipe` (quedaría flotando sobre
  los controles del comparador).

Regresiones nuevas (g16_product.mjs y g16c_android.mjs):
`swipe_box_eq_canvas` (caja `.swipe` ≡ `.mapwrap` ±3 px),
`legend_below_canvas`, `cellinspect_hidden_in_swipe`,
`canvas_size_matches` (CSS == `.mapwrap` en ambos ejes y bitmap == CSS ×
dpr). Auditoría de toques por `elementFromPoint` sobre el centro de la
parte visible de cada control; solo se descarta (WARN) una cobertura
cuyo cobertor está comprobadamente dentro de chrome fijo/sticky
(`.vtoolbar`, `.vmenu`, `.selection-panel`, `.celldetail`) — cualquier
otra es FAIL. El proceso sale con código ≠ 0 si hay algún FAIL, y cada
paso previsto se registra como PASS/FAIL/SKIP/BLOCKED — ninguna omisión
silenciosa. Las acciones se verifican por efecto real: `app.playing`,
año de campaña mostrado, `app.selectedCell`, `app.year` + kicker,
`html lang`, `app.place.slug`.

Además: `probeOrtho` ahora resetea `orthoState='UNKNOWN'` y
`orthoAlternatives=[]` al iniciar y al aceptar cada sonda — antes los
avisos y campañas alternativas del punto anterior sobrevivían durante la
nueva comprobación (`probeB_clears_old_state`, `probeC_late_B_ignored`,
`probe_recovery_no_stale_notice`, `swipe_both_probe_same_point`).

### G16c — campaña fallida en el comparador (cierre)

El estado detectado en `local-06-comparador-dom.png` (campaña 2025
fallida, mapa de edificios a la derecha etiquetado «Actualidad · 2025»)
queda corregido distinguiendo **solicitada / verificada / no disponible /
respaldo** por lado:

- Lado «después» (lienzo principal): con `orthoState` en
  `NOT_COVERED`/`SERVICE_ERROR` el chip derecho muestra
  `Mapa · {year} sin imagen` (`.chip.miss`, estilo de aviso) — nunca
  `swipe.today`; el preset derecho pasa a «Solo el mapa» (sigue
  funcionando y dice lo que revela), el `aria-label` del slider nombra
  «mapa de edificios» a la derecha (`swipe.slider_map`) y la atribución
  `.src` declara el respaldo (`swipe.src_map`).
- Lado «antes» (cortina): con `app.swipeBeforeState === 'error'` la
  cortina queda oculta y desaparecen chip, divisor, handle y presets —
  no hay comparación que prometer. La imagen válida del otro lado
  conserva su etiqueta.
- Avisos: sacados del overlay absoluto (`.swipe-msg` eliminado) al panel
  en flujo `SwipeControls` (`.sw-status`) — no pueden tapar chips ni
  controles; cada fallo muestra «Reintentar» (`.sw-retry`): el lado
  «después» re-sondea con `probeOrtho`, el «antes» incrementa
  `app.swipeBeforeRetry` y el efecto de `SwipeCompare` repite la sonda
  en el mismo `orthoPoint`. `swipeBeforeState`/`swipeTilesReady` viven en
  el estado global precisamente para que el panel los declare.
- `swipe.after_error` ahora dice explícitamente que a la derecha se
  muestra el mapa de edificios, no la ortofoto pedida.

Regresiones (`swfail_*` en `g16_product.mjs`, con stubs dirigidos por
lado): ambos lados caídos, solo el «antes», solo el «después»,
recuperación por reintento de cada lado, respuesta tardía de una sonda
reemplazada (`swfail_late_probe_ignored`), aviso fuera del lienzo
(`swfail_notice_outside_canvas`) — contenido y etiquetas, no geometría.

Veredicto del harness Android ahora se **calcula**: totales
PASS/FAIL/SKIP/BLOCKED desde el registro, lista de comprobaciones
obligatorias (una omitida es `FAIL missing_*`), `pageerror` capturado en
todas las páginas y tras reconexiones (cada uno es FAIL), controles
esperados ausentes → FAIL en local (SKIP solo en prod con justificación
de versión), sin clics forzados como prueba de pulsabilidad, reproducción
exige avance de `playYear` y estabilidad tras pausa, rotación exige
transición efectiva a horizontal y regreso, `font_scale` exige cambio
medible del texto web (`texto130_effective`) y el IME
sigue BLOCKED hasta observar el teclado abierto (`mInputShown` +
`visualViewport`). Salida: `VEREDICTO: COMPLETO|PARCIAL|FALLO`, exit 1
con FAIL, exit 2 si PARCIAL — nunca «ALL PASS» con el teclado bloqueado.
Precisión sobre `texto130_effective`: lo observado es un aumento del H1
de 19.52 a 20.87 px (~7 %) tras `font_scale` 1.3 — demuestra que la
preferencia produce *algún* crecimiento del contenido web en este
Chrome, **no** una ampliación efectiva del 30 %.

Límites del entorno: el IME virtual no abre bajo foco sintético CDP en
este AVD (BLOCKED `teclado_ime` — no validado); `font_scale` en caliente
mata el renderer de Chrome 109 (la auditoría a 1.3 se hace tras
recargar); `elementFromPoint` no equivale a un toque táctil real ni
detecta ventanas del sistema; emulador ≠ dispositivo físico ni NVDA.
Además los servicios de imagen externos apenas responden en el
emulador — solo la tesela BFA 1956 tiene contenido real en Getxo; las
sondas de 2025/1983/2002 devuelven NOT_COVERED/SERVICE_ERROR reales. Ese
fallo real valida el *tratamiento del error* en el comparador. **Causa
del fallo en el emulador: no determinada** — que ambas imágenes
verifiquen desde escritorio demuestra disponibilidad en ese entorno,
pero no descarta problemas de compatibilidad, red, tiempo de espera o
lógica de la sonda en el AVD.

### Verificación post-despliegue (gh-pages `0ba99e7`, desde `1dee929`)

Desplegado y servido en Pages (`app.dKnqfed_.js` en `index.html`).
Corrección del harness incluida: `prod` ya no se trata como la versión
antigua — la presentación honesta del fallo y los controles G16 se
exigen también en el despliegue (un control esperado ausente es FAIL en
cualquier target).

- `g16c_android.mjs prod` post-despliegue (`qa-prod4-postdeploy.log`):
  **31 PASS · 0 FAIL · 0 SKIP · 1 BLOCKED → PARCIAL** (exit 2).
  `swipe_box_eq_canvas`/`legend_below_canvas` PASS en producción;
  `swipe_failed_honest`, `swipe_failed_notice_in_flow`,
  `swipe_failed_recovers` PASS; chip honesto observado con sonda real
  (`Mapa · 2025 sin imagen`); `teclado_ime` sigue BLOCKED.
- Ambas imágenes **reales** confirmadas en producción desde escritorio
  (Chromium, sin stubs, `scripts/_prod_swipe_real.mjs`):
  `orthoState=AVAILABLE` (2025, geoEuskadi) y `swipeBeforeState=ready`
  (1956, BFA), chips `1956` / «Actualidad · 2025» —
  `prod-06e-comparador-real-dom.png`. Esto no invalida el fallo
  observado en el emulador (causa no determinada, arriba).
- Pendiente sin ronda nueva: IME virtual, toques táctiles reales,
  dispositivo físico, NVDA.

- `g16_product.mjs`: **67 PASS** · `g16c_android.mjs` local: **31 PASS ·
  0 FAIL · 1 BLOCKED → VEREDICTO PARCIAL** (exit 2; prod pre-despliegue
  reproducía `swipe_box_eq_canvas`/`legend_below_canvas` FAIL, exit 1).
- Evidencia: `evidence/g16c/` — `prod-06-comparador-dom.png` (antes:
  `cell-inspect` sobre la cortina, cortina 164 px por debajo del canvas)
  vs `local-06-comparador-dom.png` / `local-06b-comparador-fallo-dom.png`
  (después: cortina acotada; fallo de campaña declarado con chip
  «Mapa · 2025 sin imagen» y aviso+reintento en el panel, nada sobre el
  lienzo), `stub-06-comparador-ambas-dom.png` (ambas imágenes
  verificadas con servicios stub — etiquetado como tal) y
  `prod-06e-comparador-real-dom.png` (ambas imágenes reales en Pages);
  logs `qa-local*.log` / `qa-prod*.log` (locales, `*.log` no se
  versiona); recorrido `local-01…15` (screencap de dispositivo, pueden
  incluir diálogos ANR del sistema — son entorno, no app; las capturas
  `*-dom.png` son a nivel de página y no incluyen UI del sistema).

# G18 — reproductor temporal tipo «imágenes históricas» — 2026-10

Rediseño de la interacción temporal de **Evolución** con el modelo de
interacción de las imágenes históricas de Google Earth como referencia
conceptual (no visual: ni colores, ni branding, ni layout).

**G18-R (revisión)**: la primera iteración interpretó «personalizar por
edad» demasiado literalmente — hitos vitales (Naciste · 10 · 18 · 30 ·
50 · Hoy), contexto «tenías N años», cards de campaña biográficas y
CTAs redundantes convirtieron el tiempo en una infografía sobre el
usuario. Corrección aprobada: **el tiempo es un control, no una
biografía**. La personalización decide el resultado inicial (año,
titular, campaña sugerida); no contamina el control.

## Evolución — un único control continuo

- **Un único control** (`EvolutionTimePlayer.svelte`, sustituye a
  `Timeline.svelte`): play/pausa con icono + `aria-label` dinámico, año
  actual grande y scrubber `input[range]` nativo sobre eje 1900→snapshot
  (`AXIS_MIN`/`playbackTickMs`/`clampYear` en `timeplayer.ts`). Teclado:
  flechas ±1, PageUp/Down ±10, Home=año elegido, End=actualidad.
- **Sin capa biográfica**: ni hitos de edad, ni «tenías N años», ni
  «antes de nacer», ni «Volver al presente» (el final del slider ES la
  actualidad), ni caption permanente dentro del control. La explicación
  metodológica vive en el disclosure `ⓘ Qué muestra esta vista`,
  cerrado por defecto.
- **Marcador sutil del año elegido** (`.ymark`) sobre el eje — única
  huella de personalización en el control. Ticks de década
  proporcionales, con año completo de 4 dígitos (regresión «45»); en
  pantallas estrechas los ticks menores se ocultan.
- **Altura contenida**: toolbar compacta inmediatamente encima del
  mapa en apaisado (~64–90 px); en apilado (≤1023 px) queda debajo del
  lienzo por decisión G15.
- **Duración**: ~140 ms/año — recorrido año elegido→actualidad ~10 s;
  el final detiene exactamente en `snapshot_year`. Play en actualidad
  reinicia desde el año elegido.
- **Semántica intacta**: el cabezal proyecta el **stock actual** por
  `Ano_Constr ≤ play_year` — nunca «así era Bizkaia». `play=` a URL solo
  en eventos discretos (`playUrlSeq`): commit de scrub, tecla,
  play/pausa/fin — nunca por tick ni por frame de arrastre.
- **Modo**: entrar en Evolución ancla el cabezal pausado al año
  elegido; salir pausa; nunca arranca solo. Reduced-motion: sin Play —
  pasos ±1 y slider operativos con nota accesible; activarlo en sesión
  congela el temporizador conservando el año.

## Fotos aéreas — rail discreto de campañas

- **Rail proporcional** (`PhotoPanel.svelte`): las campañas se
  distribuyen por año real sobre el rango completo (1945→2025), no en
  una fila equidistante que usaba una fracción del ancho. Etiquetas de
  4 dígitos siempre.
- **Un range input transparente** (`.pscrub`) cubre el rail: clic,
  toque, arrastre y teclado (flechas/Home/End) hacen **snap exclusivo a
  campañas reales** (`nearestCampaign`); clic o Enter sobre la campaña
  ya destacada la activa — el range nativo no emite `input` sin cambio
  de valor, así que `click`/`keydown` también confirman.
- **Sin cards ni CTA redundantes**: eliminados «Cerca de tu
  nacimiento/10/20 años», «La imagen más reciente» y «Comprobar desde el
  aire» (el modo foto YA es comprobar desde el aire). Anterior/siguiente
  y play/pausa de campañas quedan integrados en la barra.
- **Metadata secundaria**: una línea `{año} · {fuente} · vuelo {rango}`
  / «· año nominal»; licencia y detalle completo en el disclosure
  «Fuente y detalles». En móvil la meta se mantiene en una línea con
  elipsis — el detalle sigue accesible.
- **Playback local al panel**: avanza campaña a campaña solo tras
  `AVAILABLE`; reduced-motion lo suprime.
- **Contrato de sonda intacto** (G16): `orthoPoint`, re-sonda por
  moveend >0,5 km, `probeSeq`/abort, estados AVAILABLE/NOT_COVERED/
  SERVICE_ERROR explícitos — nada de esto cambió.

## Transversal

- **Fix de history (transversal, no de UI)**: `commitSearch` muta
  `place`/`view` de forma síncrona y el `moveend` del fitBounds disparaba
  `syncUrl(false)` → `replaceState` **antes** del `pushState` del efecto
  — pisaba la entrada de history anterior con la URL de la búsqueda
  nueva (Back caía en una entrada corrupta y `place` no se restauraba).
  `app.searchCommitting` suprime los `replace` durante la ventana
  síncrona del commit; el push no se ve afectado. Detectado por
  `ux-navigation-regression` (Atrás desde Getxo no restauraba Muskiz).
- **Dominio**: eliminados `milestoneCampaigns`, `milestoneCaption`,
  `ageAt`, `msAge`, `msHitboxPct` y las claves i18n biográficas
  (`time.milestones.*`, `photo.ms.*`, `photo.check`). `relYearLabel`
  permanece — lo usa `PlaceContext` (censo/padrón).
- **Regresión**: `g18_timeplayer.mjs` reescrito (38 checks: estructura,
  ausencia de biografía, scrub, teclado, URL discreta, recarga, fin
  exacto, reduced-motion, móvil táctil, 320 px, etiquetas 4 dígitos).
  `g2a_play`, `g2b_views`, `g10_hardening`, `g13_ux`, `g16_product`,
  `g1r_ortho_preview`, `ux-navigation-regression`, `_audit_nav`
  migrados al contrato rail/`data-action`. `_audit_nav` mide la parte
  invariante del panel (barra+rail estables, sin recortes) y acepta la
  altura dependiente de estado.
- **Evidencia visual**: `evidence/g18/` (player-compact/mobile/end) +
  `evidence/g11r/` (photo-desktop/mobile/drag/focus/rm,
  player-playing/focus/rm).

# G19 — lienzo temporal: mapa + chrome, no página + mapa — 2026-10

Adjudicación visual de G18-R: los controles funcionaban pero la
arquitectura seguía siendo «página editorial + reproductor + mapa
incrustado» (sidebar ~400 px, varias filas antes del lienzo, controles
fuera del mapa). G19 cambia la jerarquía en los modos de visor a **mapa
a pantalla casi completa + chrome temporal superpuesto** (ADR-021). El
modelo de datos, la semántica temporal y el contrato de URL no cambian.

## Arquitectura

- **`.stage.viewer`**: en `time`/`photo`/`hist`/`swipe` el `.sidebar`
  editorial no se monta y la escena llena la primera pantalla (el stage
  mide su `offsetTop` y fija `min-height = viewport − top`; `.result`
  crece con los capítulos below-fold, así que `flex:1` solo no basta).
  El panel se recupera con `‹ Resultado · lugar · año` (ViewSwitch) o el
  modo `Edificios`.
- **Overlay dentro del lienzo**: `MapView` renderiza el snippet
  `overlay` dentro de `.mapwrap`; `.tclayer` (`inset:0`,
  `pointer-events:none`) lleva el control del modo y la ficha de
  selección flotante `.sel-float`. Contrato E2E: el chrome es
  descendiente de `.mapwrap` y su caja se superpone al lienzo.
- **`TemporalChrome.svelte`**: superficie oscura flotante compartida
  (`--ink` translúcido, no azul ajeno) — Play/Pausa · año grande ·
  rail · meta · `ⓘ`. Evolución = continuo; Fotos aéreas = discreto.
  Desktop: anclada arriba-izquierda; ≤1023 px: barra inferior sobre el
  borde del lienzo (`--tcbh` eleva atribución/escala de MapLibre).
- **`LayerToggles.svelte`**: popover de capas junto al zoom —
  `Fotografía aérea` + `Contorno de los edificios actuales`.

## Evolución

- El mismo control de G18-R (semántica, teclado, reduced-motion, URL
  discreta) re-presentado sobre `TemporalChrome`: flota sobre el mapa,
  disclosure `ⓘ` cerrado por defecto, marcador sutil del año elegido en
  el rail.

## Fotos aéreas

- Chrome primario reducido a `▶ ‹ año ›` + rail + `ⓘ`: fuera
  `Velocidad` (cadencia fija ~1,8 s), `Comparar` (existe `Antes /
  ahora`), `Ocultar` y `Contorno` (ambos → `LayerToggles`).
- **Rail de campañas**: etiquetas densidad-adaptativas — extremos
  siempre, majors si ≥42 px de cada etiqueta retenida; la campaña activa
  nunca repite etiqueta en el rail (el año grande es la fuente de
  verdad). Mata la colisión `1989/1990` por diseño.
- **Dúo conservado como capacidad**: `ortho2=`/historias (`air.c2`)
  siguen abriendo `CompareMap`; en ≤700 px el selector A/B es un chip
  flotante `.pvfloat` solo cuando el dúo está activo.

## Transversal

- `HistMapControls`/`SwipeControls` → tarjetas flotantes en `.tclayer`.
- `app.photoSpeed` eliminado; claves i18n nuevas `layers.*`,
  `map.legend.details`; retiradas `photo.duo_on/duo_off`,
  `photo.speed.*`, `photo.hide/show`, `photo.compare*`.
- Scripts migrados al contrato overlay: ver ADR-021 §Consecuencias.
- Medida: mapa ≈82 % del viewport en 1440×900; en 390 px el lienzo
  llena la primera pantalla con la barra inferior superpuesta.
- Evidencia: `evidence/g19/` (6 capturas de adjudicación).
- **No desplegado**: `00ca924` sigue siendo el baseline G18-R en la
  rama de desarrollo; `gh-pages` sigue en G18 (`5107a3f`).

## G19-R2 — shell común + barra temporal integrada — 2026-09

La adjudicación de G19 detectó que los modos de visor ya no parecían la
misma aplicación (columna desmontada = salto de arquitectura) y que el
chrome seguía siendo una cápsula-slider, no instrumentación
cartográfica. R2 corrige solo layout + temporal chrome (ADR-022):

- **Shell común en desktop**: la columna de resultado (300–340 px)
  permanece en los cinco modos; el lienzo en visor es
  `clamp(560px, 68svh, 760px)` — mapa protagonista sin devorar la
  página. La cabecera del visor es idéntica entre modos (`‹ Resultado`
  solo existe en apilado, donde la columna está desmontada). La ficha
  de selección vive en la columna; `.sel-float` solo en apilado.
- **Barra temporal de ~49 px** pegada al borde superior del lienzo
  (desktop) / borde inferior (apilado): Play + año (~20 px) + rail fino
  + `ⓘ`. Sin meta en la barra (`pubShort`/`flightShort` y las claves
  `ortho.publisher.short.*` retiradas — la procedencia completa vive
  tras `ⓘ Fuente y detalles`).
- **Rails**: Evolución = relleno en acento + thumb 13 px + ticks de
  década; Fotos = un tick por campaña real (etiquetas
  densidad-adaptativas, regla `LABEL_GAP_PX` conservada).
- Geometría medida (`evidence/g19r2/geometry.json`, 1440×900): lienzo
  `x=340, w=1100` en todos los modos; `h=611` en visor, `h=557` en
  `map` — la diferencia era la fila `.mapintro` (exigida por G12) y la
  adjudicación no la aceptó: R3 la resuelve con el `ModeIntroSlot`.
- Evidencia: `evidence/g19r2/` (6 capturas + geometría).

## G19-R3 — un solo reproductor, un solo lienzo — 2026-10

La adjudicación de R2 exigió identidad geométrica literal (±2 px entre
modos) y un único componente temporal visible (ADR-023):

- **ModeIntroSlot**: `.mapintro` existe en los cinco modos con la misma
  altura estructural (`min-height: 7.5rem` en desktop) — cada modo
  declara en una línea qué capa muestra el mapa (`view.intro.*`); en
  `Edificios` conserva la explicación completa de G12. Sin controles
  temporales en la franja.
- **Mismo lienzo**: `.mapband` comparte `min-height` en todos los
  modos; el reproductor es overlay dentro del lienzo, nunca en flujo.
- **`HistoricalTimePlayer`**: un solo componente (antes
  `TemporalChrome`) con anatomía fija `Play · ‹ · año · › · rail · ⓘ`
  en ambos modos. `mode="continuous"` (Evolución: eje anual + relleno +
  décadas) y `mode="discrete"` (Fotos: un tick por campaña real) solo
  cambian el track; el thumb es el mismo elemento dibujado por el
  player; el ⓘ es icono puro; bajo reduced-motion solo desaparece el
  Play y `‹ ›` quedan como paso manual.
- Geometría medida (`evidence/g19r3/geometry.json`, 1440×900): lienzo
  `x=340, y=271, w=1100, h=557` en los cinco modos (diferencia 0 px);
  `bar/play/prev/year/next/rail/info` con cajas idénticas entre
  Evolución y Fotos (0 px).
- Evidencia: `evidence/g19r3/` (8 capturas + 2 recortes del player +
  geometría).
