# ADR-014 — PIP de planeamiento precalculado frente a geometría en runtime

- **Estado:** aceptado
- **Fecha:** 2026-09-18

## Contexto

G3-B necesita responder «¿qué planificación oficial consta alrededor de este
lugar?» para un punto/edificio resuelto por MI EDIFICIO, y «¿este caso coincide
con un espacio oficial de actividad económica?» para los casos editoriales.

Las capas oficiales de planeamiento pesan ~800 MB en GeoJSON crudo
(`clasif_no_urbanizable`: 41 415 features / 365 MB). El WFS tampoco es viable
para descarga por servicio: `resultType=hits` de esa capa tarda >200 s y las
peticiones de página se agotan. Se necesita una forma demand-driven.

Opciones medidas (`data/qa/g3b_planning.json`, tamaños por municipio):

- **GeoJSON por municipio en runtime:** Bilbao ≈ 13 MB, rural hasta ~70 MB.
  Inviable incluso con carga perezosa.
- **Simplificación de geometrías:** reduce tamaño pero introduce error de
  borde en el PIP — inaceptable para un contexto que afirma «este punto cae
  dentro de X».
- **PIP precalculado en pipeline:** intersección huella∩capa con la geometría
  oficial completa en pipeline; el artefacto por municipio solo guarda el
  resultado por `building_id` (clasificación dominante + share, usos, ámbitos,
  espacios AE).

## Decisión

**Precalcular el PIP en pipeline** (`pipeline/g3b_build_artifacts.py`) sobre el
snapshot congelado `planning_20260918` y servir artefactos pequeños:

- `planning-muni.json` — tabla municipal completa (P-01…P-06, 112 filas).
- `planning/<cod>.json` — facets por `building_id` (máx 610 KB Bilbao).
- `planning-geom/<cod>.json` — geometría 4326 de ámbitos + AE del municipio,
  solo para el visual opt-in (resaltar áreas relevantes, nunca capa global).

La geometría oficial se consulta **offline, a precisión completa**; el runtime
nunca simplifica ni recalcula.

## Consecuencias

- Cobertura local limitada a edificios con geometría resuelta (`EXACT` o
  candidatos). Punto NORA sin edificio Catastro ⇒ `NOT_COVERED` explícito.
- Solapes múltiples se persisten como lista `[capa, share]` — el estado
  `MULTIPLE_OVERLAP` se materializa en dato, no en UI.
- `share < 100 %` en clasificación indica huella a caballo entre clases —
  honestidad de borde sin simplificar geometría.
- Caso descubierto: **Usansolo** (cod oficial 916) no existe en el corpus
  catastral (112 municipios); sus features quedan sin adscribir y se
  documenta como gap de cobertura G1, no de G3-B.
- El visual opt-in muestra solo ámbitos/AE del municipio; la clasificación
  nunca se dibuja como capa (no es un visor urbanístico).

## Alternativas rechazadas

- WFS en runtime: mutable + lento + contradice `static-first` (ADR-006).
- PMTiles de planeamiento: pensado para render masivo; aquí la pregunta es
  puntual por edificio — sobredimensionado y obligaría a geometría simplificada.
- Raster precomputado: convierte PIP en lookup de celda — precisión inferior
  sin beneficio de coste frente a ~6 MB totales de facets.
