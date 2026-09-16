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
| `uncaught` | `pageerror` + `unhandledrejection` no capturados durante el journey canónico |
| `console_errors` | `console.error` no incluidos en la lista blanca de §6 |
| `own_asset_failures` | fallos de activos **first-party** (`*.pmtiles`, JS, CSS, `metrics/*.json`, `catalog.json`) en el journey canónico. Umbral: **0** (ver `docs/gates/G1.md` §RELIABILITY) |
| `ext_ortho_availability` | disponibilidad de la ortofoto **externa**: se **caracteriza**, no se presupuesta. `NOT_COVERED` no es fallo |
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
| Repeticiones | **20** en mÃ©tricas con percentil Â· **5** en mÃ©tricas de valor Ãºnico (transferencia, heap). Se reportan p75, p95 y mÃ¡ximo observado. |
| Estado inicial | `INTRO` (cold) y `RESULT` con `?year=1987&place=leioa` |

### P2 — `mobile-emulated`

| Parámetro | Valor |
|-----------|-------|
| Navegador | mismo binario Chromium, **emulación de dispositivo** |
| Viewport | 390 × 844, DPR 3, `hasTouch`, `isMobile` |
| CPU | **×4 slowdown** (equivalente a un móvil de gama media) |
| Red | perfil **Slow 4G**: 1,6 Mbps bajada · 750 kbps subida · 150 ms RTT |
| Caché | fría |
| Repeticiones | **20** en mÃ©tricas con percentil Â· **5** en mÃ©tricas de valor Ãºnico. Se reportan p75, p95 y mÃ¡ximo observado. |

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
| `transfer_hero` | ≤ 420 KB | ≤ 420 KB | hero sin MapLibre: solo shell JS/CSS/fuentes comprimidos (G0 gzip total 364.587 B incluía MapLibre). Deja margen para branding sin cargar el motor de mapa. **Solo first-party**; excluye JPEG/WMS externos. |
| `t_hero_interactive` | p75 ≤ 900 ms · p95 ≤ 1.500 ms | p75 ≤ 2.000 ms · p95 ≤ 3.200 ms | entrada usable antes de que el usuario escriba. **20 repeticiones** mínimas. |
| `build_js_raw` | ≤ 1.800.000 B | — | invariante de repositorio, determinista. G0: 1.339.816 B ⇒ +34 % para branding, histograma, i18n y estado. Evita crecimiento silencioso. |

### 4.2 Resultado

| Métrica | P1 | P2 | Rationale |
|---------|----|----|-----------|
| `t_result_ready` | p75 ≤ 1.600 ms · p95 ≤ 2.400 ms | p75 ≤ 3.500 ms · p95 ≤ 5.000 ms | primer resultado con **celdas**: ≈372 KB (JS comprimido + JSON + celdas) ⇒ ≈1,9 s de transferencia a Slow 4G + parseo/ejecución con CPU ×4. **20 repeticiones**: con 5 no se puede estimar un p95 con seriedad. Se reportan p75, p95 y **el máximo observado**. |
| `transfer_result_first_party` | ≤ 620 KB | ≤ 620 KB | 358 KB (JS gzip) + 6 KB (agregados) + 8 KB (celdas) + margen. **Solo first-party**: excluye explícitamente teselas de ortofoto externas (JPEG/WMS). Sin edificios ni ortofoto. |
| `transfer_result_buildings_first_party` | ≤ 1.100 KB | ≤ 1.100 KB | caso en que el encuadre inicial cae en `z ≥ 13,5` y hay que servir teselas de edificios (medido: 464.599 B en un encuadre z14 de Bilbao). **Solo first-party**. |
| `t_result_ready_buildings` | p75 ≤ 2.400 ms · p95 ≤ 3.200 ms | p75 ≤ 5.000 ms · p95 ≤ 7.000 ms | añade las teselas de edificios. **20 repeticiones**. |
| `t_year_change` | p95 ≤ 120 ms | p95 ≤ 300 ms | G0 midió 9–18 ms para el repintado del mapa. El margen cubre además repintar la distribución y emitir el anuncio accesible. **20 repeticiones**. |
| `t_place_change` | p95 ≤ 1.800 ms | p95 ≤ 3.500 ms | incluye consulta a NORA (≈100–300 ms), carga del JSON del municipio y nuevo encuadre. **20 repeticiones**. |
| `t_ortho_visible` | p75 ≤ 1.500 ms | p75 ≤ 3.000 ms | opt-in; cuadro de teselas JPEG de ≈300–600 KB de un **servicio externo**. Se mide aparte y su disponibilidad **no** condiciona la corrección del producto (§4.3). **20 repeticiones**. |

### 4.3 Estabilidad y memoria

| Métrica | P1 | P2 | Rationale |
|---------|----|----|-----------|
| `heap_after_journey` | ≤ **60 MB** | ≤ **40 MB** | G0: 11,4–13,9 MB (P1) y 9,5–11,5 MB (P2) **sin** journey completo. 60/40 MB son ≈4× el baseline respectivo: margen para histograma, búsqueda y comparación, y a la vez un techo que **acota la caché de teselas**. El factor 4× se declara como decisión, no como cálculo. |
| `uncaught` | **0** | **0** | ninguna excepción no capturada en el journey canónico. |
| `console_errors` | **0** | **0** | solo la lista blanca de §6. |

> **La tasa de fallos de teselas ya no es un presupuesto mezclado.** Se separa en
> `docs/gates/G1.md` §RELIABILITY: **0 fallos de activos propios** (PMTiles, JS, CSS, JSON) y
> **medición aparte** de la ortofoto externa, donde `NOT_COVERED` **no** es fallo y
> `SERVICE_ERROR` debe degradar correctamente. Un proveedor público temporalmente indisponible
> no debe hacer fallar estadísticamente el producto.

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
- La **disponibilidad** de los servicios oficiales (geoEuskadi, geo.bizkaia.eus): son terceros
  y se **caracterizan**, no se presupuestan. No hay un umbral de fallo de ortofoto externa;
  lo que se exige es el **comportamiento degradado correcto** (`REL7`) y que su indisponibilidad
  temporal en la release produzca `G1_BLOCKED`, no `G1_FAIL` (`REL8`).
- Las **tasas de fallo de activos propios no son un presupuesto de rendimiento**: son un
  criterio de fiabilidad con umbral **0** (`REL6`).
- La latencia de NORA como tal; se presupuesta `t_place_change` extremo a extremo.
