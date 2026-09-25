# UX_COPY — copy real (es)

> Este documento es canónico: el copy del producto sale de aquí.
> No hay lorem ipsum. Toda frase respeta `DATA_SEMANTICS.md`.
> El copy se escribe **a la vez** que los datos y la interacción.

## Principios

1. Primero la conclusión, después la explicación, después la metodología.
2. Vocabulario no técnico salvo cuando aporte precisión.
3. Frases cortas. Sin exageración. Sin antropomorfizar los datos.
4. Distinguir siempre hecho, derivación y limitación.

---

## 1. Hero (TU BIZKAIA)

**Título:** `MÁS JOVEN QUE TÚ`

**Subtítulo (G11.2):** `Tu vida como medida del territorio`

**Titular (G11):** `Tu municipio también tiene edad.`

**Instrucción (G11):**

> Descubre qué edificios actuales se construyeron después de que nacieras y compara
> el mismo lugar en fotografías de otras épocas.

**Campos:**

- `Año de nacimiento` (placeholder: `1988`)
- `Municipio` (placeholder: `Getxo`)

**CTA (G11):** `Descubrir mi Bizkaia`

**Nota de privacidad (bajo los campos):**

> Solo usamos el año. No guardamos tu fecha de nacimiento, tu nombre ni tu correo.

---

## 2. Resultado personalizado (estructura)

**Titular:**

> Eres de **{year}**.
>
> En **{place}**, **{X} de cada 100** edificios actuales **con año de construcción conocido**
> se terminaron después de que nacieras.

**Cobertura del dato (siempre visible, junto a la cifra):**

> {known} de {total} edificios actuales de {place} tienen año de construcción conocido
> ({coverage} %). La cifra anterior se calcula solo sobre esos {known}.

**Aclaración (no en letra pequeña):**

> Esto no significa que antes no hubiese construcción en ese entorno. El Catastro que
> usamos describe los edificios que existen actualmente, no los que existieron.

**Affordance:** `¿Cómo se calcula?` → despliega `DATA_SEMANTICS §M-05` en lenguaje llano.

**Segunda cifra (huella):**

> Esos edificios suman **{area} ha de huella en planta** (el área que ocupan en el suelo,
> no la superficie construida). `¿Cómo se calcula?`

---

## 3. Histograma

**Título:** `Edificios actuales de {place} por año de construcción`

**Eje X:** `Año de construcción`
**Eje Y:** `Nº de edificios actuales`
**Nota:**

> Cada barra cuenta edificios que **existen hoy**. El año que elegiste aparece marcado.

**Leyenda:**

- `Ya existían en {year}`
- `Terminados después de {year}`
- `Año no consta`

---

## 4. Leyenda del mapa

| Etiqueta                        | Significado                      |
| ------------------------------- | -------------------------------- |
| `Ya existía en {year}`          | `Ano_Constr ≤ {year}`            |
| `Terminado después de {year}`   | `Ano_Constr > {year}`            |
| `Año de construcción no consta` | Sin dato en Catastro (`UNKNOWN`) |

---

## 5. Panel de edificio (al hacer click)

- Con año: `Este edificio consta como terminado en **{year}**.`
- Sin año: `El Catastro no indica un año de construcción para este edificio.`
- Campos: `Uso: {use}` · `Alturas: {n}` · `Huella: {m²} m²`
- Nota: `Huella en planta. No es superficie construida.`
- Enlace: `Ver en Catastro` (si existe identificador público) `PENDING`

---

## 6. VIAJA EN EL TIEMPO

**Título:** `Viaja en el tiempo`

**Selector:** `Campaña de fotografía aérea`

**Comparación:**

> Compara dos campañas de ortofoto oficial. Arrastra para ver el antes y el después.

**Fuente (siempre visible):**

> Fuente: {publisher} · Campaña {year} · {fecha/rango real del vuelo si consta}

**Campaña más próxima:**

> No hay ortofoto oficial de {year}. La campaña más cercana es la de **{nearest}**,
> a {diff} años de distancia.

**Ejemplo con rango real:**

> Campaña **2025** (vuelos 9 julio – 4 agosto 2025).

**Autoplay (si existe):**

> Reproducir la serie. Puedes detenerla en cualquier momento.

---

## 7. HISTORIAS DEL CAMBIO

**Título:** `Historias del cambio`

**Entradilla:**

> Cómo se lee el cambio en Bizkaia a partir de los edificios que existen hoy y las
> fotografías aéreas oficiales.

**Plantilla de capítulo:**

- **Qué vemos** — descripción neutra de lo visible.
- **Cuándo cambia** — las campañas y décadas relevantes.
- **Qué dato lo sustenta** — la métrica y su denominador (con `¿Cómo se calcula?`).
- **Qué no sabemos** — límites explícitos del capítulo.

Prohibido en capítulos: «explotó», «nació», «no había nada», «creció un X %».

---

## 8. CÓMO LO SABEMOS

**Título:** `Cómo lo sabemos`

**Cuerpo (borrador real):**

> **Qué es el Catastro.** El Catastro es el registro administrativo de los bienes
> inmuebles. Para cada edificio de Bizkaia incluye, entre otros datos, su geometría y,
> cuando consta, el año de construcción.
>
> **Qué mide «año de construcción».** Es el año que el Catastro asigna al edificio en el
> campo `Ano_Constr`. No es una fecha de proyecto ni de licencia. Una rehabilitación
> posterior no lo cambia.
>
> **Qué es un «edificio actual».** Es un edificio que existe en la capa catastral que
> usamos. No sabemos por este dato cuántos edificios desaparecieron ni cuándo.
>
> **Por qué puede faltar el año.** Si el Catastro no lo tiene, aparece como 0 o vacío.
> Nosotros lo tratamos como **desconocido**, nunca como 1900 ni como «antiguo».
> En {place} no consta el año de {unknown} de {total} edificios ({pct} %).
>
> **Qué es una ortofoto.** Es una fotografía aérea corregida para poder medir sobre ella.
> La usamos como evidencia visual, no para calcular cifras.
>
> **Por qué el año de una campaña puede no ser la fecha exacta del vuelo.** Una campaña
> se identifica por un año nominal, que no siempre coincide con la fecha exacta del
> vuelo. Cuando la fuente publica esa fecha o rango, lo mostramos junto a la campaña:
> por ejemplo, «Campaña 2025 (vuelos 9 julio – 4 agosto 2025)».
>
> **Qué calculamos.** Número de edificios actuales con año conocido, porcentaje de los
> terminados después de tu año, cobertura del dato y huella en planta.
>
> **Qué NO calculamos.** No reconstruimos el parque histórico, no medimos superficie
> construida y no extraemos cifras de las fotografías.
>
> **Fuentes.** Catastro de Bizkaia y ortofotos (Open Data Bizkaia / Diputación Foral de
> Bizkaia; geoEuskadi / Gobierno Vasco). Ver fuentes y licencias.
>
> **Fecha del conjunto de datos.** {snapshot_date}. (G11.2 — sin anglicismo «snapshot»)

**Enlace:** `Metodología técnica` → `METHODOLOGY.md`.

---

## 9. Estados vacíos / error (contrato)

| Situación                  | Copy                                                                                                                        |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Sin año elegido            | (hero, sin resultado)                                                                                                       |
| Año fuera de rango         | `Introduce un año entre 1900 y {current_year}.`                                                                             |
| Lugar no encontrado        | `No encontramos «{query}» en Bizkaia. Prueba con un municipio, calle o barrio.`                                             |
| Edificio sin año           | `El Catastro no indica un año de construcción para este edificio.`                                                          |
| Ortofoto inexistente       | `No hay una ortofoto oficial para ese año. Mostramos la campaña más cercana: {nearest}.`                                    |
| Servicio de ortofoto caído | `La ortofoto oficial no está disponible temporalmente. El resto de la visualización sigue funcionando.`                     |
| Cobertura baja             | `En este municipio falta el año de construcción en una parte relevante del parque actual. Consulta cómo afecta al cálculo.` |
| Sin conexión               | `No hay conexión. Algunas fuentes oficiales no están disponibles.`                                                          |
| Error inesperado           | `Algo ha fallado. La parte de datos que ya estaba cargada sigue disponible.`                                                |

---

## 10. Pie / créditos

> **Datos:** Open Data Bizkaia · Diputación Foral de Bizkaia · Catastro de Bizkaia ·
> geoEuskadi / Gobierno Vasco.
> **Código:** licencia MIT. **Datos:** CC BY 4.0 (salvo donde se indique).
> **Inspiración:** _Bizkaiko etxeak_, Mikel Iturbe (2016); Bert Spaan, _Buildings_;
> elDiario.es, _¿Cuánto ha crecido tu ciudad desde que naciste?_ (ver `INSPIRATION.md`).
> **Herramientas:** MapLibre · PMTiles · tippecanoe · DuckDB (ver `OSS_REUSE.md`).

---

## 11. i18n

- Idioma de trabajo: **es**. Estructura preparada para **eu** desde el inicio.
- Las claves de copy viven en un sistema i18n, nunca embebidas en componentes.
- Existe un **borrador EU asistido** (`app/src/lib/i18n/eu.ts`) que supera el
  contrato estructural (`npm run verify:eu`). **No ha pasado revisión
  lingüística humana**: su estado idiomático sigue siendo NO VERIFICADO.
  Por decisión registrada (adenda al final de este documento) esa revisión
  no se planifica; eso no certifica calidad.
- Los helpers que generan fragmentos fuera del diccionario
  (`approxOfTen`, `relYear*`, `yearsLabel`, `decadeName`, `joinEs`,
  `fmtDate*`, `obsLabel`) aceptan `lang` y producen la variante EU: el
  euskera de la interfaz no depende solo del diccionario.
- Regla de composición EU aplicada: ningún placeholder lleva sufijo
  declinado (los nombres propios no flexionan por concatenación:
  «{municipality} udalerrian», nunca «{municipality}n»); los sufijos van
  sobre nombres comunes.

### Flujo de traducción EU (cuando se aborde)

Recursos oficiales recomendados, en este orden:

1. **Itzuli** (Gobierno Vasco) — primer borrador ES→EU. Es traducción
   automática, **no** validación lingüística: el propio IVAP exige revisión
   humana de sus resultados.
2. **Euskalterm** (Banco Terminológico Público Vasco) — unificar términos:
   *edificio, año de construcción, cartografía, cobertura, vivienda…*
3. **Servicio de traducciones de Elhuyar** — revisión profesional del texto
   final antes de activar EU.

Reglas de interfaz para esa traducción:

- Frases completas, nunca fragmentos ensamblados en orden castellano.
- Preservar los placeholders (`{municipality}`, `{year}`…) y los
  denominadores («edificios actuales con año conocido»).
- Alcance completo: errores, leyendas, ayudas y etiquetas de accesibilidad,
  no solo títulos.
- Los nombres de calle **no se traducen**: se usan las denominaciones
  oficiales ES/EU del callejero (campos `e`/`u` de `streets/<slug>.json`).
- Tras traducir, comprobar desbordamientos y lectura en móvil (el euskera
  suele producir cadenas más largas).

---

# Copy de G1 — «Tu Bizkaia»

> Copy real, listo para implementar. Cada entrada indica **métrica fuente**, **placeholders**
> y **condición**. Todas las claves viven en el diccionario i18n; **0 literales en componentes**.

## 12. Hero (`INTRO`)

| Clave              | Copy                                                                                                                             | Condición                                  |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| `hero.title`       | Más joven que tú                                                                                                                 | —                                          |
| `hero.tagline`     | Tu vida como medida del territorio (G11.2)                                                                                       | —                                          |
| `hero.question`    | Tu municipio también tiene edad. (G11: promesa corta — la pregunta larga baja al resultado)                                      | —                                          |
| `hero.intro`       | Descubre qué edificios actuales se construyeron después de que nacieras y compara el mismo lugar en fotografías de otras épocas. | —                                          |
| `hero.label.year`  | Año de nacimiento                                                                                                                | —                                          |
| `hero.label.place` | Municipio (G11)                                                                                                                  | —                                          |
| `hero.cta`         | Descubrir mi Bizkaia (G11)                                                                                                       | habilitado con año válido y lugar resuelto |
| `hero.privacy`     | Solo usamos el año. No guardamos tu fecha de nacimiento, tu nombre ni tu correo.                                                 | siempre visible                            |
| `hero.sources`     | Datos oficiales: Catastro de Bizkaia, ortofotos y cartografía histórica · Open Data Bizkaia · geoEuskadi · Eustat.               | —                                          |
| `hero.contest`     | Una pieza construida solo con datos públicos oficiales                                                                           | —                                          |

**Validación del año:** `hero.year.invalid` → «Introduce un año entre 1900 y {snapshot_year}.»
No se exige que sea un año de nacimiento; el campo acepta cualquier año del rango.

## 13. Titular y cobertura (`RESULT`)

**`result.headline`** (G10.1/G11/G11.2b) — métricas `C-04`, `C-05`, `C-02`

> El **{post_share} %** de los edificios actuales de {municipality} con año
> conocido se construyó después de {selected_year}.

- `result.headline.pre` = «El» (G11.2b: frase declarativa; la construcción
  «Eres mayor que el … % … se construyó después» era agramatical). El vínculo
  personal lo aportan `result.plain.*` y `view.cta_era.note`.
- `result.headline.post` (G11.2) lleva municipio + universo + año en la
  propia frase («con año conocido» — el % nunca se lee como si fuese sobre
  el parque total). La antigua línea `result.headline.scope` desaparece:
  el universo ya está en el titular y la repetición era redundante.
- Contrato de ensamblado: `copylint` compone `pre` + cifra + `post` y exige
  la frase completa gramatical; `g10_hardening` la verifica sobre el DOM.

**`result.plain.*`** (G10.1, simplificada G11.2) — aproximación humana, las tres
plantillas nombran el universo:

> «Aproximadamente {approx} con año conocido.» (`plain.some`, sin repetir el
> municipio — ya está en el titular) · «Casi todos los edificios con año
> conocido de {municipality} son más jóvenes que tú.» (`plain.all`) ·
> «Ningún edificio con año conocido de {municipality} es más joven que tú.»
> (`plain.none`).

**`result.lead`** (G11.2) — cifras exactas (denominador `C-02`)

> {after} de {known} edificios con año de construcción conocido.

- `{post_share}` = `round(C-05, 1)` con coma decimal (`47,6`).
- **Prohibido** titular/lead sin nombrar el universo «con año conocido».

**`result.coverage`** (G11.2) — métricas `C-01`, `C-02`, `C-03`

> Cobertura del año registrado: {coverage_pct} %.

- Línea corta junto al recuento; el detalle vive en un desplegable
  (`result.coverage.detail` = «Detalle del registro») que despliega
  `result.coverage.detail.body` = «El año de construcción está registrado para
  {known} de los {total} edificios actuales; el porcentaje se calcula solo sobre
  los de año conocido.» + la nota `unknown`/`suspicious` en lenguaje llano
  («no tienen año utilizable» / «registran un año anómalo»). El rigor sigue
  visible a un clic, sin repetir la misma condición en tres párrafos.

**`result.caveat`**

> El Catastro describe los edificios que existen hoy. No sabemos por este dato cuántos
> edificios desaparecieron ni cuándo.

**`result.calc`** (nivel 3) — contratos `C-01`…`C-05`

> Numerador: edificios con año conocido y `Ano_Constr > {selected_year}` = **{after}**.
> Denominador: edificios actuales con año conocido = **{known}**.
> % = {after} ÷ {known} × 100 = **{post_share}**.
> Los edificios sin año utilizable y las geometrías no válidas quedan fuera de ambos términos.
> Contrato `DATA_SEMANTICS §11 C-04/C-05`.

**`result.low_coverage`** — solo si `coverage_pct < 90`

> En este municipio falta el año de construcción en una parte relevante del parque actual.
> Consulta cómo afecta al cálculo.

## 14. Distribución temporal

| Clave                         | Copy                                                                                                                                                                                                                                                       |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `dist.title`                  | Edificios actuales de {municipality} por periodo de construcción                                                                                                                                                                                           |
| `dist.axis.x`                 | Periodo de construcción                                                                                                                                                                                                                                    |
| `dist.axis.y`                 | Nº de edificios actuales                                                                                                                                                                                                                                   |
| `dist.bucket.pre1900`         | antes de 1900                                                                                                                                                                                                                                              |
| `dist.bucket.decade`          | {decade} · {decade+9}                                                                                                                                                                                                                                      |
| `dist.bucket.none`            | sin año                                                                                                                                                                                                                                                    |
| `dist.marker`                 | TU AÑO · {selected_year}                                                                                                                                                                                                                                   |
| `dist.denominator`            | sobre {known} edificios con año conocido                                                                                                                                                                                                                   |
| `dist.noyear_band`            | Sin año utilizable: {no_year} · {no_year_pct} %                                                                                                                                                                                                            |
| `dist.heaping`                | **La distribución se agrupa por periodos, no por años.** Parte de las fechas del Catastro están redondeadas y se concentran en años acabados en 0 o 5 (en {municipality}, {heaping_pct} %). Por eso no leemos picos anuales como momentos de construcción. |
| `dist.bucket.pre1900.tooltip` | Edificios anteriores a 1900 · {n} · {share} % del parque con año conocido                                                                                                                                                                                  |
| `dist.tooltip.decade`         | {decade}s · {n} edificios · {share} % del parque con año conocido                                                                                                                                                                                          |
| `dist.marker.note`            | La línea marca tu año exacto. Las barras son periodos: la línea puede caer dentro de una barra.                                                                                                                                                            |

**Buckets (fijos, idénticos en desktop y móvil):** `<1900`, `1900s`, `1910s`, …, `2020s`, y
`SIN AÑO` fuera del eje. Máximo **15** categorías.

**Prohibido** en esta sección: «boom», «explosión», «el año en que se construyó más», y
cualquier lectura de crecimiento.

## 15. Mapa y leyenda

| Clave                          | Copy                                                                                                           |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------- |
| `map.legend.after`             | Terminado después de {selected_year}                                                                           |
| `map.legend.before`            | Ya existía en {selected_year}                                                                                  |
| `map.legend.noyear`            | Año no utilizable (sin dato o anómalo)                                                                         |
| `map.legend.cells`             | Edificios construidos después de {selected_year}                                                               |
| `map.legend.cells.universe`    | sobre los de año conocido de cada zona                                                                         |
| `map.legend.cells.nodata`      | a rayas: zona sin edificios con año conocido                                                                   |
| `map.legend.cells.small_n`     | Pocos edificios con año válido en esta zona (n={n}); unos pocos edificios pueden cambiar mucho el porcentaje.  |
| `map.tooltip.cell.share`       | {share} de cada 100 edificios de esta zona se terminaron después de {selected_year}                            |
| `map.tooltip.cell.denominator` | sobre {known} edificios con año conocido                                                                       |
| `map.tooltip.cell.footprint`   | En huella en planta: el {share} % de la superficie con año conocido es posterior a {selected_year}             |
| `map.tooltip.cell.no_known`    | Esta zona no tiene edificios con año de construcción conocido                                                  |
| `map.cell.inspect`             | Ver datos de esta zona                                                                                         |
| `map.cell.detail`              | En esta zona                                                                                                   |
| `map.cell.close`               | Cerrar detalle de la zona                                                                                      |
| `map.cell.none`                | No hay ninguna zona en el centro actual del mapa                                                               |
| `map.cell.loading`             | Cargando los datos de esta zona…                                                                               |
| `map.cell.missing`             | No se han podido obtener los datos de esta zona. (descarga resuelta sin el registro: inconsistencia declarada) |
| `map.cell.load_error`          | No se pudieron cargar los datos de algunas zonas. No significa que carezcan de edificios con año conocido.     |
| `map.cell.retry`               | Reintentar carga de zonas                                                                                      |
| `map.cell.sentence`            | {after} de {known} edificios actuales con año conocido se construyeron después de que nacieras                 |
| `map.cell.sentence.play`       | {until} de {known} edificios actuales con año conocido constan construidos hasta {play_year}                   |
| `map.cell.zoom`                | Acercar para ver los edificios por separado                                                                    |
| `map.visible_universe`         | Estadística del municipio de **{municipality}**. El encuadre del mapa no la cambia.                            |

El detalle de zona usa el **mismo contenido** que el tooltip de hover (forma
«N de K» con numerador exacto, cuota, huella, aviso small-N) en una tarjeta
persistente **junto al mapa** (G12: antes caía bajo el pliegue en la sección
CUÁNDO): clic/tap selecciona la celda; el botón `map.cell.inspect` la
inspecciona en el centro del mapa para teclado; `Esc`/cerrar, cambio de
municipio o salir del rango de zoom de celdas limpian la selección. La tarjeta
ofrece `map.cell.zoom` como acción real (zoom al nivel de edificios), no una
instrucción sin salida.

## 16. Edificio

| Condición                | Copy                                                                                                                                                                                                                                                                                                                                 |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| año `VALID`              | Este edificio consta como terminado en **{year}**.                                                                                                                                                                                                                                                                                   |
| vínculo personal (G11.2) | Con año `VALID` y año del usuario disponible, línea propia bajo el año: `{n} años después de tu nacimiento.` / `{n} años antes de tu nacimiento.` / `Terminado el mismo año en que naciste.` (`building.rel.after`/`before`/`exact`; {n} con singular «año»). Nunca con año `UNKNOWN`/`SUSPICIOUS`/`INVALID` ni sin año del usuario. |
| `UNKNOWN`                | El Catastro no indica un año de construcción para este edificio.                                                                                                                                                                                                                                                                     |
| `SUSPICIOUS`             | El Catastro registra **{raw_value}**, un año anómalo: no se usa en las cifras.                                                                                                                                                                                                                                                       |
| `INVALID` (valor)        | El año de este edificio no es interpretable: no se usa en las cifras.                                                                                                                                                                                                                                                                |
| geometría reparada       | Geometría reparada y registrada (la original se conserva).                                                                                                                                                                                                                                                                           |
| campos                   | Uso: {uso} · Alturas: {alturas} · Huella: {area} m²                                                                                                                                                                                                                                                                                  |
| nota                     | Huella en planta. No es superficie construida.                                                                                                                                                                                                                                                                                       |
| enlace                   | ¿Cómo se calcula?                                                                                                                                                                                                                                                                                                                    |

## 17. Ortofoto (opt-in)

| Estado                 | Copy                                                                                                                                 |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| propuesta (G18-R)      | `photo.hint`: Elige una campaña en el eje para cargar su fotografía aérea. — sin imagen cargada; el rail es el opt-in.              |
| meta (una línea)       | {year} · {publisher} · vuelo {flight_range} / · año nominal                                                                          |
| detalle                | `photo.details` = Fuente y detalles (licencia, vuelo real, `photo.rail_note`, `photo.nodata`)                                        |
| `NOT_COVERED`          | **La campaña de {year} no cubre este lugar.** Puedes probar {alt1} o {alt2}: son las campañas más cercanas que sí cubren este punto. |
| `SERVICE_ERROR`        | La ortofoto oficial no está disponible temporalmente. El resto de la visualización sigue funcionando.                                |
| acción de recuperación | Reintentar                                                                                                                           |
| lienzo `LOADING`       | Cargando la fotografía de {year}… (aviso sobre el lienzo mientras las teselas están en vuelo; el mapa nunca queda en blanco mudo)      |
| lienzo `EMPTY`         | La campaña de {year} no tiene cobertura en esta zona. (sobre el lienzo, con acceso a las campañas alternativas verificadas)            |
| lienzo `ERROR`         | No se ha podido cargar la fotografía. + acción **Reintentar** (sobre el lienzo; reintento real, remonta source y capa)                |
| capas (G19)            | `layers.label` = Capas del mapa · `layers.ortho` = Fotografía aérea · `layers.buildings` = Contorno de los edificios actuales — la visibilidad de la imagen y el contorno son controles de capa junto al zoom, no botones del panel |
| comparación (G19)      | el dúo ya no es un CTA del panel — se abre por historia (`air.c2`) o deep link `ortho2=`; en ≤700 px `photo.toggle.a11y`/`photo.panel_a` etiquetan el chip A/B |

**Reglas:** `{alt1}`/`{alt2}` solo se ofrecen **después de verificar** su cobertura; si no se
han verificado, **no se ofrecen**. Prohibida la sustitución silenciosa de campaña.

**Preview progresivo (G1-R2/ADR-011):** la primera imagen visible puede ser una
versión de menor resolución de **la misma campaña oficial** servida desde el
propio sitio; la refina la tesela oficial en cuanto llega. No es otra fecha ni un
placeholder, así que la atribución `Fuente: {publisher} · Campaña {year}` sigue
siendo literalmente cierta y no necesita copy adicional.

## 18. Búsqueda de lugar (`PlaceSearch`)

| Estado          | Copy                                                                                                                     |
| --------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `TOO_SHORT`     | Consulta demasiado corta: escribe al menos 3 caracteres.                                                                 |
| `SEARCHING`     | Buscando…                                                                                                                |
| `RESULTS`       | {m} municipios encontrados ({n} coincidencias en el registro NORA) — G11.2: el organismo queda en información secundaria |
| `NO_RESULTS`    | No encontramos «{query}» en Bizkaia. Prueba con un municipio.                                                            |
| `OUT_OF_SCOPE`  | NORA reconoce {n} lugares, pero están fuera de Bizkaia.                                                                  |
| `NETWORK_ERROR` | No hay conexión con el geocodificador oficial (NORA).                                                                    |
| anuncio         | Seleccionado {municipality}. La estadística es la municipal.                                                             |

## 19. Compartir y estados vacíos

| Clave           | Copy                                                                                      |
| --------------- | ----------------------------------------------------------------------------------------- |
| `share.label`   | Copiar enlace (G11.2: la acción implementada solo copia la URL)                           |
| `share.done`    | Enlace copiado. Incluye tu año y el lugar; no incluye ningún dato personal.               |
| `share.error`   | No se pudo copiar el enlace. Puedes copiarlo de la barra de direcciones.                  |
| `empty.catalog` | Ahora mismo no hay datos disponibles para este lugar.                                     |
| `error.pmtiles` | No se pudieron cargar los edificios. La estadística y la distribución siguen disponibles. |
| `error.generic` | Algo ha fallado. La parte de datos que ya estaba cargada sigue disponible.                |

## 20. Fuentes y créditos (pie)

> **Fuente principal:** Open Data Bizkaia — Diputación Foral de Bizkaia (Catastro y ortofotos
> 1956–2002, CC BY 4.0). **Complemento:** geoEuskadi / Gobierno Vasco (ortofotos 2004–2025 y
> geocodificador NORA, CC BY 4.0). **Código:** MIT. **Fecha del conjunto de datos:**
> {snapshot_date}. (G11.2)

## 21. Niveles de divulgación

| Nivel | Contenido                                                         | Ubicación                    |
| ----- | ----------------------------------------------------------------- | ---------------------------- |
| 1     | titular con la cifra                                              | arriba                       |
| 2     | denominador, cobertura, advertencia «no sabemos de desaparecidos» | bajo el titular              |
| 3     | `result.calc`                                                     | `¿Cómo se calcula?` en línea |
| 4     | metodología, fuentes, licencias, snapshot, heaping técnico        | `Cómo lo sabemos`            |

## 22. Reproductor temporal (`RESULT`, G18-R; chrome G19/G19-R3)

**G19-R3**: un solo componente visible — `HistoricalTimePlayer.svelte` —
con anatomía fija `Play · ‹ · año · › · rail · ⓘ` integrada en el borde
del lienzo (`.tcpanel` dentro de `.mapwrap`). Evolución lo usa en modo
`continuous` (eje anual, relleno en acento, ticks de década, ‹ › = ±1
año) y Fotos aéreas en modo `discrete` (un tick por campaña real, ‹ › =
campaña anterior/siguiente, el thumb compartido hace snap a la campaña
más cercana). Solo cambian la fuente de fechas y el cuerpo del ⓘ; el
chrome exterior — incluido el thumb `.tc-thumb`, que dibuja el propio
player — es el mismo elemento. Bajo `prefers-reduced-motion` solo se
oculta el Play; ‹ › quedan como paso manual. **El tiempo es un
control, no una biografía** (G18-R): ni hitos de edad, ni «tenías N
años», ni «antes de nacer», ni «Volver al presente» (el final del
slider ES la actualidad). El año elegido queda como marcador sutil
`.ymark` sobre el eje — la personalización decide el resultado inicial,
no el control.

| Clave                       | Copy                                                                                                                                            |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `time.axis_label`           | Eje temporal: incorporación del parque actual por año registrado                                                                                |
| `time.play_aria`            | Reproducir evolución (aria-label del botón ▶; el icono basta)                                                                                    |
| `time.pause_aria`           | Pausar evolución                                                                                                                                 |
| `time.step_back`            | Un año atrás (aria-label de ‹; siempre visible — en reduced-motion es el paso manual)                                                            |
| `time.step_fwd`             | Un año adelante (aria-label de ›; siempre visible)                                                                                               |
| `time.scrub_label`          | Año en reproducción (aria-label del slider)                                                                                                      |
| `time.explain`              | Qué muestra esta vista (summary del disclosure, cerrado por defecto)                                                                             |
| `time.reduced_note`         | La reproducción automática está desactivada por tu preferencia de movimiento reducido.                                                           |
| `time.status`               | Año en reproducción {play_year}: se muestra el parque actual con año registrado hasta {play_year}. (aria-live)                                     |
| `time.caption`              | Esta vista ordena los edificios que existen actualmente según su año de construcción registrado en Catastro… (cuerpo del disclosure)              |
| `map.legend.cells.play`     | Edificios actuales ya construidos en {play_year}                                                                                                 |
| `map.legend.cells.play.less` / `.more` | 0 % · ninguno / 100 % · todos (extremos de la escala en play)                                                                     |
| `map.legend.buildings.play` | Se muestran los edificios registrados hasta {play_year}                                                                                          |
| `map.legend.play.known`     | Año de construcción conocido (muestra única de Evolución a nivel edificio: no re-codifica por el año personal — solo existe «constatado hasta {play_year}») |

Contrato (semántica §11 de `DATA_SEMANTICS.md`):

- El cabezal solo habla del **parque actual** con **año registrado** hasta ese
  año — «constatado hasta {play_year}», nunca «así era Bizkaia en {play_year}».
- El año personal fija el cabezal inicial y el marcador `.ymark`; el control
  **no repite la edad del usuario** en ningún punto (G18-R §18).
- Las campañas de ortofoto viven en el panel FOTO (año nominal; la fecha
  real del vuelo puede diferir) — no son marcas del eje catastral.
- Toda etiqueta de año se muestra completa con 4 dígitos (`1945`, nunca `45`).
- Prohibido en todo el eje: «reconstruimos», «así era», «parque histórico»,
  «vuelo de {año}» sin matizar nominalidad.

## 23. Vistas MAPA·TIEMPO·FOTO y contraste (G2-B)

| Clave                | Copy                                                                                                       |
| -------------------- | ---------------------------------------------------------------------------------------------------------- |
| `view.label`         | Vista del mapa                                                                                             |
| `view.map`           | Por antigüedad (G19-R4: «Edificios» era genérico; el nombre declara la variable — clasificación vs año personal) |
| `view.time`          | Evolución                                                                                                  |
| `view.photo`         | Fotos aéreas                                                                                               |
| `view.hist`          | Mapa 1923–25                                                                                               |
| `view.swipe`         | Antes / ahora                                                                                              |
| `view.intro.*` (G19-R4) | ModeIntroSlot — un título + una frase por modo sobre el lienzo (misma franja estructural en los cinco modos): `time` = «Cómo se fue formando el parque actual.» + «Mueve el año para ver qué edificios de los que existen hoy ya estaban construidos entonces.» · `photo` = «Fotografías aéreas disponibles de esta zona.» + «Elige una campaña para ver la imagen oficial correspondiente.» · `hist` = «Bizkaia en la cartografía de 1923–25.» + `view.intro.hist.body` («Es un mapa dibujado por cartógrafos, no una fotografía: cada hoja tiene su propio año de levantamiento.») · `swipe` = «Compara la imagen histórica con la actualidad.» + «Desliza la cortina para ver la misma zona en dos épocas.» |
| `photo.label`        | Fotografía aérea oficial sobre la misma vista del mapa                                                     |
| `photo.prev` / `photo.next` | Campaña anterior / siguiente: {year} (`photo.*_none` cuando no hay)                          |
| `photo.scrub_label`  | Elegir campaña de fotografía en el eje de años                                                             |
| `photo.scrub_valuetext` | Campaña {year} (aria-valuetext del rail)                                                              |
| `photo.details`      | Fuente y detalles (disclosure con licencia, vuelo real y notas)                                            |
| `photo.rail_note`    | Las marcas son campañas reales, no una serie anual… (nota dentro del disclosure; declara la nominalidad)   |
| `photo.play` / `photo.pause` | Reproducir fotografías / Pausar (icono en la barra del panel)                               |
| `photo.ended`        | Fin de la serie de campañas. «Reproducir» vuelve a la primera.                                             |
| `layers.*` (G19)     | Capas del mapa / Fotografía aérea / Contorno de los edificios actuales (popover junto al zoom)             |
| `photo.toggle.a11y` / `photo.panel_a` (G19) | Elegir qué campaña se ve en el mapa / Campaña {year} — chip A/B del dúo en pantalla estrecha |
| `contrast.title`     | Edificios frente a huella en planta                                                                        |
| `contrast.buildings` | de cada 100 edificios actuales con año conocido se terminaron después de {selected_year}                   |
| `contrast.footprint` | de la huella en planta de los edificios con año conocido y geometría válida es posterior a {selected_year} |
| `contrast.note`      | El recuento de edificios y el territorio que ocupan cuentan historias distintas.                           |

Contrato:

- Las tres vistas son **acentos sobre la misma escena**, no tres apps: el
  selector es tipográfico (MAPA · TIEMPO · FOTO), nunca pills ni segmented
  control.
- FOTO muestra editor + año nominal + vuelo real (si se conoce) en una
  línea `.meta`; licencia y detalle completo en «Fuente y detalles». El
  rail de campañas es la vía de carga: no hay CTA «Comprobar desde el
  aire» — el modo ya es esa acción (G18-R §12).
- El contraste compara C-05 y C-08 **con sus denominadores explícitos**;
  prohibido «dispersión», «densificación», «compacto» o «sprawl» —
  interpretaciones que requieren evidencia externa.
- **Ubicación (G4-H1):** el bloque de contraste ya no aparece en el flujo
  municipal; se renderiza solo dentro de los capítulos `f4036`/`f4738` con
  los valores congelados de sus story briefs (§28.3).

## 24. MI EDIFICIO y DOS AÑOS (`RESULT`, G3-A)

### 24.1 Flujo de dirección (MI EDIFICIO)

| Clave | Copy                           |
| ----- | ------------------------------ |
|       | `address.invite`               | ¿Quieres bajar hasta tu calle?                                                                                                                                            |
|       | `address.invite_note`          | Busca una dirección en {municipality}. Para localizarla consultamos NORA, el servicio del Gobierno Vasco; el texto de la dirección no se incluye en el enlace compartido. |
|       | `address.start`                | Buscar una dirección                                                                                                                                                      |
|       | `address.label.street`         | Calle en {municipality}                                                                                                                                                   |
|       | `address.label.number`         | Número                                                                                                                                                                    |
|       | `address.label.bis`            | Bis                                                                                                                                                                       |
|       | `address.street.searching`     | Buscando la calle…                                                                                                                                                        |
|       | `address.street.none`          | No encontramos esa calle en {municipality}. Prueba con el nombre oficial, en castellano o en euskera.                                                                     |
|       | `address.street.outside`       | NORA reconoce calles con ese nombre, pero fuera de {municipality}.                                                                                                        |
|       | `address.street.pick`          | Hay {n} calles con ese nombre en {municipality}. Elige una:                                                                                                               |
|       | `address.street.network_error` | No hay conexión con el geocodificador oficial (NORA).                                                                                                                     |
|       | `address.portal.none`          | No consta el número {number} en esa calle.                                                                                                                                |
|       | `address.portal.pick`          | Hay varios portales con ese número. Elige el tuyo:                                                                                                                        |
|       | `address.building.searching`   | Comprobando el edificio…                                                                                                                                                  |
|       | `address.building.not_found`   | No hemos podido vincular esta dirección a un edificio catastral concreto.                                                                                                 |
|       | `address.building.multiple`    | El portal corresponde a {n} edificios catastrales. Elige cuál es el tuyo:                                                                                                 |
|       | `address.result.title`         | Tu edificio                                                                                                                                                               |
|       | `address.result.linked`        | Identificado en Catastro a partir del portal {portal_desc}.                                                                                                               |
|       | `address.result.nora_only`     | NORA identifica edificio en este portal, pero ningún polígono catastral contiene el punto del portal. Mostramos el dato NORA sin vincularlo al Catastro.                  |
|       | `address.year.both_equal`      | Catastro y NORA registran el mismo año: {year}.                                                                                                                           |
|       | `address.year.both_differ`     | Catastro registra {catastro_year}. NORA registra {nora_year}. Son dos fuentes oficiales distintas; mostramos ambas sin corregir una con la otra.                          |
|       | `address.year.catastro_only`   | Catastro registra {catastro_year}. NORA no registra año para este edificio.                                                                                               |
|       | `address.year.nora_only`       | NORA registra {nora_year}. El Catastro no indica un año de construcción para este edificio.                                                                               |
|       | `address.year.both_unknown`    | Ni Catastro ni NORA registran un año de construcción para este edificio.                                                                                                  |
|       | `address.provenance`           | Dirección: NORA (geoEuskadi, Gobierno Vasco) · Edificio: Catastro de Bizkaia (Open Data Bizkaia). La vinculación es por el punto oficial del portal.                      |
|       | `address.reset`                | Buscar otra dirección                                                                                                                                                     |
|       | `address.close`                | Cerrar la búsqueda de dirección                                                                                                                                           |

### 24.2 Segundo ancla temporal (DOS AÑOS)

| Clave | Copy                            |
| ----- | ------------------------------- |
|       | `compare.invite`                | Añade otro año                                                          |
|       | `compare.invite_note`           | Por ejemplo el de otra persona. Misma vista, dos años.                  |
|       | `compare.label`                 | Otro año                                                                |
|       | `compare.apply`                 | Comparar                                                                |
|       | `compare.remove`                | Quitar el segundo año                                                   |
|       | `compare.invalid`               | Introduce un año entre 1900 y {snapshot_year}.                          |
|       | `compare.marker`                | OTRO AÑO · {compare_year}                                               |
|       | `compare.partition.title`       | El parque actual repartido entre dos años                               |
|       | `compare.partition.before`      | Hasta {earlier}: {n} edificios ({pct} %)                                |
|       | `compare.partition.between`     | Entre {earlier} y {later}: {n} edificios ({pct} %)                      |
|       | `compare.partition.after`       | Después de {later}: {n} edificios ({pct} %)                             |
|       | `compare.partition.unknown`     | Sin año utilizable: {n}                                                 |
|       | `compare.partition.denominator` | De los edificios actuales con año conocido en {municipality} ({known}). |
|       | `map.legend.compare.before`     | Terminado hasta {earlier}                                               |
|       | `map.legend.compare.between`    | Entre {earlier} y {later}                                               |
|       | `map.legend.compare.after`      | Después de {later}                                                      |

### 24.3 Contratos de copy (G3-A)

- **Privacidad explícita y exacta** (G11.3): la búsqueda **sí envía** el texto
  de la calle y el municipio a NORA — el copy lo dice («consultamos NORA»). La
  dirección nunca se serializa a la URL ni a storage; el deep link de edificio
  usa el id catastral (`building=`), nunca el texto de la dirección. Prohibido
  «nada sale de esta página».
- **Ambigüedad visible**: «Elige una» / «Elige el tuyo» — la UI nunca
  comunica haber elegido por el usuario.
- **Discrepancia sin ganador**: «mostramos ambas sin corregir una con la
  otra» — prohibido «el año real es», «Catastro confirma», «NORA corrige».
- **Vinculación honesta**: «por el punto oficial del portal» — nunca «tu
  portal es este edificio» cuando la identidad no es EXACT.
- **Partición sin historia**: «El parque actual repartido entre dos años» /
  «De los edificios actuales con año conocido…» — prohibido «en {earlier}
  había», «entre ambos años se construyó», «la ciudad creció».

## 25. Planeamiento + contexto AE (`RESULT`, G3-B)

Sección «¿Y qué está previsto?» bajo el núcleo temporal — registro editorial,
nunca visor urbanístico (gate `docs/gates/G3-B.md` §3, §8).

### 25.1 Resumen municipal

- Intro con fecha oficial de extracción: «A fecha de {ref_date}, el
  planeamiento vigente registra en {municipality}:»
- Cifras (solo si el campo existe; ausente ≠ 0, se omite):
  - «{n} viviendas pendientes de ejecución» (P-06)
  - «{n} ha de suelo residencial vacante» (P-03)
  - «{n} ha de suelo de actividad económica vacante» (P-05)
- Disclosure «Qué significa» (obligatorio): «El planeamiento vigente registra
  capacidad, no construcción anunciada. Suelo vacante no implica desarrollo, y
  la clasificación describe el estado jurídico del suelo hoy — puede cambiar.
  Estos datos describen planeamiento, no predicción.»
- Fuente: «Datos globales de planeamiento · Open Data Bizkaia (Diputación
  Foral de Bizkaia, CC BY 4.0). Ejercicio {ej}.»

### 25.2 Contexto local (edificio resuelto)

- Clasificación: «El suelo que ocupa este edificio está clasificado como suelo
  urbano / urbanizable / no urbanizable / con aprobación en suspenso.» Si la
  huella queda a caballo: «…está clasificado mayoritariamente ({pct} %) como…»
- Uso global: «Uso global registrado para este suelo: {usos}.»
- Ámbito: «Cae dentro del ámbito que la fuente oficial identifica como
  «{nombre}» ({tipo}).»
- Solape múltiple: «Cae dentro de {n} ámbitos oficiales que se solapan en este
  punto — los listamos todos:»
- Espacio AE: «Se solapa con el espacio que el inventario oficial denomina
  «{nombre}».»
- Visual opt-in: «Ver los ámbitos en el mapa» / «Ocultar los ámbitos del
  mapa» — el resalte nunca sustituye al texto.

### 25.3 Estados de fallo

- «No se ha podido cargar el contexto de planeamiento. El resto de la ficha
  sigue disponible.»
- «El suelo de este edificio no consta en las áreas de clasificación
  consultadas del planeamiento vigente.»
- «El contexto local de planeamiento no está disponible para este municipio.»
- Sin edificio resuelto el contexto local no se muestra (nunca se suplanta).

### 25.4 Contratos de copy (G3-B)

- **Planeamiento ≠ futuro**: permitido «registra», «consta», «pendiente de
  ejecución»; prohibido «se construirán», «crecerá», «habrá», «se urbanizará»,
  «el precio», «este edificio será».
- **AE = contexto, no explicación**: permitido «se solapa con el espacio que el
  inventario oficial denomina…»; prohibido «provocó», «explica», «causó»,
  «esta zona creció por». La evidencia negativa también es dato.
- **Observación vs derivación**: la clasificación/uso/ámbito se atribuye a la
  fuente oficial («identifica como», «registra»); el solape se presenta como
  cálculo propio con denominador explícito (P-09).
- **Ningún 0 por ausencia**: un campo ausente se omite; el 0 solo aparece si
  la fuente lo registra como valor real.

## 26. Mapa histórico 1923–25 (`RESULT`, G3-C)

Sección «Mapa histórico» junto a la ortofoto — superficie de evidencia
visual propia, distinta de la fotografía aérea (gate `docs/gates/G3-C.md`
§2, §5). Es un MAPA: ninguna terminología de fotografía aérea se le aplica.

### 26.1 Copy vigente

- Propuesta: «La cartografía oficial 1:25.000 registró este lugar entre 1923
  y 1925, antes de la primera fotografía aérea.»
- Acción: «Ver el mapa histórico 1923–25» / «Ocultar el mapa histórico».
- Fuente (visible siempre que la capa está activa): «Fuente: Open Data
  Bizkaia — Diputación Foral de Bizkaia · Cartografía histórica 1:25.000
  (1923–1925) · CC BY 4.0. Fecha nominal por hoja: cada hoja tiene su propio
  año de levantamiento.»
- Carga: «Cargando el mapa histórico…»
- Fallo: «El mapa histórico oficial no está disponible temporalmente. El
  resto de la visualización sigue funcionando.» + «Reintentar».

### 26.2 Contratos de copy (G3-C)

- **Mapa ≠ foto**: permitido «la cartografía representa/registra»; prohibido
  «foto», «vuelo», «campaña de ortofoto» aplicado a esta superficie, y
  prohibido insertar 1925 en la lista de campañas.
- **Nominal ≠ exacto**: «1923–1925» es la fecha nominal de la serie por hoja;
  prohibido «así era exactamente», «aquí no había», «tu edificio no existía».
- **Superficie ≠ ancla**: el mapa histórico no interactúa con DOS AÑOS ni con
  `play_year`; nunca se presenta como tercer estadístico.
- **Opt-in**: 0 peticiones al servicio antes de la acción del usuario; la
  cámara/extent es la misma que la escena actual.

## 27. Contexto actual condicional (`RESULT`, G3-D)

Sección «Tu entorno, según los datos oficiales» bajo MI EDIFICIO — tres
módulos condicionales (gate `docs/gates/G3-D.md` §2, contratos
`DATA_SEMANTICS.md` §18). Cada módulo abre con su **pregunta visible** y
existe solo si la fuente aporta resultado; los negativos son dato, nunca
una tarjeta genérica. Sin edificio resuelto la sección no existe.

### 27.1 Copy vigente

Literal de `app/src/lib/i18n/es.ts` (keys `context.*`).

- Título: «Tu entorno, según los datos oficiales».
- RUIDO: «¿Qué banda de ruido cartografía oficialmente este punto?»
  - Mapeado: «El mapa estratégico de ruido sitúa este punto en la banda
    oficial {range} dB para el periodo {period}.» — una línea por periodo
    (día/tarde/noche) con banda.
  - Mapeado múltiple: «El mapa estratégico de ruido registra en este
    punto varias bandas solapadas para el periodo {period}: {ranges} dB.»
    — todas las bandas, nunca «la peor».
  - No mapeado: «Este punto queda fuera de la cobertura del mapa
    estratégico de ruido de carreteras forales. No significa ausencia de
    ruido: la fuente no lo cartografía.»
  - Overlay: «Ver las bandas de ruido en el mapa» / «Ocultar las bandas
    de ruido» + «Periodo mostrado:» día/tarde/noche solo con la overlay
    activa.
  - Fuente: «Mapa estratégico de ruido de las carreteras forales · Open
    Data Bizkaia (CC BY 4.0). Mapa oficial; no es una medición del punto
    exacto.»
- MOVILIDAD: «¿Qué transporte público conecta este entorno?»
  - Con paradas: «A menos de 400 m hay {n} paradas oficiales de
    Bizkaibus:» (sing. «…hay 1 parada oficial…») + lista
    «{name} · {dist} m · líneas {routes}» o «{name} · {dist} m».
  - Sin paradas: «La fuente oficial no registra ninguna parada de
    Bizkaibus a menos de 400 m de este punto.»
  - Overlay: «Ver las paradas en el mapa» / «Ocultar las paradas».
  - Fuente: «Información geográfica de rutas y paradas de Bizkaibus ·
    Open Data Bizkaia (CC BY 4.0). Distancia en línea recta; sin horarios
    ni frecuencias.»
- MONTE PÚBLICO: «¿Está este punto dentro de un monte público?»
  - Dentro: «Este punto se encuentra dentro del monte público que la
    fuente oficial denomina «{name}».» + «Titular declarado en la
    fuente: {owner}.» + fechas con su etiqueta exacta («fecha de
    deslinde: {date}», «fecha de amojonamiento: {date}», «fecha de
    catalogación: {date}»; la ausente se omite, nunca «0»).
  - Varios: «Este punto cae dentro de {n} montes públicos que se solapan
    — los listamos todos:» + ««{name}»» por monte.
  - Fuera: «Este punto no consta dentro de ningún monte público de
    Bizkaia.»
  - Overlay: «Ver el monte en el mapa» / «Ocultar el monte».
  - Fuente: «Montes públicos de Bizkaia · Open Data Bizkaia (CC BY 4.0).
    Monte público no equivale a espacio natural protegido.»

### 27.2 Contratos de copy (G3-D)

- **Banda oficial, no juicio**: permitido «banda oficial {L1}–{L2} dB»;
  prohibido «zona ruidosa», «silencioso», «insalubre», «malo para dormir»,
  «contaminación acústica alta» y cualquier interpretación sanitaria (sin
  clasificación oficial separada que la sustente). Copylint C3 lo fuerza.
- **NOT_MAPPED ≠ 0**: fuera de cobertura es «no consta banda oficial»;
  prohibido «0 dB», «sin ruido», «zona tranquila».
- **Periodos independientes**: día/tarde/noche van cada uno con su etiqueta;
  prohibido agregarlos o elegir «el peor».
- **Solo lo que consta en movilidad**: permitido parada, distancia en
  línea recta y códigos de ruta documentados; prohibido horario,
  frecuencia, duración del viaje, tiempo a pie, accesibilidad de la parada.
- **R/N explícitos**: «a menos de 400 m», «{n} paradas» — el radio va
  literal en el texto, nunca «cerca».
- **Monte público ≠ protección**: prohibido «protegido», «reserva»,
  «parque natural», «conservación» salvo la fuente geoEuskadi separada
  (study-only en G3-D). Fechas con su nombre oficial literal; prohibido
  reinterpretarlas como creación/protección/«edad del bosque».
- **MULTIPLE se lista**: solapes de isófonas o de montes se enumeran
  todos; prohibido elegir uno en silencio.
- **Sin magnitud combinada**: prohibido score, ranking, «nivel de
  entorno», semáforos o badges de calidad de zona.
- **Overlay = opt-in y excluyente**: un botón por módulo; una sola overlay
  contextual activa; el texto basta sin mapa; la cámara no se mueve.

---

## 28. Escena unificada, tramos e historias (`RESULT`, G4)

### 28.1 Jerarquía de tramos (headings reales)

| Tramo     | Heading (G11.2)                                                  | Contenido                                                                 |
| --------- | ---------------------------------------------------------------- | ------------------------------------------------------------------------- |
| Lugar     | `Baja hasta tu calle` (`section.place`)                          | concentraciones del municipio → invitación MI EDIFICIO → ficha → DOS AÑOS |
| Lectura   | `¿De qué épocas son los edificios actuales?` (`section.reading`) | distribución por décadas + caveat + «Cómo lo calculamos»                  |
| Contexto  | `Qué más sabemos del lugar` (`section.context`)                  | líneas editoriales con fuente+fecha (población, planeamiento)             |
| Editorial | `Para seguir leyendo` (`section.more`)                           | historias de otros lugares de Bizkaia                                     |

**Orden (G11.2):** el recorrido personal va primero — «Baja hasta tu calle»
antes de la distribución, el contexto y las historias. Las historias de otros
municipios amplían un hallazgo que ya es personal, no lo preceden.

### 28.2 Modos de la escena (`ViewSwitch`)

**G5:** las etiquetas técnicas `MAPA`/`TIEMPO`/`FOTO`/`1923–25` se sustituyen
por `view.map` = `Edificios` · `view.time` = `En el tiempo` · `view.photo` =
`Con fotos aéreas` · `view.hist` = `Con el mapa de 1923–25`, agrupadas bajo
`view.group.read` = `Leer el dato` y `view.group.check` = `Comprobar con
otras fuentes`, con la frase puente `view.bridge` (ver §29). El contrato de
estado no cambia: modos excluyentes, `?view=`, entrar en `hist` es el
opt-in de red.

**G6:** se añade `view.swipe` = `1956 / hoy` al grupo `view.group.check`
(ADR-016) — cortina antes/después entre la primera campaña del catálogo y
la última. Entrar en el modo activa la ortofoto más reciente sobre el
lienzo principal (misma maquinaria de sonda de FOTO) y monta el overlay de
1956 solo tras verificar su contenido (`probeCampaign`, fail-closed).

- **FOTO** (`PhotoPanel`, sección §17): entrar en el modo **no pide
  imagen**; el opt-in es interactuar con el rail de campañas
  (G18-R — ya no hay botón «Comprobar desde el aire»: el modo es esa
  acción).
- **1923–25** (`histmap.*`, sección §26): entrar en el modo **es** el opt-in —
  ya no hay propuesta ni botón «Ver el mapa histórico» propio. El panel del
  modo ofrece `Reintentar` (si `UNAVAILABLE`) y `Volver al mapa actual`
  (`histmap.exit`), que devuelve al modo MAPA.
- **1956/HOY** (`swipe.*`): entrar en el modo **es** el opt-in — pide la
  ortofoto actual y la de 1956 para el lugar en vista. El divisor es un
  `role="slider"` accesible (teclado y arrastre, handle ≥44 px). No hay
  botón de salida propio: se sale cambiando de modo en el `ViewSwitch`,
  como en `map`/`time`.

**G7 (microcopy público):** las etiquetas se simplifican a `view.map` =
`Mapa` · `view.time` = `En el tiempo` · `view.photo` = `Fotos aéreas` ·
`view.hist` = `Mapa 1923–25` · `view.swipe` = `1956 / hoy`, y los grupos
a `view.group.read` = `El dato` / `view.group.check` = `Ver cómo era`.
El contrato de modos excluyentes y de opt-in de red no cambia.

### 28.3 Historias (`story.*`)

Sección: `Cinco lugares de Bizkaia` — intro:

> Cinco conjuntos de edificios donde el mismo dato cuenta historias distintas.
> Cada capítulo configura el mapa para verlo; tu año y tu lugar se conservan aparte.

Entrada: `Descúbreme un cambio` (abre el primer capítulo del orden congelado).
Bloques por capítulo: `Qué vemos` · `El dato` · `Qué sabemos y qué no sabemos`.
Acciones: `Ver en el tiempo` (casos con pulso temporal: `c2803`, `f4233`) /
`Ver en el mapa` (casos sin pulso: `f4036`, `f4738`, `f149`) — la etiqueta
primaria es dinámica según la señal (`moveTarget`) y la acción lleva a la
escena (`#scene`, scroll suave; instantáneo con `prefers-reduced-motion`,
nunca autoplay) · `Míralo desde el aire` (solo si el caso declara campaña;
activa FOTO y lleva a la escena) · `Otro` (rotación cíclica determinista) ·
`Volver a mi Bizkaia`.
Kicker: `Capítulo {n} de 5` + etiqueta del caso
(`Municipio · conjunto · década`).

**Copy de los cinco capítulos:** ver `src/lib/i18n/es.ts` `story.{id}.*`
(`c2803` margen izquierda 1960–69 · `f4036` Mungia divergencia
recuento/huella · `f4233` Muskiz pulso 1970–79 · `f4738` Santurtzi
divergencia inversa · `f149` Abanto-Zierbena 2000–09). Todo el copy sale de
`evidence/g2/story-briefs/` y `docs/g4/STORY-EVIDENCE-PACK.md`.

**Contraste C-05/C-08 (G4-H1):** ya no hay bloque `Contrast` en el flujo
municipal — el contraste vive solo dentro de los capítulos cuya señal es la
divergencia recuento↔huella (`f4036`, `f4738`), como visualización compacta
`.scontrast` bajo «El dato» con los **valores congelados de sus story
briefs** (85,7 %/1,9 % ref 1979 · 11,1 %/94,7 % ref 1999). Reusa las claves
`contrast.*` y sus denominadores explícitos (§23); el contrato semántico no
cambia, solo la ubicación editorial.

**Jerarquía de acciones del capítulo (G4-H1):** la primaria dinámica
(`Ver en el tiempo` / `Ver en el mapa`) es la única acción primaria (CTA
oscuro); `Míralo desde el aire` es secundaria (borde, fondo transparente);
`Otro` y `Volver a mi Bizkaia` son terciarias (subrayado, sin borde). Un
solo CTA oscuro por capítulo.

**Foco del encabezado del capítulo (G4-H2):** el foco programático sobre
`.c-title` (contrato GA2) ya no dibuja una caja: en deep link o montaje sin
interacción previa se anuncia sin indicador (`focusVisible: false`); tras
interacción real deciden las heurísticas del navegador — teclado ve un
subrayado editorial de 3 px en color acento, ratón no ve nada. No hay
supresión global de foco.

### 28.4 Restauración y guards (deep links)

- `building=` no resoluble:
  > No hemos podido localizar el edificio del enlace en este lugar. El mapa y
  > las cifras siguen disponibles.
- `compare=` igual al año elegido:
  > El segundo año debe ser distinto de {selected_year}: la partición sería vacía.

### 28.5 Contratos de copy (G4)

- **Un opt-in, un verbo**: la evidencia visual se pide con una acción
  explícita (elegir campaña en el rail, entrar en `1923–25`); nunca
  aparece sola.
- **Historia ≠ estado personal**: el copy de cada capítulo nombra el caso y
  su conjunto («este conjunto»), nunca el municipio entero ni el dato del
  usuario; «tu año y tu lugar se conservan aparte» es la promesa visible del
  snapshot.
- **`zona` sobre `celda`**: en superficie de usuario se dice «zona»; «celda»
  solo en metodología.
- **Prohibido en historias** (igual que en el resto): causalidad no
  constatada, «antes no había nada», «sprawl», «densificación», lenguaje de
  reconstrucción histórica. Los solapes con infraestructura (PETRONOR,
  Puerto) se nombran como contexto, nunca como causa.

## 29. Copy editorial (`RESULT`, G5)

### 29.1 Titular, lead y cobertura

> «El **{share_pct} %** de los edificios actuales de {municipality} con año
> conocido se construyó después de {selected_year}.» (G11.2b)

- `result.plain.*` (G5-R2, simplificada G11.2): frase directa bajo el
  titular que reformula el porcentaje — «Aproximadamente {approx} con año
  conocido.» (`plain.some`); bordes gramaticales propios `plain.none`
  («Ningún edificio con año conocido de {municipality} es más joven que
  tú.») y `plain.all` («Casi todos los edificios con año conocido de
  {municipality} son más jóvenes que tú.»). `approx` sale de
  `approxOfTen()` y la plantilla de `approxKind()`
  (`src/lib/domain/human.ts`): «casi N de cada 10» / «N de cada 10» /
  «algo más/menos de N de cada 10» / «menos de 1 de cada 10». Nunca
  inventa la fracción — siempre deriva del valor exacto del titular.
- `result.lead` (G11.2): cifras exactas — «{after} de {known} edificios
  con año de construcción conocido.» (el año ya está en el titular).
- `result.population` (G5-R2, reformulado G9): un único dato humano junto
  al resultado con fecha de observación explícita — «A {ref_date},
  {municipality} tenía {population} habitantes empadronados.» + línea
  `.src` «Eustat · Padrón municipal» (`result.population.src`). Viaja
  dentro del metrics JSON (`constants.population`,
  `pipeline/g5_population_into_metrics.py`): cero peticiones nuevas en el
  critical path.
- `result.coverage` (G11.2): una línea — «Cobertura del año registrado:
  {coverage_pct} %.» — y el desglose en un `<details>` junto a ella
  (`result.coverage.detail` + `result.coverage.detail.body` + nota
  `unknown`/`suspicious` en lenguaje llano: «no tienen año utilizable» /
  «registran un año anómalo»).
- ~~Cards de la fila de hechos (G9 §10)~~ — **retirada en G11**: la cabecera del
  resultado ya no repite cifras en tarjetas; población y década dominante
  viven en sus capítulos («Qué más sabemos del lugar», «¿De qué épocas son
  los edificios actuales?»). Las claves `facts.*` quedan huérfanas en `es.ts` (reserva, sin
  uso desde G11). El dato humano de población vive en «Qué más sabemos del
  lugar» (`place.population` en `PlaceContext`); `result.population` queda
  huérfana en `es.ts`. La campaña cercana se anuncia en
  `view.cta_era.note`.
- **Jerga fuera de la superficie**: «Numerador», «Denominador»,
  `Ano_Constr` y referencias `DATA_SEMANTICS §…` no aparecen en copy de
  consumo; el cálculo literal vive en `result.calc.*` (disclosure «Cómo lo
  calculamos», en el tramo de lectura) y en `/como-lo-sabemos`.

### 29.2 Escena y modos

- `view.bridge`: «El tiempo de esta pieza es el año de construcción
  registrado en Catastro. Las fotos aéreas y el mapa de 1923–25 son otras
  fuentes para comprobarlo con tus ojos: no son fechas de construcción.»
- FOTO (`photo.*`, G19-R3): el panel es la barra temporal del lienzo
  (`.tcpanel`, `HistoricalTimePlayer` en modo `discrete` — el mismo
  chrome que Evolución); la procedencia completa (editor,
  vuelo real, licencia, nodata) va tras el disclosure `photo.details` =
  «Fuente y detalles» (icono ⓘ puro) — la barra solo lleva
  play + ‹ › + campaña + rail; la activación es
  el propio rail (`photo.scrub_label` / `photo.scrub_valuetext`);
  visibilidad de la imagen y contorno de edificios son capas del mapa
  (`layers.ortho` / `layers.buildings` en `LayerToggles`); la
  comparación se abre por historia o `ortho2=` y en pantalla estrecha el
  chip `.pvfloat` elige campaña (`photo.panel_a`, `photo.toggle.a11y`).
- 1923–25 (`histmap.*`): «Es un mapa dibujado por cartógrafos, no una
  fotografía. Cada hoja tiene su propio año de levantamiento entre 1923 y
  1925.» — el modo es standalone, sin rellenos de dato encima.
- 1956/actualidad (`swipe.*`, G6; renombrado G9 §5 — la ortofoto es una
  campaña observada, no «hoy»): chips «{before_year}» /
  «Actualidad · {after_year}»; ayuda `swipe.hint` = «Desliza para
  comparar»; nombre accesible del divisor `swipe.slider` = «Cortina de
  comparación: {before_year} a la izquierda, la campaña más reciente a la
  derecha»; estados honestos `swipe.loading` /
  `swipe.tiles` / `swipe.error` / `swipe.after_error` (`role="status"`,
  fail-closed); atribución dual `swipe.src` con licencia CC BY 4.0 — en
  pantalla estrecha la atribución propia se oculta porque la del mapa
  principal ya la cubre. **G11.3**: `swipe.src` se construye por lado desde
  la campaña real («Izquierda: {organismo} · Campaña {año}{ (vuelo …)} ·
  Derecha: …»), no con una atribución genérica a ambas fuentes; y la
  campaña «antes» se re-sincroniza al editar el año — la etiqueta solo
  cambia cuando la sonda verifica la nueva imagen. **G16c**: si la
  campaña «después» no verifica (`NOT_COVERED`/`SERVICE_ERROR`), el chip
  derecho declara el respaldo — `swipe.after_missing` = «Mapa · {year}
  sin imagen» (chip de aviso, nunca «Actualidad»); el preset derecho
  pasa a `swipe.only_map` = «Solo el mapa»; el slider usa
  `swipe.slider_map` = «…mapa de edificios a la derecha»; la atribución
  `swipe.src_map` nombra solo el lado verificado + «derecha: mapa de
  edificios». Si el «antes» no verifica, la cortina entera desaparece
  (sin divisor, handle ni presets que prometan comparación). Los avisos
  de sonda/fallo viven en el panel en flujo (`.sw-status` de
  SwipeControls, `role="status"`), nunca sobre el lienzo; cada fallo
  ofrece `swipe.retry` = «Reintentar».

### 29.3 Qué más sabemos del lugar (`place.*`, `planning.*`)

Hechos en línea con fuente y fecha explícitas, máximo 2–3 (reformulados
G9 — contrato en `docs/EDITORIAL_STYLE.md`):

> «A {ref_date}, {municipality} tenía {pop} habitantes empadronados.»
> — ref_date es la fecha efectiva del padrón («1 de enero de 2025»).
> «La observación oficial más cercana a tu año es {censo de 1950|el
> padrón de julio de 2022}: {pop} habitantes en {municipality}.»
> (`place.pop.then.near` + `place.obs.*`; si coincide exactamente:
> `place.pop.then.exact`.)

> «Entre los censos de {then_year} y {now_year}, las viviendas familiares
> pasaron de {then} a {now}.» (`place.housing.then_now` — comparación,
> no dos observaciones sueltas.)

> Provenance una sola vez por bloque, menor jerarquía (`.src`):
> «Eustat · padrón municipal y censos de población y vivienda»
> (`place.context.src`).

> «A {ref_date}, el planeamiento vigente de {municipality} registraba
> {n} viviendas pendientes de ejecución, {n} ha de suelo residencial
> vacante y {n} ha de suelo para actividades económicas vacante.»
> (`planning.intro` + `planning.item.*` unidos con `joinEs` — una frase
> editorial, no una lista de campos.)

- El censo/padrón se elige como el **más cercano al año personal** con
  dato real; nunca se interpola. El padrón es población de derecho y el
  censo de hecho: `place.obs.*` los nombra distinto (censo por año;
  padrón por año o por «mes de año» si el literal no es 0101).
- Fallo de una fuente → solo su hecho se sustituye por
  `planning.unavailable` / `place.context.unavailable`; el otro sigue.

### 29.4 Índice de historias

`Descúbreme un cambio` desaparece como único punto de entrada: `Cinco
lugares de Bizkaia` se presenta como sumario numerado (n.º + etiqueta
`lugar · conjunto · década` + título), cada entrada abre su capítulo.
«Otro» y «Volver a mi Bizkaia» siguen dentro del capítulo.

### 29.5 Contratos de copy (G5)

- La aproximación humana **acompaña** al valor exacto, nunca lo sustituye.
- «año registrado en Catastro» / «año de construcción registrado» es la
  forma corta admitida; nunca «año del edificio» a secas cuando pueda
  leerse como observación directa.
- Las campañas de foto llevan «campaña {year}» (nominal), no «foto de
  {year}» cuando el vuelo difiera.
- El mapa 1923–25 nunca se presenta como foto ni como fecha de
  construcción.

## 30. Rail temporal y datos «cuando naciste» (`photo.*`, `place.*`, `hotspots.*`, G6)

### 30.1 Rail de campañas en FOTO (G18-R)

- El rail es un `input[range]` transparente sobre marcas posicionadas
  por **año real** (1945→última campaña): clic/toque/arrastre/teclado
  hacen snap exclusivo a campañas existentes. `photo.scrub_label` =
  «Elegir campaña de fotografía en el eje de años»;
  `photo.scrub_valuetext` = «Campaña {year}».
- Cada marca muestra el **año nominal** completo (4 dígitos); la campaña
  activa se destaca en acento. Sin chips biográficos ni etiqueta «tu
  año» sobre el rail (G18-R §7/§18).
- Relación temporal en texto (`photo.rel_*`): «{n} antes de que
  nacieras» · «{n} después de que nacieras» · «tu año de nacimiento» —
  solo en contextos que la justifiquen (CTA «Comparar fotografías» del
  resultado, `relYearShort`), nunca como etiqueta de imagen ni dentro
  del control.

### 30.2 «Tu municipio cuando naciste»

- `place.pop.then.exact` / `place.pop.then.near`: observación Eustat
  exacta o más cercana, siempre con año observado y familia
  (`censo` / `padrón municipal`) nombrados.
- `place.housing.then` / `place.housing.then_now`: viviendas familiares
  del censo, con ambos años explícitos cuando hay comparación.
- Prohibido interpolar entre observaciones ni mezclar familias en una
  misma frase comparativa.

### 30.3 Hotspots

- Pregunta: `hotspots.ask` = «¿Dónde se concentran los edificios
  posteriores a {year}?».
- Título contractual: «Celdas de 500 m con más edificios actuales
  construidos después de {year}» — siempre «edificios actuales».
- `hotspots.note` recuerda el sesgo de supervivencia: «Solo cuenta el
  parque que existe hoy: lo demolido antes no está en el catastro
  actual.»
- Estados: `loading` / `empty` (sin concentración suficiente) /
  `error` (series no cargables — el resto de la página sigue).

### 30.4 Contratos de copy (G6)

- El año personal del usuario **nunca** se usa como etiqueta de imagen;
  la campaña siempre muestra su año nominal real.
- «más cercana a tu año» / «{n} antes/después de que nacieras» son las
  únicas formas de relacionar imagen y nacimiento.
- En hotspots prohibido «creció», «zonas de expansión», «más
  transformadas»: el ranking es de **stock actual** post-Y
  (`DATA_SEMANTICS.md` §20).
- Población/vivienda: siempre «observación» + año + familia; nunca
  «en {Y} había» cuando la observación es de otro año.

## 31. Redesign G7 (presentación)

Cambios de copy de la pasada de dirección de arte (front-end only; la
semántica y los contratos de §30 se conservan):

- `hero.visual.*` — díptico real 1956/hoy en la home: `alt` describe la
  evidencia («la misma Bizkaia, dos fechas»), `caption` nombra campaña y
  fuente. Nunca «foto de cuando naciste».
- `facts.*` — fila de hechos del resultado (edificios posteriores a ti,
  habitantes empadronados en {año observado}, campaña aérea más cercana,
  década dominante). Todo derivado de datos ya en memoria; la campaña se
  etiqueta con su año nominal real.
- `about.*` / `sources.*` / `foot.*` — «Sobre este proyecto», «Datos
  utilizados» (organismo · qué aporta · cobertura · portal oficial) y
  pie con navegación. El concurso se nombra con el nombre oficial
  verificado: Premios al Reto de Periodismo de Datos 2026 (DF 73/2026).
- `how.steps.*` / `how.limits.*` — pasos del cálculo y limitaciones en
  `/como-lo-sabemos`, en lenguaje de público general.
- Miniaturas de historias — recortes reales de la ortofoto oficial de
  la campaña `air.c1` (`pipeline/g7_story_thumbs.py` + manifest). El
  `alt` es vacío dentro del botón porque etiqueta+título ya lo nombran.
- Timeline FOTO (G7; rail desde G18-R): las marcas posicionadas por año
  muestran siempre el año nominal completo; la accesibilidad vive en el
  `input[range]` único (`aria-valuemin/max/now` +
  `aria-valuetext="Campaña {year}"`).

## 32. Selector de modo G8 (ADR-019)

Cambios de copy del controlador único del visor (la semántica y los
contratos de §30–31 se conservan):

- `view.map`/`view.time`/`view.photo`/`view.hist`/`view.swipe` —
  `Edificios | Evolución | Fotos aéreas | Mapa 1923–25 | Antes / ahora`.
  Son **modos del mismo lugar**, no secciones: nunca llevan artículo ni
  prometen una acción externa.
- `view.group.*` y `view.bridge` — **retirados**: las agrupaciones
  `EL DATO`/`VER CÓMO ERA` dejan de existir como navegación.
- `view.explore` — `Explora {municipality}`: encabezado de la toolbar,
  refuerza que los modos responden «¿qué quiero ver sobre este lugar?».
- `view.vista` — `Vista`: prefijo del control móvil (`Vista · {modo}`).
- `view.cta_era` — `Ver fotografías históricas` (G19-R4: el destino es
  el modo FOTO — «comparar» chocaba con Antes / ahora): CTA corto junto
  al resultado que activa el modo FOTO con la campaña más cercana al año
  del usuario. Debajo, `view.cta_era.note` — «Campaña cercana a tu
  nacimiento: {campaign_year}» — nombra la campaña real que se va a
  activar; nunca promete «tu año exacto».
- `photo.nodata` — aviso de ausencia de cobertura real en el preview:
  el neutro no es un fallo de carga y el copy lo dice («fuera de la
  cobertura de la campaña») junto a la alternativa.

## 33. Hardening G10 (cero defectos conocidos)

Correcciones de copy derivadas de `evidence/ux-audit-20260920/OBSERVATIONS.md`
(gate `docs/gates/G10.md`). La semántica de §30–32 se conserva:

- `result.headline.scope` — «Entre los edificios actuales con año de
  construcción conocido.» Línea propia bajo el titular: el denominador es
  perceptible en primera lectura, no tres párrafos después (G10-02).
- `search.searching_more` — «Buscando más resultados…»: estado no
  bloqueante cuando los candidatos locales ya se muestran y NORA sigue
  pendiente (G10-09). Distinto de `search.searching` (sin locales aún).
- `hero.visual.now` — «2025», no «hoy»: el chip nombra la campaña real
  que se ve; `hero.visual.caption` cita ambas («campaña 1956 y de la
  campaña 2025»). Refuerza la regla G9 de no usar «hoy» para observaciones
  fechadas.
- Leyenda Evolución en play — con `playYear` activo y nivel celda los
  extremos de la rampa pasan a `0 %`/`100 %`: la variable es la cuota del
  parque constatada hasta el año reproducido, no «menos/más posteriores»
  (G10-03).
- Errores de año — el editor del resultado reutiliza `hero.year.invalid`:
  un solo dominio (`parseYearInput`), una sola redacción, `role="alert"` +
  `aria-invalid`/`aria-describedby` (G10-01).

### 33.1 G10.1 — universo restringido en el enunciado + presets de cortina

- `result.headline.post` — «de los edificios con año conocido que hoy
  forman {municipality}»: la restricción del universo vive dentro del
  propio titular, no solo en la línea de scope (adjudicación del auditor).
- `result.plain.*` — las tres plantillas («{approx}», «casi todos»,
  «ninguno») nombran «con año conocido».
- `swipe.only_before` / `swipe.only_after` — botones «Solo {año}» /
  «Solo actualidad»: alternativa de puntero sin arrastrar la cortina.
- Edición de año — el valor vigente se precarga como texto editable
  (no como placeholder) en el editor del resultado y al re-editar una
  comparación.

## 34. Rediseño G11 (frontend editorial)

Renovación visual completa (gate `docs/gates/G11.md`). La semántica y los
contratos de §30–33.1 se conservan; solo cambian presentación y copy
editorial de superficie:

- **Hero** — titular corto `hero.question` = «Tu municipio también tiene
  edad.»; `hero.intro` reformulada; `hero.label.place` = «Municipio»;
  `hero.cta` = «Descubrir mi Bizkaia»; `hero.sources` amplía a Eustat;
  `hero.contest` = «Una pieza construida solo con datos públicos
  oficiales». Composición 40/60 (texto+formulario / evidencia); en móvil
  el orden es titular → intro → formulario → imagen → metadatos.
- **`hero.visual.*`** — el díptico ya no es un mosaico regional: es un
  recorte real de la curva de la ría y Abandoibarra (Bilbao), mismo bbox
  en la campaña 1956 (Open Data Bizkaia) y la 2025 (geoEuskadi),
  `data/hero/bilbao-1956.jpg` / `bilbao-2025.jpg` (1600×1163) con
  manifiesto. `alt` describe el lugar y la transformación; `caption` cita
  lugar, campañas, fuentes y licencia CC BY 4.0.
- **Resultado** — panel narrativo de ~340–400 px junto al mapa en la
  misma primera vista; sin fila de tarjetas-KPI (las claves `facts.*`
  quedan huérfanas). El CTA `view.cta_era` enlaza el panel con la
  campaña más cercana al año.
- **Swipe (G11-H)** — la capa «antes» ya no es siempre 1956: es la
  campaña más cercana al año del usuario (`app.nearest`); si coincide
  con la última, la inmediatamente anterior; último recurso BFA 1956.
  Chips, `aria-label` del slider y presets nombran la campaña real.
- **Leyenda de mapa** — extremos numéricos `0 %`/`100 %` en la rampa de
  cuotas (nunca «menos/más»); mensaje de escala «Vista por zonas. Acerca
  para ver edificios».
- **Historias** — tarjetas image-led con miniaturas oficiales
  (`story-thumbs/`), dos líneas de contexto y acción explícita
  «Explorar este lugar →».
- **Histograma** — barras horizontales en móvil; el estado «sin año»
  conserva tratamiento neutro/trama distinto del azul «antes».
- **Paleta** — tokens claros tipo atlas (`lib/palette.ts` → `:root`):
  papel `#f7f8fa`, tinta `#182631`, acción `#a8372a`, antes `#52768e`,
  después `#c94f38`, sin año `#d8dde2` + trama. La separación
  antes/después por luminancia es baja por diseño del par: la
  codificación redundante (trama/opacidad, G10-13) sigue siendo
  obligatoria. Contrastes recomputados: `evidence/g11/contrast.json`.
- **Tipografía** — Newsreader 500 (voz del relato) + Source Sans 3
  400/600/700 (interfaz, cifras, controles), self-hosted OFL en
  `app/static/fonts/` con licencias en `app/static/fonts/licenses/`.

## 35. Pasada de producto y copy (G11.2)

Refinamiento editorial posterior a la revisión de G11.1 — mismo sistema visual
(fuentes, paleta, composición), lenguaje más llano y recorrido local primero:

- **Tagline** — `hero.tagline` = «Tu vida como medida del territorio»
  (sustituye «70 años construyendo Bizkaia»).
- **Titular resultado** — `result.headline.post` nombra municipio + universo
  - año en la misma frase; `result.headline.scope` retirado (redundante).
    `result.headline.pre` = «El» (G11.2b: la frase ensamblada debe ser
    gramatical — hay test de titular completo en `copylint` y `g10_hardening`).
- **Panel resultado** — una aproximación llana (`plain.some` sin repetir el
  municipio), recuento `result.lead` y cobertura en una línea; el desglose
  `unknown`/`suspicious` vive en el desplegable `result.coverage.detail`.
- **CTA de fotos** — `view.cta_era` = «Ver fotografías históricas» + nota
  `view.cta_era.note` = «Campaña cercana a tu nacimiento: {campaign_year}».
- **Búsqueda** — `search.results*` = «{m} municipios encontrados ({n}
  coincidencias en el registro NORA)»: el organismo pasa a información
  secundaria.
- **Compartir** — `share.label` = «Copiar enlace» (la acción solo copia la URL).
- **Snapshot** — `footer.snapshot` / `how.snapshot.title` = «Fecha del conjunto
  de datos» (sin anglicismo).
- **Secciones** — `section.place` = «Baja hasta tu calle», `section.reading` =
  «¿De qué épocas son los edificios actuales?», `section.context` = «Qué más
  sabemos del lugar», `section.more` = «Para seguir leyendo». Orden nuevo:
  lugar → lectura → contexto → historias (§28.1).
- **Ficha de edificio** — vínculo personal `building.rel.*` (§16): la ficha
  dice cuántos años antes/después de tu nacimiento se terminó el edificio.
- **Fuentes** — `sources.catastro.cov` = «112 municipios · conjunto de datos
  {snapshot_year}» (sin «snapshot»).

## 36. Pasada de estabilización (G11.3)

Claves añadidas o corregidas en la estabilización — copy de estados de fallo
y atribución honesta:

- **Privacidad real** — `search.privacy` = «Para localizar la dirección
  consultamos NORA, el servicio del Gobierno Vasco. El texto de la
  dirección no se incluye en el enlace compartido» (sustituye la promesa
  absoluta «Nada se guarda ni sale de esta página»: el texto de la calle sí
  sale a NORA, y el año viaja serializado en la URL compartida).
- **Error de carga lazy** — `ui.load_error` = «No se pudo cargar esta parte
  de la página. Al recargar se conserva tu año y tu lugar.» +
  `ui.retry` = «Recargar la página». La recuperación es una recarga porque
  el navegador cachea el fallo del `import()` dinámico (el estado vive en
  la URL, así que se restaura).
- **Cámara de URL inválida** — `url.camera_reset` = «La vista del enlace no
  era válida; hemos vuelto a encuadrar {municipality}» (visible, no un
  error silencioso de MapLibre).
- **Atribución por lado** — `swipe.src` = «Izquierda: {before_pub} ·
  Campaña {before_year}{before_flight} · Derecha: {after_pub} · Campaña
  {after_year}{after_flight} · CC BY 4.0» — cada lado nombra su organismo y
  su intervalo de vuelo real; `ortho.publisher.open_data_bizkaia` /
  `ortho.publisher.geoeuskadi` resuelven el organismo.
- **1956 honesto** — el `flight_range` de la campaña ODB 1956 declara en
  catálogo «entre 1953 y 1955, fecha exacta desconocida»: la fecha oficial
  es indeterminada dentro de ese intervalo, no un rango de dos años.
  `flightSuffix()` separa dato y prosa: rangos ISO se localizan por fecha,
  las notas conocidas («fecha exacta desconocida», «vuelo americano»)
  pasan por claves i18n (`ortho.flight.*`), y una nota desconocida se
  muestra verbatim como dato de fuente — nunca se inventa precisión.
- **Zonas sin imagen** — `swipe.gaps` = «Esta campaña contiene zonas sin
  imagen.» (G11.3b: nota bajo el chip izquierdo cuando la campaña tiene
  `coverage_gaps` en catálogo — hoy solo 1956, verificado en producción;
  causa de origen no confirmada).

## 37. Pasada de comprensión del mapa (G12)

Motivación (feedback real): «No termino de entender la web», «¿y los
cuadrados que van cambiando de color?». La barrera no era funcional: la
relación año → cuota → color → edificio nunca se enunciaba junto al mapa.
La explicación vivía solo en la leyenda overlay (en móvil, bajo el lienzo),
con jerga («celda», «cuota»), y la ficha persistente de zona caía bajo el
pliegue en la sección CUÁNDO.

**Intro del mapa (`map.intro.*` / `view.intro.*`)** — bloque `.mapintro`
visible ANTES del lienzo en escritorio y móvil (G19-R3: existe en los
cinco modos como franja estructural común; en `map` lleva la explicación
completa y en los visores una línea breve — la detallada sigue tras el ⓘ
del reproductor); en `map` varía por nivel (`app.mapLevel`, umbrales
preregistrados de `scale.ts`).

G19-R4: la intro ya no varía por `playYear` (el cabezal fuera de
Evolución es estado guardado, no vista — `app.playActive`); `map`
lleva el título fijo `map.intro.title` y una frase por nivel:

| Clave                 | Copy                                                                                                                                                                                                          |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `map.intro.title`     | ¿Qué edificios actuales son más jóvenes que tú?                                                                                                                                                               |
| `map.intro.munis`     | Todos los edificios actuales siguen visibles. El color indica qué parte de los de cada municipio se construyó después de {selected_year}, entre los que tienen año conocido.                                    |
| `map.intro.cells`     | Cada cuadrado agrupa los edificios actuales de una zona de 500 m; todos siguen visibles y el color indica qué parte se construyó después de {selected_year}, entre los que tienen año conocido.                 |
| `map.intro.buildings` | Cada forma es un edificio que existe hoy. Bermellón si se terminó después de {selected_year}; azul si ya existía; a rayas si el año no es utilizable.                                                           |

**Leyenda por contrato (G12)** — cada modo declara variable, universo,
extremos y ausencia de dato:

- `map.legend.cells` = «Edificios construidos después de {selected_year}» +
  sublínea `map.legend.cells.universe` («sobre los de año conocido de cada
  zona») + extremos `less`/`more` («0 % · ninguno» / «100 % · todos») +
  entrada `map.legend.cells.nodata` con muestra a rayas («zona sin edificios
  con año conocido»). La ausencia de dato tiene patrón propio
  (`cells-nodata`, hatch `PALETTE.noyearStroke`): nunca se confunde con 0 %.
- En Evolución, `map.legend.cells.play` = «Edificios actuales ya
  construidos en {play_year}»: la variable cambia de «después de tu año»
  a «constatada hasta {play_year}» y la leyenda lo declara.
- La intro de Evolución repite la regla semántica: parque actual, no
  reconstrucción («edificios de los que existen hoy»).

**Ficha de zona** — titular «En esta zona», frase «{after} de {known}
edificios actuales con año conocido se construyeron después de que
nacieras» (numerador exacto `countAfterParsed`, mismo denominador que la
cuota) y acción real «Acercar para ver los edificios por separado»
(`app.mapFlyTo` al centro de la celda, zoom ≥13.5). Variante play con
`countUntilParsed`. «Zona» sustituye a «celda» en toda la superficie de
usuario (§estilo: término de implementación fuera del copy).

**Recorrido elegido para probar: A (respuesta → mapa explicado → fotos).**
Se mantiene el contrato opt-in actual y las fotos a un toque. Esto no demuestra
que B sea inferior: introducir fotos primero requeriría evaluar y documentar
el cambio de carga. La decisión de comprensión queda pendiente de prueba humana.

**Corrección posterior de G12:** pregunta del mapa en línea independiente,
explicación a 16 px; en móvil la aproximación redundante se oculta y el
recuento exacto se abre con «Ver recuento exacto». El titular conserva el
universo. «Ver huella en planta» despliega la variable secundaria. Carga y
error tienen mensajes propios y «Reintentar carga de zonas»; solo denominador
cero permite «zona sin edificios con año conocido», y una descarga resuelta
sin el registro muestra «No se han podido obtener los datos de esta zona»
(estado `missing`, sin porcentaje ni trama). Municipio y evolución
declaran «edificios actuales con año conocido». La ficha táctil no duplica
un tooltip hover. El diccionario es la fuente de los textos implementados.

**Guion de prueba humana (pendiente, no ejecutado)** — `docs/HUMAN_TEST.md`:
sin explicación previa, con Cassnyo y 3–4 personas más; registra respuestas
literales, ayudas y errores. Sirve para detectar barreras, no para afirmar
validación estadística.

## 38. Pasada de producto G13 (marca, callejero, reproducción, titular llano)

**Marca → portada** — el titular del resultado «Más joven que tú» es un
enlace real (`<a href>`) a la portada: conserva `app.year` y `app.place`
en sesión (el formulario los precarga para modificarlos) y limpia la query
de la URL (una recarga de la portada no re-entra al resultado). La cabecera
queda en marca + «Cómo lo sabemos» + selector de idioma cuando exista
segundo diccionario revisado.

**Selector de municipio sin salto** — estado y listbox viven en `.pop`
absoluto bajo el input: el campo no se mueve al escribir y el desplegable
flota sobre el contenido (regresión `input_stable` en `g13_ux.mjs`).

**Callejero municipal (ADR-020)** — sugerencias locales desde
`data/streets/<slug>.json` (capa oficial de portales EUSTAT/NORA, CC BY 4.0):

| Clave                       | Copy                                                                                        |
| --------------------------- | ------------------------------------------------------------------------------------------- |
| `address.street.near`       | Sin coincidencia exacta en el callejero. ¿Querías decir…?                                    |
| `address.street.near_pick`  | Sin coincidencia exacta: {n} calles próximas en el callejero oficial de {municipality}.      |
| `address.number.ask`        | {street}: escribe el número del portal.                                                     |
| `address.number.ask_n`      | {street}: {n} portales numerados en el callejero oficial. Escribe el número.                 |

Reglas: tildes y mayúsculas normalizadas; el tipo de vía escrito por la
persona se despoja usando los tipos del propio callejero («Calle Ogoño» =
«ogono»; «calle» a secas no casa nada); empieza-por antes que contiene;
casi-matches (Levenshtein ≤2) solo cuando no hay exacta y nunca se
autoseleccionan; cualquier edición del campo invalida la calle confirmada y
todo lo derivado; el número, Bis y el envío solo existen tras calle
confirmada; «Bis» solo si la calle tiene portales bis oficiales; sin
fichero local se degrada a la búsqueda NORA anterior.

Cobertura: las calles **representadas en la capa oficial de portales** de
los 112 municipios del catálogo — no necesariamente todas las vías sin
portales ni cambios posteriores a la descarga (snapshot 2026-09-21).
Usansolo sí tiene callejero en la fuente (355 registros): está fuera por
el corpus de edificios (gap G1), así que ningún copy puede decir «todos
los municipios de Bizkaia».

**Reproducción de fotografías** — `photo.play`/`photo.pause`/`photo.speed.*`
(lenta·normal·rápida): avanza por campañas reales con la misma sonda del
rail; año nominal, vuelo real, editor, licencia y nota de cobertura visibles
en todo momento; si la campaña siguiente no cubre o falla, se detiene con el
aviso propio — nunca sustituye en silencio. Con `prefers-reduced-motion` no
hay reproducción automática (el rail y ←/→ dan el paso manual, igual que el
Play del eje temporal).

**Titular llano (G13)** — sustituye a la cifra gigante + aproximación +
recuento repetidos:

| Clave               | Copy                                                                                                          |
| ------------------- | ------------------------------------------------------------------------------------------------------------- |
| `result.kicker`     | {municipality}, desde {selected_year}                                                                          |
| `result.lead.some`  | De los edificios actuales con año conocido, {approx} se construyeron después de que nacieras.                   |
| `result.lead.none`  | Ningún edificio actual con año conocido se construyó después de que nacieras.                                   |
| `result.support`    | La cifra exacta:                                                                                               |
| `result.pct_value`  | {pct} %                                                                                                        |
| `result.invite`     | Compara las fotografías y descubre dónde se concentran.                                                       |
| `result.about_data` | Sobre este dato                                                                                                |

«Aproximadamente casi…» → «Casi…» (sin el adverbio redundante). Recuento,
cobertura y cálculo conviven bajo el único «Sobre este dato»; el universo
(«edificios actuales con año conocido») sigue en la frase principal.

**Relato fundamentado** — solo líneas derivadas de datos existentes:
la personalización fija el resultado inicial (titular, cifra, cabezal
del reproductor en el año elegido, campaña sugerida «cercana a tu
nacimiento» vía `relYearShort` en el CTA). G18-R elimina
`time.first_decade` y todo el copy de edad dentro de los controles
temporales — el dato no cambia, la interfaz deja de repetirlo.

**Estructura i18n (ES/EU)** — `lang.svelte.ts` + `t()` con fallback por
clave a `es`; `<html lang>` sigue al locale; `LangSwitch` se renderiza
porque `AVAILABLE_LANGS` tiene dos idiomas. El diccionario EU existe
(`src/lib/i18n/eu.ts`, borrador asistido) y `npm run verify:eu` lo valida
estructuralmente. Estado lingüístico: **NO VERIFICADO** — seleccionable en
la interfaz, sin revisión humana.
# Adenda de validación automática — 2026-09-21

La petición posterior del usuario sustituye el flujo propuesto de revisión
humana EU: no se contratará ni se dará por ejecutada esa revisión. No implica
que una traducción automática tenga calidad certificada. `npm run verify:eu`
exige el diccionario y comprueba su contrato estructural (claves,
placeholders, vacíos, caracteres de sustitución): **pasa**. El fallback ES
nunca cuenta como contenido traducido.

**Revisión automática ejecutada, con estas limitaciones** (2026-09-21):

1. **Contraste frase a frase con Itzuli** (`euskadi.eus/traductor/`, modelo
   `es2eu`, conducido con Playwright): muestra dirigida de 25 claves con
   semántica de datos y riesgo (titular, cobertura, caveat, leyenda,
   ortofoto, errores, dirección, metodología, contexto). Cada traducción se
   lee del cuerpo del POST a `/itzuli/es2eu/v2/translate` emparejado con su
   entrada — nunca del área de salida (una respuesta en vuelo dejaría
   registros desfasados). Resultado: 24 `translated` + 1 `reused`
   (`search.network_error`, texto ES idéntico a
   `address.street.network_error` — reutilización explícita, no timeout).
   Equivalencias confirmadas, seis mejoras aplicadas al borrador (verbo
   omitido en `result.caveat`, orden natural en `map.tooltip.cell.no_known`
   y `ortho.not_covered`, descalco de «a fecha de», «kale-izendegi»,
   «zenbaki») y discrepancias donde el borrador se conserva por ser más
   fiel (p. ej. Itzuli invirtió numerador/denominador en
   `map.cell.sentence`). Registro completo: `evidence/eu/itzuli.md` +
   `itzuli.json`.

2. **Contraste terminológico** con fuentes oficiales indexadas (fichas
   Eustat, datasets EU de Open Data Bizkaia/datos.gob.es, capas
   geo.bizkaia.eus, DPD oficiales; Euskalterm en vivo no es consultable
   por script): `eraikuntza-urtea`, `estaldura`, `lurzoru`, `oinplano`,
   `errolda`/`zentsoa`, `atari`, `ortoargazki`, `kanpaina`, `kale-izendegia`
   conformes. Dos errores corregidos: **`jende-basoa` → `baso publiko`**
   (título oficial del dataset «Bizkaiko baso publikoak»; «jende-basoa» no
   está atestiguado y «herri-baso» = monte comunal, figura distinta) y
   **`geokodetzailea` → `kale-izendegia`** (nombre oficial del servicio
   NORA). Registro: `evidence/eu/terminology.md`.

3. **QA visual EU** (`scripts/g14_eu_qa.mjs`, 101 checks, capturas +
   `report.json` en `evidence/eu/qa/`): matriz explícita de 11 superficies
   (portada, resultado, evolución temporal, fotos, swipe 1956–hoy, mapa
   histórico, ficha de edificio, metodología, búsqueda vacía, panel de
   dirección) × escritorio 1440 y **móvil táctil real** (390 px con
   `isMobile`+`hasTouch` como opciones de contexto — dentro de `viewport`
   Playwright las ignora y prueba un escritorio estrecho). Cada escenario
   declara precondición (`need`) y resultado exigible (`expect`): falta de
   control o de superficie = fallo, nunca omisión. Por superficie:
   `html lang=eu`, sin overflow horizontal, sin placeholders sin resolver,
   porcentajes en convención vasca (`% 79,3`), cero pageerrors y
   **detección de fugas conocidas** (no garantía de ausencia): fragmentos
   largos de `es.ts`, etiquetas cortas con borde de palabra Unicode y
   literales ES de datos (notas de catálogo), sobre texto visible Y
   `aria-label`/`title`/`placeholder`/`alt`. Correcciones derivadas del
   gate endurecido: `lurzoru residencial` → `erresidentzial` dentro del
   propio `eu.ts`; «sin año» se colaba desde `metrics.ts` en el tick SVG y
   la tabla sr-only de `DecadeDistribution`; el `aria-label` del canvas se
   congelaba en el idioma de creación del mapa (ahora efecto reactivo);
   atribución de fuentes raster neutra (nombre propio + año + licencia);
   `mjt-lang` y `<html lang>` en el layout para cubrir
   `/como-lo-sabemos` (que gana `LangSwitch`); `#svelte-announcer`
   resincronizado con el `<title>`; el click de edificio del gate se hizo
   determinista (punto de pantalla sobre feature real de `b-*-fill`, con
   coords de viewport — `project()` solo da las del contenedor).

**Limitaciones que permanecen**: cobertura Itzuli 25/≈290 claves (las
etiquetas cortas de interfaz no fueron todas contrastadas); dominio
general de Itzuli (no «Administratiboa»); la gramática de frases no
muestreadas se revisó solo contra patrones de batua; el QA visual mide
overflow y fugas, no legibilidad ni naturalidad. **No se realizó
certificación lingüística ni revisión humana frase a frase**: la decisión
del usuario la exime como requisito, pero el proyecto no la declara
cerrada. El fallback ES nunca cuenta como contenido traducido.

Fuentes de referencia: Itzuli (https://www.euskadi.eus/traductor/), Euskalterm
(https://www.ivap.euskadi.eus/euskalterm/), Elhuyar (no integrado como
servicio; consultas puntuales registradas en `evidence/eu/`).
# Continuidad espacial de la selección — 2026-09-21

Sin cambios de redacción ni de denominadores: la relación personal con la
campaña ocupa un espacio propio y estable; las fuentes siguen completas.
La respuesta al seleccionar una zona/edificio se muestra en el lateral
(escritorio) o en un panel inferior visible (pantallas estrechas), con las
etiquetas y botones de cierre ES/EU existentes. No se exige descubrir una
ficha nueva mediante scroll. Las actualizaciones asíncronas no desplazan
repetidamente la página ni roban el foco.
# Claridad del contexto y las historias — 2026-09-22

Se revisan los textos señalados de población, vivienda, planeamiento y
Muskiz, además de jerga visible en concentraciones y otros capítulos.
«Observación oficial más cercana» explica ahora por qué se usa otro año;
las fechas censales no se confunden con nacimiento/presente. El capítulo
de Muskiz sustituye «cabezal/pulso temporal» por una instrucción para leer
los años registrados y contrastarlos con la vida propia. No se inventan
recuerdos, causalidades ni edificios desaparecidos.

Recuento y cobertura quedan visibles; «Sobre este dato» conserva el detalle.
La comparación de población indica la distancia real entre la observación
y el nacimiento (antes/después), no solo «tu año». El formulario avisa si
el nombre escrito aún no corresponde a un municipio seleccionado.
El planeamiento tiene una nota visible que distingue capacidad de obras
confirmadas. Los cambios equivalentes EU son borradores asistidos; esta
ronda verifica claves/variables, no certificación lingüística. No se han
recalculado métricas ni alterado denominadores.
# Editor con borrador y composición móvil — 2026-09-22

**Editor «Cambiar año o lugar» (G15).** El formulario trabaja sobre un
borrador: al abrirse precarga año y municipio vigentes, escribir o elegir
otro municipio solo modifica el borrador, y «Cancelar»
(`result.change.cancel`: ES «Cancelar» / EU «Utzi») lo descarta sin tocar
estado ni URL. El botón de cabecera muestra «Cancelar» mientras el editor
está abierto (`aria-expanded`). «Aplicar» valida los dos campos: año con
`hero.year.invalid`, municipio con `search.choose_from_list` si el texto
no corresponde a una opción elegida — mismo mensaje en línea que la
portada. Sin cambios confirmados no se crea entrada de historial; con
cambios se aplica la búsqueda completa de una vez (Atrás/Adelante
recorren búsquedas enteras, no estados intermedios). En la lista de
municipios la opción elegida lleva marca «✓» (clase `picked`).

**Escena apilada (≤1023 px).** El orden de lectura pasa a: selector de
vista → explicación breve del mapa (`map.intro.*`, sin cambios de copy) →
lienzo → controles del modo → invitación a explorar (`result.invite` +
`view.cta_era` + `view.cta_era.note`, bloque `.explore-tail`). Los textos
son idénticos; solo cambia su posición para que el mapa entre en la
primera pantalla móvil. No se trunca ni se reduce contenido por altura.

## 39. Ronda G16 (referentes: IGN/geoEuskadi/Layers of London)

- `map.cell.photos` — «Ver esta zona en fotografías»: la acción que lleva
  del dato de la celda a la evidencia. No dice «comparar» (esa acción ya
  existe y significa otra cosa) ni promete qué se verá.
- `hotspots.zone/ref/center` + `dir.*` — referencia territorial neutral:
  «Zona 1 · a 3 km al noroeste del centro». Las celdas de 500 m no
  tienen nombre oficial; se usa número + distancia/cardinal verificables,
  nunca un barrio inventado. `hotspots.photo` — «ver en fotos»: acción
  secundaria por ítem junto al «ver en el mapa» principal.
- `photo.ms.*` — ~~hitos vitales como accesos a campañas~~ **retirados
  en G18-R**: los accesos biográficos convertían el selector temporal en
  un dashboard. El rail de campañas (§30.1) es el único selector; la
  honestidad nominal/vuelo se conserva en la línea `.meta` y en el
  disclosure «Fuente y detalles» (`photo.nominal_mark`,
  `photo.rail_note`).
- `swipe.pick.*` — «Primera imagen / Segunda imagen»: los dos lados del
  comparador son elegibles. La nota declara la regla de honestidad: si
  una campaña no tiene imagen en la zona se dice, no se cambia en
  silencio. `swipe.only_after` pasa a «Solo {year}» y `swipe.slider`
  nombra ambos años: «Actualidad» ya no se afirma cuando la imagen 2 no
  es la última campaña.
- EU: equivalencias asistidas nuevas (`map.cell.photos`, `hotspots.*`,
  `dir.*`, `photo.ms.*`, `swipe.pick.*`, `swipe.only_after`,
  `swipe.slider`, `swipe.after_error`); borradores verificados en
  estructura (g14 + locale-contract), sin certificación lingüística.
