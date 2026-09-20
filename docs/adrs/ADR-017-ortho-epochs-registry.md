# ADR-017: registry de épocas ortofoto multi-origen + rail temporal

**Fecha:** 2026-09-20 · **Estado:** aceptado

## Contexto

La serie primaria de Open Data Bizkaia (fuente oficial, Base 1) publica
9 campañas: 1956·1965·1970·1975·1983·1990·1995·1999·2002. Entre 2002 y
hoy quedaba un hueco de 23 años y entre campañas hay saltos de 5–7 años
que debilitan la personalización («la imagen más próxima a tu año» puede
estar a 7 años).

El GetCapabilities de geoEuskadi WMS (`WMS_ORTOARGAZKIAK`) declara
**61 capas `ORTO_*`**, incluidas épocas que rellenan los huecos
(`ORTO_1945_46_AMERICANO`, `ORTO_INTERMINISTERIAL_1977_78`,
`ORTO_1984_85`, `ORTO_1989`, `ORTO_1991`, `ORTO_2001`) y una serie anual
2004–2025.

## Decisión

1. `pipeline/metrics.py::CAMPAIGNS` pasa a un registry de **37 campañas**
   con `source` (`bfa` | `geoeuskadi`), `nominal_year`, `flight_range`
   cuando la ficha lo documenta y `layer` cuando el nombre WMS no sigue
   el patrón `ORTO_{año}`.
2. geoEuskadi actúa como **fuente complementaria** (nunca sustituye una
   campaña BFA del mismo año: 1956, 1995 y 2002 siguen siendo BFA).
3. El preview local se genera para **todas** las épocas con el mismo
   generador (`image` source para geoEuskadi, bbox ETRS89); el manifest
   fusiona en vez de sobrescribir al correr por subset.
4. En FOTO, un rail de épocas reemplaza al stepper prev/next: todos los
   años disponibles son alcanzables, con marcador «tu año» sobre la
   campaña más cercana al año de nacimiento (`app.nearest`, ya existente).
   Operable por teclado (←/→/Inicio/Fin), `aria-label` por botón.
5. Estado compartible: `?view=photo&ortho={año}` (param existente, sin
   cambios de URL).

## Evidencia

- `evidence/g6/orthophotos/probe-geoeuskadi-epochs.json` (4 épocas × 3
  puntos), `probe-geoeuskadi-rural.json` (punto rural Karrantza),
  `probe-geoeuskadi-odd-years.json` (2005–2023 impares × urbano+rural):
  contenido real verificado (JPEG multicolor, >100 colores únicos).
- `app/static/data/ortho-previews/manifest.json`: 37 entradas.

## Consecuencias

- La app hace más peticiones a un servicio de terceros solo tras opt-in;
  fail-closed por campaña (`probeCampaign`) se conserva.
- El rail crece a 37 entradas: scroll horizontal con `scroll-snap`,
  sin paginación.
- Coste repo: +28 previews (~30–60 KB cada una) — aceptable.

## Alternativas descartadas

- **Limitar a la serie BFA**: mantenía huecos de 5–23 años en la
  personalización por año de nacimiento.
- **Mosaico estilo Swisstopo** (una fecha nominal con teselas de años
  mezclados): imposible de etiquetar honestamente por tesela; viola la
  regla de precisión temporal.
- **Selector compacto** (dropdown): oculta la densidad de la serie, que
  es parte del mensaje («hay una foto cada año desde 2004»).
