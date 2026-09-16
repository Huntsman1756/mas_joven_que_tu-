# OSS_REUSE — licencias y decisiones

> Licencias **leídas** del fichero `LICENSE` del repositorio (no inferidas),
> verificadas 2026-09-16. Software ≠ datos: ver `DATA_SOURCES.md`.

## Tabla de decisión

`ADOPT` = lo usamos tal cual · `ADAPT` = integramos/los patrones con adaptación ·
`STUDY ONLY` = aprendemos, **no copiamos código** · `REJECT` = descartado.

| Proyecto | Para qué | Licencia | Actividad | Código reutilizable | Patrón reutilizable | Decisión | Notas |
|----------|----------|----------|-----------|--------------------|--------------------|----------|-------|
| `maplibre/maplibre-gl-js` | Motor de mapa | **BSD-3-Clause** | activo (2026) | sí | sí | **ADOPT** | Sin SDK propietario |
| `protomaps/PMTiles` | Formato de tiles estáticos | **BSD-3** (spec **CC0**) | activo | sí | sí | **ADOPT** | Formato candidato principal |
| `felt/tippecanoe` (fork de `mapbox/tippecanoe`) | Generar vector tiles | **BSD-2-Clause** | activo | sí (binario) | sí | **ADOPT** | Origen mapbox también BSD-2 |
| `opengeos/maplibre-gl-swipe` | Swipe antes/después | **MIT** | activo | sí | sí | **ADOPT** | API vanilla, sin React |
| `russellgoldenberg/scrollama` | Scrollytelling | **MIT** | estable | sí | sí | **ADOPT** | Alternativa: IntersectionObserver |
| `duckdb/duckdb` (+ extensión `spatial`) | ETL, QA, joins, agregados | **MIT** | muy activo | sí (librería) | sí | **ADOPT** | DuckDB 1.5.5 ya instalado |
| `sveltejs/kit` | Framework frontend | **MIT** | muy activo | sí | sí | **ADOPT** | static adapter |
| `sveltejs/svelte` | Framework UI | **MIT** | muy activo | sí | sí | **ADOPT** | — |
| `mikeliturbe/bizkaiko-etxeak` | Antecedente directo Bizkaia | **MIT** (código) | antiguo (2016) | ideas compatibles | sí | **STUDY + cita** | **Datos NO incluidos** en el repo. No adoptamos su stack (TileMill/Mapbox.js) |
| `bertspaan/buildings` | Edificios por año (Países Bajos) | **SIN LICENCIA** | activo (2026) | **NO** | sí (arquitectura) | **STUDY ONLY** | Sin licencia inequívoca ⇒ prohibido copiar código. Solo estudiar arquitectura, multiescala, timeline y clustering |
| `olive-groves/cas-viewer` | Viewer Svelte+MapLibre+PMTiles | **MIT** | activo | sí | sí | **ADAPT** | Reutilizar patrones de side-by-side viewer |
| `openlayers/openlayers` | Alternativa de motor de mapa | **BSD-2-Clause** | activo | sí | — | **REJECT** | Ver ADR-001 (MapLibre elegido) |
| `visgl/deck.gl` | Grandes volúmenes de datos | **MIT** | activo | sí | — | **REJECT (por ahora)** | Añadiría peso; PMTiles cubre la necesidad |
| `protomaps/protomaps-leaflet` | Leaflet + PMTiles | **BSD-3** | activo | sí | sí | **REJECT** | No usamos Leaflet |
| `osmlab/name-suggestion-index` | Nombres de marcas (no aplica) | **BSD-3** | activo | — | — | **REJECT** | Fuera de alcance |
| Google Maps / Mapbox Search | Geocoder | propietaria | — | — | — | **REJECT** | Sustituido por NORA (oficial, CORS `*`) |
| IGN PNOA histórico | Ortofoto | oficial | — | — | — | **STUDY** | Usado por geoEuskadi; puede cubrir fechas faltantes |

## Atribución obligatoria en el producto

- MapLibre GL JS — BSD-3.
- PMTiles — BSD-3 / spec CC0.
- tippecanoe — BSD-2.
- maplibre-gl-swipe — MIT.
- Scrollama — MIT.
- DuckDB — MIT.
- Vitest / ESLint / Prettier (+ plugins svelte/ts) — MIT (solo desarrollo, ADR-009).
- Antecedente: *Bizkaiko etxeak*, Mikel Iturbe, 2016 (MIT).

## Assets auto-hospedados

- **Glyphs de etiquetas** — `app/static/fonts/glyphs/Open Sans Semibold/*.pbf`.
  Generados a partir de `openmaptiles/fonts` (fontstack Open Sans Semibold,
  fuente Open Sans — **Apache License 2.0**). Auto-hospedados para eliminar la
  dependencia de `demotiles.maplibre.org` (VR4: visual regression determinista
  sin servicios vivos) y de terceros en producción. Cobertura: rangos Unicode
  que la fuente publica (Latin + puntuación general); los rangos ausentes no
  existen en la fuente.

## Aportación nueva respecto al antecedente

Frente a *Bizkaiko etxeak* (2016), este proyecto aporta:

- datos actualizados (snapshot 2026, frecuencia mensual/diaria);
- arquitectura web moderna (SvelteKit + MapLibre + PMTiles) y estática;
- personalización temporal (tu año como estado global);
- estadísticas con denominador y cobertura explícitos;
- sincronización Catastro ↔ ortofotografía histórica oficial;
- serie histórica de ortofotos hasta 2025 vía geoEuskadi;
- narrativa editorial dato-fundada;
- metodología y QA reproducibles y publicados.

## Restricciones registradas

- **`bertspaan/buildings` sin licencia**: prohibido copiar código. Verificado en
  `LICENSE` ausente y API de GitHub (`license: null`).
- **Datos ≠ código**: la licencia MIT de un repo no se extiende a sus datos.
  En `bizkaiko-etxeak` los datos no están publicados.
- **Cambios de servicio**: las capas WMS de geoEuskadi cambiaron de nomenclatura
  (aviso oficial 2026-06-12). Los endpoints se validan en cada build.
