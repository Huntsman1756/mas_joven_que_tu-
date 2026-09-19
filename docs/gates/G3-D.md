# G3-D — Contexto actual condicional

Estado: **PREREGISTRADO** (congelado antes de implementación). Baseline:
G3-C `0d21407` en `g3c-historical-map` (pusheado a origin). Rama:
`g3d-context-modules`.

Alcance público: **RUIDO**, **MOVILIDAD** (Bizkaibus), **MONTE PÚBLICO**.
Estudio sin implementación: geoEuskadi espacios protegidos, Eustat población.
Reserva (no público): garbigunes, servicios sociales.

Fuera de scope: rutas nuevas, selector de capas GIS, dashboard, score de
entorno, ranking de calidad de barrio, horarios/frecuencias/tiempos.

---

## 1. Principio — módulos de evidencia condicional

Un módulo aparece solo cuando: la fuente cubre el lugar seleccionado, la
semántica está documentada y la información responde una pregunta distinta.
La **pregunta va antes que el dato** en la UI.

- RUIDO: «¿Qué banda de ruido cartografía oficialmente este punto?»
- MOVILIDAD: «¿Qué transporte público conecta este entorno?»
- MONTE PÚBLICO: «¿Está este punto dentro de un monte público?»

Sin resultado significativo → se omite o se declara «sin coincidencia
oficial»; nunca una tarjeta genérica fabricada.

## 2. Snapshots (congelados antes de implementar)

Por fuente ADOPT: URL, resource URL, retrieved_at, modified/published,
licencia, sha256, CRS, esquema, feature count, limitaciones — mismo patrón
que `planning_20260918`. Runtime sobre artefactos derivados first-party
(facets por `building_id` / municipio), sin dependencia viva para los hechos
de texto.

- **RUIDO**: WFS `RuidoCarreteras` — `Ruido_dia`, `Ruido_tarde`,
  `Ruido_noche` (isófonas) + `Receptores` (49.868 puntos).
- **MOVILIDAD**: WFS `Bizkaibus` — `Geralekuak___Paradas` (2.376) +
  trazados ida/vuelta solo si aportan una pregunta.
- **MONTE**: WFS `MendiPublikoak_MontesPublicos` —
  `Baso_Publikoak___Montes_Públicos` (346).

## 3. RUIDO — contrato de campos (a verificar en snapshot)

| Campo | Semántica propuesta (congelar tras inspección) |
|-------|--------------------------------------------------|
| `LEVEL_1`/`LEVEL_2` | límite inferior/superior de la banda isofónica en dB |
| `TIPO` | periodo: `D` día, `T` tarde, `N` noche |
| `Receptores.Dia/Tarde/Noche` | nivel estimado en dB en el punto receptor |
| `Receptores.FLOOR` | planta del receptor (GF…); no se mezcla con la isófona |

Estados: `MAPPED`, `NOT_MAPPED`, `MULTIPLE`, `SOURCE_UNAVAILABLE`,
`INVALID_GEOMETRY`. Prohibido elegir «el peor» valor en silencio; se
preservan los tres periodos.

Copy contract RUIDO:

- Permitido: «El mapa estratégico de ruido sitúa este punto en la banda
  oficial {a–b} dB para el periodo {día/tarde/noche}.»
- Prohibido: «zona ruidosa», «silencioso», «insalubre», «malo para dormir»,
  «contaminación acústica alta», cualquier interpretación de salud — salvo
  clasificación oficial separada y documentada.
- Fuera de cobertura → `NOT_MAPPED`, nunca «0 dB» ni «sin ruido».

## 4. MOVILIDAD — regla espacial congelada

**R = 500 m, N = 5** (elegido antes de inspeccionar ejemplos):
distancia euclídea en EPSG:25830 desde el punto representativo del edificio/
lugar a la parada; se persisten `distance_m`, `stop_id`, `stop_name`,
códigos de ruta de `CodificacionRuta`.

- Sin parada dentro del radio → `NO_NEARBY_STOP`; prohibido expandir el
  radio hasta encontrar una.
- Presentación: «A menos de 500 m hay {n} paradas oficiales de Bizkaibus.»
  + las más próximas con sus códigos; lista completa bajo disclosure.
- Prohibido: horario, frecuencia, duración de viaje, tiempo a pie — salvo
  datos separados y contractados.

## 5. MONTE PÚBLICO — contrato

PIP sobre `Montes_Públicos` (346). Estados: `INSIDE`, `OUTSIDE`,
`MULTIPLE`, `UNKNOWN`.

- Permitido: «Este punto se encuentra dentro del monte público que la fuente
  oficial denomina «{NombreMonte}».» + fechas con su nombre exacto
  («fecha de catalogación», «fecha de deslinde», «fecha de amojonamiento»),
  solo cuando el campo existe; ausente se omite.
- Prohibido: reinterpretar fechas como «creación», «protección», «edad del
  bosque». **monte público ≠ espacio natural protegido**: prohibido
  «protegido», «reserva», «parque natural», «conservación».

## 6. Estudios (sin implementación pública)

- **geoEuskadi espacios protegidos**: verificar editor oficial, campos de
  categoría legal, geometría, CRS, cobertura, actualización, licencia,
  identificadores estables. Recomendación ADOPT/STUDY/REJECT.
- **Eustat población municipal**: clave municipal compatible, cobertura
  anual, primer/último año, revisiones, unidades, licencia, método de
  descarga. Sin correlación ni causalidad.

## 7. Orquestación

Los módulos se derivan de forma independiente por edificio/lugar; un fallo
no suprime a otro. Sin «context score» combinado ni ranking de barrio.

UI: una sección editorial «Tu entorno, según los datos oficiales» con
bloques disponibles solamente (orden sugerido: planeamiento, AE, ruido,
movilidad, entorno natural). Sin rejilla, sin iconos, sin checkboxes.
Overlay de mapa: opt-in, uno a la vez, cámara preservada, equivalente
textual obligatorio.

## 8. Criterios de aceptación

- **GD1.** Gate preregistrado + commit antes de implementar.
- **GD2.** Snapshots de las 3 fuentes con manifest completo.
- **GD3.** Contratos de campos en `DATA_SEMANTICS.md` (ruido, movilidad,
  monte).
- **GD4.** R = 500 m / N = 5 aplicado y persistido; `NO_NEARBY_STOP`
  explícito.
- **GD5.** Estados explícitos por módulo; orquestación independiente
  (matriz en reporte).
- **GD6.** Copy contract cumplido (ruido sin juicio, monte ≠ protegido,
  movilidad sin horarios).
- **GD7.** Estudios geoEuskadi + Eustat con recomendación.
- **GD8.** Perf por módulo: bytes crudos/comprimidos, primer/caché, heap,
  requests. Sin carga antes de la profundidad contextual.
- **GD9.** a11y: heading+texto+fuente por módulo, equivalente textual del
  overlay, axe, teclado, 320 px, 400 %, reduced-motion.
- **GD10.** Corpus de validación congelado antes del ajuste.
- **GD11.** No-regresión: G3-C/B/A, G2-A/B, G1, check/lint/format/tests/
  build, 3 motores, 320/400.
- **GD12.** Reporte `evidence/g3/g3d/REPORT.md` A–Q + veredicto.

STOP antes de: implementación pública de espacios protegidos y Eustat,
garbigunes, servicios sociales, deltas de snapshot, prosa de historias.
