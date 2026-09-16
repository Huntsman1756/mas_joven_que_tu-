# G1 — PAQUETE DE REVISIÓN HUMANA (HR1 / HR2)

> Paquete **autosuficiente** para revisión humana externa. Se limita a copiar
> literalmente las secciones vigentes y a acompañarlas de los análisis pedidos.
>
| Campo | Valor |
|-------|-------|
| Proyecto | Más joven que tú · G1 «Tu Bizkaia» |
| Baseline | `be26508` (G0_PASS) |
| HEAD | `3fe17b7e2a616ef9443dbd62fffebd7142c8c0f8` |
| Rama | `g1-design` |
| Generado | 2026-09-16T14:28:37Z |
| Working tree | 12 ficheros versionados modificados · 2 rutas nuevas sin versionar |
| Estado del gate | **`G1_DESIGN_CHANGES_REQUIRED`** — F-1…F-8 corregidos (§11); pendiente HR1/HR2 |

---

## 0. Cómo leer este paquete

1. **Mira primero los PNG** (§12): son la estructura de información tal como queda.
2. **Lee el copy real** (§4): es la página leída en voz alta.
3. **HR1 y HR2** (§1) son las dos decisiones que no puede tomar un resumen textual.
4. §6–§9 documentan, **literalmente**, el estado vigente del zoom, del denominador
   pequeño, de la distribución temporal y de los presupuestos.
5. §11 es el **registro de cambios** derivado de la revisión anterior.

---

## 1. Definición exacta de HR1 y HR2

### REVISIÓN HUMANA (no automatizable)

Estos puntos **no** son criterios de corrección: no se pueden resolver «arreglando código» y
no admiten expresiones como «se ve bien».

| # | Qué se revisa | Quién decide | Evidencia que recibe |
|---|---------------|--------------|----------------------|
| HR1 | Identidad editorial y jerarquía visual: ¿el dato domina y el producto no parece un dashboard institucional? | responsable del proyecto | 6 wireframes + 6 capturas canon | 
| HR2 | Claridad del copy en lectura real: ¿una persona nueva entiende qué introduce, qué descubre y qué significa el porcentaje? | responsable del proyecto | `UX_COPY.md` + capturas de los 9 estados |

Resultado de HR1/HR2: `ACCEPTED` / `CHANGES_REQUESTED`. No producen `G1_FAIL` por sí mismos,
pero **bloquean la aprobación** si no están `ACCEPTED`.

---
---

## 2. Criterios del gate G1 (literal)

### PRODUCT (P)

| # | Criterio (binario) | Método | Evidencia |
|---|--------------------|--------|-----------|
| P1 | La aplicación expone **una sola experiencia** de producto: `/` con `INTRO`/`RESULT` y `/como-lo-sabemos`. No hay rutas de producto adicionales | inspección del árbol de rutas; `npm run build` lista las rutas generadas | informe de build |
| P2 | El hero permite introducir año y lugar **sin** cuenta, **sin** fecha completa y **sin** geolocalización; existe un único CTA | revisión de UI + captura | captura + `UX_COPY.md` |
| P3 | Titular, denominador y cobertura están visibles **sin scroll** en 1440×900 y en 390×844 | medición automatizada: `getBoundingClientRect().bottom <= viewport.height` | JSON de medición |
| P4 | Existe **una sola** visualización temporal, con marcador del año del usuario y los buckets obligatorios **`<1900` · décadas 1900s–2020s · `SIN AÑO`** (máx. **15** categorías), **idénticos** en desktop y móvil, sin scroll horizontal | inspección + aserción de DOM (1 solo contenedor de gráfico; nº de categorías ≤ 15; mismos buckets en ambos viewports) | JSON con buckets y conteo + capturas |
| P5 | La ortofoto **no** se solicita sin acción explícita | test de red: 0 peticiones a `ORTO_BFA_*`/`WMS_ORTOARGAZKIAK` antes del clic | lista de peticiones |
| P6 | No existen features de la lista de no-objetivos (`G1-TU-BIZKAIA.md` §15) | inspección de rutas, dependencias y UI | informe de no-objetivos |
### DATA (D)

| # | Criterio | Método | Evidencia |
|---|----------|--------|-----------|
| D1 | Cobertura territorial completa: **112** municipios con `buildings` y `metrics`; el 113.º (Usansolo) documentado | conteo de artefactos | índice de artefactos |
| D2 | Los contratos **C-01…C-12** se mantienen sin cambios de denominador | suite `tests/data` en verde | salida de pytest |
| D3 | Existen agregados por municipio (112) y por celda (toda Bizkaia), deterministas | regeneración dos veces y comparación de `sha256` | hashes iguales |
| D4 | **Ninguna** métrica se recalcula en el frontend: solo se proyectan agregados canónicos | inspección de código + test que prohíbe división de denominadores en `app/src` | informe de auditoría |
| D5 | `NO_YEAR` no entra en numerador ni denominador, y su desglose (sin dato / anómalo) se publica | comparación con `qa_*.json` del pipeline | tabla de contraste |
| D6 | 0 geometrías inválidas sin registro de reparación | `geometry-repairs.json` vs conteo | informe |
### MAP (M)

| # | Criterio | Método | Evidencia |
|---|----------|--------|-----------|
| M1 | El **dominio de zoom es una función total** y coincide literalmente con `G1-TU-BIZKAIA.md` §6.2: `z < 9` municipios · `9 ≤ z < 13,5` celdas · `z ≥ 13,5` edificios. Ningún valor real de zoom carece de nivel y ningún intervalo declara dos niveles | test de nivel y opacidad en 60 valores de `z` (paso 0,25) en los tres documentos y en la app | JSON con 60 filas: `z`, nivel, opacidades, huecos y solapes = 0 |
| M2 | **El zoom no recalcula métricas**: instrumentación que cuente llamadas a cálculo durante 10 cambios de zoom | contador de instrumentación | JSON con contador = 0 |
| M3 | `UNKNOWN`, `SUSPICIOUS` e `INVALID` **no** se dibujan con el estilo de `BEFORE`/`AFTER` | verificación de expresión de estilo | captura + expresión |
| M4 | `NO_YEAR` es distinguible **sin color** (trama) | conversión a escala de grises y diferencia de patrón | captura en grises |
| M5 | La leyenda refleja el estado real de capas en cada nivel de escala | aserción DOM vs capas activas | JSON |
| M6 | `CELL_SMALL_DENOMINATOR` **no altera el relleno**: para el mismo `C-05`, una celda marcada y una no marcada reciben **exactamente el mismo color**; el porcentaje publicado es idéntico al de una celda sin marca. Solo cambian contorno y tooltip | test comparando el color resuelto de dos celdas con igual cuota y `n` distinto, y contraste del porcentaje | JSON con pares (cuota, color, %) y diff = 0 |
### UX (U)

| # | Criterio | Método | Evidencia |
|---|----------|--------|-----------|
| U1 | El journey canónico (año → búsqueda → resultado → zoom → ortofoto → compartir) se completa **solo con teclado** | test Playwright sin ratón | vídeo/JSON de pasos |
| U2 | Todo estado tiene salida: **0** indicadores de carga sin fin; todo error es recuperable o terminal con copy | revisión de estados + test de fallos | capturas de los 9 estados |
| U3 | La búsqueda cubre los **7** estados de `G1-STATE-MODEL.md` §5, cada uno con UI y copy | test por estado | JSON por estado |
| U4 | **El titular no cambia de universo al hacer zoom**: el texto del ámbito permanece idéntico tras 5 cambios de zoom | test automatizado de texto | JSON con 5 lecturas iguales |
| U5 | Recarga y atrás/adelante reproducen el **mismo resultado** | test de URL | JSON de 2 cargas |
| U6 | Móvil: sin panel lateral fijo; hoja inferior operable; objetivos táctiles ≥ 44×44 px | medición de `getBoundingClientRect` | JSON de medición |
### COPY (C)

| # | Criterio | Método | Evidencia |
|---|----------|--------|-----------|
| C1 | **100 %** del copy de la interfaz vive en el diccionario de claves; **0** literales en componentes | búsqueda de texto en `app/src/**/*.svelte` | informe |
| C2 | Toda cifra mostrada tiene denominador explícito adyacente | revisión de UI + capturas | capturas |
| C3 | Ninguna frase de la lista prohibida (`DATA_SEMANTICS.md` §10) aparece en UI ni en comentarios | grep automatizado sobre el copy | informe |
| C4 | El disclosure de heaping está visible junto a la distribución | captura | captura |
| C5 | `NOT_COVERED` y `SERVICE_ERROR` tienen copy **distinto** y no intercambiable | revisión del diccionario | informe |
| C6 | Los estados vacíos y de error tienen copy real (lista cerrada en `UX_COPY.md`) | contraste con la lista | informe |
### PERFORMANCE (PERF)

Perfiles y definiciones: `G1-PERFORMANCE-BUDGETS.md`. P1 = local-desktop · P2 = móvil emulado.

| # | Criterio | P1 | P2 | Evidencia |
|---|----------|----|----|-----------|
| PERF1 | `transfer_hero` (**solo first-party**) | ≤ 420 KB | ≤ 420 KB | `encodedBodySize` |
| PERF2 | `t_hero_interactive` | p75 ≤ 900 ms · p95 ≤ 1.500 ms | p75 ≤ 2.000 ms · p95 ≤ 3.200 ms | 20 repeticiones + máximo |
| PERF3 | `build_js_raw` | ≤ 1.800.000 B | — | suma de ficheros |
| PERF4 | `t_result_ready` (p75 **y** p95) | p75 ≤ 1.600 ms · p95 ≤ 2.400 ms | p75 ≤ 3.500 ms · p95 ≤ 5.000 ms | 20 repeticiones + máximo |
| PERF5 | `transfer_result_first_party` (excluye ortofoto externa) | ≤ 620 KB | ≤ 620 KB | `encodedBodySize` |
| PERF6 | `transfer_result_buildings_first_party` | ≤ 1.100 KB | ≤ 1.100 KB | `encodedBodySize` |
| PERF7 | `t_result_ready_buildings` | p75 ≤ 2.400 ms · p95 ≤ 3.200 ms | p75 ≤ 5.000 ms · p95 ≤ 7.000 ms | 20 repeticiones |
| PERF8 | `t_year_change` | p95 ≤ 120 ms | p95 ≤ 300 ms | 20 repeticiones |
| PERF9 | `t_place_change` | p95 ≤ 1.800 ms | p95 ≤ 3.500 ms | 20 repeticiones |
| PERF10 | `t_ortho_visible` (**servicio externo**) | p75 ≤ 1.500 ms | p75 ≤ 3.000 ms | 20 repeticiones |
| PERF11 | `heap_after_journey` | ≤ 60 MB | ≤ 40 MB | tras journey canónico |

> La tasa de fallos **no** es un presupuesto de rendimiento: se separa en RELIABILITY.
### ACCESSIBILITY (A)

| # | Criterio | Umbral | Evidencia |
|---|----------|--------|-----------|
| A1 | `axe-core` violaciones A/AA en los 6 estados canónicos | **0** | JSON de axe |
| A2 | Contraste de texto / componentes | ≥ 4,5:1 / ≥ 3:1 | medición + herramienta |
| A3 | Journey canónico completo por teclado, con foco visible en todos los controles | 100 % | vídeo/JSON |
| A4 | Alternativa textual del mapa **y** resumen textual de la distribución | presentes y equivalentes | captura + DOM |
| A5 | `prefers-reduced-motion` da experiencia equivalente sin pérdida semántica | sin animación de cámara ni transiciones obligatorias | test con emulación |
| A6 | El cambio de resultado se anuncia por región `aria-live` | ≥ 1 anuncio por cambio | traza de accesibilidad |
| A7 | El buscador implementa el patrón `combobox` con navegación por flechas y `Esc` | conforme a ARIA APG | test de teclado |
| A8 | Zoom de texto 200 % sin pérdida de contenido ni solapamiento crítico | sin recortes | captura a 200 % |
| A9 | Objetivos táctiles ≥ 44 × 44 px en los controles del journey | 100 % de los controles | medición de `getBoundingClientRect` |
### RELIABILITY (REL)

| # | Criterio | Umbral | Evidencia |
|---|----------|--------|-----------|
| REL1 | Excepciones no capturadas en el journey canónico | **0** | `pageerror` |
| REL2 | `console.error` fuera de la lista blanca (`G1-PERFORMANCE-BUDGETS.md` §6) | **0** | consola |
| REL3 | Fallo de lectura de PMTiles → error controlado con copy, sin romper la app | probado abortando el rango | captura + JSON |
| REL4 | Fallo de NORA → estado recuperable y reintentable | probado abortando la petición | captura + JSON |
| REL5 | Los estados `AVAILABLE`, `NOT_COVERED` y `SERVICE_ERROR` se alcanzan en pruebas | 3/3 | JSON de estados |
| REL6 | **Activos propios** (`*.pmtiles`, JS, CSS, `metrics/*.json`, `catalog.json`): **0 fallos** en el journey canónico | **0 fallos** | registro de red con origen first-party |
| REL7 | **Ortofoto externa: disponibilidad medida aparte**, no presupuestada como fallo del producto. `NOT_COVERED` **no** es fallo; `SERVICE_ERROR` degrada correctamente (aviso + resto operativo) | 3 estados alcanzables + carácterización de disponibilidad registrada | JSON de caracterización + capturas |
| REL8 | Si el smoke de release contra el servicio externo **no puede ejecutarse** (proveedor temporalmente indisponible), el resultado del gate es **`G1_BLOCKED`**, nunca `G1_FAIL` por ese motivo | regla de adjudicación | informe del gate |
### DEPLOYMENT (DEP)

| # | Criterio | Umbral | Evidencia |
|---|----------|--------|-----------|
| DEP1 | Petición `Range` a un `.pmtiles` | **HTTP 206** con `Content-Range` correcto | traza HTTP |
| DEP2 | Cabecera `Accept-Ranges: bytes` | presente | traza HTTP |
| DEP3 | MIME de `.pmtiles` | `application/octet-stream` o `application/x-pmtiles` | traza HTTP |
| DEP4 | Compresión de JS/CSS | `content-encoding` presente (`br`/`zstd`/`gzip`) | traza HTTP |
| DEP5 | Lectura real de PMTiles desde el host candidato | tesela servida y renderizada | captura en el host |
| DEP6 | HTTPS + CSP que permita `geo.bizkaia.eus`, `www.geo.euskadi.eus`, `opengis.bizkaia.eus` | sin violaciones de CSP | consola |

> Ningún hosting que devuelva solo `200` con el fichero completo pasa DEP1/DEP5.
> No se selecciona proveedor definitivo en esta fase.
### VISUAL REGRESSION (VR)

| # | Criterio | Método | Evidencia |
|---|----------|--------|-----------|
| VR1 | Capturas canónicas del **shell determinista** (6 estados × 2 viewports) con diff ≤ 0,1 % de píxeles | Playwright + comparador; umbral fijado **antes** de la primera ejecución | JSON de diff |
| VR2 | Política de máscara aplicada: se enmascara el canvas del mapa y las teselas remotas | revisión de la configuración de captura | informe |
| VR3 | Integración de mapa verificada por **aserciones estructurales** (capas presentes, colores de leyenda, conteos por nivel) | test de DOM/estado | JSON |
| VR4 | Las pruebas de mapa usan **fixture local** de teselas; no dependen de servicios vivos | ejecución sin red externa | log de ejecución |
### PROVENANCE (PROV)

| # | Criterio | Método | Evidencia |
|---|----------|--------|-----------|
| PROV1 | Manifests de todas las fuentes con licencia, `retrieved_at` y `sha256` | revisión de `data/manifests/` y del manifest de ejecución | manifiestos |
| PROV2 | Atribución visible de Open Data Bizkaia / geoEuskadi en la UI | captura | captura |
| PROV3 | Fecha del snapshot visible en `Cómo lo sabemos` | captura | captura |
| PROV4 | Ninguna dependencia nueva sin licencia documentada y ADR | revisión de `package.json` vs `OSS_REUSE.md` | informe |

---
### Criterios GO / NO-GO

**GO (`G1_PASS`)** si y solo si:

1. Los 6 criterios PRODUCT se cumplen.
2. Los 6 de DATA, **6 de MAP**, 6 de UX, 6 de COPY se cumplen.
3. Los **11 de PERFORMANCE** se cumplen en el perfil declarado.
4. Los 9 de ACCESSIBILITY se cumplen.
5. Los **8 de RELIABILITY** se cumplen.
6. Los 6 de DEPLOYMENT se cumplen en el host candidato.
7. Los 4 de VISUAL REGRESSION se cumplen.
8. Los 4 de PROVENANCE se cumplen.
9. HR1 y HR2 están `ACCEPTED`.

**NO-GO (`G1_FAIL`)** si cualquier criterio binario no se cumple y no existe causa externa
acreditada.

**`G1_BLOCKED`** si:

1. el entorno impide medir (p. ej. un servicio oficial caído de forma sostenida);
2. falta un artefacto de evidencia obligatorio;
3. **el smoke de release contra el servicio externo de ortofoto no puede ejecutarse**
   (REL8). Un proveedor público temporalmente indisponible **no** es un fallo del producto.
### Recuento de criterios

| Bloque | Nº |
|--------|----|
| PRODUCT | 6 |
| DATA | 6 |
| MAP | **6** |
| UX | 6 |
| COPY | 6 |
| PERFORMANCE | **11** |
| ACCESSIBILITY | 9 |
| RELIABILITY | **8** |
| DEPLOYMENT | 6 |
| VISUAL REGRESSION | 4 |
| PROVENANCE | 4 |
| **Total verificables** | **72** |
| Revisión humana (bloqueante, no binaria) | 2 |

> **Cambios respecto a la revisión anterior:** `M6` y `REL6/REL7/REL8` son nuevos;
> `PERF11` (`tile_failures`) se **elimina** como métrica mezclada y su contenido se reparte
> entre REL6 (activos propios) y REL7/REL8 (servicio externo). `MUNICIPIO` desaparece del
> enumerado de nivel de escala. Ver `docs/design/G1-HUMAN-REVIEW-PACK.md` §11.
---

## 3. G1-TU-BIZKAIA.md — §§4, 8, 9, 10, 14 (literal)

### 4. Regla del universo estadístico (crítica)

> **`viewport ≠ universo estadístico`** salvo declaración explícita.

- El **titular** y la **distribución temporal** usan siempre el **municipio seleccionado**.
- **Hacer zoom NO cambia el universo.** El titular sigue diciendo «En Leioa…».
- La búsqueda de una calle, un portal o un topónimo **mueve la cámara** al punto exacto, pero
  la estadística principal sigue siendo la del **municipio que contiene ese punto**.
- Para cambiar de unidad estadística hay que **elegir otro municipio** de forma consciente.
- Las cifras de celda existen, se etiquetan como **de celda** y **nunca** se presentan como
  «tu» cifra.

Esta regla es una defensa deliberada contra la ambigüedad estadística: un mapa que cambia de
universo al hacer zoom es visualmente atractivo y estadísticamente indefendible.

**Implementación de la regla:** el universo estadístico es un campo explícito del estado
(`statisticalUnit`), independiente de `view` (`G1-STATE-MODEL.md`). Ningún gesto de mapa lo
modifica.
### 8. Edificio: de estado de dato a representación

Mapping explícito (contratos en `DATA_SEMANTICS.md` §5 y §11):

| Estado del dato | Cuenta en métrica | Representación en mapa | Copy |
|-----------------|-------------------|------------------------|------|
| `VALID` y año `≤ Y` | `BEFORE` (`C-06`/`C-04` complementario) | relleno **contexto** (apagado) | «Ya existía en {Y}» |
| `VALID` y año `> Y` | `AFTER` (`C-04`) | relleno **protagonista** (acento) | «Terminado después de {Y}» |
| `UNKNOWN` | fuera de `C-02` | sin relleno temporal + **trama discontinua** | «Año de construcción no consta» |
| `SUSPICIOUS` | fuera de `C-02` | igual que `UNKNOWN` + marca en tooltip | «Año anómalo en Catastro» |
| `INVALID` (valor) | fuera de `C-02` | igual que `UNKNOWN` | «Año no interpretable» |
| geometría reparada | área válida, reparación registrada | normal | «Geometría reparada y registrada» |

**Decisión de simplificación, justificada y declarada:** en el mapa, `UNKNOWN`, `SUSPICIOUS` e
`INVALID` comparten **una sola clase visual no temporal** (`NO_YEAR`), porque representan
0,05 %–3,5 % del parque y añadir una cuarta familia de color a esa escala produce ruido sin
mejorar la comprensión. **No se ocultan:** (a) el desglose numérico se publica siempre en el
disclosure de cobertura; (b) el tooltip del edificio dice exactamente cuál es su estado.
Esta decisión es revisable por revisión humana (ver §14).

Reglas duras:

- **No depender solo del color:** `NO_YEAR` lleva además trama discontinua.
- **Nunca dibujar `SUSPICIOUS` como `AFTER`** (inflaría lo reciente).
- `Ano_Rehabi`/`Ano_Reform` **no** colorean ni clasifican (§2 de `DATA_SEMANTICS`).
- `Ano_Calcul` no se usa (ADR-007).
### 9. Distribución temporal — una sola visualización principal

**Una única** distribución en pantalla. Prohibido: barras + área + línea + donut + heatmap.

| Atributo | Decisión |
|----------|----------|
| Forma | barras verticales |
| Unidad del eje X | **periodos** (décadas + un cubo abierto para la cola antigua) |
| Buckets | **`<1900` · `1900s` · `1910s` … `2020s` · `SIN AÑO`** (máx. **15** categorías) |
| Rango | cubre **todo** el universo; ningún edificio antiguo queda fuera del eje |
| Eje Y | nº de edificios actuales con año `VALID` (`C-09`) |
| Marcador | línea vertical + etiqueta **«TU AÑO · {Y}»**, en **posición continua** dentro del eje |
| Categoría aparte | `SIN AÑO` separada visualmente y **nunca** en 0 |
| Denominador | escrito bajo el gráfico: «sobre {C-02} edificios con año conocido» |
| Interacción | hover resalta el periodo **y** las celdas correspondientes en el mapa |
| Click | **no** cambia el año personal |
| Desktop y móvil | **exactamente los mismos buckets**, para que no cuenten historias distintas |

#### 9.1 Por qué estos buckets y no una barra por año

Evidencia G0: el porcentaje de años acabados en 0/5 es **37,8 % en Bilbao, 29,0 % en Leioa y
43,7 % en Murueta**. Una curva anual sugeriría una precisión que el dato no sostiene y
invitaría a leer «booms» inexistentes.

Además, con `min_valid_year = 1700` el rango completo son **33 décadas**: en 390 px cada barra
tendría ≈10,6 px. Por eso:

- La cola anterior a 1900 se agrupa en un **cubo abierto `<1900`** (etiquetado como
  «anteriores a 1900»), que **no oculta** esos edificios: quedan representados y contados.
- De 1900 en adelante se usa **una barra por década**.
- `SIN AÑO` se muestra aparte, fuera del eje temporal.
- **No** hay scroll horizontal ni ventana temporal: los buckets son fijos.
- El **marcador del año exacto conserva posición continua** dentro del eje aunque las barras
  sean agregadas. Esto es deliberado y se explica en el nivel 3 de copy.
- **Prohibido** interpretar un pico anual como boom constructivo sin evidencia externa.
- El **año exacto se conserva** donde el Catastro publica un año exacto: el filtro personal
  «posterior a {Y}» (`C-04`/`C-05`) y el año nominal de la campaña de ortofoto.
### 10. Relación mapa ↔ distribución

Hipótesis del encargo, validada:

| Dirección | Decisión |
|-----------|----------|
| año → mapa y distribución | **sí** (única fuente de verdad temporal) |
| hover en distribución → resalta mapa | **sí** (ayuda a leer el patrón espacial) |
| click en distribución → cambia el año personal | **NO** |
| mapa → distribución | **no** (el zoom no toca la estadística, §4) |

Motivo del «no» al click: el año de nacimiento es la **referencia narrativa** del producto;
si el gráfico pudiera reescribirlo, el titular dejaría de ser «tu» año y el enlace compartido
sería inestable. El gráfico **explora**, no **redefine**.
### 14. Decisiones que la revisión humana puede querer revertir

Se listan explícitamente para que no queden implícitas:

1. **Clase visual única `NO_YEAR`** (en lugar de 4 clases de color). Revierte a 4 clases si se
   considera que oculta `SUSPICIOUS`. Conteos y tooltip ya lo publican.
2. **Métrica de celda = conteo** (huella en tooltip). Revierte a huella si se prioriza la
   lectura física del territorio; el encargo pedía decidir, no descartar.
3. **Ortofoto opt-in.** Si se quiere presencia visual inmediata de la foto aérea, sube el
   payload inicial y hay que reabrir los budgets.
4. **Hero sin MapLibre.** Si se quiere el mapa ya en la portada, cambia el perfil de carga
   inicial (`G1-PERFORMANCE-BUDGETS.md`).
---

## 4. UX_COPY.md — §§12–21 (literal)

### 12. Hero (`INTRO`)

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
### 13. Titular y cobertura (`RESULT`)

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
### 14. Distribución temporal

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
### 15. Mapa y leyenda

| Clave | Copy |
|-------|------|
| `map.legend.after` | Terminado después de {selected_year} |
| `map.legend.before` | Ya existía en {selected_year} |
| `map.legend.noyear` | Año no utilizable (sin dato o anómalo) |
| `map.legend.cells` | Cada celda colorea la cuota de **edificios** posteriores a {selected_year} |
| `map.legend.cells.small_n` | Pocos edificios con año válido en esta celda (n={n}); unos pocos edificios pueden cambiar mucho el porcentaje. |
| `map.visible_universe` | Estadística del municipio de **{municipality}**. El encuadre del mapa no la cambia. |
### 16. Edificio

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
### 17. Ortofoto (opt-in)

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
### 18. Búsqueda de lugar (`PlaceSearch`)

| Estado | Copy |
|--------|------|
| `TOO_SHORT` | Consulta demasiado corta: escribe al menos 3 caracteres. |
| `SEARCHING` | Buscando… |
| `RESULTS` | {n} resultado(s) en NORA · {m} con datos disponibles |
| `NO_RESULTS` | No encontramos «{query}» en Bizkaia. Prueba con un municipio. |
| `OUT_OF_SCOPE` | NORA reconoce {n} lugares, pero están fuera de Bizkaia. |
| `NETWORK_ERROR` | No hay conexión con el geocodificador oficial (NORA). |
| anuncio | Seleccionado {municipality}. La estadística es la municipal. |
### 19. Compartir y estados vacíos

| Clave | Copy |
|-------|------|
| `share.label` | Compartir esta vista |
| `share.done` | Enlace copiado. Incluye tu año y el lugar; no incluye ningún dato personal. |
| `share.error` | No se pudo copiar el enlace. Puedes copiarlo de la barra de direcciones. |
| `empty.catalog` | Ahora mismo no hay datos disponibles para este lugar. |
| `error.pmtiles` | No se pudieron cargar los edificios. La estadística y la distribución siguen disponibles. |
| `error.generic` | Algo ha fallado. La parte de datos que ya estaba cargada sigue disponible. |
### 20. Fuentes y créditos (pie)

> **Fuente principal:** Open Data Bizkaia — Diputación Foral de Bizkaia (Catastro y ortofotos
> 1956–2002, CC BY 4.0). **Complemento:** geoEuskadi / Gobierno Vasco (ortofotos 2004–2025 y
> geocodificador NORA, CC BY 4.0). **Código:** MIT. **Snapshot de datos:** {snapshot_date}.
### 21. Niveles de divulgación

| Nivel | Contenido | Ubicación |
|-------|-----------|-----------|
| 1 | titular con la cifra | arriba |
| 2 | denominador, cobertura, advertencia «no sabemos de desaparecidos» | bajo el titular |
| 3 | `result.calc` | `¿Cómo se calcula?` en línea |
| 4 | metodología, fuentes, licencias, snapshot, heaping técnico | `Cómo lo sabemos` |
---

## 5. G1-PERFORMANCE-BUDGETS.md — §4 (literal)

### 4. Presupuestos

> Cada umbral lleva **rationale**. Si la implementación no los cumple, se **documenta** y se
> propone remediación; **no** se relaja el umbral (ver §7).

#### 4.1 Carga

| Métrica | P1 | P2 | Rationale |
|---------|----|----|-----------|
| `transfer_hero` | ≤ 420 KB | ≤ 420 KB | hero sin MapLibre: solo shell JS/CSS/fuentes comprimidos (G0 gzip total 364.587 B incluía MapLibre). Deja margen para branding sin cargar el motor de mapa. **Solo first-party**; excluye JPEG/WMS externos. |
| `t_hero_interactive` | p75 ≤ 900 ms · p95 ≤ 1.500 ms | p75 ≤ 2.000 ms · p95 ≤ 3.200 ms | entrada usable antes de que el usuario escriba. **20 repeticiones** mínimas. |
| `build_js_raw` | ≤ 1.800.000 B | — | invariante de repositorio, determinista. G0: 1.339.816 B ⇒ +34 % para branding, histograma, i18n y estado. Evita crecimiento silencioso. |

#### 4.2 Resultado

| Métrica | P1 | P2 | Rationale |
|---------|----|----|-----------|
| `t_result_ready` | p75 ≤ 1.600 ms · p95 ≤ 2.400 ms | p75 ≤ 3.500 ms · p95 ≤ 5.000 ms | primer resultado con **celdas**: ≈372 KB (JS comprimido + JSON + celdas) ⇒ ≈1,9 s de transferencia a Slow 4G + parseo/ejecución con CPU ×4. **20 repeticiones**: con 5 no se puede estimar un p95 con seriedad. Se reportan p75, p95 y **el máximo observado**. |
| `transfer_result_first_party` | ≤ 620 KB | ≤ 620 KB | 358 KB (JS gzip) + 6 KB (agregados) + 8 KB (celdas) + margen. **Solo first-party**: excluye explícitamente teselas de ortofoto externas (JPEG/WMS). Sin edificios ni ortofoto. |
| `transfer_result_buildings_first_party` | ≤ 1.100 KB | ≤ 1.100 KB | caso en que el encuadre inicial cae en `z ≥ 13,5` y hay que servir teselas de edificios (medido: 464.599 B en un encuadre z14 de Bilbao). **Solo first-party**. |
| `t_result_ready_buildings` | p75 ≤ 2.400 ms · p95 ≤ 3.200 ms | p75 ≤ 5.000 ms · p95 ≤ 7.000 ms | añade las teselas de edificios. **20 repeticiones**. |
| `t_year_change` | p95 ≤ 120 ms | p95 ≤ 300 ms | G0 midió 9–18 ms para el repintado del mapa. El margen cubre además repintar la distribución y emitir el anuncio accesible. **20 repeticiones**. |
| `t_place_change` | p95 ≤ 1.800 ms | p95 ≤ 3.500 ms | incluye consulta a NORA (≈100–300 ms), carga del JSON del municipio y nuevo encuadre. **20 repeticiones**. |
| `t_ortho_visible` | p75 ≤ 1.500 ms | p75 ≤ 3.000 ms | opt-in; cuadro de teselas JPEG de ≈300–600 KB de un **servicio externo**. Se mide aparte y su disponibilidad **no** condiciona la corrección del producto (§4.3). **20 repeticiones**. |

#### 4.3 Estabilidad y memoria

| Métrica | P1 | P2 | Rationale |
|---------|----|----|-----------|
| `heap_after_journey` | ≤ **60 MB** | ≤ **40 MB** | G0: 11,4–13,9 MB (P1) y 9,5–11,5 MB (P2) **sin** journey completo. 60/40 MB son ≈4× el baseline respectivo: margen para histograma, búsqueda y comparación, y a la vez un techo que **acota la caché de teselas**. El factor 4× se declara como decisión, no como cálculo. |
| `uncaught` | **0** | **0** | ninguna excepción no capturada en el journey canónico. |
| `console_errors` | **0** | **0** | solo la lista blanca de §6. |

> **La tasa de fallos de teselas ya no es un presupuesto mezclado.** Se separa en
> `docs/gates/G1.md` §RELIABILITY: **0 fallos de activos propios** (PMTiles, JS, CSS, JSON) y
> **medición aparte** de la ortofoto externa, donde `NOT_COVERED` **no** es fallo y
> `SERVICE_ERROR` debe degradar correctamente. Un proveedor público temporalmente indisponible
> no debe hacer fallar estadísticamente el producto.
---

## 6. ZOOM DOMAIN

### 6.1 Regla vigente, copiada literalmente de cada documento

**`docs/design/G1-TU-BIZKAIA.md` §6.2 — definición única, completa y total**

#### 6.2 Dominio de zoom — definición única y total

La escala es una **función total**: ningún valor real de zoom carece de representación.
Esta definición es la **única vigente** y sustituye a cualquier otra formulación.

| Nivel | Dominio | Opacidad |
|-------|---------|----------|
| `municipalities` | `z < 9` | `1` si `z < 9`; `0` si `z ≥ 9` |
| `cells` | `9 ≤ z < 13,5` | `1` si `9 ≤ z < 13,5`; `0` en otro caso |
| `buildings` | `z ≥ 13,5` | `1` si `z ≥ 13,5`; `0` en otro caso |

- **Conmutación discreta en el umbral**, sin fundidos entre niveles: los dominios son
  mutuamente excluyentes, de modo que **nunca** hay dos capas temporales a la vez (color
  ambiguo) ni un intervalo sin capa (hueco visual). Un suavizado solo sería admisible si
  conserva esas dos propiedades; hoy **no** se especifica ninguno.
- El **encuadre inicial del resultado es municipal** (típicamente `z 11–12`): la primera
  respuesta se sirve con **celdas**, no con 14.000 polígonos.
- Los umbrales están **preregistrados**; cambiarlos exige enmienda.
- Cualquier documento que describa la escala debe repetir esta tabla literalmente
  (`UX.md` §14, `G1-STATE-MODEL.md` §4, `G1-FRONTEND-ARCHITECTURE.md` §6.1).
  **Prohibidas** las formulaciones parciales (`9–13`, `< 13`, `8 < z < 13,5`).
**`docs/UX.md` §14 — repite la misma tabla**

### 14. Multiescala

Definición **única y total** de la escala (fuente: `docs/design/G1-TU-BIZKAIA.md` §6.2).
Ningún valor real de zoom queda sin representación.

| Dominio | Nivel | Capa |
|---------|-------|------|
| `z < 9` | Bizkaia | municipios |
| `9 ≤ z < 13,5` | celdas 500 m | celdas |
| `z ≥ 13,5` | edificio | edificios |

Conmutación **discreta** en el umbral: los dominios son mutuamente excluyentes, así que nunca
hay dos capas temporales simultáneas ni un intervalo sin capa.

El encuadre inicial del resultado es **municipal (z 11–12)** y se sirve con **celdas**: la
primera respuesta no descarga 14.000 polígonos.
**`docs/design/G1-STATE-MODEL.md` §4 — repite la misma tabla**

### 4. Estados del nivel de escala

```
activeScaleLevel ∈ { BIZKAIA, CELDA, EDIFICIO }
```

Derivado del zoom (§6.2 de `G1-TU-BIZKAIA.md`), **no** del universo estadístico.
La escala es una **función total**: ningún valor real de zoom carece de nivel.

| Dominio | Nivel | Capa |
|---------|-------|------|
| `z < 9` | `BIZKAIA` | `municipalities` |
| `9 ≤ z < 13,5` | `CELDA` | `cells` |
| `z ≥ 13,5` | `EDIFICIO` | `buildings` |

Conmutación **discreta** en el umbral: dominios mutuamente excluyentes, sin capas
simultáneas y sin intervalos sin capa.

`MUNICIPIO` **no** es un nivel de escala: es la **unidad estadística** (§2), independiente del
zoom. Se elimina del enumerado para no confundir escala con universo.

Cambiar `activeScaleLevel` **no** dispara ningún recálculo de métricas: las cifras ya están
en los agregados canónicos. El frontend solo cambia la representación.
**`docs/design/G1-FRONTEND-ARCHITECTURE.md` §6.1 — zoom del artefacto vs dominio**

### 6. Entrega de datos

#### 6.1 Artefactos

| Artefacto | Contenido | Zoom del artefacto | Dominio de visualización (`G1-TU-BIZKAIA.md` §6.2) | Se carga |
|-----------|-----------|--------------------|------------------------------------------------------|----------|
| `municipalities.pmtiles` | 112 polígonos municipales | 0–10 | `z < 9` | siempre |
| `cells.pmtiles` | celdas de 500 m de toda Bizkaia con agregados por periodo | 8–14 | `9 ≤ z < 13,5` | siempre |
| `buildings/{codigo_mun}.pmtiles` | edificios del municipio | 13–16 | `z ≥ 13,5` | **bajo demanda** |
| `metrics/{slug}.json` | agregados canónicos (C-01…C-10) por municipio | — | al elegir lugar |
| `catalog.json` | catálogo de campañas de ortofoto con fechas reales | — | siempre |

- **PMTiles por municipio** para los edificios: el cliente pide por HTTP Range solo las
  teselas visibles, y solo del municipio elegido.
- El **directorio** de un PMTiles se lee al primer acceso; es pequeño frente al fichero.
- El **dominio de visualización** es una regla de producto única y total; fuera de su dominio
  una capa tiene opacidad 0 (MapLibre puede sobreescalar la última tesela disponible).

### 6.2 Verificación de totalidad sobre **todo** valor real de zoom

| Rango de `z` | Nivel | Opacidad municipios / celdas / edificios | Huecos | Solapes |
|---|---|---|---|---|
| `8,00 – 8,99` | `BIZKAIA` | 1 / 0 / 0 | 0 | 0 |
| **`9,00`** | `CELDA` (conmutación) | 0 / 1 / 0 | 0 | 0 |
| `9,00 – 13,49` | `CELDA` | 0 / 1 / 0 | 0 | 0 |
| **`13,50`** | `EDIFICIO` (conmutación) | 0 / 0 / 1 | 0 | 0 |
| `13,50 – 22,00` | `EDIFICIO` | 0 / 0 / 1 | 0 | 0 |

**Confirmación:** la escala es una **función total**. Todo `z` real tiene un nivel
asignado y exactamente **una** capa visible. El intervalo `13 ≤ z < 13,5` que la
revisión señaló como ambiguo está ahora **dentro del dominio de celdas**, y `UX.md` y
`G1-STATE-MODEL.md` repiten la misma tabla.

> **F-1: cerrado.** Se eliminaron las formulaciones parciales (`9–13`, `< 13`,
> `8 < z < 13,5`) de los tres documentos. `MUNICIPIO` deja de ser un valor del
> enumerado de escala: era una confusión entre escala y universo estadístico.
> Criterio verificable: **`M1`** (60 valores de `z` con paso 0,25).

---

## 7. SMALL CELL SEMANTICS

### 7.1 Redacción vigente, copiada literalmente

**`docs/design/G1-TU-BIZKAIA.md` §7.2**

#### 7.2 Decisión

**Métrica primaria de celda = cuota de EDIFICIOS construidos después de `Y`** (contrato `C-05`
evaluado sobre el universo de la celda).

Motivos:

1. **Un único concepto en todo el producto.** El titular municipal ya es `C-05`
   («X de cada 100 edificios con año conocido»). Usar huella en la celda introduciría **dos
   cantidades distintas bajo la misma pregunta**, exactamente la ambigüedad que §4 prohíbe.
2. **Interpretabilidad literal.** La frase de la celda es la misma que la del titular:
   «X de cada 100 edificios de esta celda se terminaron después de 1987».
3. **Robustez frente a un solo polígono enorme.** La huella hace que un único edificio
   industrial decida el color de la celda (el caso 17 % → 90 % anterior).

**La huella NO se descarta:** aparece como lectura **secundaria** en el tooltip de la celda,
etiquetada con su propio contrato (`C-08`, universo `C-06`), y en la explicación de por qué
las dos cifras pueden diferir. Nunca colorea el mapa.

**Consecuencia de diseño obligatoria — `CELL_SMALL_DENOMINATOR`:** una celda con
`n_known < 15` (36 de 168 celdas de la muestra, **21 %**) recibe una **señal secundaria**.
Reglas:

- El **porcentaje se conserva íntegro**: no se altera el numerador, el denominador ni el valor.
- El **relleno mantiene exactamente la misma escala cromática** que el resto de celdas: el
  color sigue significando lo mismo y no introduce una clase nueva.
- La señal es **no cromática**: contorno discontinuo + nota en el tooltip.
- **Prohibido** describirlo como problema de fiabilidad, muestra o dato menos fiable: el
  Catastro es un **censo del universo observado**, no un muestreo. Un denominador pequeño
  cambia la **sensibilidad**, no la validez.
- Justificación del umbral: con `n_known = 15`, un solo edificio mueve el porcentaje ≥ **6,7 pp**
  (`1/15`), y más cuando `n` es menor. El umbral 15 queda así anclado en una magnitud
  interpretable, no en una impresión.
- Copy exacto en `UX_COPY.md` §15. Término interno: **`CELL_SMALL_DENOMINATOR`**
  (sustituye al antiguo `CELL_LOW_N`, retirado).
**`docs/DATA_SEMANTICS.md` §12**

### 12. Agregación por celda (G1)

- Rejilla de **500 m** en `EPSG:25830`; clave `(Codigo_Mun, cell_x, cell_y)`.
- **Métrica primaria de celda: `C-05` sobre el universo de la celda** (cuota de *edificios*
  posteriores a `Y`). Decisión y evidencia: `docs/design/G1-TU-BIZKAIA.md` §7.
- **Métrica secundaria:** `C-08` (cuota de **huella**) — solo en tooltip, siempre etiquetada
  con su propio contrato. **Nunca** colorea el mapa.
- Una celda con `n_known < 15` recibe la señal **`CELL_SMALL_DENOMINATOR`**: el **porcentaje
  se conserva íntegro** y el **relleno mantiene la misma escala cromática**; solo se añade un
  contorno discontinuo y una nota en el tooltip. Evidencia: 36 de 168 celdas de la muestra
  (21 %) están por debajo. Umbral anclado en que con `n = 15` un solo edificio mueve el
  porcentaje ≥ 6,7 pp. **Prohibido** describirlo como «fiabilidad», «muestra» o «dato menos
  fiable»: el Catastro es un censo del universo observado, no un muestreo.
  Copy en `UX_COPY.md` §15.
- La cifra de celda **nunca** se presenta como «tu» cifra: el universo estadístico personal
  es el **municipio** (ver §13).
**`docs/UX_COPY.md` §15**

### 15. Mapa y leyenda

| Clave | Copy |
|-------|------|
| `map.legend.after` | Terminado después de {selected_year} |
| `map.legend.before` | Ya existía en {selected_year} |
| `map.legend.noyear` | Año no utilizable (sin dato o anómalo) |
| `map.legend.cells` | Cada celda colorea la cuota de **edificios** posteriores a {selected_year} |
| `map.legend.cells.small_n` | Pocos edificios con año válido en esta celda (n={n}); unos pocos edificios pueden cambiar mucho el porcentaje. |
| `map.visible_universe` | Estadística del municipio de **{municipality}**. El encuadre del mapa no la cambia. |
**`docs/VISUAL_SYSTEM.md` §11 y §12**

### 11. Semántica antes que color

La semántica se congela aquí; los valores definitivos se eligen y se **justifican** al
implementar, con contraste medido y prueba en daltonismo. **No se copian paletas de
proyectos de referencia por tradición.**

| Rol semántico | Significado | Prioridad visual |
|---------------|-------------|------------------|
| `AFTER` | terminado después del año del usuario | **protagonista** |
| `BEFORE` | ya existía ese año | contexto, apagado |
| `NO_YEAR` | sin dato o año anómalo | ni protagonista ni fondo |
| `CELL_SMALL_DENOMINATOR` | celda con < 15 edificios con año | señal secundaria no cromática |
| `SELECTED` | edificio o elemento activo | contraste máximo |
| `HOVER` | resalte transitorio | subordinado a `SELECTED` |
| `MAP_BG` | fondo del mapa | nunca compite |

Reglas duras:

- `AFTER` es el **único** color de acento saturado del mapa.
- `NO_YEAR` **no** puede ser igual que `BEFORE` ni confundirse con el fondo.
- **`MAP_BG` nunca es un color de dato.**
- `SELECTED` no puede ser sólo un cambio de color: añade grosor de trazo.
### 12. Redundancia no cromática (obligatoria)

| Clase | Recurso no cromático |
|-------|----------------------|
| `NO_YEAR` | trama discontinua (diagonal) |
| `CELL_SMALL_DENOMINATOR` | contorno discontinuo + nota en tooltip (el **relleno no cambia**) |
| `SELECTED` | trazo grueso `SELECTED` |
| `AFTER` / `BEFORE` | además del color, la **leyenda** y el **titular** enuncian la distinción |

Debe existir una prueba de escala de grises: `NO_YEAR` sigue siendo distinguible sin color.
### 7.2 Respuestas literales a lo preguntado

| Pregunta | Estado vigente |
|----------|----------------|
| **Threshold** | `n_known < 15` edificios con año válido en la celda |
| **Nombre semántico** | **`CELL_SMALL_DENOMINATOR`** (retirado `CELL_LOW_N`) |
| **Por qué existe** | con `n = 15` un solo edificio mueve el porcentaje ≥ **6,7 pp** (`1/15`), y más cuando `n` es menor. Mide **sensibilidad**, no validez |
| **¿Altera datos?** | **No.** El porcentaje publicado es idéntico al de una celda sin marca |
| **¿Altera color/relleno?** | **No.** El relleno mantiene **exactamente** la misma escala cromática |
| **¿Altera contorno?** | **Sí**: contorno discontinuo |
| **¿Altera tooltip?** | **Sí**: nota de denominador pequeño |
| **Expresión al usuario** | «Pocos edificios con año válido en esta celda (n={n}); unos pocos edificios pueden cambiar mucho el porcentaje.» |
| **Términos prohibidos** | «fiabilidad», «muestra», «dato menos fiable» |

> **F-2 y F-7: cerrados.** Se retira «baja fiabilidad» y se define explícitamente la
> invariante del relleno. Criterio verificable: **`M6`** (dos celdas con la misma
> cuota reciben el mismo color; el porcentaje no cambia por llevar marca).

---

## 8. DECADE DISTRIBUTION MOBILE

### 8.1 Redacción vigente, copiada literalmente

**`docs/design/G1-TU-BIZKAIA.md` §9**

### 9. Distribución temporal — una sola visualización principal

**Una única** distribución en pantalla. Prohibido: barras + área + línea + donut + heatmap.

| Atributo | Decisión |
|----------|----------|
| Forma | barras verticales |
| Unidad del eje X | **periodos** (décadas + un cubo abierto para la cola antigua) |
| Buckets | **`<1900` · `1900s` · `1910s` … `2020s` · `SIN AÑO`** (máx. **15** categorías) |
| Rango | cubre **todo** el universo; ningún edificio antiguo queda fuera del eje |
| Eje Y | nº de edificios actuales con año `VALID` (`C-09`) |
| Marcador | línea vertical + etiqueta **«TU AÑO · {Y}»**, en **posición continua** dentro del eje |
| Categoría aparte | `SIN AÑO` separada visualmente y **nunca** en 0 |
| Denominador | escrito bajo el gráfico: «sobre {C-02} edificios con año conocido» |
| Interacción | hover resalta el periodo **y** las celdas correspondientes en el mapa |
| Click | **no** cambia el año personal |
| Desktop y móvil | **exactamente los mismos buckets**, para que no cuenten historias distintas |

#### 9.1 Por qué estos buckets y no una barra por año

Evidencia G0: el porcentaje de años acabados en 0/5 es **37,8 % en Bilbao, 29,0 % en Leioa y
43,7 % en Murueta**. Una curva anual sugeriría una precisión que el dato no sostiene y
invitaría a leer «booms» inexistentes.

Además, con `min_valid_year = 1700` el rango completo son **33 décadas**: en 390 px cada barra
tendría ≈10,6 px. Por eso:

- La cola anterior a 1900 se agrupa en un **cubo abierto `<1900`** (etiquetado como
  «anteriores a 1900»), que **no oculta** esos edificios: quedan representados y contados.
- De 1900 en adelante se usa **una barra por década**.
- `SIN AÑO` se muestra aparte, fuera del eje temporal.
- **No** hay scroll horizontal ni ventana temporal: los buckets son fijos.
- El **marcador del año exacto conserva posición continua** dentro del eje aunque las barras
  sean agregadas. Esto es deliberado y se explica en el nivel 3 de copy.
- **Prohibido** interpretar un pico anual como boom constructivo sin evidencia externa.
- El **año exacto se conserva** donde el Catastro publica un año exacto: el filtro personal
  «posterior a {Y}» (`C-04`/`C-05`) y el año nominal de la campaña de ortofoto.
**`docs/UX_COPY.md` §14**

### 14. Distribución temporal

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
### 8.2 Estructura de buckets vigente

| # | Bucket | Tipo |
|---|--------|------|
| 1 | `<1900` | **cubo abierto**: la cola antigua se agrupa, no se oculta |
| 2–14 | `1900s`, `1910s`, `1920s`, `1930s`, `1940s`, `1950s`, `1960s`, `1970s`, `1980s`, `1990s`, `2000s`, `2010s`, `2020s` | una barra por década |
| 15 | `SIN AÑO` | **fuera del eje temporal**, nunca en 0 |

| Aspecto | Definición |
|---------|------------|
| Total | **15 categorías** (antes: 33 décadas) |
| Buckets distintos por viewport | **Prohibido**: idénticos en desktop y móvil |
| Scroll horizontal / ventana temporal | **Prohibido** |
| Edificios anteriores a 1900 | Quedan **representados** en `<1900` y **contados** |
| Marcador «TU AÑO · {Y}» | **Posición continua** dentro del eje |
| Ancho por barra en 390 px | 16 px de barra / 23 px de paso ⇒ sin scroll |

> **F-3: cerrado.** El wireframe móvil ya dibuja los 15 buckets (antes 8 barras).
> Ver `desktop-result.png` y `mobile-result.png` en §12.

---

## 9. Tabla completa de presupuestos

Valores literales de `G1-PERFORMANCE-BUDGETS.md` §4. Perfiles: **P1** local-desktop ·
**P2** móvil emulado (Slow 4G, CPU ×4) · **P3** host candidato.

| Métrica | Perfil | Percentil / reps | Umbral | Baseline G0 comparable | Método | Regla pass/fail |
|---------|--------|------------------|--------|------------------------|--------|-----------------|
| `transfer_hero` (first-party) | P1, P2 | valor, 5 reps | ≤ 420 KB | build gzip 364.587 B (incluía MapLibre) | Σ `encodedBodySize` | p95 de 5 ≤ umbral |
| `t_hero_interactive` | P1 | p75/p95, **20 reps** | ≤ 900 / 1.500 ms | canvas 91–184 ms | `navigationStart` → input activo | p75 y p95 ≤ umbral |
| `t_hero_interactive` | P2 | p75/p95, **20 reps** | ≤ 2.000 / 3.200 ms | canvas 157–172 ms | idem con CPU ×4 | idem |
| `build_js_raw` | repo | determinista | ≤ 1.800.000 B | 1.339.816 B | Σ `_app/immutable/**/*.js` | ≤ umbral |
| **`t_result_ready`** | P1 | p75/p95, **20 reps** + máximo | ≤ 1.600 / 2.400 ms | no comparable | CTA → celdas visibles + titular | p75 y p95 ≤ umbral |
| **`t_result_ready`** | P2 | p75/p95, **20 reps** + máximo | ≤ 3.500 / 5.000 ms | no comparable | ≈1,9 s transferencia + CPU ×4 | idem |
| `transfer_result_first_party` | P1, P2 | valor, 5 reps | ≤ 620 KB | cells z12 = 7.547 B | excluye ortofoto externa | p95 ≤ umbral |
| `transfer_result_buildings_first_party` | P1, P2 | valor, 5 reps | ≤ 1.100 KB | buildings z14 = 464.599 B | caso de encuadre z ≥ 13,5 | idem |
| `t_result_ready_buildings` | P1 | p75/p95, 20 reps | ≤ 2.400 / 3.200 ms | no comparable | añade teselas de edificios | idem |
| `t_result_ready_buildings` | P2 | p75/p95, 20 reps | ≤ 5.000 / 7.000 ms | no comparable | idem | idem |
| `t_year_change` | P1 | p95, 20 reps | ≤ 120 ms | 9–10 ms | mapa + distribución + `aria-live` | p95 ≤ umbral |
| `t_year_change` | P2 | p95, 20 reps | ≤ 300 ms | 16–18 ms | idem | idem |
| `t_place_change` | P1 | p95, 20 reps | ≤ 1.800 ms | no comparable | NORA + JSON + encuadre | p95 ≤ umbral |
| `t_place_change` | P2 | p95, 20 reps | ≤ 3.500 ms | no comparable | idem | idem |
| `t_ortho_visible` (**externo**) | P1 | p75, 20 reps | ≤ 1.500 ms | tesela 212–324 ms | servicio de terceros | p75 ≤ umbral |
| `t_ortho_visible` (**externo**) | P2 | p75, 20 reps | ≤ 3.000 ms | tesela 231–297 ms | idem | idem |
| **`heap_after_journey`** | P1 | valor | ≤ **60 MB** | 13,9 MB (sin journey) | ≈4× baseline; techo que acota caché | `usedJSHeapSize` | ≤ umbral |
| **`heap_after_journey`** | P2 | valor | ≤ **40 MB** | **9,5–11,5 MB** (sin journey) | ≈4× baseline; techo que acota caché | idem | ≤ umbral |
| `uncaught` | P1, P2 | valor | **0** | 0 | — | `pageerror` + `unhandledrejection` | exactamente 0 |
| `console_errors` | P1, P2 | valor | **0** | 0 | lista blanca §6 | `console.error` | exactamente 0 |

### 9.1 Separación de fiabilidad (fuera de PERFORMANCE)

| Métrica | Dónde | Umbral | Regla |
|---------|-------|--------|-------|
| **Activos propios** (`*.pmtiles`, JS, CSS, `metrics/*.json`, `catalog.json`) | `REL6` | **0 fallos** | binaria |
| **Ortofoto externa — disponibilidad** | `REL7` | sin umbral: **caracterización** | `NOT_COVERED` no es fallo; `SERVICE_ERROR` debe degradar |
| **Ortofoto externa — smoke de release imposible** | `REL8` | — | resultado **`G1_BLOCKED`**, nunca `G1_FAIL` |

> **F-4, F-5, F-6 y F-8: cerrados.**
> - `tile_failures` **eliminada** como métrica mezclada; se reparte entre `REL6`
>   (propio, 0), `REL7` (externo, caracterizado) y `REL8` (bloqueo por entorno).
> - `heap` móvil baja de 70 MB a **40 MB** (y P1 de 90 MB a 60 MB), con el factor 4×
>   declarado como decisión.
> - `t_result_ready` protege **p75 y p95 con 20 repeticiones** (antes p95 con 5) y se
>   reporta el máximo observado.
> - Se añade presupuesto **acumulado first-party** (`transfer_result_first_party` y la
>   variante con edificios), excluyendo JPEG/WMS externos.

---

## 10. Las 4 decisiones reversibles de §14

### 14. Decisiones que la revisión humana puede querer revertir

Se listan explícitamente para que no queden implícitas:

1. **Clase visual única `NO_YEAR`** (en lugar de 4 clases de color). Revierte a 4 clases si se
   considera que oculta `SUSPICIOUS`. Conteos y tooltip ya lo publican.
2. **Métrica de celda = conteo** (huella en tooltip). Revierte a huella si se prioriza la
   lectura física del territorio; el encargo pedía decidir, no descartar.
3. **Ortofoto opt-in.** Si se quiere presencia visual inmediata de la foto aérea, sube el
   payload inicial y hay que reabrir los budgets.
4. **Hero sin MapLibre.** Si se quiere el mapa ya en la portada, cambia el perfil de carga
   inicial (`G1-PERFORMANCE-BUDGETS.md`).
### 10.1 Fichas de reversibilidad

#### D-1 · Clase visual única `NO_YEAR`

- **Decisión actual:** `UNKNOWN`, `SUSPICIOUS` e `INVALID` comparten **una** clase
  visual no temporal; el desglose numérico va en el disclosure y el estado exacto en el
  tooltip.
- **Alternativa:** cuatro clases visuales (color/trama distintas) en zoom de edificio.
- **Evidencia utilizada:** 12/13.750 (Bilbao), 5/2.390 (Leioa), 9/254 (Murueta) →
  0,05 %–3,5 % del parque.
- **Coste de revertir tras G1:** bajo en datos; medio en `VISUAL_SYSTEM.md` y
  `UX_COPY.md` §15; hay que rehacer leyenda, tooltip y pruebas de escala de grises.
- **Artefactos afectados:** `VISUAL_SYSTEM.md` §11–12, `UX_COPY.md` §15–16,
  `desktop-building.svg`, `mobile-detail.svg`, criterios `M3`/`M4`.

#### D-2 · Métrica primaria de celda = conteo de edificios

- **Decisión actual:** la celda colorea la cuota de **edificios** (`C-05`); la huella
  (`C-08`) solo en tooltip.
- **Alternativa:** celda por cuota de **huella**.
- **Evidencia utilizada:** divergencia media 14,8 pts; 25 % de celdas > 20 pts; solo
  75 % coinciden al clasificar «mayoritariamente nueva»; extremo 17,4 % vs 90,2 %.
- **Coste de revertir tras G1:** **alto**: cambia una capa visible, leyenda, tooltip,
  copy y todos los umbrales de color; requiere regenerar `cells.pmtiles`.
- **Artefactos afectados:** `G1-TU-BIZKAIA.md` §7, `DATA_SEMANTICS.md` §12,
  `UX_COPY.md` §15, `VISUAL_SYSTEM.md` §13, pipeline de celdas,
  `M1`/`M3`/`M6`, regresión visual.

#### D-3 · Ortofoto opt-in

- **Decisión actual:** ninguna ortofoto se carga sin acción explícita.
- **Alternativa:** mostrar la foto más próxima automáticamente bajo los edificios.
- **Evidencia utilizada:** assets 364.587 B gzip; teselas de ortofoto ≈300–600 KB.
- **Coste de revertir tras G1:** **alto** en presupuesto (sube
  `transfer_result_first_party` y `t_result_ready`; exige enmienda), medio en copy.
- **Artefactos afectados:** `G1-PERFORMANCE-BUDGETS.md` §4,
  `G1.md` `P5`/`PERF4`/`PERF5`/`PERF10`, `UX_COPY.md` §17,
  `G1-STATE-MODEL.md` §3, wireframes de resultado.

#### D-4 · Hero sin MapLibre

- **Decisión actual:** el hero no monta el motor de mapa.
- **Alternativa:** mapa ya en la portada.
- **Evidencia utilizada:** el hero sin MapLibre permite `transfer_hero` ≤ 420 KB.
- **Coste de revertir tras G1:** **medio-alto**: cambia el perfil de carga inicial
  (`PERF1`/`PERF2`) y la jerarquía del hero.
- **Artefactos afectados:** `UX.md` §15, `VISUAL_SYSTEM.md` §15, `UX_COPY.md` §12,
  `G1-PERFORMANCE-BUDGETS.md` §4, `PERF1`–`PERF3`,
  `desktop-hero.svg`, `mobile-hero.svg`.

---

## 11. Registro de cambios derivado de la revisión

| # | Hallazgo | Acción aplicada | Artefactos tocados | Criterio |
|---|----------|-----------------|--------------------|----------|
| F-1 | Discontinuidad de zoom `13 ≤ z < 13,5` | Dominio único y total `z<9` / `9 ≤ z <13,5` / `z ≥13,5`; se eliminan formulaciones parciales; `MUNICIPIO` sale del enumerado de escala | `G1-TU-BIZKAIA` §6.2 · `UX` §14 · `G1-STATE-MODEL` §4 · `G1-FRONTEND-ARCHITECTURE` §6.1 | `M1` |
| F-2 | «Baja fiabilidad» describe un censo como si fuera una muestra | Renombrado a `CELL_SMALL_DENOMINATOR`; se prohíben «fiabilidad», «muestra», «dato menos fiable»; umbral justificado por 6,7 pp con n=15 | `G1-TU-BIZKAIA` §7.2 · `DATA_SEMANTICS` §12 · `UX_COPY` §15 · `VISUAL_SYSTEM` §11 · `RISKS` R-18 | `M6` |
| F-3 | Distribución móvil ilegible con 33 décadas; el wireframe dibujaba 8 barras | Buckets fijos `<1900` + 1900s–2020s + `SIN AÑO` (15 máx.), idénticos en ambos viewports, sin scroll; marcador continuo | `G1-TU-BIZKAIA` §9 · `DATA_SEMANTICS` §14 y `M-09` · `UX_COPY` §14 · `G1.md` `P4` · `desktop-result.svg` · `mobile-result.svg` | `P4` |
| F-4 | `tile_failures` mezclaba activos propios y servicios externos | Eliminada como métrica mezclada; activos propios → `REL6` (0); externo → `REL7` caracterizado; smoke imposible → `REL8` = `G1_BLOCKED` | `G1-PERFORMANCE-BUDGETS` §1/§4.3/§8 · `G1.md` `REL6`–`REL8` y GO/NO-GO | `REL6`, `REL7`, `REL8` |
| F-5 | `heap` móvil 70 MB con rationale «6× baseline» | Bajado a **40 MB** (P2) y **60 MB** (P1); factor 4× declarado como decisión | `G1-PERFORMANCE-BUDGETS` §4.3 · `G1.md` `PERF11` | `PERF11` |
| F-6 | `t_result_ready` solo protegía p75 con 5 repeticiones | p75 **y** p95 con **20 repeticiones** y máximo observado en todas las métricas con percentil | `G1-PERFORMANCE-BUDGETS` §2/§4 · `G1.md` `PERF2`/`PERF4`/`PERF7`–`PERF10` | `PERF4` |
| F-7 | `CELL_LOW_N` decía «no se colorea igual» sin definir color | El **relleno no cambia**: misma escala cromática; la señal es contorno discontinuo + tooltip | `VISUAL_SYSTEM` §12–13 · `UX_COPY` §15 | `M6` |
| F-8 | Sin presupuesto de transferencia acumulada first-party | Añadidos `transfer_result_first_party` (≤620 KB) y `transfer_result_buildings_first_party` (≤1.100 KB), excluyendo ortofoto externa | `G1-PERFORMANCE-BUDGETS` §4.2 · `G1.md` `PERF5`/`PERF6` | `PERF5`, `PERF6` |

**Cambio en el recuento del gate:** 68 → **72** criterios (nuevos `M6`, `REL6`, `REL7`, `REL8`; `PERF11` reasignado de `tile_failures` a `heap_after_journey`).

---

## 12. Wireframes renderizados

| PNG | Tamaño | sha256 (16) |
|-----|--------|-------------|
| `desktop-building.png` | 1440x900 | `4cdedf255a108305…` |
| `desktop-hero.png` | 1440x900 | `158869d910f550c0…` |
| `desktop-result.png` | 1440x900 | `562967a5a9250999…` |
| `mobile-detail.png` | 390x844 | `bad7233bf3525e66…` |
| `mobile-hero.png` | 390x844 | `d5a8a11de62ec613…` |
| `mobile-result.png` | 390x844 | `adfbc7f7e7a81f74…` |

Rutas completas: `docs/design/review-render/<nombre>.png`.
Render reproducible: `python docs/design/review-render/render-svg.py`.

> `desktop-result.png` y `mobile-result.png` se han vuelto a renderizar tras el cierre
> de F-3 (15 categorías, antes 8 barras).

---

## 13. Check-in de artefactos

| SVG fuente | sha256 |
|-----------|--------|
| `desktop-building.svg` | `730881aab8a32033405ee13ae0c58ea9431bea631636b9932ef270012f2767d2` |
| `desktop-hero.svg` | `390c437bc1ccdf6a0ec5c9b802eab199830dd4bce319058dfa195909d1595c4e` |
| `desktop-result.svg` | `4fb7ef82c7a58106f6298572ee33116f3c7dd16d93af19a0bc84ff35be159c49` |
| `mobile-detail.svg` | `9436208c5e42cca48a36fa2b8be42c35e98cdfadd6812444a78adb59e4ccb69e` |
| `mobile-hero.svg` | `455b9ff3832ea99e179c125193011d3c58e2fff17fa1fd172ef1fb12fc947dc4` |
| `mobile-result.svg` | `f5ef92e9fa639640893c75bed2a7ec92f134dd7a07996dab57966af5a664a584` |

> Esta ronda de correcciones afecta a `desktop-result.svg` y `mobile-result.svg`;
> los otros cuatro conservan su contenido.
