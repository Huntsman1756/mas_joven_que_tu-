# G1 — «Tu Bizkaia»: especificación de producto y experiencia

> Fase de diseño. **No implementación.** Baseline `be26508` (G0_PASS).
> Documentos relacionados: `G1-STATE-MODEL.md`, `G1-FRONTEND-ARCHITECTURE.md`,
> `G1-PERFORMANCE-BUDGETS.md`, `docs/gates/G1.md`, `docs/design/wireframes/`.

## 1. Objetivo único de G1

Convertir el demostrador técnico en **una sola experiencia real**:

```
año personal  +  lugar de Bizkaia  →  respuesta visual inmediata
```

Todo lo demás (máquina del tiempo completa, historias editoriales, bilingüe completo) queda
fuera y se lista en §15.

## 2. Tesis UX

El usuario no viene a estudiar Catastro. Viene porque la pregunta le concierne personalmente.

```
curiosidad personal → respuesta directa → visualización → contexto → metodología
```

**Prohibido como orden de entrada:** metodología → filtros → mapa → explicación (es el patrón
dashboard que `PROJECT_CHARTER.md` §3 rechaza).

## 3. Journey canónico

| # | Estado | Qué ve la persona | Qué hace |
|---|--------|-------------------|----------|
| 1 | `INTRO` | marca, la pregunta, dos campos, un CTA | introduce año y lugar |
| 2 | `LOCATION_RESOLVING` | el campo de lugar resuelve | elige un resultado |
| 3 | `RESULT` | titular personalizado + cobertura + mapa municipal con celdas + distribución por décadas | mueve el año, hace zoom, abre «¿Cómo se calcula?» |
| 4 | `RESULT` + edificios | al acercar (z ≥ 13,5) aparecen los edificios coloreados | cambia el año, selecciona un edificio |
| 5 | `ORTHO_*` | opcional: la foto aérea más próxima a su año | pulsa «Ver la foto de 1990» |
| 6 | `SHARE` | enlace estable con su año y lugar | copia el enlace |

**Éxito del journey:** una persona nueva obtiene una cifra personalizada en **una
interacción** y entiende su denominador sin salir de la pantalla.

## 4. Regla del universo estadístico (crítica)

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

## 5. Unidad geográfica

| Nivel | Geometría | Rol |
|-------|-----------|-----|
| `Bizkaia` | 112 municipios | contexto inicial y exploración posterior |
| `municipio` | polígono municipal | **unidad estadística**: titular + distribución |
| `celda 500 m` | rejilla `EPSG:25830` | patrón espacial; cifra secundaria etiquetada |
| `edificio` | polígono catastral | evidencia individual; `C-12` |

## 6. Progresión multiescala y umbrales de zoom

### 6.1 Evidencia medida (spike `docs/design/spikes/g1_zoom_thresholds.py`)

Features por tesela, PMTiles de G0:

| z | `buildings` (Bilbao) | `cells` (Bilbao) |
|---|----------------------|------------------|
| 10 | 12.002 | 179 |
| 11 | 13.746 | 170 |
| 12 | 6.735 | 93 |
| 13 | 3.285 | 49 |
| 14 | 2.036 | — |
| 15 | 667 | — |
| 16 | 140 | — |

**Lectura:** por debajo de z ≈ 13–14 el edificio individual no es legible como tal; a z14 hay
2.036 polígonos en una tesela de Bilbao, y a z16 sólo 140. El agregado por celda es legible
hasta z13 (49 celdas por tesela).

### 6.2 Umbrales congelados

| Rango de zoom | Capa visible | Opacidad |
|---------------|--------------|----------|
| `z ≤ 8` | `municipalities` | 1 → 0 entre z8,0 y z9,0 |
| `9 ≤ z < 13` | `cells` | 0 → 1 entre z8,5 y z9,5; 1 → 0 entre z13,0 y z13,5 |
| `z ≥ 13,5` | `buildings` | 0 → 1 entre z13,5 y z14,2 |

- El **encuadre inicial del resultado es municipal** (típicamente `z 11–12`): la primera
  respuesta se sirve con **celdas**, no con 14.000 polígonos.
- `cells` y `buildings` **no se solapan** salvo en la transición de 0,5 niveles, para que el
  color nunca sea ambiguo.
- Los umbrales son configurables pero **están preregistrados**; cambiarlos exige enmienda.

## 7. Métrica primaria de la celda — decisión

> Pregunta del encargo: ¿**número de edificios** o **huella edificada**?

### 7.1 Evidencia medida (spike `docs/design/spikes/g1_cell_metric.py`, Y = 1987)

211 celdas, 168 con año conocido:

| Medida | Valor |
|--------|-------|
| Divergencia `|cuota-edificios − cuota-huella|` | media **14,8 pts** · mediana 9,8 · p90 34,9 · máx **72,8** |
| Celdas con divergencia > 10 pts | **83 (49,4 %)** |
| Celdas con divergencia > 20 pts | 42 (25,0 %) |
| Celdas con divergencia > 30 pts | 30 (17,9 %) |
| Concordancia al clasificar «celda mayoritariamente nueva» (> 50 %) | **sólo 126/168 (75 %)** |
| Divergencia con `n_known` < 15 | 19–21 pts (peor que con n grande) |
| Divergencia en celdas con ≥ 3 edificios industriales | 15,4 pts (vs 12,4 sin industria) |

Extremos reales: una celda de Bilbao con 47 edificios y 3.101 m²/edificio da **17,4 %** por
conteo y **90,2 %** por huella; una celda de Leioa con 9 edificios da **88,9 %** por conteo y
**24,6 %** por huella.

**Conclusión:** la elección **no es cosmética**; una de cada cuatro celdas cambia de
clasificación según la métrica.

### 7.2 Decisión

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

**Consecuencia de diseño obligatoria:** una celda con `n_known < 15` (36 de 168 celdas, **21 %**)
se marca como **baja fiabilidad** y el tooltip lo declara. No se oculta ni se colorea igual.

## 8. Edificio: de estado de dato a representación

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

## 9. Distribución temporal — una sola visualización principal

**Una única** distribución en pantalla. Prohibido: barras + área + línea + donut + heatmap.

| Atributo | Decisión |
|----------|----------|
| Forma | barras verticales |
| Unidad del eje X | **décadas** |
| Rango | de la década más antigua con datos a la década actual |
| Eje Y | nº de edificios actuales con año `VALID` (`C-09`) |
| Marcador | línea vertical + etiqueta **«TU AÑO · {Y}»** |
| Categoría aparte | `NO_YEAR` como barra/segmento separado, **nunca** en 0 |
| Denominador | escrito bajo el gráfico: «sobre {C-02} edificios con año conocido» |
| Interacción | hover resalta la década **y** las celdas correspondientes en el mapa |
| Click | **no** cambia el año personal |

### 9.1 Por qué décadas y no años (restricción heredada de G0)

Evidencia G0: el porcentaje de años acabados en 0/5 es **37,8 % en Bilbao, 29,0 % en Leioa y
43,7 % en Murueta**. Una curva anual sugeriría una precisión que el dato no sostiene y
invitaría a leer «booms» inexistentes.

Por tanto:

- La vista principal es **por décadas**.
- El **año exacto se conserva** donde el Catastro publica un año exacto: el filtro personal
  «posterior a {Y}» (`C-04`/`C-05`) y el año nominal de la campaña de ortofoto.
- **Prohibido** interpretar un pico anual como boom constructivo sin evidencia externa.
- El marcador del año del usuario **no** implica resolución anual de la distribución; es
  deliberado y se explica en el nivel 3 de copy.

## 10. Relación mapa ↔ distribución

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

## 11. Ortofoto en G1: integración mínima y coverage-aware

G1 **no** es la máquina del tiempo. La ortofoto es evidencia, contexto y teaser de G2.

### 11.1 Flujo

```
resultado
  └─ “La foto aérea oficial más próxima a tu año es de 1990 (a 3 años).”
       [ Ver la foto de 1990 ]   [ Comparar con 2025 ]      ← opt-in
```

- **No** se carga ninguna ortofoto por defecto.
- Un solo control de comparación (`swipe`), reutilizando `maplibre-gl-swipe` (MIT).
- Sin selector de campaña completo: eso es G2.

### 11.2 Cobertura como estado de dominio (no como error de UI)

Modelo mínimo, preregistrado en `G1-STATE-MODEL.md`:

```
orthoState(location, campaign) ∈ { AVAILABLE, NOT_COVERED, SERVICE_ERROR, UNKNOWN }
```

| Estado | Significado | Copy |
|--------|-------------|------|
| `AVAILABLE` | hay imagen | se muestra, con fuente y fecha real |
| `NOT_COVERED` | la campaña **no cubre ese punto** | «La campaña de 1990 no cubre este lugar. Prueba 1970 o 1983.» |
| `SERVICE_ERROR` | el servicio no responde o devuelve XML/blanco | «La ortofoto oficial no está disponible temporalmente. El resto de la visualización sigue funcionando.» |
| `UNKNOWN` | aún no comprobado | estado de carga, nunca spinner infinito |

Reglas duras:

- **Prohibido el fallback silencioso** a otra campaña.
- La distinción `NOT_COVERED` vs `SERVICE_ERROR` es visible y distinta.
- Los candidatos alternativos («Prueba 1970 o 1983») sólo se ofrecen si se determinan con una
  regla clara: **las dos campañas del catálogo más próximas en año que sí cubren el punto**,
  verificadas antes de ofrecerse. Si no se han verificado, **no se ofrecen**.
- Evidencia de partida: la campaña **1975 no cubre parte de Bilbao ni Murueta** (404 real,
  documentado en `evidence/g0/05-orthos/`).

## 12. Estados de cobertura del dato

Umbrales vigentes (`DATA_SEMANTICS.md` §7): aviso con cobertura < 90 %; disclaimer reforzado
con < 70 %. Con la evidencia G0 (mínimo territorial 91,59 %) **ningún municipio activa el
aviso**, pero el estado se implementa y se prueba con datos de prueba.

## 13. Niveles de explicación (progressive disclosure)

| Nivel | Contenido | Dónde |
|-------|-----------|-------|
| 1 | conclusión: «X de cada 100 edificios…» | titular |
| 2 | contexto: cobertura, denominador, «esto no significa que antes no hubiera nada» | bajo el titular |
| 3 | «¿Cómo se calcula?»: numerador, denominador, contrato `C-04`/`C-05` | desplegable en línea |
| 4 | metodología completa, fuentes, licencias, snapshot | `Cómo lo sabemos` |

Ninguna estadística importante puede quedar sin una forma visible de entender su denominador.

## 14. Decisiones que la revisión humana puede querer revertir

Se listan explícitamente para que no queden implícitas:

1. **Clase visual única `NO_YEAR`** (en lugar de 4 clases de color). Revierte a 4 clases si se
   considera que oculta `SUSPICIOUS`. Conteos y tooltip ya lo publican.
2. **Métrica de celda = conteo** (huella en tooltip). Revierte a huella si se prioriza la
   lectura física del territorio; el encargo pedía decidir, no descartar.
3. **Ortofoto opt-in.** Si se quiere presencia visual inmediata de la foto aérea, sube el
   payload inicial y hay que reabrir los budgets.
4. **Hero sin MapLibre.** Si se quiere el mapa ya en la portada, cambia el perfil de carga
   inicial (`G1-PERFORMANCE-BUDGETS.md`).

## 15. No-objetivos de G1 (congelados)

Máquina del tiempo completa · todas las campañas navegables como producto · historias y
scrollytelling (G3) · selección automática de historias · análisis de demoliciones · visión
artificial · reconstrucción del stock histórico · 3D · datos en tiempo real · login · backend ·
comentarios · funciones sociales · IA/LLM · comparación entre usuarios · gamificación ·
edición bilingüe completa (solo estructura i18n).

Introducir cualquiera de estos exige un gate nuevo aprobado.

## 16. Conflictos de especificación detectados

> Protocolo del encargo: **STOP**, documentar `SPEC_CONFLICT`, **no** cambiar en silencio.

### SPEC_CONFLICT-001 — `nearest_ortho(1987)` documentado como 1983

- **Dónde:** `DATA_SEMANTICS.md` §4 `M-11` («más próxima a 1987: 1983») y §10 (tabla de
  frases permitidas); `PRODUCT.md` §3.2 («La fotografía oficial más próxima a 1987 disponible
  es la de 1983»).
- **Hecho:** con el catálogo congelado, `|1987−1983| = 4` y `|1987−1990| = 3`. El contrato
  `C-11` devuelve **1990**; verificado en el navegador en G0.
- **Naturaleza:** los literales eran **ejemplos ilustrativos del encargo**, nunca cálculo.
  El contrato no está en duda.
- **Resolución:** se sustituyen los literales por **plantillas** (`{nearest_year}`) y se
  registra la corrección. No se toca la fórmula de `C-11`.

### SPEC_CONFLICT-002 — `M-10` dice «huellas» y el pipeline usa conteo

- **Dónde:** `DATA_SEMANTICS.md` §4 `M-10` («década modal de las huellas»).
- **Hecho:** `pipeline/g0_slice.py` calcula la década modal por **conteo de edificios**.
- **Naturaleza:** contradicción real entre contrato escrito e implementación.
- **Resolución:** se alinea `M-10` con la métrica primaria decidida en §7 (conteo), dejando
  explícito que una variante por huella sería otra métrica con otro nombre. Documentado y
  corregido; no se cambia ningún denominador existente.

## 17. Hipótesis de diferenciación — validación

Hipótesis del encargo: *la aportación diferencial es la integración coherente de año personal
+ geografía multiescala + estadística canónica + parque actual + evidencia aérea oficial +
explicación metodológica progresiva, mediante un único estado temporal.*

**Validación: correcta, con una precisión.**

La integración es la aportación **solo si el universo no cambia al cambiar de escala**. Un mapa
multiescala que reescribe la estadística al hacer zoom no sería una integración: sería una
contradicción con buena factura. La aportación defendible es:

> **Un único año personal que gobierna, sin cambiar de denominador, el titular, el mapa
> multiescala y la distribución; con la evidencia aérea y la metodología como capas
> progresivas del mismo estado.**

Comparado con los antecedentes:

- **Bizkaiko etxeak (2016):** mapa de edad de edificios, sin personalización, sin estadística
  con denominador, sin ortofotos sincronizadas, sin multiescala.
- **elDiario «desde que naciste»:** personalización por año, pero agregado urbano sin
  evidencia aérea ni contrato de datos por edificio.
- **Bert Spaan / Urban Layers:** excelente rendimiento multiescala y lectura de edad, pero sin
  pregunta personal ni cruce con ortofoto oficial.
- **Comparador de geoEuskadi:** compara imágenes, no las cruza con el parque construido ni con
  el año del usuario.

Lo diferencial, por tanto, no es «building age map + birth year»: es **la coherencia
estadística entre escalas y la trazabilidad del denominador** aplicadas a una pregunta
personal, con evidencia aérea oficial como respaldo.
