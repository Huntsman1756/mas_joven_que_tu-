# G1 — Presupuestos de rendimiento (preregistrados)

> G0 **caracterizó**; G1 **presupuesta**. Baseline ≠ objetivo.
> Nada de aquí se declara «aceptable» sin medirse con este perfil. Los valores se congelan
> en `docs/gates/G1.md` §PERFORMANCE **antes** de implementar.

## 1. Definiciones exactas

| Métrica | Definición operativa |
|---------|----------------------|
| `t_hero_interactive` | `navigationStart` → el campo de año acepta entrada (primer `input` con listener activo) |
| `t_result_ready` | activación del CTA → mapa con el encuadre municipal y `cells` visible **y** titular con cifra renderizada |
| `t_result_ready_buildings` | igual, con `buildings` visible (zoom inicial ≥ 13,5) |
| `t_year_change` | evento `input` del control de año → siguiente frame tras repintar mapa **y** distribución **y** anuncio `aria-live` |
| `t_place_change` | selección de resultado en la búsqueda → titular con la nueva cifra renderizado |
| `t_ortho_visible` | pulsación de «Ver la foto» → primera imagen de ortofoto visible en el mapa |
| `transfer_hero` | suma de `encodedBodySize` de documentos, JS, CSS y fuentes del primer encuadre del hero |
| `transfer_result` | igual, hasta `t_result_ready` (incluye teselas PMTiles efectivamente transferidas) |
| `build_js_raw` | suma de bytes de `app/build/_app/immutable/**/*.js` (sin comprimir) |
| `heap_after_journey` | `usedJSHeapSize` tras recorrer el journey canónico completo |
| `tile_failures` | `tileFailures / tileRequests` excluyendo campañas clasificadas `NOT_COVERED` |
| `uncaught` | `pageerror` + `unhandledrejection` no capturados |
| `console_errors` | `console.error` no incluidos en la lista blanca (§6) |

## 2. Perfiles de medición

### P1 — `local-desktop`

| Parámetro | Valor |
|-----------|-------|
| Navegador | Chromium/Chrome o Edge **stable**, versión fijada y registrada |
| Viewport | 1440 × 900, DPR 1 |
| CPU / red | sin throttling |
| Servidor | estático local con **HTTP Range** y compresión (`scripts/static-server.mjs`) |
| Caché | **fría** (contexto de navegador nuevo, sin service worker) |
| Repeticiones | **5**; se reporta mediana y p95 |
| Estado inicial | `INTRO` (cold) y `RESULT` con `?year=1987&place=leioa` |

### P2 — `mobile-emulated`

| Parámetro | Valor |
|-----------|-------|
| Navegador | mismo binario Chromium, **emulación de dispositivo** |
| Viewport | 390 × 844, DPR 3, `hasTouch`, `isMobile` |
| CPU | **×4 slowdown** (equivalente a un móvil de gama media) |
| Red | perfil **Slow 4G**: 1,6 Mbps bajada · 750 kbps subida · 150 ms RTT |
| Caché | fría |
| Repeticiones | **5**; mediana y p95 |

### P3 — `deployment-smoke`

| Parámetro | Valor |
|-----------|-------|
| Entorno | **hosting candidato real** (no `localhost`), HTTPS |
| Navegador | Chromium stable, 1440 × 900, sin throttling |
| Repeticiones | 3 |
| Propósito | verificar HTTP Range, compresión, MIME y `transfer_result` real |

**Regla dura:** **no se comparan ni se mezclan** valores de P1 (localhost sin throttling) con
valores de P2 (móvil emulado) en el mismo umbral.

## 3. Baseline medido en G0 (referencia, **no** objetivo)

| Métrica | Desktop P1 | Móvil P2 |
|---------|-----------|----------|
| canvas presente | 91–184 ms | 157–172 ms |
| primera tesela de ortofoto | 212–324 ms | 231–297 ms |
| cambio de año | 9–10 ms | 16–18 ms |
| `usedJSHeapSize` | 11,4–13,9 MB | 9,5–11,5 MB |
| transfer total (sin comprimir) | ≈1,36 MB | ≈1,36 MB |

Y medido por separado (`docs/design/spikes/g1_budget_basis.py`):

| Medición | Valor |
|----------|-------|
| assets de build raw / gzip | 1.339.816 B / **364.587 B** |
| `cells` z12 (encuadre) | 7.547 B |
| `buildings` z14 (encuadre) | 464.599 B |

## 4. Presupuestos

> Cada umbral lleva **rationale**. Si la implementación no los cumple, se **documenta** y se
> propone remediación; **no** se relaja el umbral (ver §7).

### 4.1 Carga

| Métrica | P1 | P2 | Rationale |
|---------|----|----|-----------|
| `transfer_hero` | ≤ 420 KB | ≤ 420 KB | hero sin MapLibre: solo shell JS/CSS/fuentes comprimidos (G0 gzip total 364.587 B incluía MapLibre). Deja margen para branding sin cargar el motor de mapa. |
| `t_hero_interactive` | p75 ≤ 900 ms · p95 ≤ 1.500 ms | p75 ≤ 2.000 ms · p95 ≤ 3.200 ms | entrada usable antes de que el usuario escriba. |
| `build_js_raw` | ≤ 1.800.000 B | — | invariante de repositorio, determinista. G0: 1.339.816 B ⇒ +34 % para branding, histograma, i18n y estado. Evita crecimiento silencioso. |

### 4.2 Resultado

| Métrica | P1 | P2 | Rationale |
|---------|----|----|-----------|
| `t_result_ready` | p75 ≤ 1.600 ms · p95 ≤ 2.400 ms | p75 ≤ 3.500 ms · p95 ≤ 5.000 ms | primer resultado con **celdas**: ≈372 KB (JS comprimido + JSON + celdas) ⇒ ≈1,9 s de transferencia a Slow 4G + parseo/ejecución con CPU ×4. Es la métrica de experiencia central de G1. |
| `transfer_result` | ≤ 620 KB | ≤ 620 KB | 358 KB (JS gzip) + 6 KB (agregados) + 8 KB (celdas) + margen. Sin edificios ni ortofoto. |
| `t_result_ready_buildings` | p75 ≤ 2.400 ms | p75 ≤ 5.000 ms · p95 ≤ 7.000 ms | añade ≈465 KB de teselas de edificios (medido). Solo ocurre si el encuadre inicial es z ≥ 13,5 o al acercar. |
| `t_year_change` | p95 ≤ 120 ms | p95 ≤ 300 ms | G0 midió 9–18 ms para el repintado del mapa. El margen cubre además repintar la distribución y emitir el anuncio accesible. |
| `t_place_change` | p95 ≤ 1.800 ms | p95 ≤ 3.500 ms | incluye consulta a NORA (≈100–300 ms), carga del JSON del municipio y nuevo encuadre. |
| `t_ortho_visible` | p75 ≤ 1.500 ms | p75 ≤ 3.000 ms | opt-in; cuadro de teselas JPEG de ≈300–600 KB. |

### 4.3 Estabilidad y memoria

| Métrica | P1 | P2 | Rationale |
|---------|----|----|-----------|
| `heap_after_journey` | ≤ 90 MB | ≤ **70 MB** | G0 móvil: 9,5–11,5 MB sin journey completo. 70 MB acota la caché de teselas y evita crecimiento no controlado en móvil; es 6× el baseline medido, margen suficiente para histograma y comparación. |
| `tile_failures` | ≤ 0,5 % | ≤ 0,5 % | G0: 0 fallos inesperados en 203 peticiones. **Excluye** `NOT_COVERED` (404 esperado y declarado). |
| `uncaught` | **0** | **0** | ninguna excepción no capturada en el journey canónico. |
| `console_errors` | **0** | **0** | solo la lista blanca de §6. |

## 5. Journey canónico medido

1. `INTRO` en frío.
2. Introducir año `1987`.
3. Buscar «Leioa» en NORA y seleccionar.
4. `RESULT` (celdas) — medir `t_result_ready`, `transfer_result`.
5. Cambiar año a `1970` y de nuevo a `1987` — medir `t_year_change`.
6. Acercar a z ≥ 14 — medir `t_result_ready_buildings`, cargar edificios.
7. «Ver la foto de 1990» — medir `t_ortho_visible`, verificar `orthoState`.
8. Copiar enlace; recargar la URL — verificar reproducción del resultado.
9. Medir `heap_after_journey`.

## 6. Lista blanca de errores de consola

Únicamente:

1. `404` de teselas raster de campañas clasificadas **`NOT_COVERED`** (MapLibre los registra).
2. Errores provocados **deliberadamente** en las pruebas de `SERVICE_ERROR` y de error de red
   de NORA.

Cualquier otro `console.error` cuenta como fallo del gate.

## 7. Política de remediación (anti-movimiento de goalposts)

- Los umbrales se congelan **antes** de implementar (`docs/gates/G1.md`).
- Si una medición **no** cumple: se documenta `BUDGET_MISS` con la medición, la causa y una
  propuesta de remediación (reducir payload, cambiar estrategia de carga, etc.).
- **No** se ajusta el umbral al resultado.
- Un cambio de umbral exige **enmienda explícita, fechada y justificada**, aprobada antes de
  volver a medir, y queda registrado en el histórico del gate.

## 8. Lo que NO es un presupuesto

- El tamaño de los PMTiles **completos** (no se descargan enteros: HTTP Range).
- La latencia de los servicios oficiales (geoEuskadi, geo.bizkaia.eus): son terceros y se
  **caracterizan**, no se presupuestan. Se presupuesta `tile_failures` y el comportamiento
  degradado.
- La latencia de NORA como tal; se presupuesta `t_place_change` extremo a extremo.
