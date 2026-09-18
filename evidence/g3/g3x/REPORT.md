# G3-X — MAXIMUM USEFUL SOURCE AUDIT

> Estado: auditoría completada. **STOP antes de implementación.** No se ha tocado código de producto.
>
> Pregunta guía: ¿está *Más joven que tú* usando todas las fuentes de Open Data Bizkaia
> que pueden mejorar materialmente el producto? Una fuente solo entra si responde una
> pregunta nueva o mejora materialmente una existente. ODB = familia principal;
> fuentes externas solo cuando ODB no puede responder.

## A. Datasets revisados a nivel esquema/recurso

- Inventario congelado: `evidence/g3/catalog_inventory.json` — **1.348 datasets** a nivel título/formato.
- Revisión a nivel recurso (`package_show` CKAN `/es/api/3/action`): **30 datasets** → `evidence/g3/g3x/odb_resources.json`.
- Revisión a nivel **campo real** (WFS `GetCapabilities`/`DescribeFeatureType`/`GetFeature` + cabeceras CSV): **20 capas/recursos** → `evidence/g3/g3x/wfs_fields.json` y hallazgos abajo.
- Barrido complementario por keywords (patrimonio, demografía, educación, salud, parques, elecciones, hidrología, entes locales) sobre los 1.348 títulos: **0 datasets ODB adicionales** para esas preguntas (ver §G).

Todas las peticiones se hicieron contra los endpoints oficiales registrados en los metadatos
CKAN del propio dataset (`geo.bizkaia.eus/arcgisserverinspire/...`, CKAN
`opendatabizkaia.eus/es/api/3/action`).

## B. Familias de fuentes creíbles nuevas

| # | Familia | Dataset ODB | Geometría | Pregunta que habilita |
|---|---------|-------------|-----------|------------------------|
| 1 | **Ruido oficial** | `mapas-de-ruido-de-las-carreteras-forales-de-bizkaia` | Polígonos de isófonas + 49.868 receptores puntuales | «¿qué ruido oficial cartografía el mapa estratégico sobre este punto?» |
| 2 | **Transporte público** | `informacion-geografica-de-rutas-y-paradas-de-bizkaibus` | 2.376 paradas + 4 capas de trazados ida/vuelta | «¿qué paradas y líneas de Bizkaibus conectan este punto?» |
| 3 | **Propiedad forestal pública** | `montes-publicos-de-bizkaia` | 346 polígonos + rodales + mojones | «¿está este punto dentro del monte público «X»?» |
| 4 | **Infraestructura de residuos** | `residuos-instalaciones` | 23 garbigunes + 2 vertederos + plantas transferencia | «¿dónde está el garbigune que sirve a este municipio?» |
| 5 | **Servicios sociales** | `registro-foral-de-servicios-sociales` | 1.495 puntos (WFS) + CSV | «¿qué servicios sociales registrados oficialmente hay en este municipio?» |
| 6 | **Red ciclable** | `vias-ciclistas-bizkaia` | 611 tramos + talleres/lavado/recogida | «¿qué red ciclable pasa cerca de este punto?» |
| 7 | **Red viaria foral** | `carreteras-forales-de-bizkaia` | Red + hitos km + cesiones + etiquetas | «¿qué carretera foral pasa por este lugar?» |
| 8 | **Equipamiento DFB** | `oficinas-atencion-ciudadana` | Puntos | «¿dónde está la oficina foral de atención?» (débil: solo sedes DFB) |
| 9 | **Litoral** | `informacion-geografica-de-playas` | Polígonos de playa + campos tiempo real | «¿este punto está en una playa oficial?» (solo costa) |
| 10 | **Medio rural productivo** | `registro-explotaciones-ganaderas` / `registro-viticola` | Puntos / parcelas | «¿este punto coincide con una explotación registrada?» (rural) |
| 11 | **Cartografía histórica** | `hojas-cartografia-historica-1:25000-1923-1925` | WMTS/WMS | «¿cómo era este punto hace un siglo?» — ya preregistrada como G3-C |

## C. Preguntas de usuario que habilita cada una

Verificadas contra campos reales (no inferidas del título):

1. **Ruido** — `Ruido_dia/tarde/noche`: polígonos con `LEVEL_1`/`LEVEL_2` (banda dB, p.ej. 55–60) + `TIPO` D/T/N. `Receptores`: punto con `Dia`/`Tarde`/`Noche` (dB enteros), `NOMBRE_TOP` municipio, `FLOOR` (planta). Pregunta: *«¿qué banda de ruido cartografía el mapa estratégico oficial en este punto, de día y de noche?»* — respuesta exacta por PIP (isófona) y/o receptor más próximo.
2. **Bizkaibus** — `Paradas`: `CodigoReducidoParada`, `Denominacion`, `CodificacionRuta` (lista de líneas «A3641_Urduña-Arrigorriaga…»), municipio. Pregunta: *«¿qué paradas y líneas conectan este punto?»* — respuesta por k-NN de paradas.
3. **Montes públicos** — `Montes_Públicos`: `NombreMonte`, `Propietario`, `FechaDeslinde`, `FechaAmojonamiento`, `FechaCatalogacion`, `UtilidadPublica`, `Patrimonial`. Pregunta: *«¿está este punto dentro de un monte de utilidad pública y desde cuándo está catalogado?»* — respuesta por PIP; aporta además profundidad temporal real (fechas de deslinde).
4. **Residuos** — `Red_de_Garbigunes`: `Garbigune`, `DireccionES`, `HorarioES`, `ZonaInfluenciaES`, `TipologiaResiduosES`, lat/lon. Pregunta: *«¿dónde está el punto limpio que sirve a este municipio?»*
5. **Servicios sociales** — `Registro_Foral_Servicios_Sociales`: `NombreCentro`, `TipoCentroES`, `PoblacionAtendidaES`, `DescripcionMunicipio`, contacto. Pregunta: *«¿qué servicios sociales oficiales existen en este municipio / cerca de este punto?»* — agregado por municipio+tipo o k-NN.
6. **Ciclista** — `Vías_ciclistas` 611 tramos: *«¿qué red ciclable pasa cerca?»* — distancia al tramo más próximo.
7. **Carreteras** — `Red_Foral_de_Carreteras` + `Hítos_Kilométricos`: *«¿qué carretera foral es la vía que pasa por aquí?»* — da identidad a la carretera del mapa de ruido.
8-10. Playas / explotaciones / vitícola: preguntas reales pero de cobertura parcial (costa, rural) → módulos condicionales.
11. **1923–25** — ya adoptada como plan (G3-C); esta auditoría confirma que es la única fuente ODB con profundidad temporal geométrica además del catastro.

## D. Fuentes recomendadas `ADOPT`

| Dataset | Justificación producto | Join | Tamaño runtime estimado | Repetibilidad |
|---------|------------------------|------|--------------------------|----------------|
| `mapas-de-ruido-carreteras-forales` | Responde «¿qué ruido oficial se cartografía alrededor?» — dimensión ambiental real del lugar, invisible hoy. PIP + receptor próximo. Bandas D/T/N → comparación temporal intrínseca. | PIP edificio↔isófona; receptor ≤500 m | Isófonas: pocas decenas de polígonos grandes (14 bandas día) simplificadas por municipio; receptores: filtrar a ±500 m del punto | Alta: pregunta universal en zona urbana/foral |
| `rutas-y-paradas-bizkaibus` | «¿qué transporte conecta este punto?» — movilidad real del lugar; las paradas llevan la lista de líneas oficial. | k-NN paradas ≤1 km | Paradas: ~2.400 puntos, ~300 KB total / filtrable por municipio | Alta: toda Bizkaia |
| `montes-publicos` | «¿está dentro de un monte público?» + fechas de deslinde/catalogación = profundidad temporal real. | PIP | 346 polígonos, pequeño | Media-alta (muy alta en rural, donde el producto hoy es más pobre) |
| `residuos-instalaciones` (garbigunes) | «¿qué equipamiento público de residuos sirve a este municipio?» — 23 puntos con zona de influencia explícita. | `ZonaInfluenciaES`↔municipio o k-NN | Trivial (23 pts) | Media |
| `registro-foral-de-servicios-sociales` | «¿qué servicios sociales oficiales hay aquí?» — agregado por municipio y tipo (NO listado de personas). | Municipio / k-NN | 1.495 pts, filtrable | Media-alta |

Condición `ADOPT`: mismas reglas G3-B — snapshot congelado (sha256+licencia), PIP/k-NN
precalculado por `building_id` o por municipio, módulo condicional que solo aparece con
cobertura y semántica defendibles, equivalente textual, fail-closed.

## E. Fuentes `STUDY`

| Dataset | Razón para estudiar, no adoptar aún |
|---------|--------------------------------------|
| `vias-ciclistas-bizkaia` | Pregunta real pero solapa con MOVILIDAD (Bizkaibus). Adoptar solo si el módulo movilidad resulta pobre sin ella, o como sub-fact del mismo módulo. |
| `carreteras-forales` | Útil para dar nombre a la vía del mapa de ruido («ruido de la BI-…»); evaluar como enriquecimiento del módulo RUIDO, no módulo propio. |
| `informacion-geografica-de-playas` | Campos tiempo real (aforo, temperatura) rompen el modelo «snapshot congelado» — exigiría runtime vivo o recorte estático. Solo si se quiere módulo LITORAL para costa. |
| `residuos-urbanos` | Serie anual de kg/hab por municipio → podría enriquecer la ficha municipal («¿cuánto residuo genera este municipio?»). Agregado municipal, sin geometría: bajo impacto vs. coste semántico. |
| `contenedores` | Microlocalización de contenedores por ejercicio; la «historia» anual (2020 vs 2023) permitiría «¿qué cambió?» pero el cambio observable es de inventario, no de lugar. Valor editorial bajo. |
| `explotaciones-ganaderas` / `registro-viticola` | Respuesta real en contextos rurales («¿este punto es una explotación registrada?»). Revisar sensibilidad (datos de explotaciones = actividad económica nominada) y decidir con copy contract. |
| `hojas-cartografia-historica-1923-25` | Ya ADOPTADA como plan en roadmap (G3-C); se mantiene aquí solo como referencia de arquitectura. |
| `pistas-en-ENP` | 1 capa de pistas forestales; sin polígonos de ENP → no responde «¿dentro de espacio protegido?». |

## F. Fuentes `REJECT` (con razón)

| Dataset | Razón |
|---------|-------|
| `trafico` | Es un CSV de **localización de cámaras** (entidad, carretera, PK, lat/lon, URL cámara) — no intensidades ni historia. Respondería «¿dónde hay una cámara?», pregunta sin valor de retorno. |
| `red-nap-de-bizkaia` | Red de nivelación de alta precisión (geodesia), no áreas protegidas — el título es ambiguo; el esquema lo descarta. |
| `prueba-es1` (energía DFB) | Consumo eléctrico de **edificios propios de la Diputación** — sin relevancia para el lugar del usuario. |
| `indicadores-de-accion-social` | Ámbito ENTIDAD=BFA (provincial), sin desagregación municipal/lugar. No responde pregunta de lugar. |
| `avispa-asiatica`, `rutas-colesterol`, `intervenciones-speis`, `centro-recuperacion-fauna`, `fauna-cinegetica-y-pesca` | Fichas temáticas sectoriales sin pregunta de lugar defendible dentro del producto (o con solape de privacidad: intervenciones SPEIS son eventos con direcciones). |
| `agenda-cultural` | Feed de eventos, no equipamiento patrimonial estable. |
| `senderos-pr` | Solo 2 parques (Armañón, Urkiola) — cobertura parcial sin pregunta general. |
| `senderos` (23 recursos KML) | Rutas de ocio; «¿qué sendero pasa cerca?» es defendible pero el formato (KML heterogéneo) y la baja relación con la pregunta-núcleo del producto lo dejan fuera de este ciclo. |
| `oficinas-atencion-ciudadana` | ~sedes DFB; pregunta marginal («¿dónde está la ventanilla foral?»). |
| `cartografia-1:500-areas-urbanas` | Toponimia/urbano base; no añade pregunta nueva sobre lo que ya da catastro+NORA. |
| Familias `parcelario-catastral-<muni>`, `planeamiento-urbanistico-<muni>`, `udaldata-<muni>`, `bizkaibus-<muni>`, `contenedores-<muni>`… | Duplicados municipales de las familias DFB ya auditadas — la versión foral cubre toda Bizkaia. |
| Memorias fiscales / presupuestos / elecciones / RPT | Datos administrativos sin dimensión de lugar. |

## G. Preguntas sin respuesta en ODB → fuente oficial externa justificada

| Pregunta | Resultado auditoría ODB | Fuente externa justificada |
|----------|--------------------------|----------------------------|
| «¿está este punto dentro de un espacio natural protegido?» | ODB solo tiene **pistas** en ENP; sin polígonos de ENP/ZEC/ZEPA ni Urdaibai | **geoEuskadi** (Red Natura 2000, espacios protegidos, Reserva Urdaibai) — competencia Gobierno Vasco |
| «¿qué equipamientos educativos/sanitarios hay cerca?» | 0 datasets ODB de centros docentes/salud con coordenadas | **geoEuskadi** (directorios de centros docentes, centros sanitarios Osakidetza) |
| «¿cuánta gente vivía aquí en mi año / cómo evolucionó la población?» | 0 datasets ODB de padrón/demografía municipal | **Eustat** (series de población municipal) — respuesta directa a profundidad temporal |
| «¿este edificio es patrimonio catalogado?» | 0 datasets ODB de bienes culturales catalogados | **geoEuskadi / Gobierno Vasco** (Inventario General de Bienes Culturales, BIC) |
| «¿qué licencias/obras se concedieron aquí?» | Solo `housing_to_execute` de planeamiento (capacidad, no licencias); 0 datasets ODB de licencias | Sin fuente abierta homogénea a nivel Bizkaia → **queda como gap documentado** (no forzar) |
| «¿qué parques/jardines públicos hay cerca?» | 0 dataset ODB de zonas verdes con cobertura completa (solo municipales parciales tipo `playas-busturia`) | GeoEuskadi/OSM oficial — gap documentado; bajo prioridad |

ODB sigue siendo la familia principal: de las 6 preguntas anteriores, 5 no tienen ningún
dataset ODB que las responda; la justificación externa es por **ausencia verificada**, no por preferencia.

## H. Módulos de contexto condicional propuestos

Regla (igual que G3-B): el módulo **solo aparece** si hay cobertura para el punto/edificio,
la semántica está documentada en `DATA_SEMANTICS.md`, y responde una pregunta distinta.
Nada de rejilla ni selector GIS. Equivalente textual obligatorio. Fail-closed.

| Módulo | Fuentes | Estado | Pregunta |
|--------|---------|--------|----------|
| `PLANEAMIENTO` | Datos globales + capas planeamiento | **Ya implementado (G3-B)** | «¿qué está previsto?» |
| `ACTIVIDAD ECONÓMICA` | Inventario espacios AE | **Ya implementado (G3-B)** | «¿coincide con espacio AE oficial?» |
| `RUIDO` | Mapas de ruido carreteras forales (isófonas D/T/N + receptores) | **Propuesto — ADOPT** | «¿qué banda de ruido oficial cartografía el mapa estratégico aquí?» |
| `MOVILIDAD` | Bizkaibus paradas+rutas (+vías ciclistas como sub-fact) | **Propuesto — ADOPT** | «¿qué transporte conecta este punto?» |
| `ENTORNO NATURAL` | Montes públicos (PIP + fechas) | **Propuesto — ADOPT** | «¿está dentro de un monte de utilidad pública?» |
| `SERVICIOS` | Servicios sociales + garbigunes (agregado municipal/tipo) | **Propuesto — ADOPT** | «¿qué servicios públicos oficiales existen aquí?» |
| `LITORAL` | Playas | Estudio — solo si se decide sub-módulo costero | «¿este punto está en una playa?» |
| `ENTORNO RURAL` | Explotaciones ganaderas / vitícola | Estudio — requiere copy contract de sensibilidad | «¿este punto es una explotación registrada?» |
| `PROTEGIDO` | — | **Bloqueado: ODB no tiene polígonos ENP** → geoEuskadi si se decide | «¿está dentro de espacio protegido?» |
| `EQUIPAMIENTOS` | — | **Bloqueado: ODB no tiene centros educativos/sanitarios** → geoEuskadi | «¿qué colegios/centros de salud hay cerca?» |

## I. Impacto en la rúbrica del concurso

- **Profundidad de datos / uso del portal**: pasa de 4 familias ODB (catastro, planeamiento, AE, ortofotos históricas) a ~8. La pregunta del jurado «¿y para qué sirve el open data?» gana respuestas concretas (ruido, bus, montes, servicios).
- **Rigor**: cada módulo replica el patrón ya probado (snapshot congelado + sha256 + licencia CC-BY + PIP precalculado + estados explícitos + equivalente textual). Nada de claims causales.
- **Temporalidad**: montes públicos aporta fechas oficiales (deslinde/amojonamiento/catalogación) — «¿desde cuándo es público este monte?» es el primer dato temporal no catastral del producto. Ruido aporta comparación día/noche. El mapa 1923–25 (G3-C) sigue siendo la pieza temporal mayor.
- **Diferenciación editorial**: los módulos condicionales responden preguntas de lugar que ningún visor de la competencia contesta, sin convertir el producto en un panel GIS.
- **Retorno/personalización**: RUIDO/MOVILIDAD/ENTORNO/SERVICIOS responden exactamente a las preguntas de «volver a mirar» del objetivo de producto.
- **Riesgo mitigado**: las fuentes `REJECT` documentadas demuestran que el portal se auditó entero a nivel esquema — evidencia de exhaustividad, no de selección superficial.

## J. Arquitectura de fuentes final

```
PRINCIPAL — Open Data Bizkaia (snapshot congelado, CC-BY)
├── Núcleo (vigente)
│   ├── Catastro: año/parcelario            (G1, adoptado)
│   ├── Ortofotos históricas 1943/1956…     (G1, adoptado)
│   ├── Planeamiento: datos globales+capas  (G3-B, implementado)
│   ├── Espacios de actividad económica     (G3-B, implementado)
│   └── Cartografía histórica 1923–25       (G3-C, planeado)
├── Contexto condicional (propuesto G3-D…)
│   ├── Mapas de ruido carreteras forales   → módulo RUIDO
│   ├── Bizkaibus paradas/rutas             → módulo MOVILIDAD
│   ├── Montes públicos                     → módulo ENTORNO NATURAL
│   ├── Servicios sociales + garbigunes     → módulo SERVICIOS
│   └── (estudio) vías ciclistas, carreteras, playas, rural
└── Rechazado documentado: tráfico(cámaras), NAP(geodesia),
    energía-DFB, indicadores provinciales, temáticos sectoriales

COMPLEMENTARIO — solo donde ODB no responde (verificado)
├── geoEuskadi: NORA (adoptado G3-A), ENP/Natura2000, centros
│   docentes/sanitarios, bienes culturales   → módulos PROTEGIDO/EQUIPAMIENTOS
├── Eustat: series población municipal      → profundidad temporal municipal
└── IGN/CNIG: sin necesidad detectada por ahora

Invariantes:
  · Toda fuente nueva: snapshot + sha256 + licencia + CRS + contrato de campos
  · Join: PIP/k-NN precalculado por building_id o municipio (patrón G3-B)
  · Módulo condicional: solo con cobertura + semántica + pregunta distinta
  · Sin rejilla, sin selector GIS, sin ceros fabricados, equivalente textual
```

## Veredicto

**`G3X_AUDIT_DONE`** — 1.348 datasets a nivel título, 30 a nivel recurso, 20 capas a
nivel campo. 5 fuentes `ADOPT` (ruido, bizkaibus, montes, garbigunes, servicios
sociales), 8 `STUDY`, ≥15 `REJECT` documentadas, 6 gaps ODB con justificación externa.
STOP antes de implementación, como se pidió.
