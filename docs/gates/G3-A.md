# G3-A — Personal Depth: MI EDIFICIO + DOS AÑOS

Estado: **PREREGISTRADO** (congelado antes de implementación). Baseline: G1 `aa50d92`+evidencia, G2-C2 `5c5fe0a`. Rama: `g3-discovery` → implementación en rama de trabajo `g3a-personal-depth`.

Scope: **solo** búsqueda de dirección exacta (MI EDIFICIO) y segundo ancla temporal (DOS AÑOS). Fuera de scope: planeamiento, capa de actividad económica, mapa 1923–25, deltas de snapshot, historias públicas, rutas nuevas.

No se modifican los gates G1/G2. La no-regresión G1/G2 es condición de cierre.

---

## 1. Modelo de búsqueda de dirección

El hero no cambia: `selected_year` + municipio → resultado. Tras RESULT, una acción secundaria «¿Quieres bajar hasta tu calle?» abre el flujo de dirección.

Cadena NORA (spec `sidl/rest/nora.json`, verificada en discovery):

```
calles?descCalle=<q>&descMunicipio=<nombre>&withParents=true
  → calle/{calleId}/portales?portalNum=<n>            (listado; portalNum = PREFIJO)
  → portal/{portalId}/edificios?withParents=false
  → edificios/{edificioId}?withParents=true
reverse: portales/cercano?x&y&crs=EPSG:25830
```

Reglas congeladas:

- R1. `descMunicipio` **no** es filtro de servidor: la desambiguación es local sobre `localidad[0].entidad.municipio` (`id` = código de 3 dígitos = `Place.cod` padStart(3,'0'); `idProvincia` = `'48'`).
- R2. `portalNum` es coincidencia por prefijo: el matching exacto (`numero`, `bis`, `acepcion`, `bloque`) se hace en cliente. Variantes restantes ⇒ se MUESTRAN todas. Nunca se elige una en silencio.
- R3. HTTP 204 NORA = «sin resultados» (NO_RESULTS), no error.
- R4. Fallo de red/timeout (10 s) ⇒ `NETWORK_ERROR` con reintento; no se bloquea la vista existente.
- R5. Los 3 pasos (calle→portal→edificio) son demand-driven; no hay precarga de catálogos de calles/portales.

## 2. Identidad Catastro (fail-closed)

Una vez resuelto el portal (punto `dxEtrs89/dyEtrs89`, EPSG:25830):

- I1. Candidatos Catastro = edificios cuyo polígono contiene el punto del portal (ventana de consulta ±10 m).
- I2. Estados:
  - `EXACT` — exactamente 1 edificio Catastro contiene el punto → se selecciona.
  - `MULTIPLE` — >1 candidato → se listan; el usuario elige; nunca se auto-colapsa a EXACT.
  - `NORA_ONLY` — NORA tiene edificio(s) pero 0 polígonos Catastro contienen el punto → se muestra el dato NORA etiquetado como no vinculado.
  - `NOT_FOUND` — NORA no resuelve portal/edificio.
- I3. `building_id` Catastro ≠ `edificioId` NORA: son identidades distintas; la vinculación es solo geométrica por el punto del portal.

## 3. Ficha MI EDIFICIO

Con identidad `EXACT` muestra: año registrado (`Ano_Constr`), `year_state`, relación con `selected_year`, huella en planta, alturas (contrato `Numero_Alt` vigente), uso solo si su semántica está verificada, ortofoto oficial más próxima (mismo contrato opt-in), procedencia.

`NORA.fechaConstr` es campo observado **independiente**:

- Estados: `BOTH_EQUAL` / `BOTH_DIFFER` / `CATASTRO_ONLY` / `NORA_ONLY` / `BOTH_UNKNOWN`.
- Si difieren se muestran ambos: «Catastro registra {a}. NORA registra {b}. Son dos fuentes oficiales distintas; mostramos ambas sin corregir una con la otra.»
- Prohibido elegir ganador o fusionar.

Prohibido: `Numero_Viv`, edad de la vivienda, inferir existencia histórica del edificio por presencia/ausencia.

## 4. Privacidad de dirección

- Sin geolocalización, cuenta, analítica ni persistencia de búsquedas.
- La URL **no** serializa el texto de la dirección. El deep link de edificio usa `building=<id catastral>` (contrato existente), solo cuando la identidad es EXACT o elegida explícitamente.
- No se crean páginas indexables por dirección; canonical sigue siendo `/`.

## 5. DOS AÑOS

- Affordance «Añade otro año»: solo años, sin relaciones/nombres.
- Estado: `selected_year` (invariante T1: nada lo sobrescribe) + `compare_year`.
- Orden temporal interno `earlier ≤ later`; se conserva cuál introdujo primero el usuario (para el copy «tu año» vs «otro año»).
- Partición del **mismo** universo `CURRENT_BUILDING_STOCK` con las mismas reglas de validez:
  `≤ earlier` · `earlier < y ≤ later` · `> later` · `UNKNOWN/non-VALID`.
- Todo conteo/porcentaje lleva denominador explícito (edificios actuales con año conocido).
- Copy seguro: «De los edificios actuales con año conocido…». Prohibido: «en 1960 había…», «entre ambas generaciones se construyó…», «la ciudad creció…».

## 6. Modelo visual (congelado)

- `DecadeDistribution`: una segunda línea de marcador (estilo discontinuo, etiqueta «OTRO AÑO · {y}»). Las barras no cambian de color: la partición se expresa en un texto de lectura bajo el gráfico.
- `Timeline`: segunda marca fija `mark-compare` (discontinua, mismo lenguaje que `mark-you`/`mark-play`).
- Mapa: las capas agregadas (municipios/celdas) siguen monocroma a `selected_year`. Los **edificios** (zoom ≥13.5) pasan a 3 estados temporales cuando `compare_year` existe: `≤ earlier` (#8fa3b8 existente) · `earlier–later` (#c63b4f existente) · `> later` (#3a3835 neutro oscuro) + hatch para no-VALID. Leyenda actualizada. Sin quinto color.
- Si `compare_year` es null: el producto es idéntico a G2 (progressive disclosure).

## 7. URL / deep link

- `compare=<year>`: serializado cuando `compare_year` existe; validado 1900–snapshot_year.
- `building=<id>`: ya existía en `serializeUrl`; ahora también se **restaura** (resolución diferida tras cargar la fuente PMTiles del municipio; si el id no existe → estado `NOT_FOUND`, sin fallo).
- Back/forward y reload reproducen place, year, compare_year, view, building, play, ortho.
- Nunca se escribe la dirección textual ni por frame.

## 8. Accesibilidad y móvil

- Combobox/listbox real (patrón de `PlaceSearch`), con `aria-activedescendant`, `role=status` para estados.
- Estados a probar: calles ambiguas, portales ambiguos, sin resultado, NORA 204, fallo de red, resultado exacto, múltiples edificios.
- Journey teclado completo: resultado → buscar dirección → portal → edificio → ficha → añadir año → comparar.
- Touch targets ≥44 px; sin modales a pantalla completa; 320 px sin overflow horizontal.

## 9. Rendimiento

- Presupuesto por paso (p95): calle ≤800 ms · portales ≤800 ms · edificios ≤800 ms · identidad ≤500 ms tras tiles cargadas.
- Caché en memoria por sesión: calles por (municipio,query), portales por calleId, edificios por portalId.
- La búsqueda no puede bloquear ni desmontar la vista de resultado existente.
- `compare_year` no añade peticiones: se calcula sobre `metrics`/`dist` ya cargados y `feature-state` local.

## 10. Corpus de validación (congelado)

`evidence/g3/g3a/address-corpus.json`: muestra estratificada ampliada del discovery (≥24 casos): Bilbao denso, Gran Bilbao, municipio medio, rural, nombres bilingües, portales numerados/con letra/bis, y fixtures sin resultado. No se optimiza tras ver fallos.

Métricas a publicar: `EXACT / MULTIPLE / NORA_ONLY / NOT_FOUND`, latencia p50/p95 por paso.

## 11. Condiciones de cierre G3-A

| # | Condición |
|---|-----------|
| GA1 | Identidad de dirección correcta y fail-closed (corpus: 0 auto-colapsos MULTIPLE→EXACT) |
| GA2 | Ambigüedad visible (calles y portales) |
| GA3 | Independencia Catastro/NORA (BOTH_DIFFER muestra ambos; nunca sobrescribe) |
| GA4 | Cero persistencia de dirección (URL, storage, telemetría) |
| GA5 | Partición dos-años correcta (suma = known + no-VALID; denominadores explícitos) |
| GA6 | Invariante `selected_year` (T1) con compare_year activo |
| GA7 | Deep link `compare=` + `building=` restaura estado |
| GA8 | a11y: combobox, estados, teclado completo, axe 0 violaciones |
| GA9 | 320 px sin overflow; touch ≥44 px |
| GA10 | Chromium + Firefox + WebKit |
| GA11 | No-regresión G1 (smoke 3 motores) y G2 (G2-A 20/20, G2-B views) |
| GA12 | Rendimiento dentro de presupuesto §9; sin peticiones por frame |
| GA13 | Copy semantics: lint + revisión de literales prohibidos |

## 12. Evidencia requerida

`evidence/g3/g3a/` — corpus + resultados de identidad, matriz de discrepancia NORA/Catastro, reporte Playwright 3 motores, axe, screenshots desktop/móvil, matriz G1/G2.
