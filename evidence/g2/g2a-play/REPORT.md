# G2-A — Verificación del núcleo temporal (Play/scrub + marcas de campaña)

- **Fecha:** 2026-09-18 · **Rama:** `g2-competition-cut`
- **Alcance:** G2-A únicamente (gate `docs/gates/G2.md` §TIME/§FOTO/§SEM).
  Hotspots (§H) y resto de G2 **fuera de alcance** — veredicto acotado.
- **Implementación:** `1c26266` · **Evidencia:** este directorio.

## Matriz de criterios (harness `app/scripts/g2a_play.mjs`)

| Check | Chromium | Firefox | WebKit |
|-------|----------|---------|--------|
| F1 marcas = catálogo | PASS | PASS | PASS |
| A3 objetivos ≥44px | PASS | PASS | PASS |
| T1 `selected_year` inmutable + titular anclado | PASS | PASS | PASS |
| T2 progresión (40 años 1987→2026) | PASS | PASS | PASS |
| T7 fin en `snapshot_year`, autoparo | PASS | PASS | PASS |
| F3 0 peticiones orto durante Play | PASS | PASS | PASS |
| URL sin escrituras por frame (1 discreta en ciclo) | PASS | PASS | PASS |
| T5 celda = cumulative canónico S2 (6 celdas) | PASS | PASS | PASS |
| T3 scrub / restart | PASS | PASS | PASS |
| Teclado (flechas ±1) | PASS | PASS | PASS |
| F2 acción de marca → contrato orto | PASS | PASS | PASS |
| F3' orto solo tras acción explícita | PASS | PASS | PASS |
| T2' pausa/reanudar | PASS | PASS | PASS |
| A2 live status | PASS | PASS | PASS |
| T4 filtro edificios (VALID≤P, SUSPICIOUS visible) | PASS | PASS | PASS |
| T6 reduced-motion (sin Play, paso equivalente) | PASS | PASS | PASS |
| S3 deep link `?play=` pausado y persistente | PASS | PASS | PASS |
| 320px + touch | PASS | n/a | n/a |
| Heap tras 3 ciclos | 28,8→23,0 MB | n/a | n/a |

## Regresión G1 (sin tocar umbrales)

- `launch_browser_smoke`: chromium/firefox/webkit PASS; `--zoom400` sin clipping.
- `g1r_cell_detail`: 17/17 PASS. `g1r_ortho_preview`: 6/6 escenarios PASS.
- `npm run check` 0 errores · `lint` 0 errores · `test` 70/70 + 15 · `build` OK.

## Notas

- La marca de campaña solo se activa cuando el eje la alcanza
  (`playYear ?? selected_year >= c.year`); su clic invoca `probeCampaign` —
  la cámara no se toca (centro/zoom/bearing/pitch intactos por construcción).
- En 320px las marcas de 44px cubren parte del eje: son objetivos táctiles
  propios por diseño; el scrub responde en los huecos (verificado).
- `performance.memory` es API de Chromium; heap no medible en Firefox/WebKit.

## Veredicto G2-A

**G2-A PASS** — núcleo temporal verificado según gate congelado. No es un
`G2_PASS`: quedan §H (historias/hotspots), comparación orto y HR3.
