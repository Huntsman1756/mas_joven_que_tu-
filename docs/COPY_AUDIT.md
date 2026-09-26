# COPY_AUDIT.md — revisión editorial independiente (fase 1: auditoría)

> Auditoría de copy público encargada como **revisión externa**, con foco
> editorial. El revisor no ha construido el producto. Este documento es la
> **fase 1** del encargo: inventario y diagnóstico **sin modificar código ni
> strings**. La implementación (fase 2) no se inicia hasta validar prioridades.
>
> Fuente de copy: `app/src/lib/i18n/es.ts` (513 claves) y `eu.ts` (513 claves,
> paridad estructural exacta). Contratos leídos: `EDITORIAL_STYLE.md`,
> `DATA_SEMANTICS.md`, `MAP_MODE_CONTRACT.md`, `UX_COPY.md`, `PRODUCT.md`,
> `docs/g4/COPY-AUDIT.md`, ADR-011/013/016/019/022/024.
>
> Relación con `docs/g4/COPY-AUDIT.md`: ese documento es la auditoría G4
> previa (285 claves) y **no tenía escala de severidad**. Aquí se introduce una
> (P0–P3) y se evita contradecir sus conclusiones; se reutiliza su hallazgo
> sistémico («los problemas son sistémicos, no frases sueltas»).

---

## 1. Verdad semántica verificada (antes de proponer nada)

Ninguna propuesta de este documento sustituye el significado de un dato. Para
el bloque representativo se comprobó el comportamiento real en código.

### 1.1 Bloque representativo de leyenda (modo `map`, nivel zona)

| Clave | Texto actual | Qué hace realmente el código | Evidencia |
|---|---|---|---|
| `map.legend.cells` | `Edificios construidos después de {selected_year}` | Título de leyenda a nivel zona (`legendTitle`) | `MapView.svelte:51-61` |
| `map.legend.cells.nodata` | `a rayas: zona sin edificios con año conocido` | Trama rayada ⇔ `cellDataState(known, share) === 'no-known'`, es decir `known === 0` (ningún edificio con año VALID). No distingue «zona sin edificios» de «zona con edificios todos sin año»: por eso el texto acierta al decir «sin edificios **con año conocido**» | `MapView.svelte:286-288`, `MapView.svelte:1713-1714`, `cells.ts:10-20` |
| `map.legend.cells.less` / `.more` | `0 % · ninguno` / `100 % · todos` | Extremos de la rampa de cuota (0 % y 100 %) | `MapView.svelte:1752-1770` |
| `map.legend.cells.universe` | `sobre los de año conocido de cada zona` | Denominador de la cuota por zona = C-02 | `MapView.svelte:1774-1775`; `DATA_SEMANTICS §11 C-05` |
| `map.legend.cells.pending` | `El tono neutro sin rayas también puede indicar datos pendientes o no disponibles.` | El relleno neutro (`paper2`) se pinta cuando `share === null` **con** `known > 0`: serie en vuelo (`loading`), fallida (`error`) o resuelta sin registro (`missing`). Es decir: neutro sin trama = carga/fallo/ausencia declarada, **no** cero | `MapView.svelte:98-117` (`SHARE_PAINT`), `MapView.svelte:280-288`, `cells.ts:3-20`, `MapView.svelte:1776` |
| `map.scale.zones` | `Vista por zonas. Acerca para ver edificios.` | Guía de escala a nivel CELDA | `MapView.svelte:1780-1781` |
| `map.visible_universe` | `Estadística del municipio de {municipality}. El encuadre del mapa no la cambia.` | Declara que el universo estadístico es municipal y no depende del viewport | `MapView.svelte:1783-1785`; `DATA_SEMANTICS §13` |
| `map.cell.inspect` | `Ver datos de esta zona` | **Abre la ficha de la zona situada en el CENTRO del encuadre**, no de una zona previamente seleccionada. El `title` (tooltip de ratón) sí lo dice: «Datos de la zona centrada en el mapa» | `MapView.svelte:1786-1797` + `1792`; `CellDetail.svelte:48-62` |

Conclusión: el bloque es **semánticamente correcto** pero está redactado como
leyenda de sistema, mezcla cinco funciones (título, escala, universo, estado de
dato y acción) en la misma jerarquía, contiene fragmentos sin verbo y usa
vocabulario de implementación («encuadre», «tono neutro», «a rayas:»).

### 1.2 Universo y denominadores (no negociable)

- Todo porcentaje personal usa C-05 (`after ÷ known`), nunca C-01. El universo
  debe nombrarse. `result.lead.some`, `result.lead`, `result.coverage` lo
  respetan.
- `UNKNOWN`, `SUSPICIOUS` e `INVALID` cuentan como **no conocido**. `known` de
  la trama y de las cuotas = solo `VALID`.
- La huella es **huella en planta**, nunca «superficie construida».
- `CURRENT_BUILDING_STOCK != HISTORICAL_BUILDING_STOCK`: prohibido «así era».
- `UNKNOWN != 0`: prohibido 1900/«antiguo».

### 1.3 Discrepancias documentación ↔ aplicación registradas

Ninguna discrepancia semántica bloqueante. Sí hay **deriva de vocabulario**
entre documentos y app (mismo concepto, varias formas):

- universo: «con año conocido» (leyenda) / «con año de construcción conocido»
  (`result.lead`, `how.measure`) / «con año registrado» (`result.coverage`,
  `result.calc`, `time.status`);
- parque: «edificios actuales» / «parque actual» / «edificios que existen hoy»;
- evidencia aérea: «campaña» en superficie cuando `docs/g4/COPY-AUDIT.md` §4
  ya recomendó reservar «campaña» a procedencia/metodología.

### 1.4 Copy fuera del diccionario (riesgo de contrato C1)

`AGENTS.md` y `UX_COPY.md` §11 declaran el diccionario como **única** fuente de
texto. Hay copy visible generado fuera de `t()`:

- `app/src/lib/domain/human.ts:14-34` — aproximaciones ES/EU inyectadas en
  `result.lead.some` (`'casi 3 de cada 10'`, `'menos de 1 de cada 10'`…).
- `app/src/lib/domain/ortho.ts:127,138`, `histmap.ts:16`,
  `MapView.svelte:1157` — atribuciones de mapa hardcodeadas.
- `app/src/app.html:8,37,40,49,52` — `<title>`/OG/Twitter sin localizar
  (el `<title>` de runtime sí se localiza en `+page.svelte:313`).
- `app/src/lib/domain/metrics.ts:104` — `'sin año'` definido y luego sombreado
  por `t('dist.bucket.none')` (no llega a pantalla, pero es una trampa).

`copylint.test.ts` solo inspecciona `.svelte`, así que estas cadenas escapan al
control. Se marca como hallazgo estructural, no como frase.

---

## 2. Inventario y clasificación global

513 claves. Clasificación de esta auditoría (una clave puede acumular marcas):

| Clase | n aprox. | Significado |
|---|---|---|
| `GOOD` | ~300 | correcto; no se toca |
| `AWKWARD` | ~45 | correcto pero poco natural / telegráfico |
| `TECHNICAL` | ~22 | jerga de sistema en superficie ciudadana |
| `REDUNDANT` | ~15 | mismo hecho repetido en el mismo viewport |
| `TOO_LONG` | ~18 | > 80–120 car. donde la lectura móvil sufre |
| `AMBIGUOUS` | ~10 | el lector no sabe qué pasará o qué se mide |
| `ACTION_MISMATCH` | ~4 | el botón promete algo distinto de lo que abre |
| `INCONSISTENT` | ~12 | mismo concepto con varias formas |
| `DEAD` | 30 | en el diccionario, no referenciada por ningún componente |

Claves muertas (30): `facts.*` (6), `year.slider.*` (3), `building.calc`,
`building.invalid`, `building.repaired`, `address.portal.searching`,
`address.portal.acepcion`, `address.portal.cp`, `address.result.linked`,
`planning.title`, `contrast.title`, `compare.partition.title`,
`dist.marker.note`, `ortho.section_label`, `histmap.view`, `histmap.hide`,
`a11y.map.canvas.compare`, `empty.catalog`, `place.context.loading`,
`result.population`, `result.population.src`, `story.discover`,
`map.legend.buildings.play`.

Observación: la limpieza de claves muertas es P3 y **no** debe hacerse sin
confirmar que no son contrato de un gate (varias tienen pinta de retirada
deliberada). Se listan para decisión, no para borrado automático.

---

## 3. Hallazgos priorizados

Formato: `clave` — **Antes** → **Después** (propuesta) — *por qué* — riesgo
semántico. Las propuestas **preservan** el significado; solo cambian registro,
jerarquía y longitud.

### P0 — semántica ambigua, acción prometida ≠ acción real

1. **`map.cell.inspect`** — Antes: `Ver datos de esta zona` → Después:
   `Ver los datos de la zona del centro` — *el botón no inspecciona la zona que
   el usuario tocó, sino la que está en el centro del encuadre; en táctil no hay
   tooltip que lo aclare* (`MapView.svelte:1786-1797`, `CellDetail.svelte`).
   Riesgo semántico: BAJO (no cambia el dato; aclara cuál es la zona).

2. **`map.legend.cells.pending`** — Antes: `El tono neutro sin rayas también
   puede indicar datos pendientes o no disponibles.` → Después: `Una zona sin
   color y sin rayas indica que sus datos aún no están disponibles.` — *el
   original describe la codificación visual («tono neutro») en vez del hecho;
   «también puede» diluye una advertencia importante.* Debe conservarse la
   disociación con la trama (el rayado significa otra cosa). Riesgo: MEDIO
   (no debe convertirse en «no hay edificios»: el neutro es carga/fallo/ausencia
   declarada, `cells.ts:3-20`).

3. **`map.legend.cells.universe`** — Antes: `sobre los de año conocido de cada
   zona` → Después: `Porcentaje sobre los edificios con año de construcción
   conocido de cada zona.` — *fragmento sin verbo; el denominador es contrato
   (C-02) y debe quedar inequívoco.* Riesgo: BAJO si se conserva «de cada zona»
   y «año conocido».

4. **`map.legend.cells.nodata`** — Antes: `a rayas: zona sin edificios con año
   conocido` → Después: `Trama rayada: zonas sin edificios con año de
   construcción conocido.` — *telegráfico; «a rayas:» es etiqueta de sistema.*
   Riesgo: BAJO (mantiene «sin edificios con año conocido» = `known === 0`).

5. **`map.visible_universe`** — Antes: `Estadística del municipio de
   {municipality}. El encuadre del mapa no la cambia.` → Después: `La cifra
   corresponde a todo {municipality} y no cambia al mover el mapa.` — *evita
   «encuadre» (jerga) y suena a frase, no a nota de sistema.* Riesgo: BAJO
   (conserva universo municipal + independencia del viewport).

6. **`map.scale.zones`** — Antes: `Vista por zonas. Acerca para ver edificios.`
   → Después: `Los datos están agrupados por zonas de 500 m. Acércate para ver
   los edificios individualmente.` — *«Vista por zonas» es manual de GIS; la
   dimensión 500 m es dato verificado (`PRODUCT.md` §5).* Riesgo: BAJO.

7. **`view.cta_era.note`** — Antes: `Campaña cercana a tu nacimiento:
   {campaign_year}` → Después: `Fotografía aérea más cercana a tu nacimiento:
   {campaign_year}` — *«campaña» es término de procedencia, no de superficie
   (`docs/g4/COPY-AUDIT.md` §4); el CTA ya dice «Ver fotografías históricas».*
   Riesgo: BAJO (sigue siendo la campaña C-11).

8. **`swipe.after_missing`** — Antes: `Mapa · {year} sin imagen` → Después:
   `Sin imagen para {year}: se muestra el mapa de edificios` — *chip telegráfico
   que junta dos ideas y confunde «falta la imagen de este año» con «este año
   no existe».* Riesgo: MEDIO (el lado derecho muestra el mapa, no la ortofoto;
   `SwipeCompare.svelte:262`).

9. **`photo.nodata`** — Antes: `Las zonas sin cobertura de la campaña se
   muestran con fondo neutro, no como imagen.` → Después: `Donde la campaña no
   tiene imagen, el fondo queda neutro en lugar de mostrar una fotografía.` —
   *«fondo neutro» es vocabulario de implementación.* Riesgo: BAJO (mantiene
   «sin cobertura de la campaña» ≠ imagen).

10. **`result.coverage`** — Antes: `Cobertura del año registrado: {pct} %.` →
    Después: `Año de construcción conocido en el {pct} % de los edificios.` —
    *«cobertura del año registrado» es jerga de pipeline; y «registrado» rompe
    la unidad de vocabulario «conocido».* Riesgo: MEDIO (debe seguir midiendo
    C-02/C-01 y quedar junto a la cifra, `DATA_SEMANTICS §7`).

### P1 — comprensión (el lector entiende el dato, pero con esfuerzo)

11. **`map.intro.cells`** — Antes: `Cada cuadrado agrupa los edificios actuales
    de una zona de 500 m; todos siguen visibles y el color indica qué parte se
    construyó después de {selected_year}, entre los que tienen año conocido.` →
    Dos frases: `Cada cuadrado agrupa los edificios de una zona de 500 m. Todos
    siguen visibles; el color indica qué parte se construyó después de
    {selected_year}, entre los edificios con año conocido.` — *una frase = una
    idea; la actual encadena cuatro conceptos.* Riesgo: BAJO.

12. **`map.intro.munis`** — Antes: `...el color indica qué parte de los de cada
    municipio se construyó...` → `...qué parte de los edificios de cada
    municipio se construyó...` — *«los de cada municipio» es elipsis dura.*
    Riesgo: BAJO.

13. **`map.intro.buildings`** — Antes: `Bermellón si se terminó después de
    {selected_year}; azul si ya existía; a rayas si el año no es utilizable.` →
    Mantener color + significado, pero con nexos: `...; y trama rayada si el
    año no es utilizable.` — *serie telegráfica; añadir el sustantivo «trama»,
    que es lo que se ve.* Riesgo: BAJO.

14. **`result.lead`** — Antes: `{after} de {known} edificios con año de
    construcción conocido.` → `{after} de {known} edificios actuales con año
    conocido.` — *unifica el universo con el resto de la app y restaura
    «actuales», que es contrato (`CURRENT_BUILDING_STOCK`).* Riesgo: BAJO.

15. **`result.calc`** — Antes: `La cuenta: {after} edificios posteriores a
    {selected_year} ÷ {known} edificios con año registrado = {post_share} de
    cada 100. Los edificios sin año utilizable no entran ni arriba ni abajo.` →
    `El cálculo: {after} edificios terminados después de {selected_year} de un
    total de {known} con año conocido = {post_share} de cada 100. Los edificios
    sin año utilizable no entran ni en el numerador ni en el denominador.` —
    *«La cuenta:» es coloquial y el símbolo ÷ no se lee; «arriba/abajo» obliga a
    imaginar una fracción.* Riesgo: MEDIO (mantener numerador/denominador
    literales; es superficie técnica, `UX_COPY §21` nivel 3).

16. **`dist.denominator`** / **`map.tooltip.cell.denominator`** — Antes:
    `sobre {known} edificios con año conocido` → `porcentaje calculado sobre
    {known} edificios con año conocido` — *fragmento sin verbo; en tooltip
    puede bastar «de {known} con año conocido».* Riesgo: BAJO.

17. **`hotspots.title`** — Antes: `Zonas de 500 × 500 m con más edificios
    actuales construidos después de {year}:` → `Las zonas que concentran más
    edificios posteriores a {year}:` + nota de 500 m aparte. *La etiqueta
    completa es obligatoria (`DATA_SEMANTICS §20`: «celdas de 500 m con más
    edificios actuales construidos después de Y»), así que la reescritura solo
    puede reordenar, no eliminar «500 m» ni «actuales».* Riesgo: ALTO si se
    quita «500 m» o «actuales»; BAJO si solo se reordena.

18. **`planning.intro`** — Antes: `Los datos de planeamiento de {municipality},
    con fecha {ref_date}, recogen:` → `A {ref_date}, el planeamiento vigente de
    {municipality} registra:` — *`EDITORIAL_STYLE §8` ya prescribe la fórmula
    «A fecha, el planeamiento vigente de X registra…» una sola frase con la
    lista.* Riesgo: BAJO (mismo dato y fecha).

19. **`result.coverage.detail.body`** — Antes: `El año de construcción está
    registrado para {known} de los {total} edificios actuales; el porcentaje se
    calcula solo sobre los de año conocido.` → Mantener, pero alinear «conocido»:
    `...para {known} de los {total} edificios actuales; el porcentaje se calcula
    solo sobre los que tienen año conocido.` Riesgo: BAJO.

20. **`photo.rail_note`** — Antes: dos ideas en una cadena (`...no una serie
    anual... El año de cada campaña es nominal...`). Separar en dos: nota del
    rail + nota de nominalidad. *`docs/g4/COPY-AUDIT.md` §5 ya señaló esta
    cadena larga.* Riesgo: BAJO (conservar ambas advertencias).

21. **`swipe.only_before` / `.only_after`** — Antes: `Solo {year}` → `Ver solo
    la imagen de {year}` — *«Solo 1956» no dice qué se sola.* Riesgo: BAJO.

22. **`map.cell.chip.after` / `.chip.play`** — Antes: `En esta zona · {after}
    de {known} · {pct} %` → aceptable como chip colapsado, pero el `title`/
    `aria-label` debería llevar la frase completa (`map.cell.sentence`). Es un
    caso de accesibilidad, no de estilo. Riesgo: BAJO.

23. **`result` bloque completo** — Antes (mismo viewport): h1 «casi 3 de cada
    10», `La cifra exacta: 30,3 %`, `1.357 de 4.472 edificios...`, `Cobertura
    ... 99,8 %`. → Mantener las cuatro piezas pero eliminar una si la prueba de
    eliminación dice que sobra; alternativa: h1 con la frase llana, y el
    desplegable «Sobre este dato» absorbe el recuento exacto. *Tres
    representaciones del mismo hecho seguidas (§20).* Riesgo: MEDIO (el
    recuento exacto y la cobertura son contrato; solo puede demoverse de
    jerarquía, no ocultarse).

### P2 — naturalidad y consistencia

24. **`map.legend.cells.play`** — Antes: `Edificios actuales ya construidos en
    {play_year}` → `Edificios actuales construidos hasta {play_year}` —
    *conserva «actuales» (contrato) y evita el choque «actuales ya».* Riesgo:
    BAJO.

25. **`time.status`** — Antes: `...el parque actual con año registrado hasta
    {play_year}` → `...el parque actual con año conocido hasta {play_year}` —
    *unifica «conocido».* Riesgo: BAJO.

26. **`sources.planning.what`** — Antes: `el «¿y mañana?» con carácter
    informativo.` → `lo que el planeamiento prevé, con carácter informativo.` —
    *el entrecomillado coloquial choca con el registro sobrio.* Riesgo: BAJO.

27. **`empty.catalog`** (muerta) — `Ahora mismo no hay datos disponibles para
    este lugar.` → `No hay datos disponibles para este lugar.` — «ahora mismo»
    es conversacional. Riesgo: BAJO.

28. **`result.invite`** — `Compara las fotografías y descubre dónde se
    concentran.` → correcto; conservar. Se deja `GOOD` explícito porque el
    verbo «comparar» aquí apunta a FOTOS y el modo comparación real es «Antes /
    ahora»; no confundir en una futura reescritura.

29. **`view.explore`** — `Explora {municipality}` — correcto; conservar.

30. **`swipe.hint`** — `Desliza para comparar` — correcto; conservar.

31. **`address.invite`** — `¿Quieres bajar hasta tu calle?` — voz natural,
    segunda persona; conservar (modelo de tono).

32. **`hero.tagline`** — `Tu vida como medida del territorio` — conservar
    (metáfora controlada).

33. **`result.lead.some`** — `De los edificios actuales con año conocido,
    {approx} se construyeron después de que nacieras.` — conservar; es el
    titular llano y nombra universo. No cambiar «approx» ni el orden.

34. **`dist.heaping`** — larga y técnica pero **necesaria** (contrato §14).
    No acortar. Candidata a vivir tras «Cómo lo calculamos» si algún día se
    quiere aligerar la sección; hoy está bien donde está.

35. **`time.caption`** — larga y necesaria (contrato §15). No tocar.

36. **`planning.meaning`** — larga y necesaria (contrato §9.2). No tocar.

37. **`address.invite_note`**, **`swipe.pick.note`**, **`ortho.not_covered`** —
    honestidad y procedencia; alargar no, acortar con cuidado. P2 solo si la
    medición móvil muestra desbordamiento.

38. **`footer.sources`**, **`how.sources`** — procedencia; no tocar salvo
    unificar etiquetas de fuente (ver hallazgo 40).

39. **`map.cell.sentence`** / `.play` — `constan construidos hasta {play_year}`
    — conservar; la forma verbal es deliberada para no afirmar verdad
    histórica (`AGENTS.md`, `DATA_SEMANTICS §15`).

40. **Etiquetas de fuente** (INCONSISTENT) — mismo organismo escrito de varias
    formas (`Open Data Bizkaia — Diputación Foral de Bizkaia`, `Open Data
    Bizkaia (Diputación Foral de Bizkaia, CC BY 4.0)`, `geoEuskadi — Gobierno
    Vasco`, `geoEuskadi / Gobierno Vasco`). Fijar una forma canónica por
    organismo en `sources.*`, `footer.*`, `planning.source`, `histmap.available`,
    `context.*.source`. Riesgo: BAJO (solo forma; no cambia licencia ni fuente).

### P3 — polish y limpieza

41. **Claves muertas** (30, §2) — decidir: reintroducir, borrar o documentar
    como reservadas. No borrar en bloque sin revisar gates.

42. **`human.ts`** — mover las aproximaciones a `es.ts`/`eu.ts` para cumplir C1
    (o documentar la excepción). Riesgo: MEDIO si se toca la lógica; P3 porque
    hoy funciona.

43. **Atribuciones hardcodeadas** (`ortho.ts`, `histmap.ts`, `MapView:1157`) —
    localizar o declarar excepción de atribución. P3.

44. **`app.html` OG/Twitter** — no localizados; el `<title>` sí. P3 (SEO/i18n).

45. **`metrics.ts:104`** `'sin año'` sombreado — eliminar el literal o
    usarlo; hoy es una trampa silenciosa. P3.

46. **`dist.marker`** `TU AÑO · {selected_year}` — mayúsculas de kicker;
    correcto para el diseño; conservar.

47. **`result.support`** `La cifra exacta:` — dos puntos + label; correcto si
    se mantiene la pieza; subordinado al hallazgo 23.

48. **`hero.year.invalid`** / **`compare.invalid`** — `Introduce un año entre
    1900 y {snapshot_year}.` — correcto y consistente; conservar.

---

## 4. Strings deliberadamente NO modificadas (rigor)

Se dejan intactas aunque suenen raras, porque su forma protege un contrato:

| Clave | Motivo |
|---|---|
| `map.cell.sentence.play` | «constan construidos hasta» evita afirmar verdad histórica (`§15`). |
| `time.caption` | Declara que no se reconstruye el parque histórico. |
| `result.caveat` | «El Catastro describe los edificios que existen hoy» — caveat obligatorio. |
| `how.unknown` | «desconocido, nunca 1900 ni “antiguo”» — contrato de estado. |
| `building.year` | «consta como terminado en {year}» — no afirma fecha de proyecto. |
| `planning.not_prediction` / `planning.meaning` | Planeamiento ≠ predicción. |
| `context.noise.not_mapped` | NOT_MAPPED ≠ 0 dB. |
| `context.monte.source` | Monte público ≠ espacio protegido. |
| `address.provenance` / `address.year.*` | NORA ≠ Catastro; dos fuentes sin ganador. |
| `map.legend.cells.small_n` | Prohibido decir «fiabilidad»/«muestra» (`§12`). |
| `time.status` | «constatado / registrado hasta P», nunca «así era». |

---

## 5. Riesgos semánticos de simplificar

1. **`map.legend.cells.pending`** — cualquier reescritura que diga «no hay
   edificios» sería falsa: el neutro puede ser carga/error/ausencia declarada.
2. **`hotspots.title`** — quitar «500 m» o «actuales» incumple el contrato §20.
3. **`result.coverage`** — no puede convertirse en «cobertura de los edificios»
   sin denominador; debe medir C-02/C-01.
4. **`map.visible_universe`** — no puede sugerir que la estadística cambia al
   hacer zoom (es municipal).
5. **`view.cta_era.note`** — sigue siendo la campaña más cercana (C-11), no la
   del año exacto del usuario; la propuesta debe conservar esa honestidad.
6. **`result.lead`** — añadir «actuales» es correcto (universo CMS) y no
   contradice «con año conocido».
7. **`swipe.after_missing`** — el lado derecho no es otra campaña: es el mapa
   de edificios; la propuesta no puede insinuar una imagen inexistente.

---

## 6. Euskera

- Paridad estructural: **513/513 claves**, 0 diferencias, 0 desajustes de
  `{placeholder}` (`locale-contract.test.ts`).
- **Toda propuesta ES de este documento queda `REQUIRES_NATIVE_EU_REVIEW`.**
  No se ha reescrito euskera. `PRODUCT.md` §13/§14 y `UX_COPY §11` declaran
  explícitamente que el EU es un borrador asistido **sin revisión humana**;
  esta auditoría no altera esa decisión ni la certifica.
- No se debe traducir literalmente las reescrituras: varias propuestas cambian
  el orden de la frase y en euskera la declinación depende de la estructura.

---

## 7. Screenshots

Fase 1 = auditoría, sin cambios: no hay antes/después. En fase 2 se capturarán,
a 1440 y 390 px, al menos: resultado (bloque titular), leyenda Por antigüedad
(zona y edificio), leyenda Evolución (play), Fotos aéreas, Antes / ahora, y
leyenda colapsada móvil. Evidencia existente reutilizable: `evidence/g19r4/`
(matriz por modo), `evidence/g11/`, `docs/g5/WIREFRAME-390.md`.

---

## 8. Tests (fase 2)

- `npm run check`, `npm run lint`, `npm run format:check`, `npm run test`.
- `copylint.test.ts`: mantener bloqueos (ISO visible, `2000–9`, `%` sin espacio,
  «1990s»). No añadir reglas que impidan español natural.
- Añadir snapshots solo donde una regresión semántica es peligrosa: leyenda
  mapa, leyenda play, estados vacío/error de ortofoto, `result.coverage`,
  denominadores y `map.visible_universe`. No snapshot global.
- `locale-contract.test.ts` sigue siendo el guardián ES/EU.

---

## 9. Restricciones respetadas (fase 1)

No se ha modificado: datasets, cálculos, componentes, navegación, layout,
colores, dirección visual, datos ni metodología. Este documento no edita
`es.ts`/`eu.ts`. Solo añade `docs/COPY_AUDIT.md`.

---

## 10. Siguiente paso (fase 2, a la espera de validación)

Orden propuesto de implementación:

1. P0 (10 hallazgos): solo strings de `es.ts` + `eu.ts` (EU marcado
   `REQUIRES_NATIVE_EU_REVIEW`), salvo hallazgo 8/9 que puede tocar chips.
2. P1 (13): strings y, solo si hace falta, jerarquía editorial (mover una línea
   a un `<details>` existente, sin cambiar layout).
3. P2 (17): strings.
4. P3 (8): limpieza y decisión sobre claves muertas / copy fuera del diccionario.

No se implementará nada de P2/P3 sin confirmación, según el encargo («ser
conservador», «no cambiar una frase correcta para demostrar actividad»).

---

## 11. Fase 2 — implementación aplicada

Estado: **ejecutada** tras la validación del usuario («termina con todas las
fases»). Alcance: copy (solo `es.ts`), sincronización de documentación canónica
y aserciones E2E. Cero cambios de datos, cálculo, layout, componentes
funcionales, navegación o color.

### 11.1 Cambios en `app/src/lib/i18n/es.ts` (23 claves)

| Clave | Antes | Después | Tipo |
|---|---|---|---|
| `result.lead` | `{after} de {known} edificios con año de construcción conocido.` | `{after} de {known} edificios actuales con año conocido.` | INCONSISTENT |
| `result.coverage` | `Cobertura del año registrado: {coverage_pct} %.` | `Año de construcción conocido en el {coverage_pct} % de los edificios.` | TECHNICAL |
| `result.coverage.detail.body` | `...solo sobre los de año conocido.` | `...solo sobre los que tienen año conocido.` | INCONSISTENT |
| `result.calc` | `La cuenta: {after} edificios posteriores a {selected_year} ÷ ... ni arriba ni abajo.` | `El cálculo: {after} edificios terminados después de {selected_year} de un total de {known} con año conocido = {post_share} de cada 100. ... ni en el numerador ni en el denominador.` | AWKWARD |
| `dist.summary` | `...Cobertura del año registrado: {coverage_pct} %.` | `...Año de construcción conocido en el {coverage_pct} % de los edificios.` | TECHNICAL |
| `dist.denominator` | `sobre {known} edificios con año conocido` | `Porcentaje calculado sobre {known} edificios con año conocido` | AWKWARD |
| `map.tooltip.cell.denominator` | `sobre {known} edificios con año conocido` | `Porcentaje calculado sobre {known} edificios con año conocido` | AWKWARD |
| `map.legend.cells.nodata` | `a rayas: zona sin edificios con año conocido` | `Zona sin edificios con año de construcción conocido.` | AWKWARD |
| `map.legend.cells.pending` | `El tono neutro sin rayas también puede indicar datos pendientes o no disponibles.` | `Las zonas sin color ni rayas pueden estar pendientes de carga o no tener un dato disponible.` | TECHNICAL |
| `map.legend.cells.universe` | `sobre los de año conocido de cada zona` | `Porcentaje sobre los edificios con año de construcción conocido de cada zona.` | AWKWARD |
| `map.cell.inspect` | `Ver datos de esta zona` | `Ver datos de la zona central` (+ `aria-label` = `Ver datos de la zona situada en el centro del mapa`) | ACTION_MISMATCH |
| `map.intro.munis` | `...qué parte de los de cada municipio...` | `...qué parte de los edificios de cada municipio...` | AWKWARD |
| `map.intro.cells` | `...500 m; todos siguen visibles y el color...` | `...500 m. Todos siguen visibles; el color...` | TOO_LONG |
| `map.intro.buildings` | `...; a rayas si el año no es utilizable.` | `...; y trama rayada si el año no es utilizable.` | AWKWARD |
| `map.visible_universe` | `Estadística del municipio de {municipality}. El encuadre del mapa no la cambia.` | `La cifra corresponde a todo {municipality} y no cambia al mover el mapa.` | TECHNICAL |
| `map.scale.zones` | `Vista por zonas. Acerca para ver edificios.` | `Los datos están agrupados por zonas de 500 m. Acércate para ver los edificios individualmente.` | TECHNICAL |
| `time.status` | `...con año registrado hasta {play_year}.` | `...con año conocido hasta {play_year}.` | INCONSISTENT |
| `map.legend.cells.play` | `Edificios actuales ya construidos en {play_year}` | `Edificios actuales construidos hasta {play_year}` | AWKWARD |
| `view.cta_era.note` | `Campaña cercana a tu nacimiento: {campaign_year}` | `Fotografía aérea más cercana a tu año de nacimiento: {campaign_year}` | TECHNICAL |
| `photo.nodata` | `Las zonas sin cobertura de la campaña se muestran con fondo neutro, no como imagen.` | `Donde la campaña no tiene imagen, el fondo queda neutro en lugar de mostrar una fotografía.` | TECHNICAL |
| `planning.intro` | `Los datos de planeamiento de {municipality}, con fecha {ref_date}, recogen:` | `A {ref_date}, el planeamiento vigente de {municipality} registra:` | AWKWARD |
| `empty.catalog` | `Ahora mismo no hay datos disponibles para este lugar.` | `No hay datos disponibles para este lugar.` | AWKWARD |
| `sources.planning.what` | `Planeamiento vigente por municipio: el «¿y mañana?» con carácter informativo.` | `Planeamiento vigente por municipio, con carácter informativo.` | AWKWARD |

Ningún placeholder cambió de nombre ni de número: la paridad EU sigue intacta.

### 11.2 Deliberadamente NO cambiadas tras verificar el código

| Clave | Motivo |
|---|---|
| `swipe.after_missing` | Chip absoluto de una línea; «Mapa · {year} sin imagen» ya declara que el lado derecho es el mapa; la frase larga desbordaría en móvil. |
| `hotspots.title` | Etiqueta literal obligatoria (`DATA_SEMANTICS §20`: «500 m» y «actuales» no pueden desaparecer). |
| `photo.rail_note` | Dentro del disclosure «Fuente y detalles»; dividirla exigía tocar `PhotoPanel` (fuera de alcance copy). |
| `swipe.only_before` / `.only_after` | Botones de preset compactos; el grupo `swipe.presets` («Posiciones de la cortina») da contexto. |
| `map.cell.chip.*` | La versión larga exige `aria-label` a nivel de componente; se difiere para no tocar componentes. |
| `building.rel.after` / `.before` | Verificado: `{n}` = `yearsLabel()` → «2 años…»; la frase renderizada ya es natural. |
| Bloque `result` (repetición de cifras) | Demover jerarquía requería cambio estructural; se deja como decisión de producto. |

### 11.3 Sincronización documental

- `docs/UX_COPY.md`: §13 (lead/coverage/cálculo), §14, §15, §19, §22, §29.1,
  §32, §34, §35 y §G12 actualizados a las cadenas nuevas.
- `docs/PRODUCT.md`: §3.1 (G5), §5 (G12 cita de leyenda), §8 (G11.2),
  §G8 (mensaje de escala) actualizados.
- Comentarios de código que citaban la etiqueta vieja (`app.svelte.ts`,
  `CellDetail.svelte`) actualizados.
- E2E vivos actualizados: `app/scripts/g10_hardening.mjs` (4 aserciones:
  `g10_02_scope_line`, `g12_legend_contract`, `g12_legend_nodata`,
  `g12_legend_play`) y `app/scripts/_prod_g12_probe.mjs`.
- **Registros históricos no reescritos** (son evidencia fechada, no spec viva):
  `docs/gates/G6.md`, `docs/gates/G11.md`, `docs/g4/*`,
  `docs/design/G1-HUMAN-REVIEW-PACK.md` y todo `evidence/**`. Contienen las
  cadenas anteriores y así se conservan.

### 11.4 Euskera

`app/src/lib/i18n/eu.ts` no se ha tocado: 513/513 claves y placeholders
intactos. Las 24 claves modificadas quedan **`REQUIRES_NATIVE_EU_REVIEW`**
(no se inventa euskera; `PRODUCT.md §13` mantiene que el EU es borrador sin
revisión humana):

`result.lead`, `result.coverage`, `result.coverage.detail.body`, `result.calc`,
`dist.summary`, `dist.denominator`, `map.tooltip.cell.denominator`,
`map.legend.cells.nodata`, `map.legend.cells.pending`,
`map.legend.cells.universe`, `map.cell.inspect`, `map.cell.inspect.title`,
`map.intro.munis`, `map.intro.cells`, `map.intro.buildings`,
`map.visible_universe`, `map.scale.zones`, `time.status`,
`map.legend.cells.play`, `view.cta_era.note`, `photo.nodata`, `planning.intro`,
`empty.catalog`, `sources.planning.what`.

### 11.5 Verificación ejecutada

- `npm run test` — **244** tests vitest + **15** node: PASS.
- `npm run check` — 0 errores, 2 warnings preexistentes (`AddressSearch`,
  `CompareYear`; no relacionados con el copy).
- `npm run lint` — 0 errores, 5 warnings preexistentes en `app/scripts`.
- `npm run format:check` — PASS (prettier reflow de 2 claves largas).
- `copylint` (G9/G13) — PASS; `locale-contract` (ES/EU) — PASS.
- `npm run build` — OK (2 min).
- E2E ejecutadas sobre el build nuevo con fixtures: `g10_hardening` **59/0**,
  `g2b_views` **todo PASS**, `g18_timeplayer` **42/0**, `g5_swipe` PASS,
  `prod_smoke` PASS. Todas las suites que tocan el copy cambiado pasan.
- `g1r_cell_detail` (no está en el subset de CI) reporta 2 checks falsos
  (`smalln_warn_in_card`, `place_change_clears`) dependientes de qué celda
  renderiza el entorno; **no** tocan ninguna cadena modificada y no afectan a CI.

### 11.6 Screenshots

Incluidas en la mini-ronda final (§12.1). La evidencia de E2E escrita por las
suites queda además en `evidence/g10/`, `evidence/g5/`, etc.

---

## 12. Mini-ronda editorial final (revisión del usuario)

Estado: **aplicada**. Solo los puntos señalados; ninguna otra clave reabierta;
`eu.ts` intacto y aún `REQUIRES_NATIVE_EU_REVIEW`.

| # | Clave | Texto final | Motivo |
|---|---|---|---|
| 1 | `map.legend.cells.pending` | `Las zonas sin color ni rayas pueden estar pendientes de carga o no tener un dato disponible.` | Conserva los tres estados reales (loading/error/missing), no solo «pendiente de carga», sin jerga. |
| 2 | `map.cell.inspect` | visible `Ver datos de la zona central`; `aria-label`/`title` = `Ver datos de la zona situada en el centro del mapa` | «zona del centro» podía leerse como centro urbano. `MapView.svelte` añade `aria-label` explícito. |
| 3 | `view.cta_era.note` | `Fotografía aérea más cercana a tu año de nacimiento: {campaign_year}` | El usuario aporta un año, no una fecha de nacimiento exacta. |
| 4 | `sources.planning.what` | `Planeamiento vigente por municipio, con carácter informativo.` | Elimina «lo previsto» (puede leerse como predicción; contrato planeamiento ≠ ejecución futura). |

- `map.cell.inspect.title` pasa a ser el `aria-label` explícito: se añade
  `aria-label` al botón `.cell-inspect` (accesibilidad; sin cambio funcional).
- Sincronizados: `docs/UX_COPY.md`, `docs/PRODUCT.md`, comentarios de
  `app.svelte.ts` / `CellDetail.svelte`, y `app/scripts/_prod_g12_probe.mjs`.
- EU: `eu.ts` sin tocar; las 24 claves siguen marcadas para revisión nativa.

### 12.1 Capturas before/after

Generadas con `app/scripts/copy_audit_shots.mjs` sobre dos builds (original
`HEAD` = **before**, copy de esta pasada = **after**), `CI_STUBS=1`, sin
pageerrors:

- `evidence/copy-audit/before/` y `evidence/copy-audit/after/`
- 1440×900 (escritorio) y 390×844 (móvil); siete capturas por estado:
  `01-resultado`, `02-leyenda-antiguedad`, `03-evolucion`, `04-fotos`,
  `05-antes-ahora`, `06-resultado-movil`, `07-leyenda-movil`.

Limitación declarada: el agente de esta revisión **no puede procesar imágenes**
en su entorno. Las capturas están generadas y validadas estructuralmente (PNG
válido, dimensiones correctas, sin `pageerror`), pero requieren **lectura
visual humana**; no se afirma que la leyenda móvil no desborde sin esa lectura.

**Sonda de layout** (`app/scripts/copy_audit_layout.mjs`, `CI_STUBS=1`) como
sustituto parcial y objetivo de esa lectura. Resultados:

| Comprobación (390×844) | Medida | Veredicto |
|---|---|---|
| Scroll horizontal — resultado, leyenda y página | `scrollWidth == innerWidth` (390) | sin scroll horizontal |
| `map.legend.cells.universe` | 361 px · 2 líneas | sin overflow |
| `map.cell.inspect` («Ver datos de la zona central») | 197 px · 1 línea | **no** parte en dos líneas |
| `view.cta_era.note` | 358 px · 2 líneas | sin overflow |
| `planning.intro` | 358 px · 2 líneas | sin overflow |

A 1440×900: sin scroll horizontal; `planning.intro` 1 línea, `map.cell.inspect`
1 línea. Cero `pageerror`. La sonda mide encaje y desbordes, **no** criterio
estético; la lectura visual humana sigue recomendada sobre las capturas.

### 12.2 Verificación de la mini-ronda

- `npm run test` — **244** vitest + **15** node: PASS.
- `npm run format:check` — PASS.
- Sin cambios en EU ni en claves fuera de las cuatro señaladas.
- **Pendiente de entrega final**: revisión lingüística nativa del euskera
  (tarea real; no resoluble con traducción automática).

