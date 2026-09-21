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
| `opengeos/maplibre-gl-swipe` | Swipe antes/después | **MIT** | activo | sí | sí | **REMOVED (G5)** | Sustituido por comparación lado a lado propia (`CompareMap.svelte` + `map/sync.ts`): el swipe por solape de opacidad dificultaba la lectura (feedback humano G4). Dependencia eliminada del `package.json` |
| `russellgoldenberg/scrollama` | Scrollytelling | **MIT** | estable | sí | sí | **NOT USED** | Nunca llegó a instalarse: el lazy-load below-fold usa `IntersectionObserver` nativo |
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
| `legalize-dev/legalize-es` | Corpus legislativo España en Markdown+git | datos: condiciones de reutilización del BOE (cita obligatoria); pipeline **MIT** | activo (44k commits) | no se necesita el código | sí (corpus ELI, `es/`+CCAA) | **STUDY — fuente normativa candidata** | Espejo derivado de la API de datos abiertos del BOE; la fuente de verdad es siempre BOE/BOB. **No cubre normativa foral del BOB** (Normas/Decretos Forales de Bizkaia, incluido el propio DF 73/2026 del concurso). Sin integración hasta necesidad demostrada |
| `leyabierta/leyes` (+ `leyabierta/leyabierta`) | Corpus legislativo España en Markdown+git | contenido: dominio público (publicaciones oficiales); código **AGPL-3.0** | activo (pipeline diario) | no se necesita el código | sí (mismo patrón ELI; `es/` 8.6k + `es-pv/` 209) | **STUDY — fuente normativa candidata** | Alternativa más reciente a legalize-es (fork conceptual, frontmatter más rico). Misma cobertura BOE ⇒ **mismo hueco foral (BOB)**. Verificar cada norma citada contra el texto oficial del BOE |

## Atribución obligatoria en el producto

- MapLibre GL JS — BSD-3.
- PMTiles — BSD-3 / spec CC0.
- tippecanoe — BSD-2.
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
- **Texto UI y titulares (G11)** — `app/static/fonts/*.woff2`, subsets
  latin + latin-ext descargados del directorio `google/fonts`:
  - **Newsreader** 500 normal/itálica (Production Type) — **SIL OFL 1.1**,
    `licenses/newsreader-OFL.txt`.
  - **Source Sans 3** 400/600/700 + itálica 400 (Adobe) — **SIL OFL 1.1**,
    `licenses/sourcesans3-OFL.txt`.
  Auto-hospedadas (sin CDN en runtime); OFL permite el auto-hosting y el
  subconjunto de Unicode conservando la licencia junto a los ficheros.

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
- **Corpus legislativo (legalize-es / leyabierta-leyes)**: ambos son espejos
  derivados del BOE. Si se citan normas, la fuente de verdad es el BOE (texto
  consolidado oficial) y el BOB para normativa foral de Bizkaia — ausente de
  ambos corpus. La reutilización exige cita de la fuente (condiciones BOE).
  Ninguna funcionalidad actual del producto consume textos legales: quedan
  catalogados como base normativa para necesidades futuras (p. ej. marco legal
  por época de construcción), sin integración en pipeline ni build.
