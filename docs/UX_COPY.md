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
- Campos: `Uso: {use}` · `Alturas: {n}` · `Viviendas: {n}` · `Huella: {m²} m²`
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
> Campaña **1956** (vuelo 1956–1957).

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
> se nombra por su año nominal, pero el vuelo puede abarcar un rango. Por eso mostramos
> la campaña y, cuando consta, el rango real: por ejemplo, «campaña 1956 (vuelo 1956–1957)».
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
