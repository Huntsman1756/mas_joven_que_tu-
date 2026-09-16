# G1 — Modelo de estado de la experiencia

> Fase de diseño. **No implementación.** Contratos de datos: `DATA_SEMANTICS.md` §11.
> Este documento es normativo para la implementación de G1.

## 1. Fuente única de verdad

El estado se separa en tres bloques **independientes**. Mezclarlos es la causa más probable
de bugs de coherencia (universo que cambia con el zoom, año que se reescribe solo).

```
PERSONAL   selectedYear · selectedPlace · statisticalUnit
MAP        view{lat,lon,zoom,bearing,pitch} · activeScaleLevel · selectedBuildingId
ORTHO      orthoCampaign · orthoState · orthoComparison
```

`statisticalUnit` **nunca** lo modifica un gesto de mapa. Solo lo modifica elegir otro lugar.

## 2. Estados de la máquina principal

| Estado | Entrada | Salida | UI visible | Datos necesarios | Recuperación | URL |
|--------|---------|--------|------------|------------------|--------------|-----|
| `INTRO` | carga inicial | `INPUT_READY` al enfocar un campo | hero: marca, pregunta, 2 campos, 1 CTA | ninguno | — | `/` (sin params) |
| `INPUT_READY` | año y lugar válidos | `LOCATION_RESOLVING` o `RESULT` | CTA habilitado | lista de municipios (estática) | validación en línea | `?year=&place=` |
| `LOCATION_RESOLVING` | se elige un resultado de búsqueda | `RESULT` | resultado de búsqueda con estado | NORA | error → se queda en `INPUT_READY` con copy | igual |
| `RESULT` | año + `statisticalUnit` | `ORTHO_*`, `SHARE`, `INTRO` | titular + cobertura + mapa + distribución | `metrics_{mun}.json` + tiles `cells` | si falla el JSON → `SERVICE_ERROR` parcial | `?year=&place=&lat=&lon=&z=` |
| `ORTHO_LOADING` | se pulsa «Ver la foto» | `ORTHO_AVAILABLE` / `NOT_COVERED` / `SERVICE_ERROR` | encuadre + indicador | azulejos de la campaña | timeout 8 s → `SERVICE_ERROR` | `?ortho=` |
| `ORTHO_AVAILABLE` | imagen válida | `RESULT` | raster bajo los edificios + fuente y fecha | — | — | `?ortho=` |
| `NOT_COVERED` | la campaña no cubre el punto | `ORTHO_LOADING` (otra campaña) o `RESULT` | aviso + alternativas verificadas | sondeo de cobertura | se puede cerrar sin perder el resultado | `?ortho=` |
| `SERVICE_ERROR` | fallo de red/XML/blanco | `ORTHO_LOADING` (reintento) | aviso, resto operativo | — | botón «Reintentar» | se conserva |
| `DATA_LOW_COVERAGE` | `coverage_pct` del municipio < umbral | `RESULT` | **modificador** de `RESULT`, no estado propio | `coverage_pct` | — | — |
| `SHARE_STATE` | se pulsa «Compartir» | `RESULT` | confirmación breve | URL canónica | — | — |

**`DATA_LOW_COVERAGE` es un modificador, no un estado.** El resultado siempre se muestra; el
aviso se añade. (`coverage_hide_stat` < 70 % refuerza el disclaimer, nunca oculta la cifra.)

## 3. Estados de dominio de la ortofoto

```
orthoState(location, campaign) ∈ { AVAILABLE, NOT_COVERED, SERVICE_ERROR, UNKNOWN }
```

| Valor | Detección | Consecuencia |
|-------|-----------|--------------|
| `UNKNOWN` | sin comprobar | estado inicial; **no** se muestra «no hay foto» |
| `AVAILABLE` | `HTTP 200` + `image/*` + imagen **con contenido** (> 1 color) | se pinta |
| `NOT_COVERED` | `HTTP 404` de la tesela en el punto | copy «no cubre este lugar» + alternativas verificadas |
| `SERVICE_ERROR` | error de red, `HTTP 5xx`, cuerpo XML `ServiceException`, imagen **blanca** | copy de indisponibilidad temporal + reintento |

Reglas:

- **La distinción `NOT_COVERED` / `SERVICE_ERROR` es obligatoria.** No es lo mismo «esta
  campaña no llegó aquí» que «el servicio está caído».
- **Nunca** sustituir la campaña en silencio.
- `UNKNOWN` **nunca** se presenta como `NOT_COVERED`.
- Las alternativas («Prueba 1970 o 1983») solo se ofrecen **después** de verificar su cobertura.

## 4. Estados del nivel de escala

```
activeScaleLevel ∈ { BIZKAIA, MUNICIPIO, CELDA, EDIFICIO }
```

Derivado del zoom (§6.2 de `G1-TU-BIZKAIA.md`), **no** del universo estadístico:

| Zoom | Nivel | Capa |
|------|-------|------|
| ≤ 8 | `BIZKAIA` | `municipalities` |
| 8 < z < 13,5 | `MUNICIPIO` / `CELDA` | `cells` |
| ≥ 13,5 | `EDIFICIO` | `buildings` |

Cambiar `activeScaleLevel` **no** dispara ningún recálculo de métricas: las cifras ya están
en los agregados canónicos. El frontend solo cambia la representación.

## 5. Estados de la búsqueda de lugar

| Estado | Disparador | UI | Copy |
|--------|-----------|-----|------|
| `IDLE` | consulta vacía | campo normal | — |
| `TOO_SHORT` | < 3 caracteres | aviso en línea | «Escribe al menos 3 caracteres.» |
| `SEARCHING` | ≥ 3 caracteres | indicador en el campo | «Buscando…» |
| `RESULTS` | ≥ 1 resultado | lista navegable con teclado | «{n} resultados en NORA» |
| `NO_RESULTS` | 0 resultados | aviso | «No encontramos «{q}» en Bizkaia. Prueba con un municipio.» |
| `OUT_OF_SCOPE` | resultados fuera de Bizkaia | aviso | «NORA reconoce {n} lugares, pero no están en Bizkaia.» |
| `NETWORK_ERROR` | fallo de NORA | aviso recuperable | «No hay conexión con el geocodificador oficial (NORA).» |

Un resultado de tipo calle/portal/topónimo **centra la cámara**; el `statisticalUnit` pasa a
ser el **municipio que lo contiene**, y el titular lo declara.

## 6. Estado en la URL

Serialización canónica:

```
/?year=1987&place=leioa&lat=43.3278&lon=-2.9863&z=12.4
```

| Clave | Tipo | Default | Derivación |
|-------|------|---------|------------|
| `year` | entero `[1900, snapshot_year]` | ausente → `INTRO` | — |
| `place` | slug de municipio (`leioa`) | ausente → `INTRO` | valida contra el catálogo |
| `lat`, `lon` | decimal, 5 cifras | centro del municipio | **derivable**: si falta, se deriva de `place` |
| `z` | decimal, 1 cifra | `12.0` | — |
| `ortho` | año de campaña | ausente = sin ortofoto | valida contra el catálogo |

Reglas:

- **No se serializa información redundante** que pueda derivarse (p. ej. el nombre del
  municipio; solo el slug).
- Valores inválidos: se **ignoran** y se cae al default; nunca se muestran errores por URL
  manipulada.
- `year` ausente ⇒ `INTRO`. `place` ausente con `year` presente ⇒ se pide el lugar.
- `lat/lon/z` **no** afectan a la estadística (§4 de `G1-TU-BIZKAIA.md`).
- Sin versión de esquema en G1 (los defaults son tolerantes); si en el futuro se elimina una
  clave, se documentará migración.
- Compartir/recargar/atrás/adelante deben reproducir el **mismo resultado**, no
  necesariamente el mismo encuadre exacto.

## 7. Invariantes

1. `statisticalUnit` es siempre un municipio de Bizkaia.
2. Ningún cambio de `view` modifica `statisticalUnit`.
3. Ningún cambio de `view` dispara recálculo de métricas.
4. `selectedYear` solo lo cambian: la persona (slider/entrada) y la URL. Nunca el mapa, nunca
   la distribución, nunca la ortofoto.
5. Toda cifra mostrada procede de un agregado canónico ya calculado; el frontend no recompone
   denominadores.
6. Todo estado de error es **recuperable** o explícitamente terminal con copy; nunca un
   indicador de carga sin fin.
