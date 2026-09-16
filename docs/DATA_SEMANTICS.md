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
- Valor no numérico o vacío ⇒ **`UNKNOWN`**.
- Entero fuera de `[min_valid_year, snapshot_year]` ⇒ **`SUSPICIOUS`** (no se borra).
  Evidencia P0 (Leioa): `1500×3`, `1640×2`. Comienzan como **`SUSPICIOUS`**, no se
  corrigen automáticamente.
- Nunca se «limpia» para obtener una distribución más bonita.

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
- Si el año nominal ≠ fecha real, se escribe: «Campaña **1956** (vuelo 1956–1957)».
- La última campaña disponible no es "hoy": se etiqueta con su año real (p. ej. 2025).

## 9. Planeamiento

El planeamiento urbanístico **actual** no reconstruye el uso histórico del suelo.
Prohibido inferir `uso actual = uso histórico`.

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
  - Serialización en tesela: `ys` = `año:conteo` (C-05) y `ya` = `año:m²` de huella,
    ambos sobre `VALID` (y `ya` además `geom_valid`, universo C-06).
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
