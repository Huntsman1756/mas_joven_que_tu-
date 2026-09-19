# Estudio G3-D §11 — Espacios protegidos vía geoEuskadi

Estado: **STUDY** (no implementado públicamente en G3-D).
Fecha del probe: 2026-09-19 · Evidencia cruda: `probe-geoeuskadi.json`.

## Pregunta de producto

> «¿Está este punto dentro de un espacio protegido oficial?»

G3-X demostró que Open Data Bizkaia **no** tiene capa de polígonos de
espacios protegidos; la fuente oficial equivalente es geoEuskadi
(Gobierno Vasco — Ingurumena). ODB sigue siendo la fuente principal; esta
capa sería **complementaria**.

## Servicio verificado

ArcGIS REST MapServer (no WFS):

```
https://www.geo.euskadi.eus/geoeuskadi/rest/services/S91B/INGURUMENA_CAS/MapServer
```

Grupo «Espacios protegidos del patrimonio natural» (id 5107), cuatro
subcapas poligonales, todas con `supportedQueryFormats: JSON, geoJSON, PBF`
y `outSR` configurable (nativo EPSG:3857; se puede pedir EPSG:25830):

| id   | capa                              | features |
|------|-----------------------------------|----------|
| 5102 | Límites ENP                       | 42       |
| 5103 | Límites Natura 2000               | 55       |
| 5104 | Límites instrumentos internac.    | 9        |
| 5105 | Zonas periféricas de protección   | 44       |

## Esquema (verificado con features reales)

- `SITECODE` — identificador estable (`ES213005`, `GEOPARK107`…)
- `SITENAME` — nombre oficial
- `PSTYPE` + `PS_ES`/`PS_EU` — categoría legal vasca
  («Parque natural», «Monumento natural», «Reserva natural»…)
- `N2000TYPE` + `N2000_ES`/`N2000_EU` — categoría Red Natura 2000
  (LIC/ZEC/ZEPA), `" "` cuando no aplica
- `INTTYPE` + `INT_ES`/`INT_EU` — instrumento internacional
  (geoparque Unesco, Ramsar, reserva de la biosfera…), `" "` si no aplica
- `INFO` — URL oficial de la ficha del espacio

Semántica importante: **una misma entidad puede aparecer en varias capas**
(Izki es ENP «Parque natural» y a la vez ZEC-ZEPA en la capa 5103). El
modelo correcto es **varias etiquetas oficiales por punto**, no una
clasificación única. El literal `" "` (espacio) es el «no aplica» de la
fuente, equivalente a `NOT_APPLICABLE` — documentarlo si se adopta.

## Cobertura y calidad

- 42 ENP + 55 N2000 + 9 internacionales cubren toda la CAV; Bizkaia está
  incluida (Urdaibai, Gorbeia, Armañón…).
- Actualización: servicio vivo de geoEuskadi; las descargas SHP de la
  ficha de dataset muestran revisiones recientes (p. ej. Montes de
  Vitoria, 2025-03). El servicio no expone `lastEditDate` por capa en el
  probe; si se adopta hay que congelar snapshot con `retrieved_at` como
  el resto de fuentes.
- Licencia: la ficha de dataset opendata.euskadi.eus la marca «Oficial»;
  las condiciones de reutilización del Gobierno Vasco aplican a datos
  abiertos (tipo CC-BY). **Pendiente:** leer el texto legal exacto de la
  ficha antes de adoptar (regla AGENTS §3).

## Encaje con la pregunta de producto

- Respuesta natural: «Este punto se encuentra dentro de {SITENAME}, que la
  fuente oficial clasifica como {PS_ES}{+ N2000_ES}{+ INT_ES}.»
- Solapa semánticamente con MONTE PÚBLICO: son hechos **distintos**
  (titularidad pública forestal vs. figura de protección). Mantenerlos
  como módulos separados; la regla «monte público ≠ espacio protegido»
  ya está en DATA_SEMANTICS §18 R-03.
- Un mismo punto puede dar varios resultados (ENP + ZEC + ZEPA): el
  patrón `MULTIPLE` de G3-B aplica directamente.

## Riesgos

- Fuente autonómica, no foral: Base 1 del Decreto exige ODB como fuente
  principal; ENP sería complemento justificado por ausencia de
  equivalente ODB (documentado en G3-X).
- Semántica de «protegido» es fuerte en copy: cada categoría debe citarse
  con su etiqueta oficial literal (`PS_ES`/`N2000_ES`/`INT_ES`), nunca
  traducir a «zona bonita» ni implicar restricciones de uso concretas.
- 3 capas → 3 estados independientes por punto; la UI no debe colapsarlas
  en «protegido sí/no».

## Recomendación

**STUDY → adoptable en una fase posterior.** La fuente es oficial,
estable, con ids persistentes y geometría consultable en geoJSON+outSR.
Antes de adoptar: (1) verificar licencia exacta en la ficha de dataset;
(2) congelar snapshot de las 3 capas (5102/5103/5104; 5105 periféricas es
contexto, no figura de protección en sí); (3) contrato por categoría con
copy literal de `PS_ES`/`N2000_ES`/`INT_ES`; (4) decidir si el módulo se
titula «espacio protegido oficial» y responde con la lista de figuras.
