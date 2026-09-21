# DATA_SEMANTICS — definición exacta de métricas

> Este documento es normativo. Si una métrica no está aquí, **no se muestra**.
> Cada cifra del producto debe poder mapearse a una fila de esta tabla.

## 0. Universo de datos (la regla madre)

```
CURRENT_BUILDING_STOCK != HISTORICAL_BUILDING_STOCK
```

El universo es el **parque de edificios existente en la capa catastral del snapshot**.
No es una reconstrucción histórica.

Consecuencias obligatorias:

- Nunca se dice «Bizkaia creció X %» ni «aquí no había nada» ni «el barrio nació en 1998».
- Nunca se infieren edificios desaparecidos.
- La ausencia actual de un edificio **no** implica que no existiera históricamente.
- Las ortofotos son evidencia visual del vuelo, no una capa de datos.

## 1. Entidades

| Entidad | Definición | Clave |
|---------|-----------|-------|
| `building` | Registro de la capa `Edificio` del Catastro del snapshot | `Codigo_Mun-Codigo_Pol-Codigo_Par-Codigo_Sub-Codigo_Edi` |
| `municipality` | Municipio de Bizkaia | `Codigo_Mun` (a conciliar con INE) |
| `ortho_campaign` | Campaña de ortofoto oficial | `{publisher}:{year_nominal}` |
| `footprint` | Polígono del edificio proyectado | — |

## 2. Campos de origen

| Campo | Rol | Semántica |
|-------|-----|-----------|
| `Ano_Constr` | **MÉTRICA PRIMARIA** | Año de construcción declarado en Catastro. `OBSERVED`. `0`/vacío ⇒ `UNKNOWN` |
| `Ano_Rehabi` | informativo | Año de rehabilitación. **No** cambia el año de construcción |
| `Ano_Reform` | informativo | Año de reforma. **No** cambia el año de construcción |
| `Ano_Calcul` | **NO USAR** | Semántica no documentada. Prohibido como métrica hasta documentarla |
| `Numero_Alt` | contexto | Nº de alturas sobre rasante |
| `Codigo_Uso` | contexto/filtro | Uso catastral. Tabla de códigos `PENDING` |
| `Categoria` | contexto | Categoría catastral |
| `Numero_Viv` | contexto | Nº de viviendas |

## 3. Clasificación temporal de un edificio respecto al año elegido `Y`

| Estado | Condición | Etiqueta de UI |
|--------|-----------|----------------|
| `BEFORE` | `Ano_Constr` conocido y `≤ Y` | «Ya existía en {Y}» |
| `AFTER` | `Ano_Constr` conocido y `> Y` | «Terminado después de {Y}» |
| `UNKNOWN` | `Ano_Constr` = 0/vacío/ilegible | «Año de construcción no consta» |

`UNKNOWN` **nunca** cuenta como `BEFORE`, ni como `AFTER`, ni como 0, ni como 1900.
`UNKNOWN` tiene color y leyenda propios.

Regla estricta de frontera: `≤ Y` es `BEFORE`; `> Y` es `AFTER`. Sin ambigüedad (`Y = 1987`:
un edificio de 1987 es `BEFORE`).

## 4. Métricas (todas con denominador explícito)

### M-01 `buildings_total`
Nº de edificios en el ámbito. `OBSERVED` (conteo).
Denominador de cobertura.

### M-02 `buildings_known_year`
Nº con `Ano_Constr` en rango válido. `DERIVED`.
Definición de válido: entero `≥ min_valid_year` y `≤ snapshot_year` (ver §5).

### M-03 `buildings_unknown_year`
`buildings_total − buildings_known_year`. Incluye `0`, vacío y valores fuera de rango.
`DERIVED`.

### M-04 `coverage_pct`
`buildings_known_year / buildings_total × 100`. `DERIVED`.
**Siempre** se muestra junto a M-01/M-02/M-03. Si `coverage_pct < umbral` (ver §7),
se activa el aviso de cobertura baja.

### M-05 `pct_built_after_Y`
```
pct_built_after_Y = buildings_AFTER / buildings_known_year × 100
```
`DERIVED`. **Denominador = edificios con año conocido, NO el total.**
Formulación de UI: «X de cada 100 edificios **con año conocido**».
Prohibido escribir «el X % de los edificios» si hay unknowns relevantes.

### M-06 `pct_built_on_or_before_Y`
`buildings_BEFORE / buildings_known_year × 100`. `DERIVED`. Complementario de M-05.

### M-07 `footprint_area_total_m2`
Suma de áreas de polígono del edificio. `DERIVED`.
**Es huella en planta. Prohibido llamarla "superficie construida".**

### M-08 `footprint_area_after_Y_m2` / `footprint_share_after_Y_pct`
Análogo a M-05 pero ponderado por huella. Mismo denominador restringido a conocidos.
`DERIVED`.

### M-09 `year_distribution`
Conteo de `buildings_known_year` por año/década. `DERIVED`.
El agregado canónico se calcula **por año**; la **vista principal de producto lo agrupa en los
buckets obligatorios de §14** (`<1900`, décadas desde 1900, y `SIN AÑO` aparte), y el eje Y es
el nº de edificios actuales.
La serie anual **no** se presenta como curva principal: sugeriría una precisión que el heaping
no sostiene. El año exacto se conserva para el filtro personal `> Y`.

### M-10 `dominant_decade(cell | municipality)`
Década **modal según el conteo de edificios** con año `VALID` de la celda/municipio.
`DERIVED`. Para agregados a zoom bajo.
**Corrección SPEC_CONFLICT-002:** versiones anteriores decían «de las huellas». El pipeline
de G0 calcula la moda por **conteo**, y es la métrica primaria de celda decidida en
`docs/design/G1-TU-BIZKAIA.md` §7. Una variante ponderada por huella sería **otra** métrica
(otro nombre, otro contrato), no una reinterpretación de esta. Ver `G1-TU-BIZKAIA.md` §16.

### M-11 `ortho_nearest(Y)`
Campaña de ortofoto cuyo año representativo minimiza `|campaign_year − Y|`.
`DERIVED`. Siempre se muestra el desfase con el año **calculado**:
«más próxima a {Y}: {nearest_year}» *(plantilla; nunca un literal de ejemplo)*.
Empate ⇒ se elige la campaña **más antigua** (`C-11`).
**Corrección SPEC_CONFLICT-001:** versiones anteriores de este documento usaban el literal
«1983» como ejemplo para `Y = 1987`. Con el catálogo congelado el resultado es **1990**
(`|1987−1990| = 3` < `|1987−1983| = 4`). El literal era un ejemplo ilustrativo, no un cálculo;
la fórmula no cambia. Ver `docs/design/G1-TU-BIZKAIA.md` §16.

### M-12 `building_year(selected)`
`Ano_Constr` del edificio seleccionado. `OBSERVED` o `UNKNOWN`.
Frase: «Este edificio consta como terminado en 1998.»

## 5. Año: estados de validez y política de anomalías

Cada valor de `Ano_Constr` se clasifica en **exactamente uno** de estos estados.
Ninguno se elimina ni se corrige en silencio.

| Estado | Definición | Uso en métricas |
|--------|-----------|-----------------|
| `VALID` | Entero en `[min_valid_year, snapshot_year]` | Cuenta como año conocido |
| `UNKNOWN` | `NULL`, vacío o no numérico | Excluido del denominador de conocidos |
| `SUSPICIOUS` | Entero fuera de rango, o año centinela/por defecto | Excluido del denominador; **contabilizado y publicado** |
| `INVALID` | Valor no interpretable o contradice otra evidencia | Excluido; **contabilizado y publicado** |

Reglas:

- `Ano_Constr = 0` ⇒ **`UNKNOWN`**. Nunca 1900.
- Valor no numérico, vacío o no finito ⇒ **`UNKNOWN`**.
- Numérico **no entero** (`1960.7`, `'1960.7'`) ⇒ **`INVALID`**. Nunca se redondea
  ni se trunca a un año válido (G11.3: antes Python truncaba a 1960 y SQL
  redondeaba a 1961 — la misma entrada daba dos resultados distintos).
- Entero fuera de `[min_valid_year, snapshot_year]` ⇒ **`SUSPICIOUS`** (no se borra).
  Evidencia P0 (Leioa): `1500×3`, `1640×2`. Comienzan como **`SUSPICIOUS`**, no se
  corrigen automáticamente.
- Nunca se «limpia» para obtener una distribución más bonita.

### 5.0 Cadena de custodia del valor

El pipeline conserva el valor literal de origen en `year_src`
(`CAST(Ano_Constr AS VARCHAR)`), **clasifica primero** con una política canónica
(`classify_year` en Python ⇔ `SQL_YEAR_STATE` en SQL, misma regla en ambos) y solo
convierte a entero (`year`) cuando el estado es `VALID`. No existe ningún
`TRY_CAST` temprano que pueda reparar un decimal en silencio.

### 5.1 Qué evidencia permite cambiar de estado

| Cambio | Evidencia requerida |
|--------|---------------------|
| `SUSPICIOUS → VALID` | Documento/campo oficial del Catastro que justifique el valor (p. ej. resolución o `Ano_Calcul` documentado) para ese edificio o municipio |
| `SUSPICIOUS → UNKNOWN` | Confirmación de que el valor es un código centinela de la fuente |
| `UNKNOWN → VALID` | Fuente oficial específica que aporte el año (no imputación estadística) |
| `VALID → SUSPICIOUS` | Detección reproducible de año por defecto o heaping sistemático documentado |

Toda transición se registra con: `valor_origen`, `estado_origen`, `evidencia`,
`transformación`, `motivo`, `valor_destino`, `estado_destino`, `fecha`, `autor`.

### 5.2 Geometría

- `ST_IsValid = false` ⇒ `INVALID`. **No** se usa su área como métrica.
- La reparación (`ST_MakeValid`) es **permitida pero nunca silenciosa**: se conserva la
  geometría original, la transformación, el motivo y la geometría resultante.
- Evidencia P0 (Leioa): 1 polígono con *ring self-intersection*, ~91.121 m² brutos,
  `Codigo_Uso=Y`, `Ano_Constr=2012`. Su área no se cuenta hasta repararlo y registrarlo.

### 5.3 Parámetros

- `min_valid_year` (inicial **1700**) y `snapshot_year` (el del snapshot) se fijan por
  configuración y se publican en el QA de cada ejecución.
- Investigar siempre: heaping en años acabados en 0/5, años por defecto, outliers,
  códigos de municipio no reconocidos.

## 6. Cobertura por municipio (obligatoria)

Cada agregado municipal publica `buildings_total`, `known`, `unknown`, `coverage_pct`.
El frontend debe mostrar la cobertura **junto** a la estadística principal, no en un pie.

## 7. Umbrales

| Umbral | Valor inicial | Acción |
|--------|---------------|--------|
| `coverage_low_warning` | < 90 % `known` | Mostrar aviso de cobertura baja en ese ámbito |
| `coverage_hide_stat` | < 70 % `known` | Mostrar la estadística con disclaimer reforzado (no ocultar el dato) |

Ambos configurables y trazados en `data/qa/`.

## 8. Ortofotos: semántica

- Una ortofoto es **evidencia visual** de un vuelo. No es una capa de datos.
- Se muestra siempre: **fuente**, **año nominal** y, si consta, **rango real del vuelo**.
- Prohibido derivar métricas (superficie, número de edificios, crecimiento) a partir de píxeles.
- Si el año nominal ≠ fecha real, se escribe la fecha real de la fuente: «Campaña **2025** (vuelos 9 julio – 4 agosto 2025)». Si la fuente no publica la fecha exacta (p. ej. 1956: vuelo catastral sin determinar entre 1953 y 1955), se muestra solo «Campaña {Y}» — nunca un rango de otra campaña.
- La última campaña disponible no es "hoy": se etiqueta con su año real (p. ej. 2025).

## 9. Planeamiento

El planeamiento urbanístico **actual** no reconstruye el uso histórico del suelo.
Prohibido inferir `uso actual = uso histórico`.

### 9.1 Fuentes congeladas (G3-B, snapshot `planning_20260918`)

- **Tabla municipal** `datos-globales-planeamiento-2023-2026.csv`
  (dataset `planeamiento-urbanistico`, Diputación Foral de Bizkaia, CC BY 4.0).
  Descripción oficial: «datos globales del planeamiento urbanístico de los
  municipios de Bizkaia. Información acumulada cuyo ámbito temporal es
  2023 a 2026». Una fila por municipio y corte (ejercicio/mes); la vista de
  producto usa **el corte más reciente por municipio**
  (`max(EJERCICIO, MES)`), y la fecha de referencia visible es su
  `FECHA EXTRACCION`.
- **Geometrías** — GPKG del servicio de descarga INSPIRE
  (`opengis.bizkaia.eus`, `Last-Modified: 2026-07-02`), solo las capas que
  responden a preguntas de producto: clasificación (4), usos globales (5) y
  ámbitos (6). Las 26 capas de calificación pormenorizada quedan fuera del
  producto (gate G3-B §1). Clasificación conforme a la Ley 2/2006: urbano /
  urbanizable / no urbanizable (+ suspendidos).
- **Espacios AE** — WFS `JardueraEkonomikoak_…_Espacios_Actividades_
  Económicas` (418 polígonos; `IdPoligonoEmpresarial`,
  `NombrePoligonoEmpresarial`, `Shape.STArea__` m²). La capa de puntos de
  empresas no entra en el producto.
- ⚠ CRS: snapshot en **EPSG:25830** (orden x,y). El WFS 2.0 con
  `EPSG:4326` exige bbox en orden **lat,lon**; invertir ejes devuelve
  vacío en silencio (verificado en G3).
- Manifiesto con sha256 de cada artefacto:
  `data/snapshots/planning_20260918/manifest.json`.

### 9.2 Regla madre: `PLANNING != PREDICTION`

- «Viviendas por ejecutar» es **capacidad registrada** en el planeamiento
  vigente, no compromiso ni construcción futura.
- «Suelo residencial/AE vacante» es suelo registrado como vacante en la
  tabla oficial, no suelo «a desarrollar».
- La clasificación describe el **estado jurídico del suelo hoy**; nada dice
  sobre uso histórico, edificabilidad de una parcela concreta, licencias
  ni calendario.
- El plan vigente puede cambiar: toda cifra va con su fecha de extracción.

## 10. Frases permitidas / prohibidas

| ✅ Permitido | ❌ Prohibido |
|--------------|--------------|
| «Este edificio consta como terminado en 1998.» | «El barrio nació en 1998.» |
| «La fotografía corresponde a la campaña de 1999.» | «Así era en 1999.» (sin más) |
| «El 87 % de los edificios actuales con año conocido…» | «El 87 % de los edificios…» (si hay unknowns) |
| «Huella en planta: 129,9 ha.» | «Superficie construida: 129,9 ha.» |
| «47,6 de cada 100 edificios con año conocido se terminaron después de 1987.» | «Bizkaia creció un 47,6 % desde 1987.» |
| «No consta el año de construcción.» | «Construido hacia 1900.» |
| «El Catastro describe los edificios que existen hoy.» | «Aquí no había nada en 1956.» |
| «El planeamiento vigente registra {X} viviendas pendientes de ejecución.» | «Aquí se construirán {X} viviendas.» |
| «El planeamiento registra {Y} ha de suelo residencial vacante.» | «Este suelo se urbanizará.» |
| «Estos datos describen capacidad/planeamiento vigente a fecha {Z}.» | «Este barrio crecerá…» / «Habrá {X} nuevos residentes.» |
| «Este punto cae dentro del ámbito que la fuente oficial identifica como {nombre}.» | «Este edificio será / podrá ser…» · «El precio subirá.» |
| «El {pct} % del área analizada se solapa con el espacio que el inventario oficial denomina «{nombre}».» | «{Espacio AE} provocó este patrón.» / «La industrialización explica…» |

Cada estadística importante lleva un affordance **¿Cómo se calcula?** que enlaza a la
fórmula de esta tabla.

## 11. Contratos de métricas (obligatorios)

Cada métrica **pública** queda formalmente definida. Está **prohibido** que el pipeline y
el frontend implementen universos, numeradores o denominadores distintos: el frontend
**consume** los agregados ya calculados; no recalcula denominadores.

Formato del contrato: `universe` · `numerator` · `denominator` · `exclusions` ·
`unknown_policy` · `unit` · `source` · `derivation`.

Sea `Y` el año seleccionado por la persona usuaria.

---

### C-01 `current_building_count`
- **universe:** todos los edificios del snapshot en el ámbito (municipio/celda/Bizkaia)
- **numerator:** —
- **denominator:** —
- **exclusions:** ninguna
- **unknown_policy:** incluidos tal cual
- **unit:** nº de edificios
- **source:** `bizkaia.catastro.edificios` (capa `Edificio`)
- **derivation:** `COUNT(*)`
- **nota:** es el denominador de la cobertura, no de las cuotas.

### C-02 `known_construction_year_count`
- **universe:** C-01
- **numerator:** edificios con `year_state = VALID`
- **denominator:** —
- **exclusions:** estados `UNKNOWN`, `SUSPICIOUS`, `INVALID`
- **unknown_policy:** excluidos y reportados
- **unit:** nº de edificios
- **source:** `Ano_Constr`
- **derivation:** `COUNT(*) FILTER (WHERE year_state = 'VALID')`

### C-03 `unknown_year_count` y `coverage_pct`
- **universe:** C-01
- **numerator:** `unknown_year_count = C-01 − C-02`
- **denominator:** `coverage_pct = C-02 / C-01`
- **exclusions:** ninguna
- **unknown_policy:** `SUSPICIOUS` e `INVALID` cuentan como **no conocidos**
- **unit:** nº de edificios / porcentaje
- **source:** `Ano_Constr`
- **derivation:** `100 * C-02 / C-01`
- **nota:** se muestra siempre junto a cualquier cuota.

### C-04 `post_selected_year_building_count`
- **universe:** **C-02** (edificios con año `VALID`)
- **numerator:** edificios con `year_state = VALID` **y** `Ano_Constr > Y`
- **denominator:** —
- **exclusions:** `UNKNOWN`, `SUSPICIOUS`, `INVALID`
- **unknown_policy:** excluidos del recuento y del denominador
- **unit:** nº de edificios
- **source:** `Ano_Constr`
- **derivation:** `COUNT(*) FILTER (WHERE year_state='VALID' AND Ano_Constr > Y)`

### C-05 `post_selected_year_share`
- **universe:** **C-02**
- **numerator:** **C-04**
- **denominator:** **C-02**
- **exclusions:** `UNKNOWN`, `SUSPICIOUS`, `INVALID`
- **unknown_policy:** excluidos
- **unit:** porcentaje (0–100), y formulación «X de cada 100 edificios **con año conocido**»
- **source:** `Ano_Constr`
- **derivation:** `100 * C-04 / C-02`
- **nota:** prohibido usar `C-01` como denominador.

### C-06 `current_footprint_area_known_year`
- **universe:** C-02
- **numerator:** —
- **denominator:** —
- **exclusions:** geometrías `INVALID` hasta reparación registrada
- **unknown_policy:** solo edificios con año `VALID`
- **unit:** m² (huella en planta)
- **source:** geometría del edificio
- **derivation:** `SUM(footprint_area_m2)`
- **nota:** **huella en planta**, nunca «superficie construida».

### C-07 `post_selected_year_footprint_area`
- **universe:** **C-06**
- **numerator:** suma de `footprint_area_m2` con `year_state='VALID'` y `Ano_Constr > Y`
- **denominator:** —
- **exclusions:** igual que C-06
- **unknown_policy:** excluidos
- **unit:** m²
- **source:** geometría + `Ano_Constr`
- **derivation:** `SUM(...) FILTER (WHERE year_state='VALID' AND Ano_Constr > Y)`

### C-08 `post_selected_year_footprint_share`
- **universe:** **C-06**
- **numerator:** **C-07**
- **denominator:** **C-06**
- **exclusions:** igual que C-06
- **unknown_policy:** excluidos
- **unit:** porcentaje
- **source:** geometría + `Ano_Constr`
- **derivation:** `100 * C-07 / C-06`

### C-09 `year_distribution`
- **universe:** C-02
- **numerator:** por año/década
- **denominator:** —
- **exclusions:** estados no `VALID`
- **unknown_policy:** excluidos del histograma; `UNKNOWN` se muestra como categoría aparte
- **unit:** nº de edificios por año/década
- **source:** `Ano_Constr`
- **derivation:** `COUNT(*) GROUP BY year`
- **nota:** el canónico es por año; la **vista de producto agrega a décadas** (§14), y
  `M-10` es la moda por conteo.

### C-10 `dominant_decade(cell|municipality)`
- **universe:** C-02 de la celda/municipio
- **numerator:** década modal
- **denominator:** —
- **exclusions:** estados no `VALID`
- **unknown_policy:** excluidos
- **unit:** década (etiqueta)
- **source:** `Ano_Constr`
- **derivation:** `argmax_decade(COUNT(*))`

### C-11 `ortho_nearest(Y)`
- **universe:** campañas de ortofoto disponibles
- **numerator:** campaña que minimiza `|campaign_year − Y|`
- **denominator:** —
- **exclusions:** campañas sin metadatos de fecha
- **unknown_policy:** si falta la fecha real, se usa el año nominal y se declara
- **unit:** campaña (año nominal + rango real si consta)
- **source:** `bizkaia.ortofotos.historicas`, `euskadi.ortofotos.modernas`
- **derivation:** `argmin |campaign_year − Y|`

### C-12 `building_year(selected)`
- **universe:** un edificio seleccionado
- **numerator:** —
- **denominator:** —
- **exclusions:** —
- **unknown_policy:** sin dato ⇒ «El Catastro no indica un año de construcción para este edificio.»
- **unit:** año o `UNKNOWN`
- **source:** `Ano_Constr`
- **derivation:** valor directo (`OBSERVED`)

---

**Invariante:** `C-05` y `C-08` usan el mismo universo (`C-02`/`C-06`). Ninguna vista
puede mostrar una cuota «más joven que tú» calculada sobre un denominador distinto.

## 12. Agregación por celda (G1)

- Rejilla de **500 m** en `EPSG:25830`; clave `(Codigo_Mun, cell_x, cell_y)`.
- **Métrica primaria de celda: `C-05` sobre el universo de la celda** (cuota de *edificios*
  posteriores a `Y`). Decisión y evidencia: `docs/design/G1-TU-BIZKAIA.md` §7.
- **Métrica secundaria:** `C-08` (cuota de **huella**) — solo en tooltip, siempre etiquetada
  con su propio contrato. **Nunca** colorea el mapa.
  - Serialización: `ys` = `año:conteo` (C-05) y `ya` = `año:m²` de huella,
    ambos sobre `VALID` (y `ya` además `geom_valid`, universo C-06).
    **Las series no viajan en la tesela** (dominaban la transferencia, PERF5):
    se publican en `data/cells/<cod>.json` como `{"fid":[ys,ya]}` y el cliente
    las resuelve por `fid`/`mun`, con carga perezosa para municipios vecinos.
  - `dominant_decade` (C-10): moda por conteo; **en empate gana la década más temprana**
    (`SQL_DOMINANT_DECADE` en `pipeline/metrics.py`, orden total `n DESC, decade ASC`).
- Una celda con `n_known < 15` recibe la señal **`CELL_SMALL_DENOMINATOR`**: el **porcentaje
  se conserva íntegro** y el **relleno mantiene la misma escala cromática**; solo se añade un
  contorno discontinuo y una nota en el tooltip. Evidencia: 36 de 168 celdas de la muestra
  (21 %) están por debajo. Umbral anclado en que con `n = 15` un solo edificio mueve el
  porcentaje ≥ 6,7 pp. **Prohibido** describirlo como «fiabilidad», «muestra» o «dato menos
  fiable»: el Catastro es un censo del universo observado, no un muestreo.
  Copy en `UX_COPY.md` §15.
- La cifra de celda **nunca** se presenta como «tu» cifra: el universo estadístico personal
  es el **municipio** (ver §13).

## 13. Universo estadístico y escala (regla de producto)

> **`viewport ≠ universo estadístico`** salvo declaración explícita.

- El titular y la distribución temporal usan **siempre el municipio seleccionado**.
- El zoom, el desplazamiento y la selección de un edificio **no** cambian el universo.
- Para cambiar de unidad estadística hay que **elegir otro municipio**.
- Ninguna métrica se recalcula en el frontend: se **proyectan** agregados canónicos.

## 14. Heaping temporal (obligación de disclosure)

Evidencia G0: porcentaje de años acabados en 0/5 = **37,8 % (Bilbao)**, **29,0 % (Leioa)**,
**43,7 % (Murueta)**.

- La vista temporal principal usa **periodos**, no años; el año exacto solo se usa para el
  filtro personal `> Y` y como marcador.
- **Buckets de la vista temporal (obligatorios y únicos para desktop y móvil):**
  **`<1900` · `1900s` · `1910s` … `2020s` · `SIN AÑO`** — máximo **15** categorías.
  - `<1900` es un **cubo abierto**: agrupa toda la cola antigua sin ocultarla.
  - `SIN AÑO` va **fuera** del eje temporal y nunca en 0.
  - El **marcador del año personal** conserva **posición continua** dentro del eje aunque las
    barras sean agregadas.
  - Prohibido usar ventana temporal, scroll horizontal o buckets distintos por viewport.
- **Prohibido** interpretar picos anuales como *booms* constructivos sin evidencia externa.
- Debe existir un **disclosure visible** junto a la distribución, y una explicación técnica
  en metodología. Textos en `UX_COPY.md`.
- El heaping **no se corrige** ni se elimina: se comunican sus límites.

## 15. Proyección temporal del cabezal (`play_year`, G2-A)

`play_year` es estado de interfaz, no un dato: mueve qué **edificios actuales**
se muestran como «ya constatados» según su `Ano_Constr` registrado. El año
personal (`selected_year`) no cambia durante la reproducción.

- **Universo:** `CURRENT_BUILDING_STOCK` (el mismo que C-05/C-08 — nunca
  reconstrucción histórica).
- **Celda — cuota constatada hasta P:**
  `shareUntil(P) = Σ_{y ≤ P} ys[y] / K`, con `K = edificios actuales con
  `Ano_Constr` VALID` (idéntico denominador que C-05). Fuente: serie canónica
  `ys` de `cells/{mun:03d}.json`; `K = 0` → `null`. Contrato completo y
  validación sobre las 6139 series en `evidence/g2/spike-s2/`.
- **Edificio — pertenencia:** visible si `state = VALID` y `year <= P`;
  `UNKNOWN | SUSPICIOUS | INVALID` permanecen visibles con su clase, **fuera
  de la ordenación temporal** (nunca cuentan como «posteriores a P»).
- **Municipio / provincia:** representación agregada anclada a `selected_year`;
  sin animación (las 112 series no se cargan para Play).
- **Campañas de ortofoto:** las marcas del eje son **años nominales** del
  catálogo; el vuelo real puede diferir (regla no negociable). Alcanzar una
  marca no dispara peticiones — solo la acción explícita del usuario.
- **Frases permitidas:** «constatado hasta {P}», «parque actual con año
  registrado hasta {P}». **Prohibidas:** «así era», «reconstruimos», «parque
  histórico» (§10).

## 16. Vistas MAPA·TIEMPO·FOTO (`app.mode`, G2-B)

`mode` es composición de la misma escena, no un estado de datos:

- **Invariante:** cambiar de vista nunca muta `place`, `year`, cámara ni
  ortofoto activa. `playYear` **persiste** entre vistas (regla determinista);
  entrar en `time` sin cabezal lo ancla pausado a `selected_year`.
- **`photo` no implica petición:** la imagen solo se carga por activación
  explícita de campaña (`activateOrtho`); entrar en la vista muestra solo
  metadatos de catálogo (editor, año nominal, vuelo real, licencia).
- **Navegación de campañas:** adyacentes exactos del catálogo; jamás se
  sustituye la campaña pedida por otra. `NOT_COVERED` se muestra como tal.
- **Contraste C-05/C-08:** numerador y denominador de cada lado son los
  canónicos — edificios actuales con año conocido / huella en planta de
  edificios con año conocido y geometría válida. No es una métrica nueva.

## 17. Contratos de planeamiento y actividad económica (G3-B)

Mismo formato que §11. Fuente tabla: `datos-globales-planeamiento-2023-2026.csv`
(snapshot `planning_20260918`). **Universo común:** el corte más reciente del
municipio (`max(EJERCICIO, MES)`); `SUB` = suelo urbano, `SUZ` = urbanizable,
`NR` = núcleo rural, según cabeceras oficiales. `unknown_policy` común:
ausente/`null` ⇒ `METRIC_MISSING` (omitido o explicado), **nunca 0**.
Un valor 0 real del CSV sí es dato («capacidad registrada: 0»).

### P-01 `census_population`
- **official field:** `BIZTANLE ERROLDA/HABITANTES CENSO`
- **unit:** habitantes · **universe:** municipio, corte vigente
- **source:** CSV datos globales · **derivation:** lectura directa
- **nota:** contexto editorial, no denominador de ninguna métrica G3-B.

### P-02 `residential_land_total`
- **official field:** `SUELO RES TOTAL SUB(M2)` + `SUELO RES TOTAL SUZ(M2)`
- **unit:** m² (se muestra en ha con 1 decimal si ≥10 ha)
- **universe:** suelo residencial registrado (urbano + urbanizable) del municipio
- **aggregation:** `SUB + SUZ` — composición declarada en «¿Cómo se calcula?»;
  NR no forma parte (no existe «suelo residencial NR» en la tabla)
- **source:** CSV datos globales · **derivation:** suma de 2 columnas

### P-03 `residential_land_vacant`
- **official field:** `SUELO RES VACANTE SUB(M2)` + `SUELO RES VACANTE SUZ(M2)`
- **unit/universe/aggregation:** como P-02, componente «vacante»
- **nota:** «vacante» es la condición registrada en la tabla oficial; no
  implica disponibilidad ni desarrollo (§9.2).

### P-04 `economic_activity_land_total`
- **official field:** `SUELO AE TOTAL SUB(M2)` + `SUELO AE TOTAL SUZ(M2)`
- **unit/universe/aggregation:** como P-02, uso «actividad económica»

### P-05 `economic_activity_land_vacant`
- **official field:** `SUELO AE VACANTE SUB(M2)` + `SUELO AE VACANTE SUZ(M2)`
- **unit/universe/aggregation:** como P-04, componente «vacante»

### P-06 `housing_to_execute`
- **official field:** `VIVIENDAS POR EJECUTAR SUB` + `…SUZ` + `…NR`
- **unit:** viviendas · **universe:** capacidad residencial registrada
  pendiente de ejecución (urbano + urbanizable + núcleo rural)
- **aggregation:** `SUB + SUZ + NR` — composición declarada
- **nota:** «por ejecutar» = pendiente de materializar en el planeamiento
  vigente. No es construcción anunciada ni previsión (§9.2).

### P-07 `planning_classification(point)`
- **universe:** un punto `EPSG:25830` (portal MI EDIFICIO o centroide de
  edificio resuelto)
- **derivation:** PIP sobre las 4 capas `clasif_*` del snapshot; etiqueta =
  nombre de capa (`Urbano`/`Urbanizable`/`No urbanizable`/`Suspendido`),
  bilingüe `ClasificacionCA`/`EU` cuando el campo aporte algo distinto
- **states:** `INSIDE_PLANNING_AREA` (1+ capas) · `OUTSIDE_KNOWN_AREA`
  (0 capas clasificación) · `MULTIPLE_OVERLAP` (>1 ámbito/uso distinto en el
  punto — se listan todos, nunca se elige) · `GEOMETRY_UNAVAILABLE` ·
  `NOT_COVERED` (punto fuera de Bizkaia / fuente no cargada)
- **nota:** clasificación es casi total del territorio; `OUTSIDE_KNOWN_AREA`
  tras cargar las 4 capas es un resultado real (huecos de la fuente), no
  «sin planeamiento».

### P-08 `planning_ambitos(point)` / `planning_usos(point)`
- **universe:** como P-07 sobre las 6 capas `ambito_*` y 5 capas `usos_*`
- **derivation:** PIP; cada match aporta `NombreAmbito` (si existe),
  etiqueta oficial de capa y `CalificacionPormenorizadaCA` en ámbitos
- **nota:** se muestran como identidad del ámbito oficial («la fuente
  oficial lo identifica como {NombreAmbito}»), no como calificación de la
  parcela.

### P-09 `ae_space(point | polygon)`
- **universe:** punto (P-07) o polígono candidato (celda/edificio)
- **derivation:** PIP sobre `espacios_ae` (punto) o solape de área
  (polígono): `overlap_pct = 100 · area(candidato ∩ espacio) / area(candidato)`
  en EPSG:25830
- **output:** `IdPoligonoEmpresarial`, `NombrePoligonoEmpresarial`,
  `Shape.STArea__` (m² oficial) + pct cuando sea polígono
- **nota:** el solape es **contexto de coincidencia espacial**, nunca
  explicación causal (§10). Ausencia de solape = resultado negativo válido.

## 18. Contratos de contexto condicional (G3-D)

Mismo formato que §11/§17. Fuente: snapshot `context_20260919`
(`data/snapshots/context_20260919/manifest.json`), WFS INSPIRE
geo.bizkaia.eus en EPSG:25830. **Universo común:** el punto representativo
(`representative_point`) del polígono de edificio resuelto en MI EDIFICIO,
o el punto seleccionado en MI LUGAR. Los tres módulos son **condicionales**:
solo aparecen cuando la fuente aporta un resultado con sentido; un fallo en
uno no suprime a los demás. **No existe ninguna magnitud combinada**
(score, ranking ni «peor caso»).

### R-01 `noise_band(point, period)`
- **official fields:** `LEVEL_1`, `LEVEL_2` (límites inferior/superior de la
  banda oficial en dB, p. ej. 55/60) · `TIPO` (`D`/`T`/`N` = día/tarde/noche)
- **unit:** dB (banda oficial del mapa estratégico de ruido de carreteras
  forales)
- **universe:** isófonas del mapa estratégico de ruido (carreteras forales);
  el mapa **no cubre todo el territorio** — solo entorno de esas vías
- **derivation:** PIP del punto sobre las capas `ruido_dia|tarde|noche`
- **states:** `MAPPED` (≥1 banda por periodo) · `NOT_MAPPED` (punto fuera de
  toda isófona — **nunca** se muestra como 0 dB ni «sin ruido») ·
  `MULTIPLE` (>1 banda en el mismo periodo: se listan todas) ·
  `SOURCE_UNAVAILABLE` · `INVALID_GEOMETRY`
- **dimensiones:** día/tarde/noche son **independientes**; prohibido
  agregarlas ni elegir «la peor»
- **receptores:** la capa `Receptores` (49 868 puntos con `Dia`/`Tarde`/
  `Noche` en dB exactos) queda **congelada como evidencia** pero **fuera de
  runtime**: mezclar banda cartográfica y valor de receptor requeriría un
  segundo contrato; documentado aquí, no ignorado en silencio.
- **copy seguro:** «El mapa estratégico de ruido sitúa este punto en la
  banda oficial {L1}–{L2} dB para el periodo {día/tarde/noche}.»
- **prohibido:** «zona ruidosa», «silencioso», «insalubre», «malo para
  dormir», «contaminación acústica alta» (sin clasificación oficial que lo
  sustente); cualquier interpretación sanitaria.

### R-02 `nearby_bus_stops(point)`
- **official fields:** `CodigoReducidoParada` (id parada) · `Denominacion`
  (nombre) · `CodificacionRuta` (lista `CODIGO_Destino` separada por
  comas; el código de ruta es el prefijo antes de `_`)
- **rule (congelada G3-D §4):** paradas a ≤ **R = 400 m** del punto, en
  EPSG:25830; se devuelven como máximo **N = 5**, ordenadas por distancia
  ascendente. Prohibido ampliar el radio hasta obtener resultado.
- **unit:** `distance_m` en metros (entero redondeado)
- **states:** `AVAILABLE` (≥1 parada ≤400 m) · `NO_NEARBY_STOP` (0
  paradas — resultado negativo válido) · `SOURCE_UNAVAILABLE`
- **output:** `stop_id`, `stop_name`, `distance_m`, `route_codes`
- **prohibido afirmar:** horario vigente, frecuencia, duración del viaje,
  tiempo a pie real, accesibilidad de la parada (no constan en la fuente).

### R-03 `public_mountain(point)`
- **official fields:** `NombreMonte` · `Propietario` · `FechaDeslinde` ·
  `FechaAmojonamiento` · `FechaCatalogacion` · `UtilidadPublica` ·
  `Patrimonial` · `CodigoMonteUtilidadPublica`
- **missing-date semantics:** la fuente serializa fechas ausentes como el
  literal `"null"` (string). `"null"` = **no consta**; nunca se interpreta
  como 0 ni se omite sin más en UI (se muestra «no consta»).
- **derivation:** PIP del punto sobre `montes_publicos`
- **states:** `INSIDE` (≥1 monte) · `MULTIPLE` (>1 monte: se listan todos) ·
  `OUTSIDE` (0 montes — negativo válido) · `SOURCE_UNAVAILABLE`
- **fechas:** se nombran con su etiqueta exacta («fecha de catalogación»,
  «fecha de deslinde», «fecha de amojonamiento»); prohibido reinterpretarlas
  como fecha de creación, protección o «edad del bosque».
- **monte público ≠ espacio protegido:** prohibido «protegido», «reserva»,
  «parque natural», «conservación» salvo que la fuente de espacios
  protegidos (estudio G3-D §11, geoEuskadi) lo sustente por separado.
- **copy seguro:** «Este punto se encuentra dentro del monte público que
  la fuente oficial denomina «{NombreMonte}».»

## 19. Observaciones demográficas (G6-F)

Fuente: Eustat PxWeb API. Dos familias, **nunca mezcladas** en una misma
comparación:

| Campo | `ep31` censo de hecho | `ep06b` padrón municipal | `v02a` viviendas |
|---|---|---|---|
| `observation_date` | año censal | `yyyymmdd` literal del PxWeb (`0101` = a 1 ene, `0701` = a 1 jul) | año censal |
| Cobertura | 1900–2001 (decenal) | 2001–2025 (anual) | 1991, 1996, 2001, 2006, 2011, 2016, 2021 |
| `exact_or_nearest` | `nearest` | `exact` si coincide, `nearest` si no | `nearest` |
| `null` | dato no publicado por el censo — nunca 0 | idem | idem |

- **Resolución «cuando naciste»** (`sincebirth.resolvePopulation`): observación
  de la **misma `methodology_family`** con menor |año_obs − Y|; en empate se
  elige la observación posterior; `null` nunca cuenta como candidato.
  Prohibido interpolar.
- **Comparación entonces/hoy**: ambas observaciones deben pertenecer a la
  misma familia (padrón↔padrón o censo↔censo). El copy muestra siempre los
  dos años observados.

## 20. Hotspots «después de ti» (G6-I)

Universo: **parque actual** con `Ano_Constr` `VALID` en `cells/*.json`
(malla oficial 500 m, centroide EPSG:4326).

- Candidata: celda con `count_after = #{edificios actuales con year > Y} ≥ 2`.
- Orden: `count_after` desc → `area_after` (huella post-Y, m²) desc → `cell_id` asc.
- Dedup: una celda ganadora suprime candidatas a <800 m (Haversine sobre
  centroides). Salida máxima: 3.
- **Etiqueta obligatoria**: «celdas de 500 m con más edificios actuales
  construidos después de {Y}». Prohibido «crecieron», «zonas de expansión»
  o cualquier formulación que implique stock histórico.
- Sesgo documentado: una celda que hoy concentra obra reciente puede haber
  sustituido edificios anteriores (derribo) — el ranking mide **stock actual
  post-Y**, no cambio neto.
