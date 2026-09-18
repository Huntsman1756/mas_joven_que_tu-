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
  mode: 'explore' | 'time-travel' | 'stories' | 'about';
  layer: 'buildings' | 'ortho';
  compare: { enabled: boolean; left: OrthoCampaign | null; right: OrthoCampaign | null };
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
/                      Hero — TU BIZKAIA
/explorar?...          Mapa + estadísticas + timeline
/tiempo?...            VIAJA EN EL TIEMPO (ortofotos + swipe)
/historias             HISTORIAS DEL CAMBIO (scrollytelling)
/historias/[slug]      Capítulo
/como-lo-sabemos       CÓMO LO SABEMOS  (primera clase, no pie de página)
/privacidad            Solo el año; nada se envía
```

### 3.1 TU BIZKAIA (`/`, `/explorar`)

- Hero con: título, pregunta, **[año de nacimiento]**, **[busca un municipio o lugar]**,
  CTA **Ver mi Bizkaia**.
- Resultado: titular personalizado + mapa + estadística principal + cobertura del dato +
  distribución por décadas + control temporal.
- Nunca pide nombre, email, fecha completa ni cuenta.

Titular (estructura, no cifra):

> «Eres de **1987**. En **Leioa**, **X de cada 100** edificios actuales con año conocido
> se terminaron después de que nacieras.»

Y debajo, no en letra pequeña:

> «Esto no significa que antes no hubiese construcción. El Catastro describe los edificios
> que existen actualmente.»

### 3.2 VIAJA EN EL TIEMPO (`/tiempo`)

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

### 3.3 HISTORIAS DEL CAMBIO (`/historias`)

- Scrollytelling breve. El orden y la selección salen de un método **dato-primero**:
  grid/hex → suma de huella de edificios actuales por década → delta temporal →
  candidatos → revisión con ortofotos → selección editorial.
- Diversidad buscada: urbana, industrial, residencial, costa/infraestructura, inesperado.
- Candidatos a *estudiar* (no elegidos de antemano): Abandoibarra, Zierbena/puerto,
  Zamudio/Txorierri, Galindo/Barakaldo/Sestao.
- Cada capítulo responde: qué vemos · cuándo cambia · qué dato lo sustenta · **qué no sabemos**.

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
