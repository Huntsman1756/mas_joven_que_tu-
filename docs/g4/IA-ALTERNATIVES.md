# G4-R · IA — tres arquitecturas completas + veredicto `.sheet`

Evalúa las tres opciones sobre el inventario real (21 elementos,
STATE_ATLAS) sin asumir la hipótesis de G4-DIRECTION.

## Forense `.sheet` (la pregunta explícita)

Todo lo que vive hoy dentro de la única `.sheet` (900 px, sombra,
`ResultView.svelte:150–167`), clasificado por naturaleza:

| Elemento | Naturaleza real | ¿Pertenece a «la ficha»? |
|----------|-----------------|--------------------------|
| h2 + DecadeDistribution | respuesta (contexto de la cifra) | sí — es ANSWER |
| OrthoControls | superficie visual opt-in | no — es EXPLORATION |
| HistMapControls | superficie visual opt-in | no — EXPLORATION |
| AddressSearch | profundidad personal | no — PERSONAL |
| CompareYear | profundidad personal | no — PERSONAL |
| Contrast | diagnóstico metodológico | no — METHODOLOGY/EDITORIAL |
| CellDetail | selección en mapa | no — EXPLORATION (efímero) |
| BuildingCard | ficha del punto | no — PERSONAL |
| PlanningContext | editorial futuro | no — EDITORIAL |
| ContextModules | entorno del punto | no — PERSONAL |
| caveat | contrato | sí — ANSWER |

**Veredicto `.sheet`: la hipótesis se confirma con matices.**
La sheet funcionó como «la ficha municipal» cuando contenía solo la
respuesta. Hoy mezcla 6 naturalezas → cada bloque se lee con el mismo
peso y el conjunto se percibe como «features apiladas» aunque mide solo
~1120 px. **No hay que eliminar la sheet: hay que reducirla a su
función original** — la respuesta (dist + caveat) — y sacar todo lo
demás a la secuencia editorial con sus propios ritmos. La evidencia:
los bloques opt-in dentro de la sheet miden 59–121 px cada uno — son
puertas disfrazadas de secciones, y como tales compiten entre sí.

## Arquitectura A — MAP-FIRST

```
topbar
headline (banda estrecha sobre el mapa)
┌────────── MAPA full-bleed (resto del viewport) ──────────┐
│  switch MAPA·TIEMPO·FOTO flotante · timeline dock        │
│  acciones de escena: foto / 1923-25 / comparar campañas  │
└──────────────────────────────────────────────────────────┘
«tu lugar concreto» → MI EDIFICIO / DOS AÑOS (sección única)
«qué sabemos» → distribución + cobertura + contraste
«qué está previsto / alrededor» → planning + contexto
historias → índice + capítulo
```

- Claridad: máxima en el primer tramo; el mapa nunca compite.
- Primera recompensa: instantánea (patrón visible al cargar).
- Densidad de interacción: concentrada en la escena — las acciones de
  superficie (foto, histórico) dejan de ser «secciones» y pasan a ser
  **acciones sobre la escena**, donde pertenecen.
- Mapa: protagonista absoluto. Profundidad personal: agrupada en una
  sección, no dispersa.
- Historias: al final — llegada natural.
- Móvil: ~4 viewports; el mapa sticky no funciona bien en 390 (dedos).
- Complejidad de implementación: **media-alta** (mover controles al
  mapa, dock del timeline).
- Riesgo: ocultar demasiado tras la escena — el usuario puede no hacer
  scroll nunca. Mitigación: una sola línea de invitación visible bajo
  el mapa («¿Quieres bajar hasta tu calle?»).

## Arquitectura B — EDITORIAL-SCROLL

```
capítulo 0: titular + cifra + mapa (respuesta)
capítulo 1: ¿dónde? — mapa grande + celdas
capítulo 2: ¿cuándo? — timeline/distro compartiendo banda
capítulo 3: ¿desde el aire? — foto/campañas + histórico unificados
capítulo 4: ¿tu edificio? — address → ficha → entorno
capítulo 5: ¿y si cambio el año? — compare
capítulo 6: ¿qué está previsto? — planning
capítulo 7: otro caso — historias + Descúbreme
metodología / fuentes
```

- Claridad: cada tramo responde una pregunta — la estructura es
  autoexplicativa (pregunta = título del tramo).
- Primera recompensa: buena, pero el mapa llega tras el capítulo 0.
- Densidad: una acción por tramo — cumple la regla móvil por diseño.
- Mapa: reaparece como evidencia por capítulo — riesgo de «¿otro mapa?».
  Mitigación: es el MISMO mapa, reposicionado (escena persistente).
- Móvil: ~6 viewports — más largo pero más legible.
- Implementación: **media** — reordena componentes existentes, añade
  encabezados-pregunta.
- Riesgo: que los capítulos se conviertan en el catálogo que intentamos
  evitar. La disciplina: cada capítulo tiene una sola acción.

## Arquitectura C — HÍBRIDA (mapa-ancla + tramos de lectura)

```
topbar · headline completo (la respuesta es texto, no tramo)
MAPA full-width + ViewSwitch + timeline integrado bajo el mapa
   (las superficies — foto, 1923-25 — son modos de ESTA escena)
tramo de lectura estrecho: «la forma del parque» (dist + contraste
   como lectura, no módulos)
tramo de acción: «baja a tu calle» (address+compare juntos)
tramo editorial: «qué está previsto» + historias + Descúbreme
footer
```

- Claridad: buena — el mapa manda, la lectura explica, la acción invita.
- Recompensa: inmediata (headline+mapa como hoy, ya funciona).
- Mapa: único, con modos de escena (MAPA/FOTO/1923-25/comp) — unifica
  los 3 caminos a ortofoto en un solo contrato.
- Profundidad: un solo tramo de acción con dos invitaciones.
- Historias: tramo editorial al final.
- Móvil: ~4–4,5 viewports.
- Implementación: **media-baja** — la mayor parte es reordenar +
  unificar entradas de superficie; el `.sheet` sobrevive reducido al
  tramo de lectura.
- Riesgo: híbrido = compromiso; puede no llegar a la claridad de A.

## Evaluación comparada

| Criterio | A MAP-FIRST | B EDITORIAL | C HÍBRIDA |
|----------|-------------|-------------|-----------|
| Claridad primer contacto | 9 | 8 | 8 |
| Primera recompensa | 10 | 8 | 9 |
| Mapa protagonista | 10 | 7 | 9 |
| Profundidad personal | 7 | 8 | 8 |
| Integración historias | 7 | 9 | 8 |
| Integración contexto | 7 | 8 | 8 |
| Longitud móvil | 8 | 6 | 8 |
| Una acción/viewport | 8 | 10 | 9 |
| Complejidad impl. | 5 | 7 | 8 |
| Conserva lo probado | 5 | 7 | 9 |
| **Total** | **78** | **78** | **84** |

## Recomendación: **C — HÍBRIDA**, con una deuda de A

El híbrido conserva lo que ya funciona (headline→mapa→timeline es el
mejor primer minuto del producto, verificado en atlas) y ataca el
problema real: la sheet sobredimensionada y los tres caminos a la
ortofoto. De A se importa la idea clave — **las superficies visuales
(foto, 1923-25, comparador) son modos de la escena del mapa, no
secciones de una tarjeta** — sin pagar el coste de mover controles al
canvas. B se descarta como arquitectura total: 8 capítulos = catálogo
de nuevo; se conserva solo su regla de «una acción por tramo».

### Contrato de escena resultante (para G4)
- Escena = el mapa. Sus modos: MAPA · TIEMPO · FOTO · 1923-25.
- Un solo opt-in de evidencia por modo; cero botones de superficie
  fuera del bloque de escena.
- El timeline es parte de la escena (bajo el mapa), no una sección.
- La sheet queda reducida a: distribución + caveat + cálculo (la
  respuesta municipal). Opcional: se convierte en «tramo de lectura»
  sin contenedor — evaluar en implementación.
- Todo lo personal vive en un único tramo «tu lugar concreto»:
  address → ficha → entorno; compare como segunda invitación.
- Planning municipal + historias + Descúbreme = tramo editorial final.
