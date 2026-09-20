# G5 · CONTEXT-SOURCES — auditoría de fuentes oficiales

> Fecha: 2026-09-20 · Rama: `g5-editorial-redesign`
> Evidencia de peticiones reales: `evidence/g5/context-source-audit/`
> Objetivo: responder a «el producto habla demasiado de edificios»
> con contexto territorial/humano **oficial**, sin crear un buffet de
> datasets. Gate de adopción: docs/gates/G5.md GF2.

## A. Demografía municipal — Eustat (Instituto Vasco de Estadística)

### Verificación técnica (peticiones reales, 2026-09-20)

| Paso | Endpoint | Resultado | Evidencia |
|------|----------|-----------|-----------|
| Catálogo | `GET https://www.eustat.eus/bankupx/api/v1/es/DB` | 200 · 502 854 B · 2 326 tablas | `eustat-catalog-root.json` |
| Metadatos censo | `GET .../PX_010152_cepv1_ep31.px` | 200 · vars: ámbitos territoriales (275) × periodo (14: 1900–2001) | `eustat-ep31-meta.json` |
| Datos censo | `POST .../PX_010152_cepv1_ep31.px` `{"query":[]}` | 200 · JSON-stat 1.2 completo | `eustat-ep31-full.json` |
| Metadatos padrón | `GET .../PX_010154_cepv1_ep06b.px` | 200 · ámbitos (276) × edad (4) × sexo (3) × periodo (27: 2001–2025) | `eustat-ep06b-meta.json` |
| Aviso legal | `https://www.eustat.eus/informacionlegal_c.html` | verificado vía búsqueda (página JS) | texto citado abajo |

### Cobertura verificada (datos reales extraídos)

Municipios de las cinco historias + Leioa, serie censal 1900–2001
(población **de hecho**):

| Municipio | 1900 | 1950 | 1970 | 1986 | 2001 | huecos |
|-----------|------|------|------|------|------|--------|
| Muskiz (48071) | 2.831 | 4.042 | 6.047 | 6.201 | 6.558 | — |
| Mungia (48069) | 4.621 | 5.286 | 8.427 | 11.309 | 13.807 | — |
| Santurtzi (48082) | — | 10.224 | 46.194 | 52.136 | 47.173 | 1900 |
| Abanto y Ciérvana (48002) | 8.853 | 9.330 | 10.002 | 8.415 | 9.036 | — |
| Leioa (48054) | 1.846 | 5.765 | 10.571 | 24.560 | 28.381 | — |
| Zierbena (48913) | — | — | — | 917 | 1.215 | 1900–1981 |
| Bizkaia (48) | 311.361 | 569.188 | 1.043.310 | 1.168.963 | 1.122.637 | — |

Serie contemporánea 2001/01/01–2025/01/01 (`ep06b`): los 112 municipios
de Bizkaia presentes, con grupos de edad y sexo.

### Semántica y límites

- **de hecho vs de derecho**: `ep31` es población de hecho censal;
  `ep06b` es la serie de padrón/estimación 2001–2025. Nunca mezclarlas
  en una misma frase sin etiquetar la operación estadística.
- **Cambios de límites municipales**: Eustat los codifica como dato
  ausente (`:` en JSON-stat status), no como 0 — compatible con
  `UNKNOWN ≠ 0`. Ejemplos verificados: Zierbena sin datos hasta 1986
  (segregación de Abanto y Ciérvana); Santurtzi sin dato 1900
  (Ortuella segregada 1901). Cualquier copy que use la serie debe
  respetar esos huecos y, si se compara entre años, indicar que la
  delimitación puede haber cambiado.
- **Abanto y Ciérvana 1900–1960**: la entidad se formó en 1966; Eustat
  publica valores anteriores para el ámbito — se usan solo con la
  etiqueta de la tabla («censo de hecho») y nunca para inferir la
  entidad administrativa anterior.
- **Interpolación**: prohibida. Solo los años publicados.

### Licencia / reutilización

- Aviso legal Eustat (`informacionlegal_c.html`, verificado):
  «Eustat autoriza a que la información sea redifundida a otros
  usuarios siempre que se cite la fuente: "Fuente: Sitio web de
  Eustat: www.eustat.eus"». Además las tablas estadísticas son
  «conjuntos de alto valor» bajo Directiva (UE) 2019/1024 y Reglamento
  2023/138 (difusión por API obligatoria — de ahí el API PXWeb).
- Obligación del producto: línea de fuente «Eustat · censo/padrón,
  [año]» junto a cada dato usado.

### Decisión

**ADOPT — 1 dataset genérico municipal** (es el único dataset genérico
nuevo que entra en G5):

- Extracción a snapshot congelado (`data/snapshots/eustat_*/`), nunca
  llamadas en runtime. Carga lazy bajo demanda de lectura.
- Uso: un hecho demográfico fechado en «Qué más sabemos del lugar»
  (p. ej. población actual o población en un año relevante) y, en
  historias donde aporte, un dato de época etiquetado.
- Respuesta a pregunta de usuario: «¿cuánta gente vive / vivía en este
  lugar?» — escala humana frente a «edificios, edificios».

## B. Contexto económico/territorial — Open Data Bizkaia (ya auditado)

Reuso del snapshot ya descargado `data/snapshots/planning_20260918/wfs/
espacios_ae.geojson` (planeamiento vigente, espacios de actividad
económica) con solapes ya calculados en
`evidence/g3/g3b/overlap_cases.json` (denominador = superficie de la
celda del caso):

| Historia | Solape verificado | Uso editorial permitido |
|----------|-------------------|-------------------------|
| f4233 Muskiz | POLÍGONO INDUSTRIAL PETRONOR — 98,07 % de la celda | «Hoy, casi toda la superficie de este conjunto se solapa con el polígono industrial de Petronor» |
| f4738 Santurtzi | PUERTO DE BILBAO — 23,68 % de la celda | «Hoy, cerca de una cuarta parte de su superficie se solapa con el Puerto de Bilbao» |
| c2803 Margen Izq. | Puerto de Bilbao 3,47 % + polígonos Ibarzaharra/Lamiako… | «Hoy, su superficie se solapa con varios espacios de actividad económica, entre ellos el Puerto de Bilbao» |
| f4036 Mungia | 0 % — sin solape | omitir (no forzar contexto) |
| f149 Abanto | (ver resto de overlap_cases) | solo si refuerza |

Reglas congeladas: etiqueta «hoy/actual», denominador del solape
declarado, prohibido «causó / se construyó por».

**Decisión: ADOPT** (reuso, sin nueva fuente).

## C. Planeamiento vigente — ya adoptado

Mantener, presentado como «capacidad registrada», nunca predicción.

## D. Movilidad / ruido / monte público — ya adoptados

Solo en profundidad por edificio («Baja hasta tu calle»). Nunca en el
resultado municipal por defecto.

## E. Imagen histórica / cartografía — ya adoptada

Mejor uso editorial (separación clara foto vs mapa 1923–25), sin nuevas
fuentes.

## F. Corpus legislativos (legalize-es, leyabierta)

Siguen catalogados en `docs/OSS_REUSE.md`. **Sin integración** — no hay
feature que los consuma.

## G. Otras fuentes

No se fuerza ninguna. Si en la implementación aparece una necesidad
concreta, se evalúa contra el gate GF2 antes de adoptar.

## Resumen de decisiones

| Fuente | Decisión | Uso |
|--------|----------|-----|
| Eustat población municipal (ep31 + ep06b) | **ADOPT** (snapshot) | 1 hecho municipal fechado + contexto de época en historias |
| ODB espacios de actividad económica | **ADOPT** (reuso auditado) | contexto story-specific con denominador |
| ODB planeamiento vigente | mantener | contexto municipal, capacidad no predicción |
| ruido/bizkaibus/monte | mantener | solo profundidad por edificio |
| corpus legislativo | catalogado | sin integración |
