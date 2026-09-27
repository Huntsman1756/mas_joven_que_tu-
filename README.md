# MÁS JOVEN QUE TÚ

**Tu vida como medida del territorio**

Visualización de datos interactiva sobre el parque de edificios actual de Bizkaia,
su año de construcción en Catastro y las ortofotografías oficiales históricas.

> Pregunta central: **¿Qué parte de la Bizkaia que ves hoy apareció después que tú?**

Concurso: *Premios al Reto del Periodismo de Datos 2026 — Open Data Bizkaia /
Diputación Foral de Bizkaia*, categoría **Visualización de datos**.
Cierre de presentación: **20 de noviembre de 2026 a las 13:00 h** (hora oficial;
revalidar publicación BOB y correcciones antes de presentar — ver
`docs/red-team/CONTEST_2026_CONTRACT.md`).

---

## Estado del producto (2026-09-27)

| Área | Estado |
|------|--------|
| **Producto** | Resultado personal + **cinco modos** (Por antigüedad, Evolución, Fotos aéreas, Mapa 1923–25, Antes/ahora), búsqueda por municipio y dirección, **cinco capítulos editoriales**, contexto de población/planeamiento, página de metodología |
| **Datos** | 112 municipios · 139.447 edificios actuales, 138.501 con año válido · snapshot 2026 congelado · invariantes verificadas (112/112) |
| **Idiomas** | ES revisado · EU con **524 claves** (paridad verificada) **pero con revisión lingüística nativa pendiente** (no certificado) |
| **Verificación** | 259 tests de dominio/copy + 15 de servidor + 49 de datos · E2E Playwright en CI · `scripts/verify.ps1` |
| **Auditoría FASE A** | `docs/red-team/` (2026-09-27) — registro fechado, no se reescribe |
| **Remediación FASE B** | `docs/remediation/red-team-2026/` — matriz de adjudicación RT-01…RT-22, verificación y procedimiento de release |

El estado del **candidato** (build, SHA, gates abiertos, pendientes humanos) vive en
`docs/remediation/red-team-2026/`. No hay ninguna publicación nueva autorizada por
la mera existencia de este repositorio: producción sigue en
<https://huntsman1756.github.io/mas_joven_que_tu-/`.

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

## Cómo ejecutarlo

```powershell
# verificación local completa (tipos, lint, formato, tests, build, datos, Range)
powershell -File scripts\verify.ps1
```

Desarrollo y comandos sueltos:

```powershell
cd app
npm install
npm run dev          # desarrollo
npm run check        # svelte-check (tipos + a11y)
npm run lint         # eslint
npm run format:check # prettier --check (CI comprueba esto)
npm run test         # vitest: dominio + copy-lint + servidor
npm run build        # build estático en app/build
npm run serve        # servidor estático con HTTP Range (PMTiles lo exige)

# tests de datos (Python)
python -m pytest tests/data -q
```

La receta del **pipeline de datos** (preingesta → G1 → tiles) está en la sección
«Comandos» de [`AGENTS.md`](AGENTS.md) y se explica con sus dependencias en
[`docs/submission/TECHNICAL-MEMORY.md`](docs/submission/TECHNICAL-MEMORY.md) §3.

### Reproducir el snapshot ≠ descargar una versión nueva de la fuente

- **Reproducir el snapshot publicado**: hace falta `data/interim/catastro/` (no se
  versiona) con los ZIP cuyos SHA-256 están registrados en
  `evidence/g0/02-recon/recon-bizkaia.json` (112 descargas). Con esos bytes,
  `python pipeline/g1_buildings.py` regenera exactamente los artefactos del snapshot.
  Si no conservas los ZIP, la fuente viva puede haber cambiado y el resultado deja de
  ser el snapshot publicado: en ese caso documenta el corte nuevo, no lo presentes como
  reproducción.
- **Descargar una versión nueva de la fuente**: `python pipeline/g0_recon.py` vuelve a
  descargar los ZIP (registrando hash, bytes y fecha del nuevo corte) y después G1.
  Es una **actualización de snapshot**, con su propio manifiesto y QA — no es
  reproducir la entrega.

### Versiones efectivas (medidas en este entorno de trabajo)

| Pieza | Versión usada |
|-------|---------------|
| Node / npm | 24.19.0 / 11.17.0 (CI usa Node 20; `engines.node >=20`) |
| Python | 3.11.15 (`requirements.txt`: `duckdb>=1.5,<2` → 1.5.5, `requests>=2.32` → 2.34.2, `shapely>=2.1,<3` → 2.1.2) |
| Playwright | 1.63.0 (E2E local y sondeos) |
| tippecanoe | 2.79.0 en contenedor fijado (ADR-003) |
| Svelte / SvelteKit / Vite | 5 / 2.70.3 / 6.x (`app/package.json` y su lock) |
| MapLibre GL / PMTiles | 6.10.0 / 4.5.0 |

## Compatibilidad declarada (RT-15)

- **Suelo por APIs usadas**: Chrome/Edge ≥ 108, Firefox ≥ 101, Safari ≥ 15.4
  (incluido iOS/iPadOS). Condicionado a `100svh`, `AbortSignal.timeout` y
  `AbortSignal.any` **con fallback propio** en `app/src/lib/domain/fetch.ts`.
- **Degradación conocida y aceptada** si falta una API CSS reciente:
  `text-wrap: balance` y el contorno `:has()` del eje temporal se descartan sin
  romper el layout; el portapapeles muestra error visible si no está disponible.
- **Verificado en ejecución**: Chromium actual (suite completa), **Firefox y
  WebKit vía Playwright** (journey completo hero→resultado→mapa→foto→cambio
  de lugar + suite `g2b_views` en verde en los tres motores, reflow a 320 px
  y zoom 400 %), Chrome Android 109 / API 33 emulado (Maestro), layout EU a
  320 y 390 px.
- **NO certificado en esta fase**: Safari iOS físico (MOB-05b), Safari
  macOS/Firefox instalados por el usuario, lector NVDA. Ver
  `docs/remediation/red-team-2026/RELEASE.md`.

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
| [`docs/adrs/`](docs/adrs/) | ADR-001 … ADR-026 |
| [`docs/submission/`](docs/submission/) | Paquete de entrega (Base 6): memoria, fuentes y licencias |
| [`docs/gates/`](docs/gates/) | Historial de gates y reportes de fase (evidencia fechada) |
| [`docs/red-team/`](docs/red-team/) | Auditoría FASE A (2026-09-27) — registro, no se reescribe |
| [`docs/remediation/red-team-2026/`](docs/remediation/red-team-2026/) | Remediación FASE B: matriz, verificación, release |
| [`data/manifests/README.md`](data/manifests/README.md) | Esquema de manifiestos por fuente |
| [`data/qa/leioa-baseline-qa.md`](data/qa/leioa-baseline-qa.md) | QA reproducido sobre datos reales (spike verificado) |

---

## Stack

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
