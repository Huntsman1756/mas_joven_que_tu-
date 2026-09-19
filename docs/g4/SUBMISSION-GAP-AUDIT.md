# G4-R · SUBMISSION-GAP-AUDIT — contra las bases reales

Fuente: `docs/COMPETITION.md` (bases legales auditadas, LEGAL_GATE PASSED).
Requisito → artefacto existente → gap → acción.

| Requisito | Artefacto existente | Gap | Acción pendiente |
|-----------|--------------------|-----|------------------|
| URL pública del proyecto | — | **despliegue no verificado en este repo** | decidir hosting + URL final antes de G5 |
| Base 6: dataset o procedencia/acceso | `data/manifests/*` (todos los snapshots con hash) | cerrado en repo | **incluir en la documentación de solicitud** (la base exige acompañarla, no basta el repo) |
| Base 6: descripción del proceso + herramientas | `METHODOLOGY.md`, `DATA_SOURCES.md`, `DATA_SEMANTICS.md`, `pipeline/`, requirements congelados | cerrado en repo | empaquetar para solicitud |
| Base 18: titularidad/licencias terceros | `OSS_REUSE.md` + atribuciones en UI | cerrado en repo | revisar al añadir cualquier dependencia G4 |
| Base 1: Open Data Bizkaia fuente principal | Catastro+ortofotos+planeamiento+Bizkaibus+montes+ruido+cartografía 1923-25 = 7 datasets principales; geoEuskadi/NORA complementarios | cumplido | mantener el encuadre en textos de solicitud |
| Base 2: persona física ≤4 | — | organizativo | fuera del repo |
| Base 19: asistencia + presentación pública | `JUDGE-JOURNEY.md` (guion 5 min) | organizativo | reservar fecha + ensayar demo |
| Metodología accesible públicamente | `/como-lo-sabemos` en producto | existe | mantener sincronizada con el producto final G4 |
| Licencias/attribution en producto | footer + por-módulo | existe | verificar tras reorganización G4 |
| Capturas | `evidence/g*/browser/` + `state-atlas/` | abundante | seleccionar set final para memoria |
| Reproducibilidad | pipeline + manifests + hashes | cerrado | empaquetar README de reproducción |
| Memoria técnica | — | **no existe** | redactar en G5 (este research pack es su materia prima) |
| Declaraciones personales/legales | — | fuera del repo | formulario oficial |
| Accesibilidad | gates + `ACCESSIBILITY.md` | sólido | sumar hallazgos G4-R (encabezados de módulo, aria-live) |
| Categoría designada | categoría (a) con sus criterios | documentada | verificar encaje final |

## Datasets Open Data Bizkaia realmente consumidos (inventario final)

1. `parcelario-catastral-de-bizkaia` (+ municipales) — edificios/años.
2. `ortoimagenes-1956…-2002` — ortofotos por campaña.
3. Planeamiento urbanístico (datos globales).
4. Cartografía histórica 1:25.000 (1923–1925).
5. Rutas y paradas de Bizkaibus.
6. Montes públicos de Bizkaia.
7. Mapa estratégico de ruido de carreteras forales.
Complementos: ortofotos geoEuskadi (2004–2025), geocodificador NORA
(geoEuskadi) — declarados como complementarios.

## Gaps reales (no de repo)

1. **URL/hosting de entrega** — sin resolver (organizativo, decide el
   dueño del proyecto).
2. **Memoria técnica formal** para la solicitud — el material existe
   disperso; compilar en G5.
3. **Empaquetado de la documentación Base 6** — copiar manifests +
   methodology a la solicitud oficial.
4. Año del jurado/celebración: nada que prepare.
