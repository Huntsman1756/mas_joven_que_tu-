# G4-R · PRODUCT-MODEL — historias, Descúbreme, retorno y deep links

## 1. Experiencia de historia (por capítulo — diseño en papel)

Cada capítulo: **1–1,5 viewports**, la escena del mapa ya configurada al
entrar (la prosa no pide «ahora haz esto» — ya está hecho).

| Capítulo | Línea de apertura (función) | Estado mapa | Interacción temporal | Interacción foto | Histórico | Contexto | Caveat | Salida |
|----------|----------------------------|-------------|----------------------|------------------|-----------|----------|--------|--------|
| 01 c2803 Portugalete | nombrar la ola territorial | bbox del componente, year=1969 | play pausado en 1969 → el usuario lo lanza | orto 1965↔actual | relevante (1923-25 pre-ola) | no | parque actual | «siguiente caso» / «mi Bizkaia» |
| 02 f4036 Mungia | «casi todos nuevos, casi nada de suelo nuevo» | edificio, z≈16 | play 1970→1979 | orto pre/post | opcional | no | huella≠conteo | ídem |
| 03 f4233 Muskiz | «una década, un barrio» | conjunto, z≈15,5 | **el protagonista: Play** | orto 1970↔1983 | no | no | conjunto≠municipio | ídem |
| 04 f4738 Santurtzi | «pocos edificios, casi todo el suelo» | huella dominante | play 1990→1999 | orto pre/post | no | planning si aporta | huella≠uso | ídem |
| 05 f149 Abanto | «lo último que registra el dato» | conjunto 2000s | play tramo final | **protagonista: campañas 2004↔2024** | no | no | reciente≠expansión | «vuelve a tu Bizkaia» |

Regla de diseño: cada capítulo usa UNA mecánica como protagonista
(play, contraste, comparador de campañas) — nunca las tres.

## 2. «Descúbreme un cambio» — contrato completo

**Requisitos:** determinista · compartible · sin aleatoriedad oculta ·
sin ruta nueva · preserva/restaura estado personal · IDs estables ·
teclado · back/forward correcto.

**Alternativas evaluadas:**

| Modelo | Cómo elige | Determinista | Compartible | Problema |
|--------|-----------|--------------|-------------|----------|
| A. Rotación ordenada | siguiente del corpus | sí | `story=id` en URL | necesita memoria de posición — la propia URL la da |
| B. Por municipio actual | el caso más cercano/relevante | sí | sí | sesgo geográfico; ¿y si no hay caso cercano? |
| C. Por año del usuario | el caso del mismo decenio | sí | sí | limitado (2 casos son 70s) |
| D. Índice explícito | el usuario elige | sí | sí | menos «descubrimiento», más control |

**Elección: A + D combinados.** Un botón «Descúbreme un cambio» abre el
siguiente caso del corpus congelado (rotación determinista f149→f4036→
c2803→f4233→f4738); un índice mínimo de 5 líneas permite elegir
directamente. La URL `story=<id>` siempre refleja el caso abierto —
compartir una historia comparte exactamente esa.

**Contrato de transición de estado:**

```
click Descúbreme (sin story previo)
  → pushState ?story=<next> + year/place/lat/lon/z/play/view del caso
  → guardar estado personal previo en memoria (year/place propios)
  → capítulo visible; escena configurada

click Descúbreme (story activo)
  → siguiente caso del anillo (next = corpus[(i+1) % 5])

«Volver a mi Bizkaia»
  → restaura year+place personales (o intro si no había)
  → story= desaparece de la URL

deep link ?story=<id> (sin estado personal)
  → abre directamente el capítulo + escena
  → el estado personal queda vacío; el CTA final ofrece
    «ahora la tuya» → intro con año/lugar
```

- `story=` coexiste con el resto de params (year/place del caso van en
  URL — el enlace es autocontenido y compartible).
- Back: desde historia a estado previo funciona por pushState natural.
- Teclado: botón normal; el capítulo es una región con encabezado.
- Sin feed infinito: 5 casos, el anillo se anuncia («caso 2 de 5»).

## 3. Modelo de valor de retorno

| Motivo | Tipo | Fricción | Ya existe |
|--------|------|----------|-----------|
| Otro lugar | re-play en sesión | 1 clic «Cambiar» | sí |
| Mi edificio exacto | profundidad | flujo address | sí |
| Otro año / DOS AÑOS | re-play | input | sí |
| Otra historia | descubrimiento | 1 clic Descúbreme | G4 |
| Histórico 1923-25 en otro punto | re-play | opt-in | sí (no compartible — BUG-02) |
| Compartir una vista concreta | retorno externo | URL | sí |
| Snapshot futuro («qué cambió») | retorno por dato | — | reservado |

Sin engagement diario inventado: el producto es de **re-consulta por
ocasión** (mudanza, conversación, noticia local). La URL compartible es
su mecanismo de retorno real.

## 4. Auditoría de deep links — modelo canónico

Serializado hoy: `year place lat lon z ortho building play view compare`.

| Estado | ¿Merece compartirse? | Veredicto |
|--------|----------------------|-----------|
| year+place | sí — es la vista | ya está |
| compare | sí — la pregunta completa | ya está |
| building | sí — pero **requiere lat/lon/z para restaurar** (BUG-01) → documentar acoplamiento o hacer restore robusto (buscar centroide en facets/tiles por id antes de escanear cámara) |
| view | sí | ya está |
| play (pausado) | sí — «míralo en 1975» | ya está |
| ortho (campaña) | sí | ya está |
| orthoCompare | **sí — hoy se pierde** | añadir `ortho2=` |
| histMapVisible | **sí — hoy no existe** | añadir `hist=1` |
| contextOverlay / planningHighlight | no — estado de exploración | queda fuera (correcto) |
| selectedCell | dudoso — detalle efímero | fuera (o `cell=fid` si una historia lo necesita) |
| story | sí (G4) | nuevo param |
| address text | **nunca** (privacidad GA4) | correcto como está |
| playing | no — transitorio | correcto |
| camera | sí — necesaria para building= | ya está |

Ruido transitorio a NO serializar: hover, scroll, formulario abierto,
estado de carga, `cellInspectNone`.

## 5. Integración de las historias en `/` (posición)

- NO en la primera visita: el usuario debe comprender SU respuesta
  antes de ver casos ajenos (regla G4-DIRECTION L4).
- Ubicación: tramo editorial final, tras planning — «cinco lugares
  donde el dato cuenta algo» (índice de 5 líneas, no tarjetas) +
  «Descúbreme un cambio» como acción.
- Al abrir una historia: capítulo (1–1,5 vp) en esa misma posición +
  escena reconfigurada arriba (scroll suave al mapa o aviso
  «la escena ha cambiado»).
- Relación con el journey canónico: es el paso «descubrir otro caso» —
  cierre del arco, no un producto aparte.
- Sin grid: el índice es prosa («01 · PORTUGALETE — la ola que cruzó seis
  municipios») — cada línea es el deep link.
