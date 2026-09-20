# PRODUCT — journeys, features y modelo de estado

> Documento canónico de producto. Se actualiza **junto con** `docs/UX_COPY.md`.

## 1. Modelo de estado (la pieza congelada)

Existe **un único estado temporal** visible: `year` (año elegido por el usuario).
Todo lo demás deriva de él.

```ts
type AppState = {
  year: number | null;        // año de nacimiento elegido. null = sin elegir
  place: Place | null;        // municipio o lugar de Bizkaia
  view: { lat: number; lon: number; zoom: number; bearing: number; pitch: number };
  // G4: una sola escena con cuatro modos mutuamente excluyentes (ADR-015)
  mode: 'map' | 'time' | 'photo' | 'hist';
  playYear: number | null;    // cabezal temporal; independiente de `year`
  orthoVisible: boolean;      // solo tiene sentido en mode='photo'
  orthoCompare: Campaign | null;
  histMapVisible: boolean;    // solo tiene sentido en mode='hist'
  story: StoryId | null;      // capítulo editorial activo (L4)
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

| Estado | Significado | Representación |
|--------|-------------|----------------|
| `OBSERVED` | Valor tomado directamente de la fuente | Se muestra tal cual |
| `DERIVED` | Calculado por nosotros a partir de observados | Se muestra con *¿Cómo se calcula?* |
| `UNKNOWN` | Fuente sin dato (p. ej. `Ano_Constr = 0` o vacío) | Estilo propio; nunca 0, nunca 1900 |
| `NOT_APPLICABLE` | La pregunta no aplica a esa entidad | No se muestra |

## 3. Áreas del producto

```
/                      Hero + resultado completo (una sola ruta, deep links)
/como-lo-sabemos       CÓMO LO SABEMOS  (primera clase, no pie de página)
```

Desde G4 el producto es **una sola página**. Las superficies de evidencia
(MAPA · TIEMPO · FOTO · 1923–25), las historias, MI EDIFICIO, DOS AÑOS y el
planeamiento viven en `/` y se direccionan por parámetros de URL
(`view=`, `story=`, `building=`, `compare=`, `ortho=`, `ortho2=`, `play=`).

### 3.1 TU BIZKAIA (`/`)

- Hero con: título, pregunta, **[año de nacimiento]**, **[busca un municipio o lugar]**,
  CTA **Ver mi Bizkaia**.
- Resultado (CUT B): titular personalizado + cobertura → escena única (mapa +
  ViewSwitch de cuatro modos + eje temporal) → tramo de lectura «La forma del
  parque» → tramo de acción «Tu lugar concreto» (MI EDIFICIO → DOS AÑOS) →
  tramo editorial (planeamiento municipal + historias).
- Nunca pide nombre, email, fecha completa ni cuenta.

Titular (estructura, no cifra):

> «Eres de **1987**. En **Leioa**, **X de cada 100** edificios actuales con año conocido
> se terminaron después de que nacieras.»

Y debajo, no en letra pequeña:

> «Esto no significa que antes no hubiese construcción. El Catastro describe los edificios
> que existen actualmente.»

### 3.2 VIAJA EN EL TIEMPO (modos `time`/`photo` de la escena)

- Selección de campaña; comparación de dos campañas; swipe antes/después.
- Autoplay opcional (solo si es técnicamente sólido y respeta reduced-motion).
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

| ID | Feature | Fase |
|----|---------|------|
| F-01 | Selección de año + lugar, sin cuenta | G1 |
| F-02 | Mapa de edificios por estado temporal (`≤ year`, `> year`, `UNKNOWN`) | G1 |
| F-03 | Estadística principal personalizada con denominador explícito | G1 |
| F-04 | Indicador de cobertura del dato (`known` / `unknown` / %) | G1 |
| F-05 | Histograma sincronizado con línea del año elegido | G1 |
| F-06 | Control temporal único | G1 |
| F-07 | Serie de ortofotos con selección de campaña | G2 |
| F-08 | Swipe antes/después (maplibre-gl-swipe) | G2 |
| F-09 | Fuente + fecha real de vuelo siempre visible | G2 |
| F-10 | URL compartible con `year`, `place`, `view` | G1 |
| F-11 | Scrollytelling con capítulos dato-fundados | G3 |
| F-12 | *Cómo lo sabemos* + disclosures *¿Cómo se calcula?* | G1/G3 |
| F-13 | Agregados multiescala (municipio / celda / edificio) | G1 |
| F-14 | Accesibilidad AA + alternativa textual | G4 |
| F-15 | Play/scrub temporal del stock actual por `Ano_Constr` | G2 |
| F-16 | Hotspots editoriales (señales internas → selección humana) | G2/G3 |
| F-17 | MI EDIFICIO: dirección exacta NORA→Catastro, fail-closed | G3-A |
| F-18 | DOS AÑOS: partición del stock actual con segundo año | G3-A |
| F-19 | URL compartible `compare=` / `building=` (sin texto de dirección) | G3-A |
| F-20 | «¿Y qué está previsto?»: resumen municipal de planeamiento vigente | G3-B |
| F-21 | Contexto local de planeamiento por edificio (PIP precalculado) | G3-B |
| F-22 | Contexto de espacio oficial de actividad económica (AE) | G3-B |
| F-23 | Visual opt-in: resalte de ámbitos/AE del edificio resuelto | G3-B |
| F-24 | MAPA HISTÓRICO 1923–25: cuarta superficie temporal opt-in | G3-C |

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
TIEMPO · FOTO · 1923–25 son cuatro modos mutuamente excluyentes de un solo
`ViewSwitch` (`app.mode`, `?view=`); la ortofoto solo existe en FOTO y el
mapa histórico solo en 1923–25, cuyo propio modo es el opt-in de red. Las
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
6. **Color funcional**: ~90 % neutros; el vino `#c63b4f` se reserva a dato, marca y
   estados. Sin degradados decorativos.
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
