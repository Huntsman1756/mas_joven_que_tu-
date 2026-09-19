# G3-D — Contexto actual condicional

Estado: **PREREGISTRADO** (congelado antes de implementación). Baseline:
G3-C `0d21407` en `g3c-historical-map` (push verificado: remoto = local).
Rama: `g3d-context-modules`.

Scope público:

- **RUIDO** — «¿Qué banda de ruido cartografía oficialmente este punto?»
- **MOVILIDAD** — «¿Qué transporte público conecta este entorno?»
- **MONTE PÚBLICO** — «¿Está este punto dentro de un monte público?»

Study-only en esta fase (NO implementación pública):

- ESPACIOS PROTEGIDOS via geoEuskadi → informe ADOPT/STUDY/REJECT
- DEMOGRAFÍA TEMPORAL via Eustat → informe ADOPT/STUDY/REJECT

Reserva explícita (no se implementa en G3-D):

- GARbigunes · SERVICIOS SOCIALES (candidatos ya auditados en G3-X para
  una fase posterior si el contexto resulta pobre)

Fuera de scope: rutas nuevas, selector de capas GIS, geolocalización,
telemetría de direcciones, snapshot-delta, prosa editorial final.

Principio de módulo: **no son tarjetas permanentes**. Un módulo aparece
solo cuando la fuente cubre el lugar seleccionado, la semántica es
defendible y la información responde una pregunta distinta. La pregunta
de producto es visible antes que el dato. Sin resultado con sentido →
se omite o se declara «sin resultado oficial», nunca tarjeta genérica.

---

## 1. Snapshot de fuentes (congelado)

Mismo patrón `data/manifests/` + `data/snapshots/` que G3-B. Recursos
exactos (WFS `geo.bizkaia.eus/arcgisserverinspire`, verificados a nivel
campo en G3-X `wfs_fields.json`):

- **N1.** `RuidoCarreteras:Ruido_dia` · `Ruido_tarde` · `Ruido_noche`
  (isófonas, dataset `mapas-de-ruido-de-las-carreteras-forales-de-bizkaia`)
- **N2.** `RuidoCarreteras:Receptores` — study del esquema; solo se
  congela si el volumen (49.868 puntos) es manejable como artefacto
  derivado por municipio. Si no, queda documentado como no usado.
- **M1.** `Bizkaibus:Geralekuak___Paradas` (2.376 paradas)
- **M2.** Trazados `Bizkaibus:*Sentido_de_*` — solo metadatos de
  capa; no se congelan geometrías de ruta (no hay mapa de rutas).
- **B1.** `MendiPublikoak_MontesPublicos:Baso_Publikoak___Montes_Públicos`
  (346 polígonos)

Cada snapshot: URL fuente, URL recurso, retrieved_at, metadatos de
publicación, licencia, sha256, CRS, esquema, feature count, limitaciones.
Runtime consume artefactos derivados first-party, no el WFS en vivo.

Regla CRS heredada congelada (G3-B): WFS 2.0 + `EPSG:4326` ⇒ bbox
lat,lon; toda consulta pasa por transform test explícito.

## 2. RUIDO — contrato de campos

Semántica congelada (a documentar en DATA_SEMANTICS §18):

- `Ruido_dia|tarde|noche`: polígonos isófonas del mapa estratégico de
  ruido de carreteras forales. `LEVEL_1`/`LEVEL_2` = banda en dB
  (interpretación exacta verificada sobre DescribeFeatureType/GetFeature
  real antes de publicar; si `LEVEL_*` resulta ser código interno, se
  congela el campo de banda real y se documenta).
- Periodos: Día / Tarde / Noche como dimensiones oficiales separadas —
  nunca se agregan ni se elige la «peor».

Copy seguro congelado: «El mapa estratégico de ruido sitúa este punto en
la banda oficial {range} dB para el periodo {día|tarde|noche}.»

Prohibido: «zona ruidosa» · «silencioso» · «insalubre» · «malo para
dormir» · «contaminación acústica alta» — salvo clasificación oficial
separada que lo sustente explícitamente. Sin interpretación sanitaria.

## 3. RUIDO — resolución espacial

PIP punto edificio → isófonas por periodo. Estados:

`MAPPED` · `NOT_MAPPED` · `MULTIPLE` · `SOURCE_UNAVAILABLE` ·
`INVALID_GEOMETRY`

- `MULTIPLE` (solape de isófonas contiguas por discreto): se listan
  todas las bandas, nunca se elige una en silencio.
- `NOT_MAPPED`: el punto cae fuera de la cobertura cartografiada. **No**
  significa 0 dB ni «sin ruido» — copy explícito.

## 4. MOVILIDAD — contrato + regla de distancia CONGELADA

Campos: `CodigoReducidoParada` (id oficial), `Denominacion`, geometría,
`CodificacionRuta` (lista oficial de líneas). Dirección/ida-vuelta solo
si la capa lo documenta; no se infiere.

**Regla congelada ANTES de inspeccionar ejemplos: `R = 400 m`,
`N = 5`** — distancia geodésica en elipsoide/proyección métrica
(EPSG:25830), no euclídea en 4326. Se persisten hasta 5 paradas con
`stop_id`, `stop_name`, `distance_m` (redondeado a metro), códigos de
ruta. Sin parada dentro de R → `NO_NEARBY_STOP`. **Prohibido expandir
el radio hasta obtener resultado.**

Justificación de R/N (congelada): 400 m ≈ 5 min a pie, umbral
habitual de cobertura de parada en estándares de transporte; 5 paradas
suficientes para responder «¿hay transporte aquí?» sin volcar listados.

Copy: «A menos de 400 m hay {n} paradas oficiales de Bizkaibus.» +
hasta 3 paradas visibles (resto en progressive disclosure). Sin
frecuencias, horarios, tiempos de viaje ni de paseo — esos datos no
existen en el contrato.

## 5. MONTE PÚBLICO — contrato

Campos verificados: `NombreMonte`, `Propietario`, `FechaDeslinde`,
`FechaAmojonamiento`, `FechaCatalogacion`, `UtilidadPublica`,
`Patrimonial`.

Estados PIP: `INSIDE` · `OUTSIDE` · `MULTIPLE` · `UNKNOWN`.

Copy: «Este punto se encuentra dentro del monte público que la fuente
oficial denomina «{NombreMonte}».» Fechas con nombre exacto:
«fecha de catalogación», «fecha de deslinde», «fecha de
amojonamiento». Fecha ausente → se omite o `fecha no consta`, nunca
inventada. Prohibido reinterpretar como fecha de creación/protección/edad.

**Regla dura de copy: monte público ≠ espacio natural protegido.**
Prohibido «protegido», «reserva», «parque natural», «conservación»
salvo que la fuente separada de espacios protegidos lo sustente.

## 6. Orquestación

Cada módulo se deriva independientemente del resto por building/lugar:

`planeamiento · actividad_economica · ruido · movilidad · monte_publico`
→ `AVAILABLE | NOT_MAPPED | OUTSIDE | NO_NEARBY_STOP | UNAVAILABLE | …`

Un fallo no suprime otro módulo. Sin «context score» combinado, sin
ranking de calidad del entorno.

UI: una sección editorial «TU ENTORNO, SEGÚN LOS DATOS OFICIALES» con
solo los bloques con evidencia. Orden sugerido: planeamiento,
actividad económica, ruido, movilidad, entorno natural — omitiendo
ausentes. Sin rejilla 3×3, sin icon-cards, sin checkboxes GIS.

## 7. Mapa

Texto suficiente sin mapa. Evidencia visual opt-in tras acción explícita
(«mostrar isófonas», «mostrar paradas», «mostrar polígono del monte»):
un overlay contextual activo como máximo, cámara preservada, nunca todas
las capas a la vez. Equivalente textual obligatorio.

## 8. Rendimiento

Artefactos por municipio (`context/<cod>.json` por `building_id` +
`context-geom/<cod>.json` solo para visual opt-in). Se miden bytes
crudos/gzip, latencia primer uso vs. caché, heap, requests — patrón
G3-B §9. Ningún módulo carga antes de llegar a profundidad contextual
salvo que su respuesta textual ya forme parte del payload ligero
municipal.

## 9. Privacidad

Todo el contexto se calcula desde el lugar explícitamente seleccionado.
Sin geolocalización, sin telemetría de dirección, sin persistencia de
búsquedas exactas.

## 10. Accesibilidad

Cada módulo: heading + resultado textual + fuente/fecha + nada de
información solo en color. Overlays con equivalente textual. Tests:
teclado, axe, 320 px, 400 %, reduced-motion, touch.

## 11. Corpus de validación (congelado por criterio, no por resultado)

Selección por criterio estructural **antes** de consultar resultados;
la resolución a building_id/punto se documenta en el corpus:

| Slot | Criterio |
|------|----------|
| V1 | Bilbao denso (municipio 048 — códigos INE del catálogo G1) |
| V2 | Gran Bilbao (municipio 013 Barakaldo o 015 Basauri) |
| V3 | Contexto industrial (caso `f4233` PETRONOR / `f4738` Puerto — ya congelados G2) |
| V4 | Municipio rural (municipio con menor densidad de edificios del catálogo) |
| V5 | Primer `building_id` del corpus con isófona Día (por orden de fid) |
| V6 | Primer `building_id` del corpus sin isófona (por orden de fid) |
| V7 | Punto con ≥3 paradas dentro de R (primer fid que cumpla, por orden) |
| V8 | Punto con 0 paradas dentro de R (primer fid rural, por orden) |
| V9 | Primer `building_id` dentro de monte público (por orden de fid) |
| V10 | Primer `building_id` fuera de todo monte (por orden de fid) |
| V11 | Los 5 casos G2 (`c2803`, `f4036`, `f4233`, `f4738`, `f149`) |

Los slots «primero por fid» son deterministas sobre el snapshot
congelado — no se elige el resultado, se elige el criterio.

## 12. Condiciones de cierre G3-D

| # | Condición |
|---|-----------|
| GD1 | Snapshots N1/(N2)/M1/B1 con manifest completo (sha256, retrieved_at, licencia, CRS, features) |
| GD2 | Contratos DATA_SEMANTICS §18 documentados (ruido LEVEL_*, paradas, monte fechas) con semántica de ausente |
| GD3 | R=400/N=5 congelados y respetados; sin expansión progresiva |
| GD4 | Estados explícitos por módulo; `MULTIPLE` nunca colapsado; `NOT_MAPPED ≠ 0 dB` |
| GD5 | Copy contracts: prohibidos ruido/monte verificados por copylint + revisión |
| GD6 | Módulos condicionales: solo con evidencia; sin tarjetas vacías; fallo aislado |
| GD7 | Corpus V1–V11 ejecutado y reportado con estados reales |
| GD8 | Estudio geoEuskadi ENP: ADOPT/STUDY/REJECT + evidencia (publisher, campos, CRS, cobertura, licencia) |
| GD9 | Estudio Eustat población: ADOPT/STUDY/REJECT + evidencia (serie, clave municipal, cobertura, licencia/API) |
| GD10 | Rendimiento: matriz bytes/latencia/heap por artefacto; nada carga antes de profundidad |
| GD11 | a11y: equivalente textual, axe 0, teclado, 320 px, 400 %, reduced-motion |
| GD12 | No-regresión: G3-C + G3-B + G3-A + G2-A/B + G1 budgets + check/lint/test/build + 3 motores + 320/400 |
| GD13 | Sin score combinado, sin ranking, sin capas simultáneas, sin geolocalización |

## 13. STOP

Antes de: implementación pública de espacios protegidos o Eustat;
garbigunes; servicios sociales; snapshot-delta; prosa final de historias.
