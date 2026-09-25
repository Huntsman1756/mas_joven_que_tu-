# Adjudicación G19-R4 — semántica de modos + aislamiento

**Commit evaluado:** `bc3a034` (rama `g11-visual-renewal`)
**Fecha adjudicación:** 2026-09-25
**Adjudicador:** humano (revisión visual de capturas `evidence/g19r4/`)

## Gates adjudicados

| Gate | Resultado | Base de evidencia |
|---|---|---|
| `MODE_SEMANTICS` | **PASS** | `docs/MAP_MODE_CONTRACT.md` escrito desde código real; intros de modo no intercambiables (clasificar / reproducir / observar) |
| `MODE_ISOLATION` | **PASS** | `mode_isolation.txt` — 19/19 checks sobre `bc3a034`: tab==mode==URL==capas==player, sin stale state, ortho/histmap/cells exclusivos por modo |
| `MAP_VS_TIME_VISUAL_DISTINCTION` | **PASS** | `b-map-1952.png` vs `b-time-1952.png` — misma cámara (`43.2625,-2.928 z14.3`, `matrix.json`): lienzo denso-bicolor vs escaso-monocromo; 2039 edificios post-1952 visibles en map vs 0 en time (`buildings-map-vs-time.json`) |
| `PHOTO_RASTER_PRIMARY` | **PASS** | `b-photo-1956.png` — ortofoto 1956 real como fuente primaria, `cellsVisible:false`, player discreto con ticks de campañas, atribución `Open Data Bizkaia · 1956 · CC BY 4.0` |

Nota: `mode_isolation.mjs` no se reejecuta — sin cambio de código tras
`bc3a034`, la evidencia existente sigue siendo válida.

## Último gate pendiente antes de deploy: test humano de 5 s

Protocolo (sin explicar qué hace cada pestaña; 2–3 personas ajenas):

1. Mostrar **Por antigüedad** 5 s → "¿Qué crees que está mostrando?"
   PASS ≈ "qué edificios son anteriores/posteriores a una fecha".
   FAIL ≈ "cómo cambia con el tiempo" / "una foto antigua".
2. Mostrar **Evolución** 5 s → misma pregunta.
   PASS ≈ mover el tiempo y aparecer/desaparecer edificios.
   FAIL ≈ "otro mapa de antigüedad estático".
3. Mostrar **Fotos aéreas** 5 s → misma pregunta.
   PASS ≈ fotografías/ortofotos reales de distintos años.
   FAIL ≈ otra visualización del Catastro/heatmap.

Distinción mental objetivo: clasificar / reproducir / observar.

| Persona | Por antigüedad | Evolución | Fotos aéreas | Resultado |
|---|---|---|---|---|
| 1 | | | | |
| 2 | | | | |
| 3 | | | | |

Regla de decisión:

- 3/3 distinguen los tres modos → **PASS** → deploy.
- 2/3 + una duda que corrige al interactuar → `PASS_WITH_FINDING` → deploy + anotar.
- ≥2 confunden Por antigüedad con Evolución → **no deploy**; corregir solo copy/intro.
- Confusión de Fotos aéreas con otro modo → problema serio → no deploy.

## Secuencia post-PASS

`bc3a034 → deploy → prod_smoke → NV-18/19 (NVDA real) → MOB-05b (móvil físico)`

Tras el deploy: actualizar `evidence/g19/HUMAN_GATES.md` con el nuevo SHA
de gh-pages. No abrir nuevas fases funcionales; solo defectos reales de
producción o de las pruebas humanas.
