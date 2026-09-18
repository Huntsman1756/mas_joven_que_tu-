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
| `map.visible_universe` | Estadística del municipio de **{municipality}**. El encuadre del mapa no la cambia. |

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
