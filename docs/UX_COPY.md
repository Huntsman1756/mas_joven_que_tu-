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

**Subtítulo:** `70 años construyendo Bizkaia`

**Pregunta:** `¿Qué parte de la Bizkaia que ves hoy apareció después que tú?`

**Instrucción:**
> Introduce tu año de nacimiento y un lugar de Bizkaia. Descubre qué edificios actuales
> se terminaron después de ese año y viaja por las fotografías aéreas oficiales para ver
> cómo cambió ese entorno.

**Campos:**
- `Año de nacimiento` (placeholder: `1987`)
- `Municipio o lugar` (placeholder: `Leioa`)

**CTA:** `Ver mi Bizkaia`

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

| Etiqueta | Significado |
|----------|-------------|
| `Ya existía en {year}` | `Ano_Constr ≤ {year}` |
| `Terminado después de {year}` | `Ano_Constr > {year}` |
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
> **Snapshot de datos.** {snapshot_date}.

**Enlace:** `Metodología técnica` → `METHODOLOGY.md`.

---

## 9. Estados vacíos / error (contrato)

| Situación | Copy |
|-----------|------|
| Sin año elegido | (hero, sin resultado) |
| Año fuera de rango | `Introduce un año entre 1900 y {current_year}.` |
| Lugar no encontrado | `No encontramos «{query}» en Bizkaia. Prueba con un municipio, calle o barrio.` |
| Edificio sin año | `El Catastro no indica un año de construcción para este edificio.` |
| Ortofoto inexistente | `No hay una ortofoto oficial para ese año. Mostramos la campaña más cercana: {nearest}.` |
| Servicio de ortofoto caído | `La ortofoto oficial no está disponible temporalmente. El resto de la visualización sigue funcionando.` |
| Cobertura baja | `En este municipio falta el año de construcción en una parte relevante del parque actual. Consulta cómo afecta al cálculo.` |
| Sin conexión | `No hay conexión. Algunas fuentes oficiales no están disponibles.` |
| Error inesperado | `Algo ha fallado. La parte de datos que ya estaba cargada sigue disponible.` |

---

## 10. Pie / créditos

> **Datos:** Open Data Bizkaia · Diputación Foral de Bizkaia · Catastro de Bizkaia ·
> geoEuskadi / Gobierno Vasco.
> **Código:** licencia MIT. **Datos:** CC BY 4.0 (salvo donde se indique).
> **Inspiración:** *Bizkaiko etxeak*, Mikel Iturbe (2016); Bert Spaan, *Buildings*;
> elDiario.es, *¿Cuánto ha crecido tu ciudad desde que naciste?* (ver `INSPIRATION.md`).
> **Herramientas:** MapLibre · PMTiles · tippecanoe · DuckDB (ver `OSS_REUSE.md`).

---

## 11. i18n

- Idioma de trabajo: **es**. Estructura preparada para **eu** desde el inicio.
- Las claves de copy viven en un sistema i18n, nunca embebidas en componentes.
- La versión en euskera requiere revisión lingüística antes de ser `production-ready`.
- Prohibido publicar traducción automática como copy final.

---

# Copy de G1 — «Tu Bizkaia»

> Copy real, listo para implementar. Cada entrada indica **métrica fuente**, **placeholders**
> y **condición**. Todas las claves viven en el diccionario i18n; **0 literales en componentes**.

## 12. Hero (`INTRO`)

| Clave | Copy | Condición |
|-------|------|-----------|
| `hero.title` | Más joven que tú | — |
| `hero.tagline` | 70 años construyendo Bizkaia | — |
| `hero.question` | ¿Qué parte de la Bizkaia que ves hoy apareció después que tú? | — |
| `hero.intro` | Introduce tu año de nacimiento y busca un lugar de Bizkaia. Verás qué edificios actuales se terminaron después y cómo se distribuye el parque que existe hoy. | — |
| `hero.label.year` | Año de nacimiento | — |
| `hero.label.place` | Lugar | — |
| `hero.cta` | Ver mi Bizkaia | habilitado con año válido y lugar resuelto |
| `hero.privacy` | Solo usamos el año. No guardamos tu fecha de nacimiento, tu nombre ni tu correo. | siempre visible |
| `hero.sources` | Datos: Catastro de Bizkaia y ortofotos oficiales · Open Data Bizkaia · geoEuskadi. | — |

**Validación del año:** `hero.year.invalid` → «Introduce un año entre 1900 y {snapshot_year}.»
No se exige que sea un año de nacimiento; el campo acepta cualquier año del rango.

## 13. Titular y cobertura (`RESULT`)

**`result.headline`** — métricas `C-04`, `C-05`, `C-02`

> Eres mayor que una parte de los edificios que hoy forman **{municipality}**.

**`result.lead`** — métrica `C-05` (denominador `C-02`)

> Entre los edificios actuales cuyo año de construcción consta en Catastro,
> **{post_share} de cada 100** se terminó después de **{selected_year}**.

- `{post_share}` = `round(C-05, 1)` con coma decimal (`47,6`).
- **Prohibido** `result.lead` sin la frase «cuyo año de construcción consta en Catastro».

**`result.coverage`** — métricas `C-01`, `C-02`, `C-03`

> Cobertura del dato: **{known}** de **{total}** edificios actuales de {municipality}
> tienen año conocido ({coverage_pct} %). La cifra anterior se calcula solo sobre esos {known}.
> {unknown_note}

- `{unknown_note}` = `· {unknown} sin año · {suspicious} con año anómalo.` (omite la parte
  que sea 0; si ambas son 0, no se muestra).

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

| Clave | Copy |
|-------|------|
| `dist.title` | Edificios actuales de {municipality} por periodo de construcción |
| `dist.axis.x` | Periodo de construcción |
| `dist.axis.y` | Nº de edificios actuales |
| `dist.bucket.pre1900` | antes de 1900 |
| `dist.bucket.decade` | {decade} · {decade+9} |
| `dist.bucket.none` | sin año |
| `dist.marker` | TU AÑO · {selected_year} |
| `dist.denominator` | sobre {known} edificios con año conocido |
| `dist.noyear_band` | Sin año utilizable: {no_year} · {no_year_pct} % |
| `dist.heaping` | **La distribución se agrupa por periodos, no por años.** Parte de las fechas del Catastro están redondeadas y se concentran en años acabados en 0 o 5 (en {municipality}, {heaping_pct} %). Por eso no leemos picos anuales como momentos de construcción. |
| `dist.bucket.pre1900.tooltip` | Edificios anteriores a 1900 · {n} · {share} % del parque con año conocido |
| `dist.tooltip.decade` | {decade}s · {n} edificios · {share} % del parque con año conocido |
| `dist.marker.note` | La línea marca tu año exacto. Las barras son periodos: la línea puede caer dentro de una barra. |

**Buckets (fijos, idénticos en desktop y móvil):** `<1900`, `1900s`, `1910s`, …, `2020s`, y
`SIN AÑO` fuera del eje. Máximo **15** categorías.

**Prohibido** en esta sección: «boom», «explosión», «el año en que se construyó más», y
cualquier lectura de crecimiento.

## 15. Mapa y leyenda

| Clave | Copy |
|-------|------|
| `map.legend.after` | Terminado después de {selected_year} |
| `map.legend.before` | Ya existía en {selected_year} |
| `map.legend.noyear` | Año no utilizable (sin dato o anómalo) |
| `map.legend.cells` | Cada celda colorea la cuota de **edificios** posteriores a {selected_year} |
| `map.legend.cells.small_n` | Pocos edificios con año válido en esta celda (n={n}); unos pocos edificios pueden cambiar mucho el porcentaje. |
| `map.tooltip.cell.share` | {share} de cada 100 edificios de esta celda se terminaron después de {selected_year} |
| `map.tooltip.cell.denominator` | sobre {known} edificios con año conocido |
| `map.tooltip.cell.footprint` | En huella en planta: el {share} % de la superficie con año conocido es posterior a {selected_year} |
| `map.tooltip.cell.no_known` | Esta celda no tiene edificios con año de construcción conocido |
| `map.cell.inspect` | Ver datos de esta zona |
| `map.cell.detail` | Celda seleccionada |
| `map.cell.close` | Cerrar detalle de celda |
| `map.cell.none` | No hay ninguna celda en el centro actual del mapa |
| `map.visible_universe` | Estadística del municipio de **{municipality}**. El encuadre del mapa no la cambia. |

El detalle de celda usa el **mismo contenido** que el tooltip de hover (cuota,
denominador, huella, aviso small-N) en una tarjeta persistente bajo el mapa:
clic/tap selecciona la celda; el botón `map.cell.inspect` la inspecciona en el
centro del mapa para teclado; `Esc`/cerrar, cambio de municipio o salir del
rango de zoom de celdas limpian la selección.

## 16. Edificio

| Condición | Copy |
|-----------|------|
| año `VALID` | Este edificio consta como terminado en **{year}**. |
| `UNKNOWN` | El Catastro no indica un año de construcción para este edificio. |
| `SUSPICIOUS` | El Catastro registra **{raw_value}**, un año anómalo: no se usa en las cifras. |
| `INVALID` (valor) | El año de este edificio no es interpretable: no se usa en las cifras. |
| geometría reparada | Geometría reparada y registrada (la original se conserva). |
| campos | Uso: {uso} · Alturas: {alturas} · Huella: {area} m² |
| nota | Huella en planta. No es superficie construida. |
| enlace | ¿Cómo se calcula? |

## 17. Ortofoto (opt-in)

| Estado | Copy |
|--------|------|
| propuesta | La foto aérea oficial más próxima a {selected_year} es de **{nearest_year}** (a {delta} años). |
| acciones | `Ver la foto de {nearest_year}` · `Comparar con {latest_year}` |
| en carga | Cargando la fotografía de {year}… |
| `AVAILABLE` | Fuente: {publisher} · Campaña {year}{flight_range}. `CC BY 4.0`. |
| `NOT_COVERED` | **La campaña de {year} no cubre este lugar.** Puedes probar {alt1} o {alt2}: son las campañas más cercanas que sí cubren este punto. |
| `SERVICE_ERROR` | La ortofoto oficial no está disponible temporalmente. El resto de la visualización sigue funcionando. |
| acción de recuperación | Reintentar |
| comparación | Campaña {left_year} ◀ ▶ Campaña {right_year} |

**Reglas:** `{alt1}`/`{alt2}` solo se ofrecen **después de verificar** su cobertura; si no se
han verificado, **no se ofrecen**. Prohibida la sustitución silenciosa de campaña.

**Preview progresivo (G1-R2/ADR-011):** la primera imagen visible puede ser una
versión de menor resolución de **la misma campaña oficial** servida desde el
propio sitio; la refina la tesela oficial en cuanto llega. No es otra fecha ni un
placeholder, así que la atribución `Fuente: {publisher} · Campaña {year}` sigue
siendo literalmente cierta y no necesita copy adicional.

## 18. Búsqueda de lugar (`PlaceSearch`)

| Estado | Copy |
|--------|------|
| `TOO_SHORT` | Consulta demasiado corta: escribe al menos 3 caracteres. |
| `SEARCHING` | Buscando… |
| `RESULTS` | {n} resultado(s) en NORA · {m} con datos disponibles |
| `NO_RESULTS` | No encontramos «{query}» en Bizkaia. Prueba con un municipio. |
| `OUT_OF_SCOPE` | NORA reconoce {n} lugares, pero están fuera de Bizkaia. |
| `NETWORK_ERROR` | No hay conexión con el geocodificador oficial (NORA). |
| anuncio | Seleccionado {municipality}. La estadística es la municipal. |

## 19. Compartir y estados vacíos

| Clave | Copy |
|-------|------|
| `share.label` | Compartir esta vista |
| `share.done` | Enlace copiado. Incluye tu año y el lugar; no incluye ningún dato personal. |
| `share.error` | No se pudo copiar el enlace. Puedes copiarlo de la barra de direcciones. |
| `empty.catalog` | Ahora mismo no hay datos disponibles para este lugar. |
| `error.pmtiles` | No se pudieron cargar los edificios. La estadística y la distribución siguen disponibles. |
| `error.generic` | Algo ha fallado. La parte de datos que ya estaba cargada sigue disponible. |

## 20. Fuentes y créditos (pie)

> **Fuente principal:** Open Data Bizkaia — Diputación Foral de Bizkaia (Catastro y ortofotos
> 1956–2002, CC BY 4.0). **Complemento:** geoEuskadi / Gobierno Vasco (ortofotos 2004–2025 y
> geocodificador NORA, CC BY 4.0). **Código:** MIT. **Snapshot de datos:** {snapshot_date}.

## 21. Niveles de divulgación

| Nivel | Contenido | Ubicación |
|-------|-----------|-----------|
| 1 | titular con la cifra | arriba |
| 2 | denominador, cobertura, advertencia «no sabemos de desaparecidos» | bajo el titular |
| 3 | `result.calc` | `¿Cómo se calcula?` en línea |
| 4 | metodología, fuentes, licencias, snapshot, heaping técnico | `Cómo lo sabemos` |

## 22. Eje temporal (`RESULT`, G2-A)

| Clave | Copy |
|-------|------|
| `time.axis_label` | Eje temporal: incorporación del parque actual por año registrado |
| `time.play` | Reproducir |
| `time.pause` | Pausar |
| `time.restart` | Reiniciar desde {selected_year} |
| `time.reset` | Volver al presente |
| `time.step_back` | Un año atrás |
| `time.step_fwd` | Un año adelante |
| `time.scrub_label` | Año en reproducción |
| `time.you` | TU AÑO · {selected_year} |
| `time.playhead` | REPRODUCCIÓN · {play_year} |
| `time.status` | Año en reproducción {play_year}: se muestra el parque actual con año registrado hasta {play_year}. |
| `time.caption` | Así se incorpora al mapa el parque que existe hoy según el año de construcción registrado en Catastro. Denominador: edificios actuales con año conocido. |
| `time.campaigns_note` | Las marcas son campañas oficiales de ortofoto (año nominal; la fecha real del vuelo puede diferir). Activa una marca para comprobarlo desde el aire. |
| `time.campaign_action` | Ver la ortofoto de la campaña {year} |
| `map.legend.cells.play` | Cada celda colorea la cuota del parque actual constatada hasta {play_year} |
| `map.legend.buildings.play` | Se muestran los edificios registrados hasta {play_year} |

Contrato (semántica §11 de `DATA_SEMANTICS.md`):

- El cabezal solo habla del **parque actual** con **año registrado** hasta ese
  año — «constatado hasta {play_year}», nunca «así era Bizkaia en {play_year}».
- «TU AÑO» es la marca fija del usuario; el cabezal nunca la mueve.
- Las campañas muestran su **año nominal** y el aviso de que el vuelo real puede
  diferir (regla no negociable de `AGENTS.md`).
- Prohibido en todo el eje: «reconstruimos», «así era», «parque histórico»,
  «vuelo de {año}» sin matizar nominalidad.

## 23. Vistas MAPA·TIEMPO·FOTO y contraste (G2-B)

| Clave | Copy |
|-------|------|
| `view.label` | Vista |
| `view.map` | MAPA |
| `view.time` | TIEMPO |
| `view.photo` | FOTO |
| `photo.label` | Ortofoto oficial sobre la misma vista del mapa |
| `photo.prev` | Campaña anterior: {year} |
| `photo.next` | Campaña siguiente: {year} |
| `photo.nominal` | campaña nominal {year} |
| `photo.proposal` | Sin imagen cargada todavía: activa la campaña para comprobar su cobertura aquí. |
| `photo.activate` | Comprobar desde el aire |
| `contrast.title` | Edificios frente a huella en planta |
| `contrast.buildings` | de cada 100 edificios actuales con año conocido se terminaron después de {selected_year} |
| `contrast.footprint` | de la huella en planta de los edificios con año conocido y geometría válida es posterior a {selected_year} |
| `contrast.note` | El recuento de edificios y el territorio que ocupan cuentan historias distintas. |

Contrato:

- Las tres vistas son **acentos sobre la misma escena**, no tres apps: el
  selector es tipográfico (MAPA · TIEMPO · FOTO), nunca pills ni segmented
  control.
- FOTO muestra siempre editor + año nominal + vuelo real (si se conoce) +
  licencia; «Comprobar desde el aire» es la única vía de carga.
- El contraste compara C-05 y C-08 **con sus denominadores explícitos**;
  prohibido «dispersión», «densificación», «compacto» o «sprawl» —
  interpretaciones que requieren evidencia externa.
- **Ubicación (G4-H1):** el bloque de contraste ya no aparece en el flujo
  municipal; se renderiza solo dentro de los capítulos `f4036`/`f4738` con
  los valores congelados de sus story briefs (§28.3).

## 24. MI EDIFICIO y DOS AÑOS (`RESULT`, G3-A)

### 24.1 Flujo de dirección (MI EDIFICIO)

| Clave | Copy |
|-------|------|
|| `address.invite` | ¿Quieres bajar hasta tu calle? |
|| `address.invite_note` | Busca una dirección en {municipality}. Nada se guarda ni sale de esta página. |
|| `address.start` | Buscar una dirección |
|| `address.label.street` | Calle en {municipality} |
|| `address.label.number` | Número |
|| `address.label.bis` | Bis |
|| `address.street.searching` | Buscando la calle… |
|| `address.street.none` | No encontramos esa calle en {municipality}. Prueba con el nombre oficial, en castellano o en euskera. |
|| `address.street.outside` | NORA reconoce calles con ese nombre, pero fuera de {municipality}. |
|| `address.street.pick` | Hay {n} calles con ese nombre en {municipality}. Elige una: |
|| `address.street.network_error` | No hay conexión con el geocodificador oficial (NORA). |
|| `address.portal.none` | No consta el número {number} en esa calle. |
|| `address.portal.pick` | Hay varios portales con ese número. Elige el tuyo: |
|| `address.building.searching` | Comprobando el edificio… |
|| `address.building.not_found` | No hemos podido vincular esta dirección a un edificio catastral concreto. |
|| `address.building.multiple` | El portal corresponde a {n} edificios catastrales. Elige cuál es el tuyo: |
|| `address.result.title` | Tu edificio |
|| `address.result.linked` | Identificado en Catastro a partir del portal {portal_desc}. |
|| `address.result.nora_only` | NORA identifica edificio en este portal, pero ningún polígono catastral contiene el punto del portal. Mostramos el dato NORA sin vincularlo al Catastro. |
|| `address.year.both_equal` | Catastro y NORA registran el mismo año: {year}. |
|| `address.year.both_differ` | Catastro registra {catastro_year}. NORA registra {nora_year}. Son dos fuentes oficiales distintas; mostramos ambas sin corregir una con la otra. |
|| `address.year.catastro_only` | Catastro registra {catastro_year}. NORA no registra año para este edificio. |
|| `address.year.nora_only` | NORA registra {nora_year}. El Catastro no indica un año de construcción para este edificio. |
|| `address.year.both_unknown` | Ni Catastro ni NORA registran un año de construcción para este edificio. |
|| `address.provenance` | Dirección: NORA (geoEuskadi, Gobierno Vasco) · Edificio: Catastro de Bizkaia (Open Data Bizkaia). La vinculación es por el punto oficial del portal. |
|| `address.reset` | Buscar otra dirección |
|| `address.close` | Cerrar la búsqueda de dirección |

### 24.2 Segundo ancla temporal (DOS AÑOS)

| Clave | Copy |
|-------|------|
|| `compare.invite` | Añade otro año |
|| `compare.invite_note` | Por ejemplo el de otra persona. Misma vista, dos años. |
|| `compare.label` | Otro año |
|| `compare.apply` | Comparar |
|| `compare.remove` | Quitar el segundo año |
|| `compare.invalid` | Introduce un año entre 1900 y {snapshot_year}. |
|| `compare.marker` | OTRO AÑO · {compare_year} |
|| `compare.partition.title` | El parque actual repartido entre dos años |
|| `compare.partition.before` | Hasta {earlier}: {n} edificios ({pct} %) |
|| `compare.partition.between` | Entre {earlier} y {later}: {n} edificios ({pct} %) |
|| `compare.partition.after` | Después de {later}: {n} edificios ({pct} %) |
|| `compare.partition.unknown` | Sin año utilizable: {n} |
|| `compare.partition.denominator` | De los edificios actuales con año conocido en {municipality} ({known}). |
|| `map.legend.compare.before` | Terminado hasta {earlier} |
|| `map.legend.compare.between` | Entre {earlier} y {later} |
|| `map.legend.compare.after` | Después de {later} |

### 24.3 Contratos de copy (G3-A)

- **Privacidad explícita**: «Nada se guarda ni sale de esta página.» La
  dirección nunca se serializa a la URL ni a storage; el deep link de edificio
  usa el id catastral (`building=`), nunca el texto de la dirección.
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

| Tramo | Heading | Contenido |
|-------|---------|-----------|
| Lectura | `La forma del parque` | distribución por décadas + caveat |
| Acción | `Tu lugar concreto` | invitación MI EDIFICIO → profundidad del edificio → invitación DOS AÑOS |
| Editorial | `Para seguir leyendo` | planeamiento municipal + historias |

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

- **FOTO** (`PhotoPanel`, sección §17): sin cambios de contrato. Entrar en el
  modo **no pide imagen**; `Comprobar desde el aire` sigue siendo el opt-in.
- **1923–25** (`histmap.*`, sección §26): entrar en el modo **es** el opt-in —
  ya no hay propuesta ni botón «Ver el mapa histórico» propio. El panel del
  modo ofrece `Reintentar` (si `UNAVAILABLE`) y `Volver al mapa actual`
  (`histmap.exit`), que devuelve al modo MAPA.
- **1956/HOY** (`swipe.*`): entrar en el modo **es** el opt-in — pide la
  ortofoto actual y la de 1956 para el lugar en vista. El divisor es un
  `role="slider"` accesible (teclado y arrastre, handle ≥44 px). No hay
  botón de salida propio: se sale cambiando de modo en el `ViewSwitch`,
  como en `map`/`time`.

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

- **Un opt-in, un verbo**: la evidencia visual se pide con verbos de acción
  («Comprobar desde el aire», entrar en `1923–25`); nunca aparece sola.
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

> «Eres mayor que el **{share_pct} %** de los edificios que hoy forman
> **{municipality}**.»

- `result.plain.*` (G5-R2): frase directa bajo el titular que reformula
  el porcentaje con la marca del producto — «Es decir: {approx} edificios
  actuales de {municipality} son más jóvenes que tú.» (`plain.some`);
  bordes gramaticales propios `plain.none` («ningún edificio… es más
  joven que tú») y `plain.all` («casi todos… son más jóvenes que tú»).
  `approx` sale de `approxOfTen()` y la plantilla de `approxKind()`
  (`src/lib/domain/human.ts`): «casi N de cada 10» / «N de cada 10» /
  «algo más/menos de N de cada 10» / «menos de 1 de cada 10». Nunca
  inventa la fracción — siempre deriva del valor exacto del titular.
- `result.lead`: cifras exactas — «De los {known} edificios actuales con
  año registrado en Catastro, {after} se terminaron después de
  {selected_year}.»
- `result.population` (G5-R2): un único dato humano junto al resultado —
  «{municipality} tiene hoy {population} habitantes empadronados (Eustat,
  padrón de {period}).» Viaja dentro del metrics JSON
  (`constants.population`, `pipeline/g5_population_into_metrics.py`):
  cero peticiones nuevas en el critical path.
- `result.coverage` (simplificada G5-R2): «Hay año registrado para
  {known} de los {total} edificios actuales ({coverage_pct} %); la cifra
  se calcula solo sobre esos.» + nota de `unknown`/`suspicious` en
  lenguaje llano («no tienen año utilizable» / «registran un año
  anómalo»).
- **Jerga fuera de la superficie**: «Numerador», «Denominador»,
  `Ano_Constr` y referencias `DATA_SEMANTICS §…` no aparecen en copy de
  consumo; el cálculo literal vive en `result.calc.*` (disclosure «Cómo lo
  calculamos», en el tramo de lectura) y en `/como-lo-sabemos`.

### 29.2 Escena y modos

- `view.bridge`: «El tiempo de esta pieza es el año de construcción
  registrado en Catastro. Las fotos aéreas y el mapa de 1923–25 son otras
  fuentes para comprobarlo con tus ojos: no son fechas de construcción.»
- FOTO (`photo.*`): procedencia «{editor} · campaña {year} · CC BY 4.0»
  siempre visible; `photo.activate` = «Comprobar desde el aire»;
  comparación `ortho.compare_label` = «Campaña {left} ◀ ▶ Campaña
  {right}»; en pantalla estrecha el toggle elige campaña
  (`photo.panel_a`, `photo.mobile_hint`); contorno de edificios opt-in
  (`overlay.buildings.*`).
- 1923–25 (`histmap.*`): «Es un mapa dibujado por cartógrafos, no una
  fotografía. Cada hoja tiene su propio año de levantamiento entre 1923 y
  1925.» — el modo es standalone, sin rellenos de dato encima.
- 1956/HOY (`swipe.*`, G6): chips «{before_year}» / «Hoy · {after_year}»;
  ayuda `swipe.hint` = «Desliza para comparar»; nombre accesible del
  divisor `swipe.slider` = «Cortina de comparación: {before_year} a la
  izquierda, hoy a la derecha»; estados honestos `swipe.loading` /
  `swipe.tiles` / `swipe.error` / `swipe.after_error` (`role="status"`,
  fail-closed); atribución dual `swipe.src` con licencia CC BY 4.0 — en
  pantalla estrecha la atribución propia se oculta porque la del mapa
  principal ya la cubre.

### 29.3 Qué más sabemos del lugar (`place.*`, `planning.*`)

Hechos en línea con fuente y fecha explícitas, máximo 2–3:

> «{municipality} tenía {pop} habitantes a 1 de enero de {pop_year}
> (Eustat, padrón municipal). En el censo de {census_year} contaba con
> {pop} habitantes (Eustat, población de hecho).»

> «A fecha de {ref_date}, el planeamiento vigente registra en
> {municipality}: {viv} viviendas pendientes de ejecución; {res} de suelo
> residencial vacante; {ae} de suelo de actividad económica vacante.»

- El censo se elige como el **más cercano al año personal** con dato real;
  nunca se interpola. El padrón es población de derecho y el censo de
  hecho: se nombran distinto.
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

### 30.1 Rail de épocas en FOTO

- Etiqueta accesible del grupo: `photo.epochs_a11y` = «Fotos aéreas
  oficiales disponibles, por campaña».
- Cada botón muestra el **año nominal** de campaña; la más cercana al
  año personal lleva además el marcador `photo.epoch_birth` = «la más
  cercana a tu año de nacimiento».
- Relación temporal en texto (`photo.rel_*`): «{n} antes de que
  nacieras» · «{n} después de que nacieras» · «tu año de nacimiento».
  Nunca se etiqueta una imagen con el año del usuario.

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
