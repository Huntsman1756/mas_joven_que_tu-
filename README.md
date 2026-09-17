# MÁS JOVEN QUE TÚ

**70 años construyendo Bizkaia**

Visualización de datos interactiva sobre el parque de edificios actual de Bizkaia,
su año de construcción en Catastro y las ortofotografías oficiales históricas.

> Pregunta central: **¿Qué parte de la Bizkaia que ves hoy apareció después que tú?**

Concurso: *Premios al Reto del Periodismo de Datos 2026 — Open Data Bizkaia /
Diputación Foral de Bizkaia*, categoría **Visualización de datos**.
Deadline de presentación: **20 de noviembre de 2026**.

---

## Estado del proyecto

| Fase | Contenido | Estado |
|------|-----------|--------|
| **P0** | Fundación: documentos canónicos, verificación de fuentes, arquitectura, G0 preregistrado | **CERRADO** |
| **G0** | Gate de viabilidad: vertical slice con datos reales | **G0_PASS** (ver `docs/gates/G0-FINAL-REPORT.md`) |
| **G1** | Producto core: *Tu Bizkaia* + mapa multiescala + estadísticas | **EN CURSO** (implementación) |
| **G2** | Máquina del tiempo: ortofotos + swipe | preregistrado |
| **G3** | Editorial: *Historias del cambio* + copy final | preregistrado |
| **G4** | Hardening: móvil, accesibilidad, rendimiento, QA | preregistrado |
| **G5** | Entrega: memoria técnica, fuentes, freeze, reproducibilidad | preregistrado |

**No se avanza a G0 sin revisión humana de esta especificación.**
Ver [`docs/gates/G0.md`](docs/gates/G0.md).

---

## La idea en una frase

El usuario elige un **año** y un **lugar**. Ese año se convierte en el estado temporal
global que sincroniza el mapa de edificios, las estadísticas, el histograma, la
ortofoto histórica y el relato.

## Qué afirmamos y qué NO

- ✅ *«Así se distribuyen por año de construcción los edificios que existen hoy.»*
- ⚠️ La serie de ortofotos muestra la evidencia visual de cada vuelo oficial.
- ❌ **No** reconstruimos el parque edificado histórico. El Catastro actual no contiene
  los edificios que fueron demolidos.
- ❌ **No** afirmamos «Bizkaia creció X %» ni «aquí no había nada».

Detalle normativo en [`docs/DATA_SEMANTICS.md`](docs/DATA_SEMANTICS.md) y
[`docs/METHODOLOGY.md`](docs/METHODOLOGY.md).

---

## Documentación canónica

| Documento | Contenido |
|-----------|-----------|
| [`docs/PROJECT_CHARTER.md`](docs/PROJECT_CHARTER.md) | Visión, usuario, concurso, éxito, no-objetivos |
| [`docs/PRODUCT.md`](docs/PRODUCT.md) | Journeys, features, navegación, modelo de estado |
| [`docs/DATA_SOURCES.md`](docs/DATA_SOURCES.md) | Inventario verificado de fuentes, formatos, licencias |
| [`docs/DATA_SEMANTICS.md`](docs/DATA_SEMANTICS.md) | Definición exacta de métricas, denominadores, unknowns |
| [`docs/METHODOLOGY.md`](docs/METHODOLOGY.md) | Adquisición, snapshots, transformaciones, QA |
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | Sistema, pipeline, runtime, despliegue, fallbacks |
| [`docs/UX.md`](docs/UX.md) | Jerarquía de pantallas, flujos, responsive, interacción |
| [`docs/UX_COPY.md`](docs/UX_COPY.md) | Copy real, tooltips, estados vacíos, explicaciones |
| [`docs/VISUAL_SYSTEM.md`](docs/VISUAL_SYSTEM.md) | Jerarquía del mapa, color, tipografía, timeline, motion |
| [`docs/ACCESSIBILITY.md`](docs/ACCESSIBILITY.md) | Teclado, color, reduced motion, alternativa textual |
| [`docs/OSS_REUSE.md`](docs/OSS_REUSE.md) | Licencias y decisiones ADOPT/ADAPT/STUDY/REJECT |
| [`docs/INSPIRATION.md`](docs/INSPIRATION.md) | Referencias internacionales y qué NO transferimos |
| [`docs/COMPETITION.md`](docs/COMPETITION.md) | Bases legales (DF 73/2026), encaje con el rubric, evidencia |
| [`docs/legal/`](docs/legal/) | Texto íntegro oficial del decreto + hash (fuente normativa canónica) |
| [`docs/RISKS.md`](docs/RISKS.md) | Riesgos, probabilidad, impacto, test, fallback |
| [`docs/adrs/`](docs/adrs/) | ADR-001 … ADR-010 |
| [`docs/gates/G0.md`](docs/gates/G0.md) | Gate de viabilidad con criterios GO / NO-GO |
| [`data/qa/leioa-baseline-qa.md`](data/qa/leioa-baseline-qa.md) | QA reproducido sobre datos reales (spike verificado) |

---

## Stack previsto

SvelteKit (static adapter) · TypeScript · Vite · MapLibre GL JS · PMTiles ·
tippecanoe (contenedor Docker con versión fijada) · DuckDB Spatial (`ST_Read` para
SHP/GML). GDAL/`ogr2ogr` CLI es **opcional**. Ver `scripts/preflight.ps1`.

Runtime: **static-first**. Sin backend propio, sin IA, sin PostGIS.
Datos servidos como PMTiles + servicios oficiales WMS/WMTS/WFS con CORS verificado.

Los PMTiles (`app/static/data/**/*.pmtiles`) **no se versionan** por tamaño: se
regeneran con `scripts/g1_build_tiles.ps1` (o `.sh`) tras `pipeline/g1_buildings.py`.
Los comandos exactos están en [`AGENTS.md`](AGENTS.md) §Comandos.

## Contribuir

Ver [`CONTRIBUTING.md`](CONTRIBUTING.md) y las reglas de trabajo en
[`AGENTS.md`](AGENTS.md).

## Licencias

- **Código de este repositorio:** MIT (ver `LICENSE`).
- **Datos:** cada fuente tiene su propia licencia. Los datos de Open Data Bizkaia
  usados están publicados bajo **CC BY 4.0**. Ver `docs/DATA_SOURCES.md`.
- La licencia del software **no** cubre los datos, ni al revés.

## Atribución mínima

Open Data Bizkaia · Diputación Foral de Bizkaia · geoEuskadi / Gobierno Vasco ·
Catastro de Bizkaia. Antecedente citado: *Bizkaiko etxeak* — Mikel Iturbe, 2016.
