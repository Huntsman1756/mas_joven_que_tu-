# G1-R2 — PERF10 root-cause / remediation spike

| Campo | Valor |
|---|---|
| Base | `53b1e8a` + corrección de evaluador + fix provenance 1956 |
| Gate | `docs/gates/G1.md` — sha256 `8532c2111feb06b490f80ebaf47d07db9e426feb4657b3cd34d6c79ff28872f1` (sin cambios) |
| UTC | 2026-09-17 |
| Evidencia | `evidence/g1-readjudication/2026-09-17T1710Z-53b1e8a/` → `out/perf10/perf10-decomp.json`, `perf10-preview-proto.json`, `perf10-request-decomp.json`, `preview-smoke.png` |
| Alcance | diagnóstico + spike. **Ninguna optimización implementada en producto.** |

## A. Defecto factual de provenance — CORREGIDO

La ficha oficial de ODB describe ORTO_BFA_1956 como *«contactos del vuelo utilizado
para Catastro 1956 [...] con fecha sin determinar entre 1953 y 1955»* (ortoimagen
generada 2019). El valor `flight_range: "1956-1957"` era incorrecto — corresponde
al **vuelo americano** (`ORTO_1956_57_AMERICANO` de geoEuskadi), no al vuelo
catastral del que deriva la ortoimagen.

Cambios:
- `pipeline/metrics.py` `CAMPAIGNS`: `1956-1957` → `None` (fuente del catálogo).
- `app/static/data/catalog.json` (artefacto generado): `flight_range: null`.
- `docs/DATA_SOURCES.md` §2.4: `PENDING` → `RESOLVED` con las fechas oficiales de
  vuelo de todas las campañas (1965: 3 vuelos 1963+1965; 1975: mayo 1975; 1983:
  junio 1983; 1990: mayo 1990; 1995: junio 1995; 1999: junio 1999; 2002: marzo
  2002). 1970 sigue `PENDING` → `null`.
- `tests/data/test_metrics.py`: +2 regresiones (`test_1956_flight_range_not_fabricated`,
  `test_catalog_json_matches_campaigns`). **36/36 PASS.**
- UI: con `null` el copy renderiza «Campaña 1956» sin fecha de vuelo (correcto).

## B. Descomposición de causa raíz (perfil P2 exacto)

CDP `response.timing` + `loadingFinished`, 20 reps por experimento, upstream
observado en **fase sana** durante esta batería (contrastar con fase degradada
del run formal: TTFB ≈ 2.950–3.000 ms).

### B1. Tesela única, conexión fría ×20

| Métrica | p50 | p95 |
|---|---|---|
| DNS | ~1 ms | 5 ms |
| TCP connect | ~62 ms | 97 ms |
| TLS | ~45 ms | 68 ms |
| **TTFB** (`sendEnd→receiveHeadersEnd`) | **174 ms** | 179 ms |
| total request | 308 ms | **2.962 ms** |

Protocolo `http/1.1` (sin multiplexado H2). En fase sana el servidor responde en
~25 ms + RTT emulado 150 ms. Los 2 outliers (~3 s) muestran micro-ventanas de
degradación incluso dentro de la fase sana.

### B2. Preconnect ×20

Ganancia observada: **0 ms** (la conexión precalentada no fue reutilizada por el
fetch; techo teórico si lo fuera = DNS+TCP+TLS ≈ **105 ms**). Conclusión: incluso
implementado perfectamente, no recorta 5,1 s → <3 s. Descartado como remediación.

### B3. Concurrencia (teselas simultáneas, 6 reps × n)

| n | mediana primer-total | lectura |
|---|---|---|
| 1 | 307 ms | base |
| 2 | 365 ms | +60 ms |
| 4 | 517 ms | cola en pool h1.1 |
| 8 | 650 ms | degradación modesta, sin colapso |

El fan-out no es el cuello de botella; el servidor atiende la ráfaga bien.

### B4. `/tile/256` vs `/export` 256/512 (misma extensión, 12 reps)

| Variante | ttfb | total | bytes |
|---|---|---|---|
| tile 256 | ~171 ms | ~400 ms | 16 KB |
| export 256 | ~174 ms | ~440 ms | 19 KB |
| export 512 | ~265 ms | ~760 ms | 75 KB |

Una imagen única grande es **peor** para first-visible (más bytes, render de
servidor más lento). Descartado.

### Conclusión de causa raíz

`t_ortho_visible ≈ TTFB_upstream + ~0,6–0,9 s cliente`. El TTFB del servidor
ArcGIS fluctúa **0,17 s ↔ 3,0 s** entre fases (misma tesela, mismo perfil,
minutos de diferencia). Ninguna palanca cliente (preconnect, concurrencia,
single-request) puede absorber un TTFB server-side de 3 s. El suelo first-visible
sin cambios de producto es ~0,9 s sano / ~5,1 s degradado.

## D. Prototipo: preview progresivo first-party — VIABLE

Implementación del spike (sin tocar producto, inyección post-clic en runtime):

- `ImageSource` `ortho-preview` con JPEG **real** derivado de ORTO_BFA_1990 vía
  `/export` oficial: 1024×645 px, **167 KB**, bbox = extent real de edificios
  (lon −3,448…−2,416 · lat 42,982…43,455), servido same-origin.
- Capa raster bajo `ortho`; las teselas oficiales cargan en paralelo encima.
- Solo tras opt-in; 0 requests de ortofoto antes del clic (verificado: las
  requests a `geo.euskadi.eus` pre-clic son el geocoder NORA, no ortofoto).

### Medición (sesión caliente idéntica al harness, 2 batches × 20 reps P2)

| Batch | p75 `t_preview_visible` | p95 | max | Umbral | Diag. tile p75 | Diag. all p75 |
|---|---|---|---|---|---|---|
| P2a | **1.764 ms** | 1.779 | 3.099 | ≤3.000 ✓ | 896 | 1.910 |
| P2b | **1.780 ms** | 1.807 | 2.886 | ≤3.000 ✓ | 899 | 1.913 |

- Diff de píxeles región mapa antes→t_preview: **72,6 %** medio → imagen real.
- `preview-smoke.png`: ortofoto reconocible tras los overlays, con atribución.
- El coste del preview es **independiente del upstream** (fichero local): ~1,7–1,8 s
  bajo Slow4G+CPU×4 con contienda de las teselas oficiales en el mismo pipe.
- En fase sana la primera tesela oficial (~0,9 s) llega antes que el preview:
  first-visible real = min(preview, tesela) → ~0,9 s sano / ~1,8 s degradado.
  **Pasa PERF10-P2 en ambas fases**, con ~40 % de margen.

## C. Tabla de decisión

| Estrategia | p75 P2 sano | p75 P2 degradado | requests | bytes | fidelidad | P5 | complejidad |
|---|---|---|---|---|---|---|---|
| Directo `/tile/` (statu quo) | ~0,9 s | ~5,1 s ✗ | ~5 ext | 85 KB | plena | ✓ | 0 |
| + preconnect | ~0,9 s | ~5,1 s ✗ | ~5 ext | 85 KB | plena | ✓ | trivial |
| export/WMS imagen única | ~0,8–1,5 s | ~4–5 s ✗ | 1 ext | 19–75 KB | plena | ✓ | media |
| **Preview first-party + teselas** | ~0,9 s (tesela) | **~1,8 s (preview)** | +1 local +5 ext | +167 KB | baja→plena | ✓ | media |

## Recomendación (remediación mínima)

Implementar el preview progresivo oficial:

1. `app/static/data/ortho-preview/{year}.jpg` — una imagen por campaña (9 ficheros,
   ~150–200 KB c/u ≈ 1,5 MB estático), generados con script fijado desde `/export`
   oficial (documentar en DATA_SOURCES.md; derivado CC BY 4.0, misma atribución ya
   visible en UI).
2. `MapView.svelte`/`OrthoControls.svelte`: tras opt-in, `addSource(image)` +
   capa raster bajo `ortho`; eliminar al ocultar. Invariante: sin requests de
   ortofoto antes del clic (P5) — el preview se añade en el mismo handler.
3. Evaluador PERF10 (tooling): el predicado de first-visible debe aceptar el
   primer render de `ortho-preview` **o** de tesela `ortho` — medirá lo que el
   usuario ve primero.
4. Readjudicar los 72 criterios sobre el nuevo candidato.

Ficheros de producto que cambiarían: `MapView.svelte`, `OrthoControls.svelte`
(o equivalente), `catalog.json` (+campo preview), `app/static/data/ortho-preview/*`,
script de generación + test, documentación (DATA_SOURCES/PRODUCT/UX_COPY, ADR).

## Integridad

- Gate sha256 sin cambios: `8532c211…`.
- Umbrales, perfiles, repeticiones: intactos.
- El spike no toca `app/src`; el preview usado en la medición vivió en `build/`
  (artefacto generado) e inyección runtime.
- Único cambio de producto de esta fase: fix factual `flight_range` 1956
  (autorizado explícitamente) → nuevo candidato.
