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

## Ciclo post-adjudicación (2026-09-26)

La revisión de capturas sobre el build servido encontró **dos defectos
reales** que invalidaban la adjudicación de `bc3a034`:

1. **D1 — Evolución mezclaba dos semánticas cromáticas**: filtraba por
   `playYear` pero seguía coloreando respecto a `birthYear`; la leyenda
   nombraba dos fechas a la vez («ya existía en 1922» + «construidos
   hasta 1945»). Fix: clase única «año de construcción conocido» +
   unknown a rayas; la leyenda habla solo de `playYear`.
2. **D2 — Fotos podía dar canvas blanco mudo** (captura 1965): capa
   montada sin imagen verificada. Fix: `orthoRender`
   (`IDLE/LOADING/CONTENT/EMPTY/ERROR`) declarado en el lienzo —
   `ADR-025`.

Gate fresco sobre el código corregido: `mode_isolation.mjs` **26/26
PASS** (`mode_isolation.txt`), incluidas regresiones
`time_single_class_fill`, `time_legend_playyear_only`,
`time_1974_single_class` (1 298 edificios 1952<y≤1974 reincorporados con
clase única), `photo_render_content`, `photo_notcovered_declared` y
`photo_render_error_retry`.

Capturas del cierre (misma cámara, Bilbao/1922, `matrix-c.json`):
`c-map-1922.png` (bicolor, binaria), `c-time-1922.png` y
`c-time-1945.png` (monocromo acumulado, clase única),
`c-photo-1965.png` (`orthoRender=CONTENT`, ortofoto real, atribución
Open Data Bizkaia · 1965 · CC BY 4.0).

**Estado tras el fix:** `MODE_SEMANTICS` y `MODE_ISOLATION` mantienen
PASS (el contrato no cambió; se reforzó su cumplimiento).
`MAP_VS_TIME_VISUAL_DISTINCTION` y `PHOTO_RASTER_PRIMARY` quedan
**pendientes de re-adjudicación sobre `c-*.png`** — el código bajo
test humano es el nuevo commit, no `bc3a034`.

## Último gate pendiente antes de deploy: test humano de 5 s

Gate cualitativo estrecho: no demuestra usabilidad general, solo si los
tres modos comunican conceptos distintos sin explicación previa.

**Build bajo test:** commit del fix (working tree al ejecutar —
posterior a `bc3a034`; el diff se registra en el commit del cierre).
Servir con `npm run build && npm run serve` (build estático real, no dev).

Protocolo — **3 personas ajenas**, sin explicar qué hace cada pestaña.
Pregunta literal: **"¿Qué crees que está mostrando?"** tras 5 s por vista.
Sin preguntas guía ("¿ves que cambia el tiempo?" está prohibido).
Orden rotado para evitar aprendizaje:

| Persona | Orden de vistas |
|---|---|
| 1 | Por antigüedad → Evolución → Fotos aéreas |
| 2 | Fotos aéreas → Por antigüedad → Evolución |
| 3 | Evolución → Fotos aéreas → Por antigüedad |

Criterios por vista:

- **Por antigüedad** — PASS ≈ "qué edificios son anteriores/posteriores a
  una fecha". FAIL ≈ "cómo cambia con el tiempo" / "una foto antigua".
- **Evolución** — PASS ≈ mover el tiempo y aparecer/desaparecer
  edificios. FAIL ≈ "otro mapa de antigüedad estático".
- **Fotos aéreas** — PASS ≈ fotografías/ortofotos reales de distintos
  años. FAIL ≈ otra visualización del Catastro/heatmap.

Registrar primero la **respuesta espontánea literal**. Si alguien duda,
solo después dejarle interactuar y anotar aparte si se corrige
(`duda→corrige`) — distingue comprensión inmediata de comprensión tras uso.

Disciplina durante la prueba:

- No decir en voz alta el nombre de la pestaña.
- Sin gestos ni señales sobre el player ni la leyenda.
- No explicar qué significa el bermellón/azul.
- Anotar la respuesta literal **antes** de interpretar si cuenta como PASS.
- Cronometrar de verdad ~5 s por vista.
- Mismo municipio/año/cámara para las tres personas (Bilbao, 1952).

| Persona | Vista 1 | Vista 2 | Vista 3 | Resultado |
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

`commit del cierre → deploy → prod_smoke → NV-18/19 (NVDA real) → MOB-05b (móvil físico)`

Tras el deploy: actualizar `evidence/g19/HUMAN_GATES.md` con el nuevo SHA
de gh-pages. No abrir nuevas fases funcionales; solo defectos reales de
producción o de las pruebas humanas.
