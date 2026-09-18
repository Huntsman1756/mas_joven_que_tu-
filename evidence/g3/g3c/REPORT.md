# G3-C — Reporte: Mapa histórico 1923–1925

Baseline: G3-B `36fa5cc`. Rama: `g3c-historical-map`.
Gate: `docs/gates/G3-C.md` (preregistrado en `1117c43`, antes de implementar).

## A. Gate SHA

`1117c43` — docs/gates/G3-C.md + manifest fuente + evidencia export 3857.

## B. Source manifest

`data/manifests/bizkaia.cartografia.historica.1923-1925.yaml` — actualizado de
`STUDY_ONLY` a `ADOPTED_G3C`:

- Dataset ODB `hojas-de-la-cartografia-historica-1-25-000-1923-1925-…` (DFB).
- Recursos: WMTS nativo EPSG:25830 · ArcGIS `export` (runtime) · WMS INSPIRE
  (descartado: `layers=0` = índice toponímico de hojas, no la cartografía).
- Licencia: CC-BY-4.0 vía aviso legal general del portal (el dataset no
  declara licencia propia en CKAN ni en WMTS `AccessConstraints` —
  documentado `license_note`, verificado 2026-09-18).
- Nominal 1923–1925 **por hoja**, no fecha por píxel. `frequency: not_planned`
  (serie cerrada).

## C. CRS proof

- WMTS `default028mm` = EPSG:25830 → no usable como tesela Web Mercator
  (regla congelada: prohibido asumir tile matrix 3857).
- Reproyección server-side: `MapServer/export?bboxSR=3857&imageSR=3857`.
  Punto de control: `evidence/g3/g3x/export_3857_detail.jpg` — Deusto/ría
  legible a nivel edificio; `export_3857_bilbao.jpg` — Bizkaia completa.
- Determinismo verificado en test: `toMercator(-2.93, 43.26)` →
  (−326 211, 5 351 631) — `histmap.test.ts`.

## D. Implementation commits

- `app/src/lib/domain/histmap.ts` — URL `{bbox-epsg-3857}`, source def,
  `toMercator`, sonda `probeHistMap` (200 + image/* + decodable → AVAILABLE).
- `app/src/lib/state/app.svelte.ts` — `histMapVisible`/`histMapState`, reset
  en `selectPlace` y `reset` (misma regla que ortofoto).
- `app/src/lib/map/MapView.svelte` — capa `histmap` raster opt-in bajo las
  vectoriales (mismo apilado que ortofoto), retirada si UNAVAILABLE.
- `app/src/lib/components/HistMapControls.svelte` — sección opt-in con
  proposal/loading/src/unavailable/retry/hide; sonda «último lugar gana».
- `app/src/lib/components/ResultView.svelte` — integración tras OrthoControls.
- `app/src/lib/i18n/es.ts` — claves `histmap.*` (copy contract §5).
- `app/src/lib/domain/histmap.test.ts` — contrato de URL + proyección.
- `app/scripts/g3c_histmap.mjs` — sonda funcional (main/reflow/axe).

## E. Network contract (GC3 — medido)

| Momento | Requests a `ORTO_EJ_CARTO_1925` |
|---------|-------------------------------|
| Carga + 2,5 s idle, antes del opt-in | **0** |
| Tras activar (Bilbao z16) | 55 (navegación incl.) |
| Tras activar (edificio deep-link) | 35 |

Sin descarga global: cada request es un `export` por tesela del viewport.

## F. Screenshots — mismo punto, actual vs 1923–25

- `browser/g3c-map-actual.png` — vista actual z16 (edificio seleccionado,
  Urazurrutia/Matiko, Bilbao).
- `browser/g3c-map-1925.png` — **mismo extent** sobre cartografía 1923–25:
  Matiko, funicular de Artxanda, trama histórica; las huellas vectoriales
  siguen encima del raster.
- `browser/g3c-histmap-bilbao.png`, `g3c-failclosed.png`, `g3c-mobile-320.png`.

MI EDIFICIO (GC4): deep-link `building=20-1202-6001-1-2` → activación muestra
el mismo punto; no se infiere existencia/inexistencia (copy contract).

## G. a11y matrix

| Check | Resultado |
|-------|-----------|
| Equivalente textual | Fuente+fecha+licencia siempre visible con la capa activa; proposal/estado en texto |
| axe-core | **0 violaciones** (`--axe`) |
| Teclado | Botón opt-in focuseable, Enter activa (verificado) |
| 320 px | Sin overflow (`hscroll=false` antes y tras activar), target 44 px |
| 400 % / reduced-motion | Sin animaciones propias; hereda reglas de mapa |
| Estado de fallo | `role="alert"` + retry + hide |

## H. Perf matrix (medido, Chromium, local)

| Métrica | Valor |
|---------|-------|
| t→`AVAILABLE` | 173 ms |
| t→viewport tiles idle (primer uso) | ~2,2 s |
| Requests / bytes primer uso | 37 req / 354 KB |
| Reactivación (hide→show) | ~1,5 s (caché) |
| Δheap | ~0 MB |

Upstream `export` unitario: 0,22–0,47 s (sonda G3-X). Sin prefetch, sin
descarga global — consistente con presupuesto G1 (nada toca el path crítico:
la sección no existe hasta que `app.place`).

## I. Regression matrix

| Suite | Resultado |
|-------|-----------|
| svelte-check | 0 errores, 0 warnings |
| vitest | 102/102 |
| node static-server | 15/15 |
| eslint | limpio |
| prettier --check | limpio |
| build estático | OK |
| G3-B planning probe | **pass** (muni + local + geom opt-in + fail) |
| G3-A flow | **pass** Chromium + Firefox + WebKit (EXACT, combobox, deep-link) |
| G2-A play | 20/20 PASS |
| G2-B views | all PASS (3 vistas, axe ×5, 320 px, reduced-motion) |
| G1 perf gate | P2 `t_ortho_visible` p75 = 1 138 ms ≤ 3 000 |

## J. Verdict

**GC1–GC10 PASS.**

- GC1 gate preregistrado `1117c43` ✓
- GC2 manifest + licencia documentada (CC-BY-4.0 portal terms) ✓
- GC3 0 requests pre-opt-in ✓
- GC4 mismo extent + salto MI EDIFICIO ✓
- GC5 fail-closed UNAVAILABLE, app usable ✓
- GC6 copy contract (mapa≠foto, nominal≠exacto, superficie≠ancla) ✓
- GC7 a11y (axe 0, teclado, 320 px, equivalente textual) ✓
- GC8 perf medido sin descarga global ✓
- GC9 no-regresión completa ✓
- GC10 este reporte ✓

`G3C_PASS` — pendiente de revisión humana. NVDA/móvil físico:
`PENDING_HUMAN` pre-submit (como G1/G2/G3-A/G3-B, no bloquea).

STOP respetado: sin módulos de contexto (G3-D), sin deltas, sin prosa
editorial de historias.
