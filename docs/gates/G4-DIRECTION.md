# G4 — PRODUCT CUT · dirección y pre-diseño (congelado)

Estado: **DISEÑO CONGELADO — sin implementación** (2026-09-19).
Baseline documental: `f869de0` en `g3d-context-modules`.
**PERF4 sigue BLOCKED** (`PERF4-CALIBRATION.md`): este documento no
autoriza ningún cambio de producto ni de bundle hasta la adjudicación
calibrada. El gate G4 final NO queda congelado aquí — esto es dirección
e inventario, no criterios de aceptación definitivos.

---

## A. Inventario del producto actual (`/`)

Fases: `intro` (Hero) → `result` (ResultView). Todo lo que sigue vive en
`result`. Estructura real en `ResultView.svelte`: topbar → headline →
ViewSwitch → [Timeline si time] → mapband(MapView) → Timeline →
[PhotoPanel si photo] → `.below > .sheet` (un único contenedor blanco
900 px con toda la profundidad) → footer.

| # | Elemento | Pregunta que responde | Visibilidad | Prerequisito | Fuente | Coste interacción | Huella vertical | Móvil | ¿Merece L1? | ¿Valor de retorno? |
|---|----------|----------------------|-------------|--------------|--------|-------------------|-----------------|-------|-------------|--------------------|
| 1 | Hero (año+lugar) | ¿Qué parte de la Bizkaia actual es posterior a mí? | intro | — | catalog + metrics | 2 campos + CTA | ~1 viewport | OK | n/a (intro) | — |
| 2 | Topbar + cambiar + share | ¿puedo cambiar / compartir? | siempre | result | — | 1 clic | 44 px | OK | sí (sutil) | compartir = retorno |
| 3 | Headline + lead + coverage | la respuesta personalizada | siempre | year+place | metrics municipal | 0 | ~160 px | OK | **sí — es el producto** | núcleo |
| 4 | `details.calc` + área | ¿cómo se calculó? | plegado | result | metrics | 1 clic | ~30 px | OK | no | rigor |
| 5 | ViewSwitch MAPA·TIEMPO·FOTO | ¿cómo lo miro? | siempre | place | — | 1 clic | ~44 px | OK | sí (descubrible) | re-play |
| 6 | MapView (celdas/edificios) | ¿dónde? | siempre | place | cells/buildings pmtiles | pan/zoom/tap | 52–58 svh | OK | **sí — es la evidencia** | explorar |
| 7 | Timeline (play/scrub/marcas) | ¿cómo crece en el tiempo? | siempre | result | metrics + campañas | play/drag | ~70 px | OK | L2 — invita sin explicar | alto (re-play) |
| 8 | PhotoPanel (modo FOTO) | ¿cómo era desde el aire? | condicional | mode=photo | ortofoto campañas | nav campañas + compare | ~viewport | OK | no (opt-in por vista) | comparar |
| 9 | Tooltip/inspect celda | ¿y esta zona concreta? | bajo demanda | mapa | cells | hover/tap | overlay | OK | no | micro-exploración |
| 10 | DecadeDistribution | ¿qué forma tiene el parque? | siempre en sheet | place | metrics | 0 | ~180 px | OK | dudoso — ver §J | contexto |
| 11 | OrthoControls | ¿ver foto sobre el mapa? | opt-in | place (no photo) | ortofoto | 1 clic | ~60 px | OK | no | otra mirada |
| 12 | HistMapControls | ¿y en 1923–25? | opt-in | place | cartografía histórica | 1 clic | ~60 px | OK | no | profundidad temporal |
| 13 | AddressSearch (MI EDIFICIO) | ¿mi edificio concreto? | opt-in (disclosure) | place | NORA + catastro + tiles | buscar dirección | colapsado ~60 px; abierto variable | OK | no (L3) | **el más personal** |
| 14 | CompareYear (DOS AÑOS) | ¿respecto a otro año? | opt-in | place | metrics | 1 input | ~60 px | OK | no | comparar |
| 15 | Contrast (edificios vs huella) | ¿cuánto vs cuántos? | siempre en sheet | place | metrics | 0 | ~120 px | OK | **no — candidato a degradar** | bajo |
| 16 | CellDetail | datos de la celda | condicional | celda seleccionada | cells | tap en mapa | ~100 px | OK | no | micro-detalle |
| 17 | BuildingCard | ficha del edificio | condicional | edificio seleccionado | catastro tiles | tap/búsqueda | ~120 px | OK | no | ficha |
| 18 | PlanningContext | ¿qué está previsto? | municipal siempre + local condicional | place / edificio | planeamiento | 0 / overlay opt-in | ~250 px | OK | no (L3) | futuro del lugar |
| 19 | ContextModules (ruido/paradas/monte) | ¿cómo es este entorno? | condicional por módulo | edificio resuelto | contexto snapshot | overlays opt-in | ~200–400 px | OK | no (L3) | entorno |
| 20 | Caveat «parque actual» | qué no sabemos | siempre | result | — | 0 | ~40 px | OK | sí (contrato) | honestidad |
| 21 | Footer + metodología | fuentes/código/snapshot | siempre | result | — | 0 | ~80 px | OK | no | confianza |

**Diagnóstico del inventario:** 21 elementos, 11 dentro de una única
`.sheet`. La sheet empezó como «ficha municipal» en G1 y hoy contiene
cuatro naturalezas distintas: estadística municipal (dist), superficies
visuales opt-in (ortho, histmap), profundidad personal (address,
compare, cell, building) y contexto de datos (planning, AE, ruido,
movilidad, monte). Esa mezcla es el problema arquitectónico real — no
la cantidad de features.

## B. Jerarquía L1–L4 (congelada)

**L1 — RECOMPENSA INMEDIATA (0–10 s):**
headline personalizado + mapa con el patrón ya visible. Nada más compite
en el primer viewport. Regla: ninguna feature entra en L1 por ser
técnicamente impresionante.

**L2 — EXPLORACIÓN (invita sin explicar):**
ViewSwitch (MAPA·TIEMPO·FOTO), Timeline/play, tooltips de celda,
ortofoto y mapa histórico como acciones opt-in sobre la escena.

**L3 — PROFUNDIDAD PERSONAL (lo que el usuario pide):**
MI EDIFICIO (búsqueda exacta + ficha + contexto local de planeamiento +
módulos de entorno), DOS AÑOS, detalle de celda, `details.calc`.

**L4 — DESCUBRIMIENTO EDITORIAL (razones para volver):**
las cinco historias, «Descúbreme un cambio», metodología, planning
municipal (¿qué está previsto?) — editorial porque habla del futuro del
lugar, no del pasado del usuario.

Asignaciones discutibles resueltas: **DecadeDistribution** baja de L1 a
L2 (contexto de la cifra, no la cifra). **Contrast** baja a L4
(diagnóstico metodológico, no pregunta de usuario). **Planning
municipal** se queda en L4 por ser «futuro», pero su contexto local por
edificio es L3.

## C. Journey canónico primera sesión (congelado)

```
año + lugar
  → respuesta personalizada (L1: headline + mapa ya coloreado)
  → ¿dónde? (mapa — pan/zoom/tooltip, L2)
  → ¿cuándo? (TIEMPO/play — la forma del crecimiento, L2)
  → ¿desde el aire? (FOTO/ortofoto — la prueba visual, L2)
  → [opcional] mi edificio exacto (L3: dirección → ficha → entorno)
  → [opcional] otro año (L3: DOS AÑOS)
  → [opcional] qué está previsto / qué hay alrededor (L3/L4)
  → descubrir otro caso (L4: «Descúbreme un cambio» → historia)
```

Objetivo: un usuario nuevo entiende el producto sin abrir metodología.
Cada nivel ofrece **una** acción siguiente evidente, nunca un menú.

## D. Matriz de progressive disclosure (congelada)

| Feature | Clase | Justificación |
|---------|-------|---------------|
| Headline + cobertura | DEFAULT_VISIBLE | la respuesta — sin ella no hay producto |
| Mapa + capas base | DEFAULT_VISIBLE | la evidencia espacial de la respuesta |
| Caveat «parque actual» | DEFAULT_VISIBLE | contrato semántico, siempre presente |
| Timeline/play | DISCOVERABLE | invita por sí mismo, no exige explicación |
| ViewSwitch | DISCOVERABLE | tres miradas, una etiqueta |
| Tooltips celda | DISCOVERABLE | aparece al explorar |
| Ortofoto (FOTO + OrthoControls) | DISCOVERABLE→USER_REQUESTED | opt-in; dos puntos de entrada a unificar (§M) |
| Mapa histórico 1923–25 | USER_REQUESTED | opt-in explícito, carga bajo demanda |
| DecadeDistribution | DEFAULT_VISIBLE (revisar §J) | contexto de la cifra; puede plegarse en móvil |
| `details.calc` | USER_REQUESTED | ya plegado, correcto |
| MI EDIFICIO (AddressSearch) | USER_REQUESTED | disclosure por botón, nunca abierto por defecto |
| DOS AÑOS | USER_REQUESTED | acción explícita |
| CellDetail / BuildingCard | CONTEXT_CONDITIONAL | solo con selección real |
| Planning municipal | DEFAULT_VISIBLE en L4 (edición) | una cifra editorial, no bloque de datos |
| Planning local + AE | CONTEXT_CONDITIONAL | solo con edificio resuelto |
| Ruido / movilidad / monte | CONTEXT_CONDITIONAL | ya implementado así — modelo a extender |
| Historias + Descúbreme | DISCOVERABLE en L4 | entrada editorial, no dashboard |
| Metodología | USER_REQUESTED | enlace footer, correcto |

## E. Modelo de valor de retorno (congelado)

El producto no es de noticias: no hay engagement diario. Las razones de
re-interacción, en orden de fortaleza:

1. **Otro lugar** — cambiar municipio reejecuta la pregunta personal
   (misma sesión, cero fricción).
2. **Mi edificio** — la dirección exacta convierte estadística en biografía.
3. **Otro año / DOS AÑOS** — la comparación es una pregunta nueva con los
   mismos datos.
4. **«Descúbreme un cambio»** — un caso editorial ya configurado.
5. **Cinco historias** — capítulos cortos que enseñan a leer el mapa.
6. **Segundo snapshot** (futuro) — «qué cambió en los datos» cuando exista;
   reservado, no prometido.

Compartir una vista concreta (URL con estado completo) es el vector de
retorno externo: cada `story=`/`building=` compartido es una entrada
directa a L3/L4.

## F. «Descúbreme un cambio» — concepto (congelado, sin implementar)

- **Estado determinista y compartible:** `?story=<id>` con
  `id ∈ {f149, f4036, c2803, f4233, f4738}`. Sin aleatoriedad sin estado:
  el botón elige el siguiente caso del corpus congelado (rotación
  determinista) o uno distinto al mostrado; la URL siempre refleja el caso.
- **Sin ruta nueva:** la historia vive en `/` como estado del resultado.
- **Acción:** clic → `place` + `year` + `view` (cámara sobre la celda/
  componente) + modo sugerido por la historia → sección editorial del caso
  visible en L4 + mapa ya configurado.
- **Presentación:** capítulo compacto (§G), no overlay modal — el mapa
  sigue siendo el protagonista; la prosa lo acompaña.
- **Salida:** «volver a mi Bizkaia» restaura año+lugar del usuario (el
  estado personal nunca se pierde por explorar una historia).

## G. Cinco historias — modelo de integración (congelado)

Corpus congelado (`evidence/g2/editorial-desk/candidates.json`, SELECT):

| id | Municipio | Señal editorial |
|----|-----------|-----------------|
| c2803 | Portugalete | componente multi-celda 1960s, singularidad territorial |
| f4036 | Mungia | divergencia c05/c08 fuerte (0,84) |
| f4233 | Muskiz | patrón temporal 1970s (51 edificios) |
| f4738 | Santurtzi | divergencia c05/c08 (0,84), década 1990 |
| f149 | Abanto Zierbena | caso límite 2000s, cobertura 100 % |

Cada historia es un **capítulo editorial compacto**, no un artículo:

```
01 / PORTUGALETE
Qué vemos        — 2–3 líneas: la señal concreta (dato real, no prosa)
El dato          — 1–2 cifras grandes con su denominador
Muévelo          — timeline precargado en el año clave (acción)
Míralo desde el aire — campaña ortofoto que prueba el cambio (opt-in)
Qué sabemos / qué no sabemos — 1–2 líneas de límites (parque actual ≠
                   parque histórico; fuente)
```

- Longitud objetivo: ~1–1,5 viewport por capítulo en móvil; ~2/3 en
  escritorio. Menos que un scroll «largo».
- Las cinco NO se muestran en cadena: se accede a **una** por
  «Descúbreme un cambio» o desde un índice mínimo («5 lugares donde el
  dato cuenta algo») al final del journey — índice = 5 líneas de texto,
  no tarjetas.
- Interacción real: cada capítulo reconfigura mapa/timeline/foto — la
  historia se *manipula*, no solo se lee.
- Prosa final fuera de scope de este documento.

## H. Wireflow escritorio (1440×900)

```
┌──────────────────────────────────────────────────────────┐
│ MÁS JOVEN QUE TÚ            [Cambiar año o lugar] [↗]      │ topbar
├──────────────────────────────────────────────────────────┤
│ En <Lugar>, el <NN %> del parque actual es posterior       │
│ a <año>.                    (cobertura · cálculo▸ · área)  │ L1 texto
├──────────────────────────────────────────────────────────┤
│ MAPA · TIEMPO · FOTO                                       │ L2 switch
│ ┌──────────────────────────────────────────────────────┐ │
│ │                                                      │ │
│ │              MAPA (patrón ya visible)                │ │ L1/L2
│ │              tooltips · selección de celda           │ │
│ └──────────────────────────────────────────────────────┘ │
│ ▶ timeline ············ 1956·1977·…·2024                   │ L2 eje
├──────────────────────────────────────────────────────────┤
│ ¿Y TU LUGAR CONCRETO?                                      │
│ [Bajar hasta tu calle ▸]      → MI EDIFICIO (L3)           │
│ [Comparar con otro año ▸]     → DOS AÑOS (L3)              │
├──────────────────────────────────────────────────────────┤
│ DISTRIBUCIÓN / superficies opt-in (ortofoto · 1923–25)     │ L2 bajo
│                                                           │ demanda
├──────────────────────────────────────────────────────────┤
│ ¿QUÉ ESTÁ PREVISTO?  (planning municipal, 2–3 cifras)      │ L4
├──────────────────────────────────────────────────────────┤
│ «Descúbreme un cambio»  →  capítulo de historia            │ L4
│ 5 lugares donde el dato cuenta algo  (índice de 5 líneas)  │
├──────────────────────────────────────────────────────────┤
│ fuentes · código · snapshot · cómo lo sabemos              │ footer
└──────────────────────────────────────────────────────────┘
```

Con edificio resuelto, la ficha + contexto local + entorno aparecen
**dentro del tramo L3**, junto a la acción que los creó — no al final de
la página.

## I. Wireflow móvil (390×844)

```
┌────────────────────┐  viewport 1: headline + acción de cambio.
│ headline           │  El mapa asoma parcialmente (scroll affordance).
│ lead + cobertura   │
│ MAPA·TIEMPO·FOTO   │  viewport 2: mapa ~52svh + timeline debajo.
├────────────────────┤  El usuario ya tiene respuesta sin tocar nada.
│ MAPA               │
│ (52svh)            │  viewport 3: UNA invitación («bajar hasta tu
├────────────────────┤  calle»), no una lista de controles.
│ ▶ timeline         │
├────────────────────┤  scroll: distribución → opt-ins → planning →
│ [Bajar a tu calle] │  historias → footer. Cada bloque ocupa
├────────────────────┤  ≤1 viewport y tiene una sola acción evidente.
│ (siguiente bloque) │
└────────────────────┘
```

Regla móvil: **ningún viewport puede contener más de una acción
primaria**. La `.sheet` actual con 11 bloques encadenados se convierte
en una secuencia editorial donde cada tramo respira.

## J. Ritmo visual (recomendación, no implementación)

El producto alterna tres anchos, como un atlas editado:

| Momento | Ancho | Contenido |
|---------|-------|-----------|
| Mapa | full-bleed (con bandas) | escena principal, siempre protagonista |
| Lectura | ~65–70 ch (~600–720 px) | headline, preguntas, contexto, historias |
| Cifra | ancho intermedio | números grandes aislados (share, viviendas, ha) |

**Pregunta explícita sobre `.sheet` (a evaluar en G4, no decidido):**
la sheet blanca 900 px con sombra funcionó cuando era «la ficha» bajo el
mapa. Hoy mezcla cuatro naturalezas (§A). Hipótesis de diseño: **la
sheet debería terminar** — el resultado municipal deja de ser «una tarjeta
sobre el mapa» y la página pasa a ser una secuencia editorial: headline
(full-width), mapa (full-width), tramos de lectura estrechos, momentos de
cifra, momentos de comparación foto/mapa. La sheet podría sobrevivir solo
como «la respuesta» (headline+cobertura), con todo lo demás fuera.

**Momentos a diseñar como ritmo, no como componentes:**
- full-width: mapa, modo FOTO, comparación ortofoto, histórico 1923–25.
- lectura estrecha: cada pregunta de módulo (ya diseñado así en G3-D —
  extender el patrón).
- número grande: share del headline, cifras de planning, «El dato» de
  cada historia.
- silencio: caveat, «qué no sabemos», proveniencia — sin bordes ni
  fondos de aviso salvo el caso low-coverage real.

## K. Fronteras lazy candidatas (solo documento — input de remediación PERF4)

Nada de esto se implementa antes de la calibración. Estimación sobre el
bundle actual (`build_js_raw` = 1 345 861 B; mega-chunk ~1,07 MB con
MapLibre):

| Candidato | ¿Eager hoy? | ¿Necesario antes de `t_result_ready`? | ¿Frontera lazy segura? | Coste UX del chunk |
|-----------|-------------|--------------------------------------|------------------------|--------------------|
| AddressSearch + NORA/identidad | sí (import estático) | **no** — solo al abrir MI EDIFICIO | sí — dynamic import al primer clic | esqueleto del disclosure (~100 ms) |
| PlanningContext + ContextModules + loaders planning/context | sí | **no** — solo con `selectedBuilding` | sí — import condicionado a edificio | «cargando contexto» breve |
| HistMapControls + dominio histmap | sí | no — opt-in | sí — al primer «ver 1923–25» | ya hay estado «Cargando…» |
| PhotoPanel (modo FOTO) | sí | no — solo `mode=photo` | sí — al activar FOTO | transición con placeholder |
| Historias/Descúbreme | no existe aún | no | diseñarlo lazy desde el inicio | n/a |
| CompareYear | sí | no | sí — al activar DOS AÑOS | mínimo |
| Contrast / CellDetail / BuildingCard | sí | no (condicionales) | evaluable con el resto | mínimo |
| MapView / Timeline / DecadeDistribution / headline | sí | **sí — son L1/L2** | **no tocar** | — |

Estimación de recuperación: la profundidad L3/L4 suma del orden de
decenas de KB raw (componentes + dominio + loaders). Suficiente para
explicar el exceso medido (+13 KB atribuible a G3-D, ~+71 KB acumulado
desde baseline) **solo si** la sesión calibrada demuestra regresión real.

## L. Criterios de aceptación G4 (borrador — NO congelado)

- Comprensión en primer viewport: la respuesta personalizada se entiende
  sin scroll ni metodología.
- Cada nivel de profundidad ofrece una única acción siguiente evidente.
- Cero patrones de dashboard (§M reglas).
- Cinco historias integradas como capítulos, no artículos.
- «Descúbreme un cambio» con estado `story=` determinista/compartible.
- Sin rutas nuevas; URL completa sigue siendo el contrato de compartir.
- Matriz de disclosure respetada (§D): nada L3/L4 visible sin causa.
- Móvil: máx. una acción primaria por viewport; sin «wall of controls».
- Teclado/axe/320/400/reduced-motion como en gates anteriores.
- Sin regresión G1/G2/G3; PERF4 resuelto por el protocolo calibrado.
- Revisión visual humana (el gate exige ojo, no solo sonda).

El baseline del gate G4 final se fija **tras** la adjudicación PERF4.

## M. Candidatos a eliminar/degradar (propuesta congelada para evaluar)

1. **Unificar los tres puntos de entrada a la ortofoto** (marcas de
   campaña en Timeline + OrthoControls + modo FOTO): tres caminos a la
   misma evidencia es redundancia percibida, no riqueza. Evaluar un
   único contrato de acceso.
2. **Contrast (edificios vs huella)**: bajar de posición por defecto a
   contexto metodológico/historia — responde una pregunta técnica que el
   usuario no formula.
3. **DecadeDistribution**: mantener visible pero plegable en móvil; es
   contexto de la cifra, no la cifra.
4. **Cambiar año/lugar**: el formulario ya plegado es correcto; no tocar.
5. **Nada se elimina todavía**: la lista es evaluación de jerarquía, no
   borrado de features — la decisión final es del gate G4 con evidencia
   visual.

## N. Reglas «no dashboard» (congeladas)

Prohibido en `/`:

- catálogo de tarjetas apiladas o grid 3×N de features;
- menú permanente de capas/fuentes;
- acordeón con módulos no relacionados;
- centro de control tipo SaaS;
- sección «más datos»;
- más de una acción primaria por viewport (móvil) o por tramo
  (escritorio).

La página se lee como **secuencia editorial**: pregunta → evidencia →
siguiente pregunta. El mapa es el protagonista; el texto acompaña.

## N'. Ficheros creados por esta fase

- `docs/gates/G4-DIRECTION.md` (este documento).

STOP — sin implementación de producto, sin congelar gate G4, a la espera
de la adjudicación calibrada de PERF4.
