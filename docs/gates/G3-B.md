# G3-B — Planeamiento + contexto de actividad económica

Estado: **PREREGISTRADO** (congelado antes de implementación). Baseline:
G3-A `3f3a1bb` en `g3a-personal-depth`. Rama: `g3b-planning-context`.

Scope:

- **A.** Resumen municipal de planeamiento («¿Y qué está previsto?»).
- **B.** Contexto local de planeamiento cuando la geometría lo soporte
  (punto MI EDIFICIO / edificio resuelto).
- **C.** Contexto genérico de espacio de actividad económica (AE).
- **D.** Enriquecimiento de los 5 casos editoriales seleccionados
  (`c2803`, `f4036`, `f4233`, `f4738`, `f149`) con el solape AE real.

Fuera de scope: mapa 1923–25, deltas de snapshot, rutas nuevas, puntos de
empresa en runtime, interpretación urbana causal, precios, predicción.

Restricción de producto: **no es un visor urbanístico**. Nada de arcoíris de
zonificación, leyenda de 26 calificaciones, capa permanente de planeamiento,
selector de capas GIS ni parrilla de tarjetas. La pregunta humana es
«¿qué planificación oficial consta hoy alrededor de este lugar?» y, cuando
aplique, «¿este caso coincide con un espacio oficial de actividad?».

---

## 1. Snapshot de fuentes (congelado)

Las fuentes oficiales son mutables: se captura snapshot reproducible antes de
implementar, con manifest por recurso (URL, retrieved_at, metadatos de
publicación, licencia, sha256, CRS, esquema, identificador de snapshot).
Mismo patrón que `data/manifests/` de G0/G1.

- **P1.** CSV global `DFBDatosGlobalesPlaneamiento_20240507.csv`
  (dataset `planeamiento-urbanistico`, Diputación Foral de Bizkaia, CC BY 4.0).
- **P2.** Solo las capas geométricas de planeamiento que responden a una
  pregunta de producto (§6): ámbitos INSPIRE de usos globales como máximo —
  no las 26 calificaciones pormenorizadas por defecto.
- **A1.** WFS `JardueraEkonomikoak_…_Espacios_Actividades_Económicas`
  (polígonos: `IdPoligonoEmpresarial`, `NombrePoligonoEmpresarial`,
  `Shape.STArea__`). La capa `…_Empresas` (puntos) queda fuera.
- ⚠ **Regla CRS congelada**: WFS 2.0 + `EPSG:4326` ⇒ bbox en orden
  **lat,lon** (invertir ejes devuelve vacío en silencio). Toda consulta pasa
  por un transform test explícito antes de usarse.

## 2. Contratos de métricas de planeamiento

Cada campo público lleva contrato (patrón C-01…C-12 de `DATA_SEMANTICS.md`):
campo oficial, unidad, universo, fecha de referencia, semántica de valor
ausente, regla de agregación, publicador, limitaciones.

Campos candidatos (del CSV global, ejercicio 2024, extracción 2024-05-07):

| ID | Campo oficial | Semántica propuesta |
|----|---------------|---------------------|
| P-01 | `BIZTANLE ERROLDA/HABITANTES CENSO` | censo municipal (contexto, no métrica principal) |
| P-02 | `SUELO RES TOTAL SUB+SUZ (M2)` | suelo residencial total registrado |
| P-03 | `SUELO RES VACANTE SUB+SUZ (M2)` | suelo residencial **vacante** registrado |
| P-04 | `SUELO AE TOTAL SUB+SUZ (M2)` | suelo de actividad económica total |
| P-05 | `SUELO AE VACANTE SUB+SUZ (M2)` | suelo AE **vacante** |
| P-06 | `VIVIENDAS POR EJECUTAR SUB+SUZ+NR` | capacidad residencial registrada pendiente de ejecución |

Reglas: SUB = urbano consolidado, SUZ = urbanizable, NR = núcleo rural —
se suman solo si el contrato lo dice explícitamente y se documenta la
composición. Valor ausente ≠ 0: se omite o se explica. Ningún porcentaje sin
numerador/denominador/unidad explícitos. No se infieren ratios no
preregistrados.

## 3. Contrato de copy: planeamiento ≠ futuro

Permitido: «El planeamiento vigente registra…» · «Constan X viviendas
pendientes de ejecución en los datos de planeamiento» · «El planeamiento
registra Y ha de suelo residencial vacante» · «Estos datos describen
capacidad/planeamiento vigente a fecha Z».

Prohibido: «aquí se construirán X viviendas» · «este barrio crecerá» ·
«habrá X nuevos residentes» · «este suelo se urbanizará» · «el precio
subirá» · «este edificio será…».

Disclosure siempre visible: planeamiento no es predicción · capacidad
registrada no es construcción ejecutada · suelo vacante/planificado no
implica desarrollo futuro · el planeamiento vigente puede cambiar.

## 4. «¿Y qué está previsto?» — municipal

Sección en progressive disclosure dentro de `/`, tras el núcleo temporal.
Estructura editorial: bloque único con 2–3 cifras defendibles + fecha de
referencia + línea de fuente + disclosure «qué significa». Sin tarjetas de 3
columnas ni panel de dashboard. Si un campo falta: omitir o explicar, nunca
coaccionar a 0.

## 5. Contexto local de planeamiento

Cuando MI EDIFICIO produce un punto/edificio resuelto: PIP contra las
geometrías de planeamiento congeladas (ámbitos INSPIRE como máximo).

Estados: `INSIDE_PLANNING_AREA` · `OUTSIDE_KNOWN_AREA` · `MULTIPLE_OVERLAP`
· `GEOMETRY_UNAVAILABLE` · `NOT_COVERED`. Solapes múltiples se listan, nunca
se elige uno en silencio.

Copy seguro: «Este punto cae dentro del ámbito que la fuente oficial
identifica como {nombre/tipo oficial}.» Prohibido convertir
clasificación/calificación en afirmaciones informales, derechos, edificabilidad
de la parcela, licencias o construcción futura.

## 6. Contexto de actividad económica (genérico)

Para punto/edificio exacto: PIP contra polígonos AE congelados.
Copy: «Este punto se encuentra dentro del espacio que el inventario oficial
denomina «{NombrePoligonoEmpresarial}».» + fuente + fecha de referencia +
tipo oficial documentado si existe.

Prohibido inferir: empleador, historia de uso, relación causal con el año del
edificio, contaminación, intensidad industrial.

## 7. Los 5 casos editoriales

Congelados: `c2803`, `f4036`, `f4233`, `f4738`, `f149`. No se reemplazan.

Denominador congelado: `overlap_pct = area(candidato ∩ AE) / area(candidato)`
en EPSG:25830, con geometría e identificadores de fuente persistidos.

El discovery observó (a reproducir, no a asumir): f4233 ≈98 % PETRONOR ·
f4738 ≈24 % Puerto de Bilbao · c2803 ≈20 % (varios espacios) · f4036 y f149
negativos. Si los valores reproducidos difieren, se reporta el real.

Copy seguro: «El {pct} % del área analizada se solapa con el espacio que el
inventario oficial denomina «{nombre}».» Prohibido: «Petronor provocó…»,
«la industrialización explica…», «el puerto causó…», «esta zona creció
por…». La evidencia negativa también es dato («no se solapa con ningún
espacio del inventario»).

## 8. Visual

El resumen municipal es texto/dato (registro editorial). La geometría local
es evidencia opt-in: si el usuario abre el mapa de ámbito, se resaltan solo
las áreas oficiales relevantes y se neutraliza el resto. Ninguna capa
permanente, ningún selector GIS.

## 9. Rendimiento / arquitectura estática

Medir antes de elegir formato (GeoJSON simplificado / PMTiles / fragmentos
por municipio). Carga demand-driven por municipio/lugar. Registrar: bytes
crudos, bytes comprimidos, latencia primer uso, latencia repetición, heap.

## 10. Accesibilidad y fallo

- Todo dato de planeamiento comprensible sin interacción de mapa; si hay
  mapa local, equivalente textual obligatorio. Nada de información solo en
  color/relleno.
- 320 px, teclado, axe, 400 %, reduced-motion.
- Estados de fallo explícitos: `DATA_UNAVAILABLE` · `METRIC_MISSING` ·
  `NO_MATCHED_AREA` · `MULTIPLE_OVERLAP` · `AE_UNAVAILABLE` ·
  `GEOMETRY_FAILURE`. Nunca mostrar 0 por ausencia. El producto sigue usable
  si planeamiento/AE fallan.

## 11. Validación

Muestra estratificada congelada antes de ajustar: Bilbao denso, Gran Bilbao,
municipio con alta capacidad registrada, municipio con capacidad 0
documentada, rural, edificio dentro de ámbito, edificio fuera, solape
múltiple, los 5 casos G2. Verificación contra el snapshot oficial congelado.

## 12. Condiciones de cierre G3-B

| # | Condición |
|---|-----------|
| GB1 | Snapshot manifest reproducible (sha256, retrieved_at, licencia) |
| GB2 | Contratos P-01…P-06 documentados con semántica de ausente |
| GB3 | Copy planeamiento≠futuro: copylint + revisión literales |
| GB4 | Resumen municipal: solo campos con semántica defendible |
| GB5 | Estados locales PIP explícitos; MULTIPLE nunca colapsado |
| GB6 | Contexto AE: denominador solape congelado, sin copy causal |
| GB7 | Solape 5 casos reproducido sobre snapshot (valores reales) |
| GB8 | Carga demand-driven; medición de tamaño/latencia documentada |
| GB9 | a11y: equivalente textual, axe 0, teclado, 320 px, 400 % |
| GB10 | Estados de fallo explícitos; producto usable sin planning |
| GB11 | No-regresión G3-A + G2-A + G2-B + G1 smoke, 3 motores |
| GB12 | check/lint/format/test/build limpios |

## 13. STOP

Antes de implementación de mapa 1923–25, de features públicas de delta de
snapshot y de la prosa editorial final de las historias.
