# docs/submission — paquete de entrega (concurso DF 73/2026)

**Publicado el 07-11-2026** en <https://masjovenquetu.eus> (build `32e4831`, ADR-029);
copia permanente en GitHub Pages. QA: `evidence/vps2-eus-20261107/` y `evidence/pages-20261107/`.
El paquete vigente es `output/pdf/entrega/paquete-entrega.zip`;
las capturas y la demo proceden de esa publicación. Los paquetes anteriores se conservan
como registros históricos. Revisión humana EU, NVDA y solicitud siguen pendientes.

## Material audiovisual producido

[Paquete visual y reproductor](media/index.html),
[vídeo silencioso subtitulado](media/demo-silenciosa.mp4), [transcripción](media/transcript.es.md).
Recapturado directamente sobre la web publicada; identidad en `media/capture-provenance.json`.
Véase [procedencia y límites](media/README.md). Antes de la entrega definitiva,
revalidar contra el artefacto publicado. El vídeo narrado anterior es histórico
y queda fuera del paquete de entrega.


> Estado: **publicado; comprobaciones públicas del 07-11-2026**.
> `FINAL-CHECKLIST.md` mantiene los controles humanos y administrativos pendientes.

## Archivos para adjuntar

`output/pdf/entrega/paquete-entrega.zip` contiene solo lo que se envía: memoria técnica
(Base 6) y resumen en PDF, demo silenciosa subtitulada (`demo.mp4`), cuatro capturas y el
CSV de los cinco casos. Nada interno: sin fechas de revisión, sellos de build ni
manifiestos. La trazabilidad queda fuera del ZIP, en `output/pdf/entrega/MANIFEST.json`
(hashes, build `32e4831` acreditado por `evidence/demo-subtitles-20261107/published-index.html`).
Se genera con `scripts/build_submission_package.py --out output/pdf/entrega --build-index
evidence/demo-subtitles-20261107/published-index.html` y no envía ninguna solicitud.
Los ZIP anteriores son históricos.

Documentación técnica exigida por la **Base 6** del Decreto Foral 73/2026
y materiales de apoyo a la solicitud. Regla de redacción (COMPETITION.md
§2): Open Data Bizkaia es la **fuente principal**; el resto son
complementos.

La Base 6 pide: (a) dataset original **o** procedencia/acceso, (b) breve
descripción del proceso, herramientas y técnicas, (c) acreditación de
representación. **No** se ha encontrado obligación literal de vídeo,
capturas ni código como requisito de admisión: son materiales de apoyo.
No convertirlos en requisitos legales.

## Contenido

| Documento | Base | Estado |
|-----------|------|--------|
| `TECHNICAL-MEMORY.md` | Base 6 — procedencia/acceso, proceso, herramientas y técnicas | actualizado + PDF |
| `SOURCES-LICENSES.md` | Base 6 + Base 18 — procedencia/acceso del dataset y licencias (datos ≠ software) | revisar contra el candidato final |
| `EVALUATION-PACKAGE.md` | Base 10 — resumen para quien evalúa (hallazgo, 3 enlaces, 4 capturas, identidad) | actualizado + PDF |
| `DEMO-SCRIPT.md` | apoyo — demo 76 s | ES/subtítulos, recapturada desde la publicación |
| `EDITORIAL-DECISIONS.md` | registro — nombre/subtítulo, «Ver un ejemplo», imágenes, demo | etapa editorial aplicada |

## Checklist de entrega (COMPETITION.md §7)

| Entregable | Dónde | Estado |
|------------|-------|--------|
| Memoria técnica | `TECHNICAL-MEMORY.md` | revisión del 07-11-2026 |
| Catálogo de fuentes y licencias | `SOURCES-LICENSES.md` + `data/manifests/` | en repo |
| Registro de descargas con SHA-256 (112) | `evidence/g0/02-recon/recon-bizkaia.json` | en repo |
| Documentación técnica Base 6 | `docs/METHODOLOGY.md`, `docs/DATA_SOURCES.md`, `docs/DATA_SEMANTICS.md`, `pipeline/` | en repo |
| Evidencia de producto (capturas, sondeos) | `evidence/` (histórica) + `evidence/red-team-2026/` (candidato) | en repo |
| Identificación del build | `<meta name="mjt:build">` en el HTML + `RELEASE.md` | en build |
| Build publicado | `evidence/vps2-eus-20261107/` | build `32e4831`; CI verde de `main` (PR #9) |
| Paquete de reproducibilidad | `pipeline/` + `data/manifests/` + `data/qa/` + `scripts/verify.ps1` | en repo |
| Enlace público | masjovenquetu.eus + gh-pages | sello consultado por `deploy-check`; capturas verificadas |
| Solicitud en modelo oficial | canal oficial | pendiente humano |
| Previsión Base 19 (acto + presentación pública) | decisión humana | pendiente humano |

## Cómo reproducir el build de la entrega

```powershell
powershell -File scripts\verify.ps1   # check + eslint + format:check + tests + build + pytest + Range
cd app; npm run serve                 # sirve app/build con HTTP Range (PMTiles)
```

Distinguir siempre (TECHNICAL-MEMORY §5):

- **reproducir el snapshot publicado** = mismos bytes de origen
  (112 SHA-256 en `evidence/g0/02-recon/recon-bizkaia.json`);
- **descargar una versión nueva de la fuente** = `pipeline/g0_recon.py`
  contra la fuente viva → corte nuevo con su manifiesto y QA.

E2E de regresión (Chromium, `CI_STUBS=1` como en CI):
`scripts/g5_swipe.mjs`, `g10_hardening.mjs`, `g12_reliability.mjs`,
`g13_ux.mjs`, `g14_eu_qa.mjs`, `g8_viewer.mjs`, `g2b_views.mjs`
(también con `BROWSER=firefox|webkit`), `g18_timeplayer.mjs`,
`perf4_deeplink_race.mjs`; y de la remediación FASE B:
`redteam_verify.mjs`, `rt_golden_cases.mjs`, `rt16_engine_retry.mjs`,
`rt12_hero_bytes.mjs`, `rt_pages_prefix.mjs`.
Resultados y límites: `docs/remediation/red-team-2026/VERIFICATION.md`.

Los datos administrativos personales (cuenta bancaria, identificación,
obligaciones — Base 7) **no se guardan en este repositorio**: se tramitan
por el canal oficial.
