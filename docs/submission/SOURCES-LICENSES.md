# CATÁLOGO DE FUENTES Y LICENCIAS — «Más joven que tú» (DRAFT G5)

> Software ≠ datos. Este catálogo lista las **licencias de los datos**;
> las licencias del código de terceros están en `docs/OSS_REUSE.md`.
> Fuente de verdad por dataset: `data/manifests/*.yaml`.
> Estado: **borrador** — se congela con el candidato G5.

## 1. Datos — fuente principal (Open Data Bizkaia, Base 1)

Todos publicados por la Diputación Foral de Bizkaia. Licencia declarada a
nivel de **recurso**: `CC BY 4.0`
(`http://creativecommons.org/licenses/by/4.0/rdf`), verificada por
peticiones reales a la API CKAN y a los recursos.

| `source_id` | Qué aporta | Acceso | Recuperado |
|-------------|------------|--------|-----------|
| `bizkaia.catastro.edificios` | Edificios actuales: geometría + `Ano_Constr` (única fuente del año) | ZIP GML/SHP por municipio, `opengis.bizkaia.eus` | 2026-09-16 |
| `bizkaia.catastro.wfs` | Actualizaciones incrementales de edificios | WFS `Edificios` (GML 3.2) | 2026-09-16 |
| `bizkaia.ortofotos.historicas` | Campañas 1956–2002 | Tiles `MapServer/tile/{z}/{y}/{x}` (servido, no descargado) | 2026-09-16 |
| `bizkaia.cartografia.historica.1923-1925` | Mapa histórico 1923–25 | Servicio de teselas `ORTO_EJ_CARTO_1925` | 2026-09-18 |
| `bizkaia.limites.municipales` | Geometrías de municipio | Open Data Bizkaia / geoEuskadi | 2026-09-16 |
| `bizkaia.planeamiento` | Planeamiento urbanístico vigente | Snapshot municipal | 2026-09-16 |
| `bizkaia.montes.publicos` | Contexto territorial (solapes) | Open Data Bizkaia | 2026-09-19 |
| `bizkaia.ruido.carreteras` | Contexto: mapa de ruido | Open Data Bizkaia | 2026-09-19 |
| `bizkaia.bizkaibus.paradas` | Contexto: transporte | Open Data Bizkaia | 2026-09-19 |
| `bizkaia.concurso.bases` | Bases del concurso | Texto legal — no objeto de PI (art. 13 LPI) | 2026-09-16 |

## 2. Datos — fuentes complementarias (nunca principales)

| `source_id` | Editor | Licencia | Uso | Recuperado |
|-------------|--------|----------|-----|-----------|
| `euskadi.ortofotos.modernas` | Gobierno Vasco — geoEuskadi | CC BY 4.0 | WMS `WMS_ORTOARGAZKIAK`, campañas 2004–2025 | 2026-09-16 |
| `euskadi.nora.geocoder` | Gobierno Vasco — geoEuskadi | CC BY 4.0 | Geocodificador oficial NORA | 2026-09-16 |
| `eustat.poblacion` | Eustat — Instituto Vasco de Estadística | Redifusión autorizada citando «Fuente: www.eustat.eus» (aviso legal verificado; Directiva (UE) 2019/1024) | Población municipal (censo histórico + padrón 2025) | 2026-09-20 |

Atribución visible en producto: cada hecho contextual lleva fuente y
fecha junto al dato; las ortofotos muestran editor y campaña; el pie de
metodología enlaza el catálogo completo.

## 3. Semántica crítica registrada (resumen)

- `Ano_Constr`: año de construcción registrado en Catastro. `UNKNOWN ≠ 0`.
- Huella en planta (`footprint_area`): área del polígono, nunca
  superficie construida total.
- Año nominal de campaña ≠ fecha real de vuelo (se muestran ambos cuando
  se conocen).
- Eustat: censo (población de hecho, con huecos históricos = dato
  ausente) y padrón (1 de enero) son operaciones distintas; no se
  mezclan en una misma afirmación.
- Detalle completo: `docs/DATA_SEMANTICS.md`.

## 4. Software de terceros (resumen; detalle en `docs/OSS_REUSE.md`)

| Componente | Licencia | Rol |
|------------|----------|-----|
| MapLibre GL JS | BSD-3-Clause | Motor de mapa |
| PMTiles | BSD-3 / spec CC0 | Tiles estáticos |
| tippecanoe | BSD-2-Clause | Generación de vector tiles |
| SvelteKit / Svelte | MIT | Framework |
| DuckDB (+spatial) | MIT | Pipeline/QA |
| Playwright, Vitest, ESLint, Prettier, axe-core | MIT / Apache-2.0 | Verificación (dev) |
| Glifos Open Sans Semibold | Apache-2.0 | Etiquetas de mapa auto-hospedadas |

`maplibre-gl-swipe` (MIT) se **eliminó** en G5: la comparación de campañas
es implementación propia de dos lienzos sincronizados.
`scrollama` nunca se instaló (IntersectionObserver nativo).

## 5. Base 18 — titularidad y terceros

- Todo el material de terceros tiene licencia leída y documentada
  (`docs/OSS_REUSE.md`, tabla de decisión ADOPT/ADAPT/STUDY/REJECT).
- `bertspaan/buildings` carece de licencia: STUDY ONLY, prohibido copiar
  código.
- El antecedente `bizkaiko-etxeak` (MIT, 2016) se cita; sus datos no se
  reutilizan (no están publicados).
- La responsabilidad sobre material de terceros es del proyecto (Base
  18); este catálogo es la evidencia de diligencia.
