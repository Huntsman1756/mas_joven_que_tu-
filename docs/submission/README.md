# docs/submission — paquete de entrega (concurso DF 73/2026)

> Estado: **DRAFT**. El contenido está escrito contra el candidato G5
> (`g5-editorial-redesign`); se congela solo tras `G5_PASS`
> (aceptación humana + PERF4 calibrado). Ver `docs/gates/G5.md`.

Documentación técnica exigida por la **Base 6** del Decreto Foral 73/2026
y materiales de apoyo a la solicitud. Regla de redacción (COMPETITION.md
§2): Open Data Bizkaia es la **fuente principal**; el resto son
complementos.

## Contenido

| Documento | Base | Estado |
|-----------|------|--------|
| `TECHNICAL-MEMORY.md` | Base 6 — proceso de trabajo, herramientas y técnicas | DRAFT |
| `SOURCES-LICENSES.md` | Base 6 + Base 18 — procedencia/acceso del dataset y licencias (datos ≠ software) | DRAFT |

## Checklist de entrega (COMPETITION.md §7)

| Entregable | Dónde | Estado |
|------------|-------|--------|
| Memoria técnica | `TECHNICAL-MEMORY.md` | DRAFT |
| Catálogo de fuentes y licencias | `SOURCES-LICENSES.md` + `data/manifests/` | DRAFT |
| Documentación técnica Base 6 | `docs/METHODOLOGY.md`, `docs/DATA_SOURCES.md`, `docs/DATA_SEMANTICS.md`, `pipeline/` | ✅ en repo |
| Capturas | `evidence/g5/shots/`, `evidence/g5/human-review/` | ✅ regeneradas G5 |
| Build congelado | `app/build/` del commit congelado | ⏳ tras freeze |
| Paquete de reproducibilidad | `pipeline/` + `data/manifests/` + `data/qa/` + `scripts/verify.ps1` | ✅ en repo |
| Enlace público funcionando | gh-pages | ⏳ tras aceptación humana + PERF4 |
| Previsión Base 19 (acto + presentación pública) | decisión humana | ⏳ PENDING |

## Cómo reproducir el build de la entrega

```powershell
powershell -File scripts\verify.ps1   # check + lint + test + format:check + build + pytest
cd app; npm run serve                 # sirve app/build con HTTP Range (PMTiles)
```

Probes de regresión (Chromium): `node scripts/g2a_play.mjs`,
`g2b_views.mjs`, `g3b_planning.mjs`, `g3c_histmap.mjs`, `g4_atlas.mjs`,
`g4_scene_stories.mjs`, `g4_state_matrix.mjs`,
`perf4_critical_path_contract.mjs`, `g5_shots.mjs`,
`g5_human_review_pack.mjs`.
