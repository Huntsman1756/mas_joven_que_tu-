# ADR-023 — Un solo reproductor temporal + geometría compartida del lienzo (G19-R3)

- Estado: aceptado
- Fecha: 2026-10
- Revisa: [ADR-022](ADR-022-viewer-common-shell.md) (la franja de contexto pasa
  a existir en los cinco modos) y la anatomía del chrome temporal de
  [ADR-021](ADR-021-temporal-canvas.md).

## Contexto

La adjudicación visual de G19-R2 detectó dos defectos:

1. El lienzo no conservaba exactamente la misma caja entre modos: en
   `Edificios` la fila `.mapintro` (exigida por G12 en ese modo) empujaba el
   mapa 112 px y lo dejaba 62 px más bajo que en `Evolución`/`Fotos`.
2. `Evolución` y `Fotos aéreas` compartían la clase `TemporalChrome` pero no
   la misma anatomía: el continuo no montaba `‹ ›` (salvo como paso
   especial bajo reduced-motion), el discreto marcaba la selección con un
   tick distinto, el ⓘ tenía ancho variable por su texto visible y los ticks
   de campaña usaban otra geometría que los de década.

## Decisión

### 1. `ModeIntroSlot` — la franja de contexto existe en los cinco modos

`.mapintro` deja de ser exclusivo de `Edificios` y se convierte en un slot
estructural común entre el selector de modos y el lienzo, con altura
estructural fija en desktop (`min-height: 7.5rem`, contenido centrado).
Contenido por modo (`view.intro.*`): el de `map` conserva la explicación
completa de G12; los de visor llevan una línea breve de contexto y la
explicación larga sigue tras el ⓘ. Nunca lleva controles temporales.

### 2. Mismo `.mapband` en todos los modos

Se elimina el override `.stage.viewer .mapband`: todos los modos comparten
`min-height: min(62svh, 640px)` en desktop. Medido (`evidence/g19r3/
geometry.json`, 1440×900): `x=340, y=271, w=1100, h=557` en los cinco modos
— diferencia 0 px.

### 3. `HistoricalTimePlayer` — un solo componente, dos fuentes de fechas

`TemporalChrome` pasa a llamarse `HistoricalTimePlayer` y a renderizar
siempre la anatomía fija `Play · ‹ · año · › · rail · ⓘ`:

- `mode="continuous"` (Evolución): eje anual, relleno en acento hasta el
  cabezal, ticks de década; `‹ ›` = ±1 año.
- `mode="discrete"` (Fotos): un tick por campaña real; `‹ ›` = campaña
  anterior/siguiente; arrastrar hace snap a la campaña más cercana.
- El thumb lo dibuja el propio player sobre `value` — literalmente el mismo
  elemento (`.tc-thumb`) en ambos modos.
- El ⓘ es icono puro (etiqueta sr-only + `title`): su caja es idéntica en
  los dos modos y el rail nunca cambia de ancho.
- `rmSteps` desaparece: bajo reduced-motion `canPlay=false` oculta solo el
  Play y `‹ ›` quedan como paso manual — misma anatomía.
- Los ticks de campaña cruzan la línea base con la misma geometría que los
  de década (tick a 6–14 px, etiqueta a 22 px, 0.62 rem).

La barra sigue siendo overlay del lienzo (top:0 desktop / bottom:0 apilado):
no consume flujo y no altera la caja del mapa.

## Consecuencias

- `EvolutionTimePlayer` y `PhotoPanel` son solo controladores de modo:
  misma vista, distinta fuente de fechas y distinto cuerpo del ⓘ.
- `photo.hint` desaparece: su función («elige una campaña del eje») la
  cubre el intro del modo. `histmap.note` se mueve al intro del modo
  `hist` (la tarjeta conserva estado + salida).
- Los gates migran: `p4_intro_brief` (intro breve en visor, explicación
  tras ⓘ), `g18_rm_steps`/`g18_prevnext_present` (los `‹ ›` son el paso
  manual en todos los contextos), caja real de `.epoch` (2×32 px) para que
  las marcas sigan siendo medibles.
- Contrato de verificación automatizado (`_g19r3_shots.mjs`):
  `getBoundingClientRect` del lienzo en los cinco modos ±2 px y de cada
  control del player (`play/prev/year/next/rail/info`) entre Evolución y
  Fotos ±2 px — ambos PASS con diferencia 0 px.

## Rechazadas

- *Overlay de `.mapintro` solo en `Edificios`*: escondía el desfase en
  lugar de dar geometría común (rechazado por la adjudicación).
- *Dos players con CSS parecido*: dos componentes distintos siempre
  divergen; la diferencia vive solo en el track (snippet `marks`) y en los
  callbacks.
- *Fila vacía artificial*: el slot no es espacio muerto — cada modo
  declara qué capa muestra el mapa.
