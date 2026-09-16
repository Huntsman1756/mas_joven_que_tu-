# ADR-001 — MapLibre GL JS como motor de mapa

- **Estado:** aceptado
- **Fecha:** 2026-09-16

## Contexto

Necesitamos un motor de mapa vectorial con soporte de fuentes raster (ortofotos
oficiales), PMTiles, control fino de estilo, buen rendimiento móvil y licencia permisiva.
Las alternativas principales son MapLibre GL JS y OpenLayers.

## Decisión

Usar **MapLibre GL JS** (BSD-3-Clause).

## Motivos

- Licencia BSD-3 permisiva; sin SDK ni tokens propietarios.
- Ecosistema directo con PMTiles y con `maplibre-gl-swipe` (MIT), que ya vamos a reutilizar.
- Soporte nativo de `raster` sources, incluido `{bbox-epsg-3857}` para consumir WMS
  (necesario para la ortofoto moderna de geoEuskadi).
- WebGL: mejor rendimiento con muchas geometrías que el render por canvas de OpenLayers.
- Es el stack observado en referencias modernas (Bert Spaan, cas-viewer), lo que reduce
  el riesgo de integración.

## Alternativas consideradas

- **OpenLayers (BSD-2):** gran soporte OGC (WMS/WFS nativo) y GIS, pero más pesado para
  una experiencia editorial y menos alineado con PMTiles/swipe. `REJECT`.
- **Leaflet:** sin WebGL; no encaja con volumen de edificios. `REJECT`.

## Consecuencias

- Debemos gestionar explícitamente WMS vía `{bbox-epsg-3857}` (MapLibre no tiene cliente WMS).
- El estilo se define en MapLibre Style Spec.
- Atribución visible obligatoria.
